// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { CorruptSnapshotError, LocalPetStore } from '../../src/storage/sqlite';

class NodeSqliteAdapter {
  constructor() {
    this.native = new DatabaseSync(':memory:');
    this.tail = Promise.resolve();
    this.failOn = null;
  }
  async execAsync(sql) {
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected SQLite failure');
    this.native.exec(sql);
  }
  async runAsync(sql, params = []) {
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected SQLite failure');
    return this.native.prepare(sql).run(...params);
  }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(this);
      this.native.exec('COMMIT');
      return result;
    } catch (error) {
      this.native.exec('ROLLBACK');
      throw error;
    } finally { release(); }
  }
}

const setup = async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  await store.createPet({ ...initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG), food: 1 });
  return { db, store };
};

const activity = (commandId, providerId, sourceRevision, steps, overrides = {}) => ({
  type: 'activity', commandId,
  gameDay: { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 1_000, endUtcMs: 11_000 },
  selectedProviderId: providerId, providerId, connectedAtMs: 1_000, sourceRevision,
  interval: { startUtcMs: 1_000, endUtcMs: 10_000 }, observedAtMs: 10_000,
  steps, runningSteps: 0, ...overrides,
});

test('SQLite schema migration is idempotent and refuses future schema without replacing it', async () => {
  const { db, store } = await setup();
  await store.migrate();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 5);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry')).count, 1);
  await db.execAsync('PRAGMA user_version = 6');
  await assert.rejects(store.migrate(), /Unsupported SQLite schema/);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 6);
  assert.equal((await store.loadPet('pet-1')).food, 1);
});

test('fresh v0 migration creates v5 transaction and sync metadata without inventing a writer identity', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 5);
  const columns = new Set((await db.getAllAsync('PRAGMA table_info(local_outbox)')).map(column => column.name));
  for (const name of ['sync_status', 'attempt_count', 'last_error_code', 'ack_sequence', 'acknowledged_at_ms', 'device_id', 'device_epoch', 'config_version']) {
    assert.equal(columns.has(name), true, name);
  }
  await store.createPet(initialPet('pet-fresh', '새별', 'reserved', 0, DEV_GAME_CONFIG));
  await store.execute('pet-fresh', { type: 'interact', commandId: 'fresh-action', kind: 'observe' });
  const row = await db.getFirstAsync('SELECT sync_status, attempt_count, device_id, device_epoch, config_version FROM local_outbox WHERE command_id = ?', ['fresh-action']);
  assert.equal(row.sync_status, 'pending');
  assert.equal(row.attempt_count, 0);
  assert.equal(row.device_id, null);
  assert.equal(row.device_epoch, null);
  assert.equal(row.config_version, DEV_GAME_CONFIG.version);
  for (const table of ['dev_purchase_ledger', 'dev_item_ownership', 'dev_sleep_benefit_ledger', 'dev_resolution_ledger']) {
    assert.equal((await db.getFirstAsync(`SELECT COUNT(*) AS count FROM ${table}`)).count, 0);
  }
});

test('first creation, restart and duplicate creation preserve one identity marker', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  assert.equal(await store.loadPet('pet-1'), null);
  const original = initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG);
  await store.createPet(original);
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  assert.deepEqual(await reloaded.loadPet('pet-1'), original);
  assert.deepEqual(await reloaded.createPet(initialPet('pet-1', '새이름', 'reserved', 0, DEV_GAME_CONFIG)), original);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry')).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_snapshot')).count, 1);
});

test('failed first snapshot insert rolls back creation marker and permits a clean retry', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  const original = initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG);
  db.failOn = 'INSERT INTO pet_snapshot';
  await assert.rejects(store.createPet(original), /injected SQLite failure/);
  db.failOn = null;
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry')).count, 0);
  assert.equal(await store.loadPet('pet-1'), null);
  await store.createPet(original);
  assert.deepEqual(await store.loadPet('pet-1'), original);
});

test('duplicate command and reload return committed result with one food debit, EXP and ledger row', async () => {
  const { db, store } = await setup();
  const command = { type: 'consumeMeal', commandId: 'meal-command', mealId: 'stable-meal', mode: 'direct', observedAtMs: 0 };
  const first = await store.execute('pet-1', command);
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  const repeated = await reloaded.execute('pet-1', command);
  assert.deepEqual(repeated.state, first.state);
  assert.equal(repeated.replayed, true);
  assert.deepEqual(repeated.currentState, await reloaded.loadPet('pet-1'));
  assert.equal((await reloaded.loadPet('pet-1')).food, 0);
  assert.equal((await reloaded.loadPet('pet-1')).totalExpUnits, 15_000_000);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 1);
  await reloaded.execute('pet-1', { type: 'interact', commandId: 'greet', kind: 'greet' });
  const historical = await reloaded.execute('pet-1', command);
  assert.equal(historical.state.revision, 1);
  assert.equal(historical.currentState.revision, 2);
  await assert.rejects(reloaded.execute('pet-1', { ...command, commandId: 'other' }), /mealId already consumed/);
  await assert.rejects(reloaded.execute('pet-1', { ...command, mealId: 'changed' }), /commandId reused/);
});

test('fault between snapshot update and ledger rolls the entire meal back; retry commits once', async () => {
  const { db, store } = await setup();
  const command = { type: 'consumeMeal', commandId: 'meal-command', mealId: 'm1', mode: 'direct', observedAtMs: 0 };
  db.failOn = 'INSERT INTO command_ledger';
  await assert.rejects(store.execute('pet-1', command), /injected SQLite failure/);
  assert.equal((await store.loadPet('pet-1')).food, 1);
  assert.equal((await store.loadPet('pet-1')).totalExpUnits, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 0);
  db.failOn = null;
  await store.execute('pet-1', command);
  assert.equal((await store.loadPet('pet-1')).food, 0);
});

test('two different meals competing for last food cannot make inventory negative', async () => {
  const { store } = await setup();
  const results = await Promise.allSettled([
    store.execute('pet-1', { type: 'consumeMeal', commandId: 'm1', mealId: 'm1', mode: 'direct', observedAtMs: 0 }),
    store.execute('pet-1', { type: 'consumeMeal', commandId: 'm2', mealId: 'm2', mode: 'auto', observedAtMs: 0 }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await store.loadPet('pet-1')).food, 0);
  assert.equal((await store.loadPet('pet-1')).totalExpUnits, 15_000_000);
});

test('pending intent survives store reload and disappears only with committed command', async () => {
  const { db, store } = await setup();
  const command = { type: 'consumeMeal', commandId: 'pending', mealId: 'p1', mode: 'direct', observedAtMs: 0 };
  await store.savePending('pet-1', command);
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  assert.deepEqual(await reloaded.listPending('pet-1'), [command]);
  await reloaded.execute('pet-1', command);
  assert.deepEqual(await reloaded.listPending('pet-1'), []);
});

test('corrupt saved bytes are reported and never overwritten by commands or createPet', async () => {
  const { db, store } = await setup();
  await db.runAsync('UPDATE pet_snapshot SET state_json = ? WHERE pet_id = ?', ['{broken', 'pet-1']);
  await assert.rejects(store.loadPet('pet-1'), CorruptSnapshotError);
  await assert.rejects(store.execute('pet-1', { type: 'interact', commandId: 'touch', kind: 'touch' }), CorruptSnapshotError);
  await assert.rejects(store.createPet(initialPet('pet-1', 'other', 'reserved', 0, DEV_GAME_CONFIG)), CorruptSnapshotError);
  assert.equal((await db.getFirstAsync('SELECT state_json FROM pet_snapshot WHERE pet_id = ?', ['pet-1'])).state_json, '{broken');
});

test('a missing snapshot with only a creation marker cannot be recreated as another pet', async () => {
  const { db } = await setup();
  await db.runAsync('DELETE FROM pet_snapshot WHERE pet_id = ?', ['pet-1']);
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  await assert.rejects(reloaded.loadPet('pet-1'), CorruptSnapshotError);
  await assert.rejects(reloaded.createPet(initialPet('pet-1', '새이름', 'reserved', 0, DEV_GAME_CONFIG)), CorruptSnapshotError);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['pet-1'])).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_snapshot WHERE pet_id = ?', ['pet-1'])).count, 0);
});

test('each surviving ledger, pending command or outbox row blocks identity recreation even without marker', async () => {
  const residueCases = [
    { table: 'command_ledger', insert: 'INSERT INTO command_ledger (command_id, pet_id, command_json, result_json, config_version) VALUES (?, ?, ?, ?, ?)', params: ['old-command', 'pet-1', '{}', '{}', 'old'] },
    { table: 'meal_ledger', insert: 'INSERT INTO meal_ledger (pet_id, meal_id, command_id) VALUES (?, ?, ?)', params: ['pet-1', 'old-meal', 'old-command'] },
    { table: 'pending_command', insert: 'INSERT INTO pending_command (command_id, pet_id, command_json, created_at_ms) VALUES (?, ?, ?, ?)', params: ['old-command', 'pet-1', '{}', 0] },
    { table: 'local_outbox', insert: 'INSERT INTO local_outbox (command_id, pet_id, event_json) VALUES (?, ?, ?)', params: ['old-command', 'pet-1', '[]'] },
    { table: 'dev_purchase_ledger', insert: 'INSERT INTO dev_purchase_ledger (purchase_id, pet_id, item_id, ownership_key, coin_cost, catalog_version, committed_at_ms, result_state_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', params: ['old-purchase', 'pet-1', 'old-item', 'old-owner', 1, 'old', 0, '{}'] },
    { table: 'dev_item_ownership', insert: 'INSERT INTO dev_item_ownership (pet_id, ownership_key, purchase_id) VALUES (?, ?, ?)', params: ['pet-1', 'old-owner', 'old-purchase'] },
    { table: 'dev_sleep_benefit_ledger', insert: 'INSERT INTO dev_sleep_benefit_ledger (command_id, pet_id, game_day_id, policy_version, applied_delta, applied_at_ms, result_state_json) VALUES (?, ?, ?, ?, ?, ?, ?)', params: ['old-sleep', 'pet-1', 'old-day', 'old', 1, 0, '{}'] },
    { table: 'dev_resolution_ledger', insert: 'INSERT INTO dev_resolution_ledger (pet_id, slot, resolution_id, decision, policy_id, policy_version, record_json) VALUES (?, ?, ?, ?, ?, ?, ?)', params: ['pet-1', 'old-slot', 'old-resolution', 'DEC-03', 'old-policy', 'old-version', '{}'] },
  ];
  for (const residue of residueCases) {
    const { db } = await setup();
    await db.runAsync(residue.insert, residue.params);
    await db.runAsync('DELETE FROM pet_snapshot WHERE pet_id = ?', ['pet-1']);
    await db.runAsync('DELETE FROM pet_registry WHERE pet_id = ?', ['pet-1']);
    const before = await db.getAllAsync(`SELECT * FROM ${residue.table} WHERE pet_id = ?`, ['pet-1']);
    const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
    await assert.rejects(reloaded.loadPet('pet-1'), CorruptSnapshotError, residue.table);
    await assert.rejects(reloaded.createPet(initialPet('pet-1', '새이름', 'reserved', 0, DEV_GAME_CONFIG)), CorruptSnapshotError, residue.table);
    await assert.rejects(reloaded.execute('pet-1', { type: 'interact', commandId: `new-${residue.table}`, kind: 'greet' }), CorruptSnapshotError, residue.table);
    if (residue.table === 'pending_command') {
      await assert.rejects(reloaded.listPending('pet-1'), CorruptSnapshotError);
      await assert.rejects(reloaded.cancelPending('old-command'), CorruptSnapshotError);
    }
    assert.deepEqual(await db.getAllAsync(`SELECT * FROM ${residue.table} WHERE pet_id = ?`, ['pet-1']), before);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_snapshot WHERE pet_id = ?', ['pet-1'])).count, 0);
  }
});

test('unreleased schema v1 migration backfills markers and sync metadata from existing rows', async () => {
  const { db, store } = await setup();
  await store.execute('pet-1', { type: 'interact', commandId: 'old', kind: 'greet' });
  await db.execAsync('DROP TABLE pet_registry; PRAGMA user_version = 1');
  await store.migrate();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 5);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['pet-1'])).count, 1);
  assert.equal((await store.loadPet('pet-1')).revision, 1);
  await db.execAsync('DROP TABLE pet_registry; PRAGMA user_version = 1');
  await db.runAsync('DELETE FROM pet_snapshot WHERE pet_id = ?', ['pet-1']);
  await store.migrate();
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['pet-1'])).count, 1);
  await assert.rejects(store.loadPet('pet-1'), CorruptSnapshotError);
  await assert.rejects(store.createPet(initialPet('pet-1', '새이름', 'reserved', 0, DEV_GAME_CONFIG)), CorruptSnapshotError);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger WHERE pet_id = ?', ['pet-1'])).count, 1);
});

test('v2 to v5 migration failure preserves original schema and rows, then retries cleanly', async () => {
  const db = new NodeSqliteAdapter();
  const state = initialPet('pet-legacy', '보존', 'reserved', 0, DEV_GAME_CONFIG);
  const stateJson = JSON.stringify(state);
  await db.execAsync(`
    CREATE TABLE pet_snapshot (pet_id TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL, state_json TEXT NOT NULL, config_version TEXT NOT NULL);
    CREATE TABLE command_ledger (command_id TEXT PRIMARY KEY NOT NULL, pet_id TEXT NOT NULL, command_json TEXT NOT NULL, result_json TEXT NOT NULL, config_version TEXT NOT NULL);
    CREATE TABLE meal_ledger (pet_id TEXT NOT NULL, meal_id TEXT NOT NULL, command_id TEXT NOT NULL UNIQUE, PRIMARY KEY (pet_id, meal_id));
    CREATE TABLE local_outbox (sequence INTEGER PRIMARY KEY AUTOINCREMENT, command_id TEXT NOT NULL UNIQUE, pet_id TEXT NOT NULL, event_json TEXT NOT NULL);
    CREATE TABLE pending_command (command_id TEXT PRIMARY KEY NOT NULL, pet_id TEXT NOT NULL, command_json TEXT NOT NULL, created_at_ms INTEGER NOT NULL);
    CREATE TABLE pet_registry (pet_id TEXT PRIMARY KEY NOT NULL);
    PRAGMA user_version = 2;
  `);
  await db.runAsync('INSERT INTO pet_registry (pet_id) VALUES (?)', ['pet-legacy']);
  await db.runAsync('INSERT INTO pet_snapshot (pet_id, revision, state_json, config_version) VALUES (?, ?, ?, ?)', ['pet-legacy', 0, stateJson, DEV_GAME_CONFIG.version]);
  await db.runAsync('INSERT INTO command_ledger (command_id, pet_id, command_json, result_json, config_version) VALUES (?, ?, ?, ?, ?)', ['legacy-action', 'pet-legacy', '{}', '{}', DEV_GAME_CONFIG.version]);
  await db.runAsync('INSERT INTO local_outbox (command_id, pet_id, event_json) VALUES (?, ?, ?)', ['legacy-action', 'pet-legacy', '[]']);
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  db.failOn = 'ALTER TABLE local_outbox ADD COLUMN sync_status';
  await assert.rejects(store.migrate(), /injected SQLite failure/);
  db.failOn = null;
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 2);
  assert.equal((await db.getFirstAsync('SELECT state_json FROM pet_snapshot WHERE pet_id = ?', ['pet-legacy'])).state_json, stateJson);
  assert.equal((await db.getAllAsync('PRAGMA table_info(local_outbox)')).some(column => column.name === 'sync_status'), false);
  await store.migrate();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 5);
  const outbox = await db.getFirstAsync('SELECT sync_status, attempt_count FROM local_outbox WHERE command_id = ?', ['legacy-action']);
  assert.equal(outbox.sync_status, 'pending');
  assert.equal(outbox.attempt_count, 0);
  assert.deepEqual(await store.loadPet('pet-legacy'), state);
});

test('v4 to v5 resolution-ledger marker backfill rolls back on failure and retries without losing the record', async () => {
  const { db, store } = await setup();
  await db.runAsync(`
    INSERT INTO dev_resolution_ledger
      (pet_id, slot, resolution_id, decision, policy_id, policy_version, record_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, ['orphan-resolution-pet', 'first-evolution', 'resolution-1', 'DEC-08', 'synthetic-policy', '1', '{"value":"mallu"}']);
  await db.runAsync('DELETE FROM pet_registry WHERE pet_id = ?', ['orphan-resolution-pet']);
  await db.execAsync('PRAGMA user_version = 4');
  db.failOn = 'PRAGMA user_version = 5';
  await assert.rejects(store.migrate(), /injected SQLite failure/);
  db.failOn = null;
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 4);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['orphan-resolution-pet'])).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger WHERE pet_id = ?', ['orphan-resolution-pet'])).count, 1);
  await store.migrate();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 5);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['orphan-resolution-pet'])).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger WHERE pet_id = ?', ['orphan-resolution-pet'])).count, 1);
});

test('persisted activity cursor blocks source mixing, stale revision and equal-revision conflict after reload', async () => {
  const { db, store } = await setup();
  await store.execute('pet-1', activity('first', 'provider-a', 2, 500));
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  const original = await reloaded.loadPet('pet-1');
  assert.equal(original.food, 2);
  await assert.rejects(reloaded.execute('pet-1', activity('other-source', 'provider-b', 3, 1_000)), /source selection changed/);
  await assert.rejects(reloaded.execute('pet-1', activity('stale', 'provider-a', 1, 1_000)), /Stale activity revision/);
  await assert.rejects(reloaded.execute('pet-1', activity('conflict', 'provider-a', 2, 501)), /Conflicting activity revision/);
  await assert.rejects(reloaded.execute('pet-1', activity('new-connection', 'provider-a', 3, 1_000, { connectedAtMs: 2_000, interval: { startUtcMs: 2_000, endUtcMs: 10_000 } })), /source selection changed/);
  assert.deepEqual(await reloaded.loadPet('pet-1'), original);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger')).count, 1);
  const duplicateAggregate = await reloaded.execute('pet-1', activity('same-revision-new-command', 'provider-a', 2, 500));
  assert.equal(duplicateAggregate.currentState.food, 2);
  assert.equal(duplicateAggregate.currentState.coin, 5);
});

test('connection and eligible interval are checked again in SQLite transaction, with rollback on fault', async () => {
  const { db, store } = await setup();
  await assert.rejects(store.execute('pet-1', activity('pre-connection', 'provider-a', 1, 500, { connectedAtMs: 2_000 })), /outside eligible interval/);
  await assert.rejects(store.execute('pet-1', activity('outside-day', 'provider-a', 1, 500, { interval: { startUtcMs: 1_000, endUtcMs: 12_000 } })), /outside eligible interval/);
  assert.equal((await store.loadPet('pet-1')).food, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger')).count, 0);
  db.failOn = 'INSERT INTO command_ledger';
  await assert.rejects(store.execute('pet-1', activity('valid', 'provider-a', 1, 500)), /injected SQLite failure/);
  db.failOn = null;
  const afterFailure = await store.loadPet('pet-1');
  assert.equal(afterFailure.food, 1);
  assert.deepEqual(afterFailure.activityByDay, {});
  const reloaded = new LocalPetStore(db, DEV_GAME_CONFIG);
  const committed = await reloaded.execute('pet-1', activity('valid', 'provider-a', 1, 500));
  assert.equal(committed.currentState.food, 2);
  assert.equal(committed.currentState.activityByDay['2026-09-19'].providerId, 'provider-a');
});

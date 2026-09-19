// @ts-nocheck -- Node's built-in SQLite is only the integration test adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initialPet } from '../../src/domain/model';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { LocalPetStore } from '../../src/storage/sqlite';
import { DevLifeService } from '../../src/application/devLifeService';
import { prepareDevSleepFixture } from '../../src/application/devSleepFixture';
import { devWidgetSnapshotReader, readDevWidgetPreview } from '../../src/application/devWidgetPreview';
import { NotConfiguredSleepProvider, SYNTHETIC_SLEEP_FIXTURES, SyntheticSleepProvider } from '../../src/sleep';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) { return this.native.prepare(sql).run(...params); }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
}

async function setup() {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  await store.createPet({ ...initialPet('pet-1', '구름', 'reserved', 0, DEV_GAME_CONFIG), food: 1 });
  return { db, service: new DevLifeService(store, db, 'pet-1') };
}

test('FR-6: selected synthetic score changes only subsequent consumed meal EXP through SQLite', async () => {
  for (const [dayId, expectedMultiplier, expectedExpUnits] of [
    ['fixture-null', 1, 15_000_000], ['fixture-0', 0.7, 10_500_000],
    ['fixture-70', 1, 15_000_000], ['fixture-100', 1.5, 22_500_000],
  ]) {
    const { db, service } = await setup();
    const prepared = await prepareDevSleepFixture(new SyntheticSleepProvider(SYNTHETIC_SLEEP_FIXTURES), dayId);
    assert.equal(prepared.status, 'ready');
    const before = await service.currentState();
    const afterFixture = await service.setSleepMultiplierFixture(0, `sleep:${dayId}`, prepared.growthMultiplier);
    assert.equal(afterFixture.sleepGrowthMultiplier, expectedMultiplier);
    assert.equal(afterFixture.totalExpUnits, before.totalExpUnits);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 0);
    const fed = await service.feedDirect(0, `meal:${dayId}`);
    assert.equal(fed.food, 0);
    assert.equal(fed.totalExpUnits, expectedExpUnits);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 1);
    assert.equal((await service.readJournal()).filter(entry => entry.event.type === 'MealConsumed').length, 1);
  }
});

test('FR-6: unavailable/error/unconfigured preserve the existing multiplier and issue zero commands', async () => {
  const { db, service } = await setup();
  await service.setSleepMultiplierFixture(0, 'confirmed-dev-fixture', 1.5);
  const beforeCount = (await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger')).count;
  const cases = [
    [new SyntheticSleepProvider(SYNTHETIC_SLEEP_FIXTURES), 'missing-day', 'unavailable'],
    [{ async getScore() { return { status: 'error' }; } }, 'error-day', 'error'],
    [new NotConfiguredSleepProvider(), 'real-day', 'decision_required'],
  ];
  for (const [provider, dayId, status] of cases) {
    const prepared = await prepareDevSleepFixture(provider, dayId);
    assert.equal(prepared.status, status);
    assert.equal((await service.currentState()).sleepGrowthMultiplier, 1.5);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger')).count, beforeCount);
  }
});

test('FR-12: DEV preview read and open_app action do not alter SQLite state or ledgers', async () => {
  const { db, service } = await setup();
  const before = await service.currentState();
  for (const scenario of ['ready', 'stale', 'missing', 'error', 'unsupported']) {
    const reader = devWidgetSnapshotReader(service, 2_000, scenario);
    const view = await readDevWidgetPreview(reader, scenario, 2_000);
    assert.equal(view.status, scenario);
    assert.equal(view.action.type, 'open_app');
  }
  assert.deepEqual(await service.currentState(), before);
  for (const table of ['command_ledger', 'meal_ledger', 'local_outbox']) {
    assert.equal((await db.getFirstAsync(`SELECT COUNT(*) AS count FROM ${table}`)).count, 0, table);
  }
});

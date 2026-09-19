// @ts-nocheck -- Node SQLite adapter mirrors the Expo async surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { SqliteServerConfirmedRecoveryStore } from '../../src/storage/serverRecovery';
import { LocalPetStore } from '../../src/storage/sqlite';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); this.failOn = null; }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) {
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected SQLite failure');
    return this.native.prepare(sql).run(...params);
  }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail; let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous; this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
}

async function setup() {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG, { deviceId: 'device-a', deviceEpoch: 1 });
  await pets.migrate();
  await pets.createPet({ ...initialPet('pet-1', '로컬', 'reserved', 0, DEV_GAME_CONFIG), coin: 9 });
  await pets.execute('pet-1', { type: 'interact', commandId: 'local-before-recovery', kind: 'observe' });
  const checkpoint = {
    petId: 'pet-1', state: { ...initialPet('pet-1', '서버', 'reserved', 0, DEV_GAME_CONFIG), coin: 3 },
    confirmedActionIds: ['server-action'], confirmedAtMs: 500, serverRevision: 4,
    configVersion: DEV_GAME_CONFIG.version,
  };
  return { db, pets, checkpoint, recovery: new SqliteServerConfirmedRecoveryStore(db, DEV_GAME_CONFIG) };
}

test('recovery atomically restores confirmed state and preserves unconfirmed rows as non-merging conflicts', async () => {
  const { db, pets, checkpoint, recovery } = await setup();
  const restored = await recovery.restore('recover-1', checkpoint);
  assert.deepEqual(restored.preservedActionIds, ['local-before-recovery']);
  assert.deepEqual(await pets.loadPet('pet-1'), checkpoint.state);
  const conflict = await db.getFirstAsync(
    'SELECT sync_status, last_error_code FROM local_outbox WHERE command_id = ?', ['local-before-recovery'],
  );
  assert.equal(conflict.sync_status, 'conflict');
  assert.equal(conflict.last_error_code, 'server_confirmed_recovery_unmerged');
  assert.deepEqual(await recovery.load('pet-1'), restored);

  await pets.execute('pet-1', { type: 'interact', commandId: 'new-epoch-action', kind: 'greet' });
  const afterNewAction = await pets.loadPet('pet-1');
  assert.deepEqual(await recovery.restore('recover-1', checkpoint), restored, 'exact replay uses the original preserved set');
  assert.deepEqual(await pets.loadPet('pet-1'), afterNewAction, 'replay cannot overwrite post-recovery work');
  assert.equal((await db.getFirstAsync('SELECT sync_status FROM local_outbox WHERE command_id = ?', ['new-epoch-action'])).sync_status, 'pending');
});

test('checkpoint ledger failure rolls back snapshot replacement and conflict classification', async () => {
  const { db, pets, checkpoint, recovery } = await setup();
  const before = await pets.loadPet('pet-1');
  db.failOn = 'INSERT INTO local_sync_checkpoint';
  await assert.rejects(recovery.restore('recover-failure', checkpoint), /injected SQLite failure/);
  db.failOn = null;
  assert.deepEqual(await pets.loadPet('pet-1'), before);
  assert.equal((await db.getFirstAsync('SELECT sync_status FROM local_outbox WHERE command_id = ?', ['local-before-recovery'])).sync_status, 'pending');
  assert.equal(await recovery.load('pet-1'), null);
});

test('older checkpoints and authority event reuse fail without changing the latest recovery', async () => {
  const { pets, checkpoint, recovery } = await setup();
  await recovery.restore('recover-1', checkpoint);
  await assert.rejects(recovery.restore('recover-older', {
    ...checkpoint, confirmedAtMs: 499, serverRevision: 3,
  }), /moved backwards/);
  await assert.rejects(recovery.restore('recover-1', {
    ...checkpoint, confirmedAtMs: 501,
  }), /replay mismatch/);
  assert.deepEqual(await pets.loadPet('pet-1'), checkpoint.state);
});

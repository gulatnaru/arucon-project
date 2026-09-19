// @ts-nocheck -- Node SQLite adapter mirrors the Expo async surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { LocalPetStore } from '../../src/storage/sqlite';
import { SqliteSyncRegistrationStore } from '../../src/storage/syncRegistration';
import { bootstrapSyntheticLocalWriter, DurableSyncStatusReader } from '../../src/sync/bootstrap';
import {
  DurableLocalWriteAuthorityGuard,
  ReadOnlyWriterError,
  WriterRegistrationRequiredError,
} from '../../src/sync/writeGuard';

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
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG);
  await pets.migrate();
  await pets.createPet(initialPet('pet-1', '구름', 'reserved', 0, DEV_GAME_CONFIG));
  return { db, registrations: new SqliteSyncRegistrationStore(db) };
}

test('writer access survives store recreation and known fencing blocks mutation guards', async () => {
  const { db, registrations } = await setup();
  const active = {
    accountId: 'account-1', petId: 'pet-1', deviceId: 'device-a', deviceEpoch: 7,
    access: 'active_writer', authorityEventId: 'bootstrap-1', updatedAtMs: 100,
  };
  await registrations.record(active);
  await new DurableLocalWriteAuthorityGuard(new SqliteSyncRegistrationStore(db)).assertCanCommit('pet-1');
  await registrations.record({ ...active, access: 'read_only_fenced', authorityEventId: 'handoff-1', updatedAtMs: 200 });
  const reloaded = new DurableLocalWriteAuthorityGuard(new SqliteSyncRegistrationStore(db));
  await assert.rejects(reloaded.assertCanCommit('pet-1'), ReadOnlyWriterError);
  await assert.rejects(reloaded.assertCanCommit('unknown-pet'), WriterRegistrationRequiredError);
});

test('registration replay is exact and stale or same-epoch reactivation is rejected', async () => {
  const { registrations } = await setup();
  const active = {
    accountId: 'account-1', petId: 'pet-1', deviceId: 'device-a', deviceEpoch: 7,
    access: 'active_writer', authorityEventId: 'bootstrap-1', updatedAtMs: 100,
  };
  await registrations.record(active);
  await registrations.record(active);
  await assert.rejects(registrations.record({ ...active, updatedAtMs: 101 }), /replay mismatch/);
  await registrations.record({ ...active, access: 'read_only_fenced', authorityEventId: 'handoff-1', updatedAtMs: 200 });
  await assert.rejects(registrations.record({ ...active, authorityEventId: 'reactivate', updatedAtMs: 201 }), /newer epoch/);
  await assert.rejects(registrations.record({ ...active, deviceEpoch: 6, access: 'read_only_fenced', authorityEventId: 'stale', updatedAtMs: 202 }), /Stale/);
});

test('bootstrap registers an unchanged legacy snapshot and never reactivates a persisted fence', async () => {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG);
  await pets.migrate();
  const state = initialPet('pet-1', '기존이름', 'reserved', 0, DEV_GAME_CONFIG);
  await pets.createPet(state);
  const input = {
    accountId: 'account-1', deviceId: 'device-a', deviceEpoch: 7,
    access: 'active_writer', authorityEventId: 'bootstrap-1', updatedAtMs: 100,
  };
  const first = await bootstrapSyntheticLocalWriter(db, pets, state, input);
  assert.equal(first.registration.access, 'active_writer');
  assert.deepEqual(await pets.loadPet('pet-1'), state);
  const registrations = new SqliteSyncRegistrationStore(db);
  await registrations.record({ ...first.registration, access: 'read_only_fenced', authorityEventId: 'handoff-1', updatedAtMs: 200 });
  const restarted = await bootstrapSyntheticLocalWriter(db, pets, state, input);
  assert.equal(restarted.registration.access, 'read_only_fenced');
  await assert.rejects(restarted.writeGuard.assertCanCommit('pet-1'), ReadOnlyWriterError);
  assert.deepEqual(await pets.loadPet('pet-1'), state);
});

test('new pet and writer registration commit together and injected registration failure rolls both back', async () => {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG);
  await pets.migrate();
  const state = initialPet('new-pet', '새펫', 'reserved', 0, DEV_GAME_CONFIG);
  const input = {
    accountId: 'account-1', deviceId: 'device-a', deviceEpoch: 0,
    access: 'active_writer', authorityEventId: 'bootstrap-1', updatedAtMs: 100,
  };
  db.failOn = 'INSERT INTO local_sync_registration';
  await assert.rejects(bootstrapSyntheticLocalWriter(db, pets, state, input), /injected SQLite failure/);
  db.failOn = null;
  assert.equal(await pets.loadPet('new-pet'), null);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['new-pet'])).count, 0);
  const bootstrapped = await bootstrapSyntheticLocalWriter(db, pets, state, input);
  assert.equal(bootstrapped.registration.deviceId, 'device-a');
  assert.deepEqual(await pets.loadPet('new-pet'), state);
});

test('restart status reader uses durable registration and queue summary without a live authority', async () => {
  const { registrations } = await setup();
  await registrations.record({
    accountId: 'account-1', petId: 'pet-1', deviceId: 'device-a', deviceEpoch: 7,
    access: 'read_only_fenced', authorityEventId: 'handoff-1', updatedAtMs: 200,
  });
  const queue = {
    async summary() {
      return { status: 'conflict', pendingCount: 0, errorCount: 0, conflictCount: 2, lastAcknowledgedAtMs: 150, lastAckSequence: 9 };
    },
  };
  const status = await new DurableSyncStatusReader(queue, registrations).read('pet-1');
  assert.deepEqual(status, {
    status: 'conflict', writerAccess: 'read_only_fenced', pendingCount: 0, errorCount: 0, conflictCount: 2,
    lastServerConfirmedAtMs: 150, explanation: 'conflict_preserved_not_merged',
  });
});

test('registration IDs reject whitespace and control characters before writing a new snapshot', async () => {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG);
  await pets.migrate();
  const state = initialPet('new-pet', '새펫', 'reserved', 0, DEV_GAME_CONFIG);
  await assert.rejects(pets.createPetWithSyncRegistration(state, {
    accountId: ' account-1', deviceId: 'device-a', deviceEpoch: 0,
    access: 'active_writer', authorityEventId: 'bootstrap-1', updatedAtMs: 100,
  }), /Invalid sync account ID/);
  assert.equal(await pets.loadPet('new-pet'), null);
});

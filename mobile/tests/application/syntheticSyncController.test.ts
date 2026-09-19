// @ts-nocheck -- Node SQLite adapter mirrors the Expo async surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createLocalSyntheticSyncController, SyntheticAuthorityUnavailableError } from '../../src/application/syntheticSyncController';
import { ApprovedMvpService } from '../../src/application/approvedMvpService';
import { APPROVED_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { LocalPetStore } from '../../src/storage/sqlite';
import { ReadOnlyWriterError } from '../../src/sync/writeGuard';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) { return this.native.prepare(sql).run(...params); }
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

const scope = { accountId: 'local-preview-account', deviceId: 'local-preview-device' };

test('fresh local synthetic composition flushes allowlisted projections then explicitly fences on handoff', async () => {
  const db = new NodeSqliteAdapter();
  const clock = { value: 1_000 };
  const state = { ...initialPet('pet-1', '구름', 'reserved', 0, APPROVED_GAME_CONFIG), coin: 100 };
  const controller = await createLocalSyntheticSyncController({ db, state, ...scope, nowMs: () => clock.value });
  assert.equal(controller.runtime.authority, 'in_process_fake');
  assert.deepEqual(controller.writer, { deviceId: scope.deviceId, deviceEpoch: 0 });

  const pets = new LocalPetStore(db, APPROVED_GAME_CONFIG, controller.writer);
  const approved = await ApprovedMvpService.initialize(db, {
    petId: 'pet-1', givenName: '구름', personalityProfileId: 'reserved', createdAtMs: 0,
    writeGuard: controller.writeGuard, outboxWriter: controller.writer,
  });
  await approved.purchaseCoinItem({ purchaseId: 'approved-table', itemId: 'table', committedAtMs: 1_000 });
  await pets.execute('pet-1', {
    type: 'applyEvolutionForm', commandId: 'approved-form', policyVersion: APPROVED_GAME_CONFIG.version, formId: 'mallu',
  });
  await pets.execute('pet-1', { type: 'sleep', commandId: 'approved-sleep' });
  assert.equal((await controller.status()).pendingCount, 3, 'approved purchase, growth, and display-state actions carry the writer identity');
  for (let index = 0; index < 3; index++) {
    assert.deepEqual(await controller.flush(), { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  }
  assert.equal((await controller.status()).explanation, 'last_sync_confirmed');

  const result = await controller.handoff('handoff-1', 'local-preview-target');
  assert.equal(result.transfer.activeWriter.deviceEpoch, 1);
  assert.equal(result.status.writerAccess, 'read_only_fenced');
  assert.equal(result.transfer.checkpoint.state.coin, 40);
  assert.equal(result.transfer.checkpoint.state.tableInstalled, true);
  assert.equal(result.transfer.checkpoint.state.formId, 'mallu');
  assert.equal(result.transfer.checkpoint.state.sleeping, true);
  assert.deepEqual(result.transfer.checkpoint.confirmedActionIds, ['approved-table', 'approved-form', 'approved-sleep']);
  assert.match(result.notice, /실제 서버 이전 결과가 아니/);
  await assert.rejects(controller.writeGuard.assertCanCommit('pet-1'), ReadOnlyWriterError);

  const restarted = await createLocalSyntheticSyncController({
    db, state: await pets.loadPet('pet-1'), ...scope, nowMs: () => clock.value,
  });
  assert.equal(restarted.runtime.authority, 'unavailable_after_restart');
  assert.equal((await restarted.status()).writerAccess, 'read_only_fenced');
  await assert.rejects(restarted.flush(), SyntheticAuthorityUnavailableError);
  await assert.rejects(restarted.handoff('handoff-2', 'another-target'), SyntheticAuthorityUnavailableError);
});

test('restart never recreates an active fake authority and preserves pending outbox rows', async () => {
  const db = new NodeSqliteAdapter();
  const state = initialPet('pet-1', '구름', 'reserved', 0, APPROVED_GAME_CONFIG);
  const first = await createLocalSyntheticSyncController({ db, state, ...scope, nowMs: () => 1_000 });
  const pets = new LocalPetStore(db, APPROVED_GAME_CONFIG, first.writer);
  await pets.execute('pet-1', { type: 'interact', commandId: 'pending-before-restart', kind: 'greet' });

  const restarted = await createLocalSyntheticSyncController({
    db, state: await pets.loadPet('pet-1'), ...scope, nowMs: () => 2_000,
  });
  assert.equal(restarted.runtime.authority, 'unavailable_after_restart');
  assert.equal((await restarted.status()).pendingCount, 1);
  await assert.rejects(restarted.flush(), SyntheticAuthorityUnavailableError);
  assert.equal((await db.getFirstAsync(
    'SELECT sync_status FROM local_outbox WHERE command_id = ?', ['pending-before-restart'],
  )).sync_status, 'pending');
});

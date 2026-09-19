// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { SyntheticAccessAuthority, createSyntheticAccessFixture } from '../../src/auth/syntheticAccess';
import { buildSyntheticOutboundEnvelope } from '../../src/privacy/outbound';
import { LocalPetStore } from '../../src/storage/sqlite';
import { SqliteSyncQueue } from '../../src/storage/syncQueue';
import { SyncCoordinator } from '../../src/sync/coordinator';
import { planServerConfirmedRecovery } from '../../src/sync/recovery';
import { CappedExponentialRetryPolicy } from '../../src/sync/retryPolicy';
import { SyntheticIdempotentServer } from '../../src/sync/syntheticServer';

class NodeSqliteAdapter {
  constructor() {
    this.native = new DatabaseSync(':memory:');
    this.tail = Promise.resolve();
  }
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

const writer = { deviceId: 'synthetic-device-a', deviceEpoch: 7 };
const retryPolicy = new CappedExponentialRetryPolicy({
  version: 'test-retry-v1', baseDelayMs: 1_000, maximumDelayMs: 8_000,
});

function coordinator(queue, transport, clock) {
  return new SyncCoordinator(queue, transport, retryPolicy, { nowMs: () => clock.value }, { unit: () => 0 });
}

function projector(petId = 'pet-1', deviceId = writer.deviceId) {
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId: 'synthetic-account', petId, deviceId, consentState: 'verified',
  }));
  const decision = authority.authorize({ accountId: 'synthetic-account', petId, deviceId, purpose: 'outbound_aggregate' });
  if (decision.status !== 'allowed') throw new Error('Synthetic outbound setup failed');
  return {
    project(record) {
      return buildSyntheticOutboundEnvelope(decision.grant, {
        kind: 'pet_projection',
        projection: {
          petId, stateRevision: record.localSequence, updatedAtMs: record.localSequence,
          formId: 'arucon', personalityProfileId: 'synthetic-profile', displayState: 'awake',
        },
      });
    },
  };
}

async function setupMeal() {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG, writer);
  await store.migrate();
  await store.createPet({ ...initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG), food: 1 });
  await store.execute('pet-1', {
    type: 'consumeMeal', commandId: 'meal-command', mealId: 'meal-1', mode: 'direct', observedAtMs: 0,
  });
  return { db, store };
}

function server(activeWriter = writer) {
  return new SyntheticIdempotentServer({
    activeWriter,
    supportedConfigVersions: [DEV_GAME_CONFIG.version],
    sequencePolicy: { kind: 'monotonic', minimumFirstLocalSequence: 1 },
    firstAckSequence: 40,
    firstConfirmedAtMs: 1_000,
  });
}

test('offline local commit remains pending until one server acknowledgement and never re-awards EXP', async () => {
  const { db, store } = await setupMeal();
  const queue = new SqliteSyncQueue(db, projector());
  const beforeSync = await store.loadPet('pet-1');
  assert.equal(beforeSync.totalExpUnits, 15_000_000);
  assert.equal((await queue.summary('pet-1')).status, 'pending');
  const clock = { value: 100 };
  const actions = await queue.listDispatchable(10, clock.value);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].actionId, 'meal-command');
  assert.equal(actions[0].envelope.payload.kind, 'pet_projection');

  const synthetic = server();
  const result = await coordinator(queue, synthetic, clock).flushOnce(10);
  assert.deepEqual(result, { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  assert.deepEqual(await store.loadPet('pet-1'), beforeSync);
  assert.equal(synthetic.committedActionCount(), 1);
  assert.deepEqual(await queue.listDispatchable(10, clock.value), []);
  assert.deepEqual(await queue.summary('pet-1'), {
    status: 'synced', pendingCount: 0, errorCount: 0, conflictCount: 0,
    lastAcknowledgedAtMs: 1_000, lastAckSequence: 40,
  });
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 1);
});

test('response loss after server commit is retried by actionId and resolves to the original acknowledgement', async () => {
  const { db, store } = await setupMeal();
  const queue = new SqliteSyncQueue(db, projector());
  const synthetic = server();
  synthetic.loseNextResponseAfterCommit('meal-command');
  const clock = { value: 100 };
  const firstCoordinator = coordinator(queue, synthetic, clock);

  assert.deepEqual(await firstCoordinator.flushOnce(10), { attempted: 1, acknowledged: 0, retryableErrors: 1, conflicts: 0 });
  assert.equal(synthetic.committedActionCount(), 1);
  assert.equal((await queue.summary('pet-1')).status, 'error');
  assert.equal((await store.loadPet('pet-1')).totalExpUnits, 15_000_000);

  assert.equal(await queue.nextRunnableAtMs(), 600);
  assert.deepEqual(await firstCoordinator.flushOnce(10), { attempted: 0, acknowledged: 0, retryableErrors: 0, conflicts: 0 });
  const durable = await db.getFirstAsync('SELECT last_attempt_at_ms, next_attempt_at_ms, retry_policy_version FROM local_outbox WHERE command_id = ?', ['meal-command']);
  assert.equal(durable.last_attempt_at_ms, 100);
  assert.equal(durable.next_attempt_at_ms, 600);
  assert.equal(durable.retry_policy_version, 'test-retry-v1');
  clock.value = 600;
  const restartedQueue = new SqliteSyncQueue(db, projector());
  assert.deepEqual(await coordinator(restartedQueue, synthetic, clock).flushOnce(10), { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  assert.equal(synthetic.committedActionCount(), 1);
  assert.equal((await store.loadPet('pet-1')).totalExpUnits, 15_000_000);
  const row = await db.getFirstAsync('SELECT sync_status, attempt_count, ack_sequence FROM local_outbox WHERE command_id = ?', ['meal-command']);
  assert.equal(row.sync_status, 'synced');
  assert.equal(row.attempt_count, 2);
  assert.equal(row.ack_sequence, 40);
});

test('a failed stream head durably blocks later actions until its acknowledgement prevents false sequence conflicts', async () => {
  const { db, store } = await setupMeal();
  await store.execute('pet-1', { type: 'interact', commandId: 'second-action', kind: 'observe' });
  const queue = new SqliteSyncQueue(db, projector());
  const synthetic = server();
  synthetic.loseNextResponseAfterCommit('meal-command');
  const clock = { value: 1_000 };
  const sync = coordinator(queue, synthetic, clock);

  assert.deepEqual((await queue.listDispatchable(10, clock.value)).map(action => action.actionId), ['meal-command']);
  assert.deepEqual(await sync.flushOnce(10), { attempted: 1, acknowledged: 0, retryableErrors: 1, conflicts: 0 });
  assert.deepEqual(await queue.listDispatchable(10, 1_499), []);
  assert.equal(await queue.nextRunnableAtMs(), 1_500);

  clock.value = 1_500;
  assert.deepEqual(await sync.flushOnce(10), { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  assert.deepEqual((await queue.listDispatchable(10, clock.value)).map(action => action.actionId), ['second-action']);
  assert.deepEqual(await sync.flushOnce(10), { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  assert.equal(synthetic.committedActionCount(), 2);
  assert.deepEqual(await queue.summary('pet-1'), {
    status: 'synced', pendingCount: 0, errorCount: 0, conflictCount: 0,
    lastAcknowledgedAtMs: 1_001, lastAckSequence: 41,
  });
});

test('acknowledgement replay is idempotent while conflicting or reused sequences preserve pending rows', async () => {
  const { db, store } = await setupMeal();
  await store.execute('pet-1', { type: 'interact', commandId: 'second-action', kind: 'observe' });
  const queue = new SqliteSyncQueue(db, projector());
  await queue.acknowledge('meal-command', 40, 1_000);
  await queue.acknowledge('meal-command', 40, 1_000);
  await assert.rejects(queue.acknowledge('meal-command', 41, 1_001), /Conflicting acknowledgement replay/);
  await assert.rejects(queue.acknowledge('second-action', 40, 1_001), /Acknowledgement sequence already belongs/);
  let second = await db.getFirstAsync('SELECT sync_status, attempt_count, ack_sequence FROM local_outbox WHERE command_id = ?', ['second-action']);
  assert.equal(second.sync_status, 'pending');
  assert.equal(second.attempt_count, 0);
  assert.equal(second.ack_sequence, null);
  await queue.acknowledge('second-action', 41, 1_001);
  second = await db.getFirstAsync('SELECT sync_status, attempt_count, ack_sequence FROM local_outbox WHERE command_id = ?', ['second-action']);
  assert.equal(second.sync_status, 'synced');
  assert.equal(second.attempt_count, 1);
  assert.equal(second.ack_sequence, 41);
});

test('synthetic inactive writer epoch becomes a preserved conflict and is not auto-merged or resent', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG, { deviceId: 'synthetic-device-old', deviceEpoch: 6 });
  await store.migrate();
  await store.createPet({ ...initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG), food: 1 });
  await store.execute('pet-1', {
    type: 'consumeMeal', commandId: 'meal-command', mealId: 'meal-1', mode: 'direct', observedAtMs: 0,
  });
  await store.execute('pet-1', { type: 'interact', commandId: 'blocked-after-conflict', kind: 'observe' });
  const inactiveQueue = new SqliteSyncQueue(db, projector('pet-1', 'synthetic-device-old'));
  const clock = { value: 100 };
  const inactiveCoordinator = coordinator(inactiveQueue, server(), clock);
  const before = await store.loadPet('pet-1');
  assert.deepEqual(await inactiveCoordinator.flushOnce(10), { attempted: 1, acknowledged: 0, retryableErrors: 0, conflicts: 1 });
  assert.deepEqual(await store.loadPet('pet-1'), before);
  assert.deepEqual(await inactiveQueue.listDispatchable(10, clock.value), []);
  assert.deepEqual(await inactiveQueue.summary('pet-1'), {
    status: 'conflict', pendingCount: 1, errorCount: 0, conflictCount: 1,
    lastAcknowledgedAtMs: null, lastAckSequence: null,
  });
  assert.equal(await inactiveQueue.nextRunnableAtMs(), null);
  const row = await db.getFirstAsync('SELECT sync_status, last_error_code FROM local_outbox WHERE command_id = ?', ['meal-command']);
  assert.equal(row.sync_status, 'conflict');
  assert.equal(row.last_error_code, 'synthetic_writer_epoch_mismatch');
  await assert.rejects(inactiveQueue.acknowledge('meal-command', 40, 1_000), /DecisionRequired: conflict row/);
  await assert.rejects(inactiveQueue.recordRetryableError('meal-command', 'synthetic_retry', 100, 600, 'test-retry-v1'), /DecisionRequired: conflict row/);
  await inactiveQueue.recordConflict('meal-command', 'synthetic_writer_epoch_mismatch');
  const preserved = await db.getFirstAsync('SELECT sync_status, attempt_count, last_error_code, ack_sequence FROM local_outbox WHERE command_id = ?', ['meal-command']);
  assert.equal(preserved.sync_status, 'conflict');
  assert.equal(preserved.attempt_count, 1);
  assert.equal(preserved.last_error_code, 'synthetic_writer_epoch_mismatch');
  assert.equal(preserved.ack_sequence, null);
  const blocked = await db.getFirstAsync('SELECT sync_status, attempt_count FROM local_outbox WHERE command_id = ?', ['blocked-after-conflict']);
  assert.equal(blocked.sync_status, 'pending');
  assert.equal(blocked.attempt_count, 0);
});

test('synthetic monotonic sequence policy rejects duplicate/reverse actions and accepts global gaps', async () => {
  const synthetic = server();
  const projection = projector();
  const base = { petId: 'pet-1', writer, configVersion: DEV_GAME_CONFIG.version };
  const envelopeFor = localSequence => projection.project({
    ...base, actionId: `sequence-${localSequence}`, localSequence,
    events: [{ type: 'InteractionObserved', kind: 'observe' }],
  });
  const zeroth = { ...base, actionId: 'sequence-0', localSequence: 0, attemptCount: 0, envelope: envelopeFor(0) };
  assert.deepEqual(await synthetic.deliver(zeroth), { kind: 'conflict', code: 'synthetic_local_sequence_out_of_order' });
  assert.equal(synthetic.committedActionCount(), 0);
  const first = { ...base, actionId: 'sequence-1', localSequence: 1, attemptCount: 0, envelope: envelopeFor(1) };
  assert.deepEqual(await synthetic.deliver(first), { kind: 'ack', actionId: 'sequence-1', ackSequence: 40, confirmedAtMs: 1_000 });
  const second = { ...base, actionId: 'sequence-2', localSequence: 2, attemptCount: 0, envelope: envelopeFor(2) };
  assert.deepEqual(await synthetic.deliver(second), { kind: 'ack', actionId: 'sequence-2', ackSequence: 41, confirmedAtMs: 1_001 });
  const fourth = { ...base, actionId: 'sequence-4', localSequence: 4, attemptCount: 0, envelope: envelopeFor(4) };
  assert.deepEqual(await synthetic.deliver(fourth), { kind: 'ack', actionId: 'sequence-4', ackSequence: 42, confirmedAtMs: 1_002 });
  const third = { ...base, actionId: 'sequence-3', localSequence: 3, attemptCount: 0, envelope: envelopeFor(3) };
  assert.deepEqual(await synthetic.deliver(third), { kind: 'conflict', code: 'synthetic_local_sequence_out_of_order' });
});

test('sync transport rejects copied envelopes that bypass the outbound privacy builder', async () => {
  const projection = projector();
  const issued = projection.project({
    actionId: 'copied', petId: 'pet-1', localSequence: 1, writer,
    configVersion: DEV_GAME_CONFIG.version, events: [],
  });
  await assert.rejects(server().deliver({
    actionId: 'copied', petId: 'pet-1', localSequence: 1, writer,
    configVersion: DEV_GAME_CONFIG.version, attemptCount: 0, envelope: { ...issued },
  }), /Valid DEV outbound envelope required/);
});

test('sync transport rejects an issued envelope after its consent authority is revoked', async () => {
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId: 'revoked-account', petId: 'pet-1', deviceId: writer.deviceId, consentState: 'verified',
  }));
  const decision = authority.authorize({
    accountId: 'revoked-account', petId: 'pet-1', deviceId: writer.deviceId, purpose: 'outbound_aggregate',
  });
  assert.equal(decision.status, 'allowed');
  if (decision.status !== 'allowed') throw new Error('Synthetic outbound setup failed');
  const envelope = buildSyntheticOutboundEnvelope(decision.grant, {
    kind: 'pet_projection',
    projection: {
      petId: 'pet-1', stateRevision: 1, updatedAtMs: 1,
      formId: 'arucon', personalityProfileId: 'synthetic-profile', displayState: 'awake',
    },
  });
  authority.revokeConsent();
  await assert.rejects(server().deliver({
    actionId: 'revoked', petId: 'pet-1', localSequence: 1, writer,
    configVersion: DEV_GAME_CONFIG.version, attemptCount: 0, envelope,
  }), /Valid DEV outbound envelope required/);
});

test('outbox rows created before writer policy configuration are preserved and cannot be uploaded with an invented epoch', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  await store.createPet(initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG));
  await store.execute('pet-1', { type: 'interact', commandId: 'local-only', kind: 'greet' });
  const queue = new SqliteSyncQueue(db, projector());
  await assert.rejects(queue.listDispatchable(10, 0), /DecisionRequired: outbox writer identity is not configured/);
  const row = await db.getFirstAsync('SELECT sync_status, device_id, device_epoch FROM local_outbox WHERE command_id = ?', ['local-only']);
  assert.equal(row.sync_status, 'pending');
  assert.equal(row.device_id, null);
  assert.equal(row.device_epoch, null);
});

test('server-confirmed recovery emits no reward and preserves unconfirmed actions without merging', async () => {
  const { store } = await setupMeal();
  const state = await store.loadPet('pet-1');
  const checkpoint = {
    petId: 'pet-1', state, confirmedActionIds: ['meal-command'], confirmedAtMs: 1_000,
    serverRevision: 4, configVersion: DEV_GAME_CONFIG.version,
  };
  assert.deepEqual(planServerConfirmedRecovery(checkpoint, []), {
    kind: 'ready', checkpoint, emitRewardEvents: false,
  });
  assert.deepEqual(planServerConfirmedRecovery(checkpoint, [{ actionId: 'offline-b' }, { actionId: 'offline-a' }, { actionId: 'offline-b' }]), {
    kind: 'server_confirmed_only', reason: 'unconfirmed_local_actions_preserved',
    preservedActionIds: ['offline-a', 'offline-b'], checkpoint, mergeLocalActions: false, emitRewardEvents: false,
  });
});

test('server-confirmed recovery marks selected local rows as durable conflicts without changing attempts or state', async () => {
  const { db, store } = await setupMeal();
  await store.execute('pet-1', { type: 'interact', commandId: 'offline-2', kind: 'observe' });
  const before = await store.loadPet('pet-1');
  const queue = new SqliteSyncQueue(db, projector());
  const ids = await queue.unconfirmedActionIds('pet-1');
  assert.deepEqual(ids, ['meal-command', 'offline-2']);
  await queue.preserveRecoveryConflicts('pet-1', ids);
  await queue.preserveRecoveryConflicts('pet-1', ids);
  assert.deepEqual(await store.loadPet('pet-1'), before);
  assert.deepEqual(await queue.summary('pet-1'), {
    status: 'conflict', pendingCount: 0, errorCount: 0, conflictCount: 2,
    lastAcknowledgedAtMs: null, lastAckSequence: null,
  });
  const rows = await db.getAllAsync('SELECT sync_status, attempt_count, last_error_code FROM local_outbox ORDER BY sequence');
  for (const row of rows) {
    assert.equal(row.sync_status, 'conflict');
    assert.equal(row.attempt_count, 0);
    assert.equal(row.last_error_code, 'server_confirmed_recovery_unmerged');
  }
});

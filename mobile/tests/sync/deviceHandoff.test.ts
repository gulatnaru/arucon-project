// @ts-nocheck -- synthetic integration uses Node SQLite and in-process grants only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createSyntheticAccessFixture, SyntheticAccessAuthority } from '../../src/auth/syntheticAccess';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { buildSyntheticOutboundEnvelope } from '../../src/privacy/outbound';
import { LocalPetStore } from '../../src/storage/sqlite';
import { SqliteServerConfirmedRecoveryStore } from '../../src/storage/serverRecovery';
import { SqliteSyncQueue } from '../../src/storage/syncQueue';
import { SqliteSyncRegistrationStore } from '../../src/storage/syncRegistration';
import { SyncCoordinator } from '../../src/sync/coordinator';
import { SyntheticSingleWriterAuthority } from '../../src/sync/deviceAuthority';
import { planServerConfirmedRecovery } from '../../src/sync/recovery';
import { CappedExponentialRetryPolicy } from '../../src/sync/retryPolicy';
import { DurableSyncStatusReader } from '../../src/sync/bootstrap';
import { SyncApplicationService } from '../../src/sync/service';
import { buildRecoveryStatusViewModel } from '../../src/sync/status';
import { SyntheticIdempotentServer } from '../../src/sync/syntheticServer';
import { DurableLocalWriteAuthorityGuard, ReadOnlyWriterError } from '../../src/sync/writeGuard';

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

const accountId = 'synthetic-account';
const petId = 'pet-1';
const oldWriter = { deviceId: 'device-old', deviceEpoch: 7 };
const retry = new CappedExponentialRetryPolicy({ version: 'fixture', baseDelayMs: 10, maximumDelayMs: 100 });

function grant(deviceId, purpose = 'pet_access', overrides = {}) {
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId, petId, deviceId, consentState: 'verified', ...overrides,
  }));
  const decision = authority.authorize({ accountId, petId, deviceId, purpose });
  if (decision.status !== 'allowed') throw new Error(`grant blocked: ${decision.reason}`);
  return { authority, grant: decision.grant };
}

function projector(deviceId) {
  const issued = grant(deviceId, 'outbound_aggregate').grant;
  return {
    project(record) {
      return buildSyntheticOutboundEnvelope(issued, {
        kind: 'pet_projection',
        projection: {
          petId, stateRevision: record.localSequence, updatedAtMs: record.localSequence,
          formId: 'arucon', personalityProfileId: 'synthetic', displayState: 'awake',
        },
      });
    },
  };
}

function coordinator(queue, server, clock) {
  return new SyncCoordinator(queue, server, retry, { nowMs: () => clock.value }, { unit: () => 0 });
}

async function setupOldDevice(food = 2) {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG, oldWriter);
  await pets.migrate();
  await pets.createPet({ ...initialPet(petId, '구름', 'reserved', 0, DEV_GAME_CONFIG), food });
  await pets.execute(petId, { type: 'consumeMeal', commandId: 'meal-1', mealId: 'meal-1', mode: 'direct', observedAtMs: 0 });
  return { db, pets, queue: new SqliteSyncQueue(db, projector(oldWriter.deviceId)) };
}

test('normal handoff requires confirmed source, is idempotent, and durably fences the old installation', async () => {
  const { db, pets, queue } = await setupOldDevice();
  const checkpoint = {
    petId, state: await pets.loadPet(petId), confirmedActionIds: ['meal-1'], confirmedAtMs: 1_000,
    serverRevision: 1, configVersion: DEV_GAME_CONFIG.version,
  };
  const authority = new SyntheticSingleWriterAuthority(accountId, petId, oldWriter, checkpoint);
  const server = new SyntheticIdempotentServer({
    writerAuthority: authority, supportedConfigVersions: [DEV_GAME_CONFIG.version],
    sequencePolicy: { kind: 'monotonic', minimumFirstLocalSequence: 1 }, firstAckSequence: 40, firstConfirmedAtMs: 1_000,
  });
  const clock = { value: 100 };
  const registrations = new SqliteSyncRegistrationStore(db);
  await registrations.record({
    accountId, petId, deviceId: oldWriter.deviceId, deviceEpoch: oldWriter.deviceEpoch,
    access: 'active_writer', authorityEventId: 'bootstrap', updatedAtMs: 1,
  });
  const app = new SyncApplicationService(
    queue, coordinator(queue, server, clock), authority, registrations,
    { accountId, petId, deviceId: oldWriter.deviceId }, () => clock.value,
  );
  const source = grant(oldWriter.deviceId).grant;
  const target = grant('device-new').grant;
  await assert.rejects(app.handoff({ handoffId: 'handoff-1', petId, sourceGrant: source, targetGrant: target }), /confirmed source/);
  assert.deepEqual(await app.flush(10), { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 });
  db.failOn = 'UPDATE local_sync_registration';
  await assert.rejects(
    app.handoff({ handoffId: 'handoff-1', petId, sourceGrant: source, targetGrant: target }),
    /injected SQLite failure/,
  );
  db.failOn = null;
  assert.deepEqual(authority.currentWriter(), oldWriter, 'failed durable fence cannot commit the prepared authority transfer');
  assert.equal((await registrations.load(petId)).access, 'active_writer');
  const transfer = await app.handoff({ handoffId: 'handoff-1', petId, sourceGrant: source, targetGrant: target });
  assert.deepEqual(transfer.activeWriter, { deviceId: 'device-new', deviceEpoch: 8 });
  assert.strictEqual(await app.handoff({ handoffId: 'handoff-1', petId, sourceGrant: source, targetGrant: target }), transfer);
  assert.equal((await registrations.load(petId)).access, 'read_only_fenced');
  assert.deepEqual(await app.status(petId, oldWriter), {
    status: 'synced', writerAccess: 'read_only_fenced', pendingCount: 0, errorCount: 0, conflictCount: 0,
    lastServerConfirmedAtMs: 1_000, explanation: 'read_only_fenced_device',
  });

  const otherTarget = grant('device-other').grant;
  await assert.rejects(app.handoff({ handoffId: 'handoff-1', petId, sourceGrant: source, targetGrant: otherTarget }), /reused/);

  // Models an old installation that was offline during the handoff and had not
  // yet persisted the fence. Its local action remains valid locally but cannot commit remotely.
  await pets.execute(petId, { type: 'interact', commandId: 'offline-after-handoff', kind: 'observe' });
  const beforeConflict = await pets.loadPet(petId);
  assert.equal(beforeConflict.totalExpUnits, 15_000_000);
  assert.deepEqual(await app.flush(10), { attempted: 1, acknowledged: 0, retryableErrors: 0, conflicts: 1 });
  assert.deepEqual(await pets.loadPet(petId), beforeConflict);
  assert.equal(server.committedActionCount(), 1);
  assert.deepEqual(await app.status(petId, oldWriter), {
    status: 'conflict', writerAccess: 'read_only_fenced', pendingCount: 0, errorCount: 0, conflictCount: 1,
    lastServerConfirmedAtMs: 1_000, explanation: 'conflict_preserved_not_merged',
  });
});

test('forced recovery activates a new epoch from server-confirmed state and old offline work stays unmerged', async () => {
  const old = await setupOldDevice();
  const confirmedState = { ...initialPet(petId, '구름', 'reserved', 0, DEV_GAME_CONFIG), food: 1 };
  const checkpoint = {
    petId, state: confirmedState, confirmedActionIds: [], confirmedAtMs: 900,
    serverRevision: 3, configVersion: DEV_GAME_CONFIG.version,
  };
  const authority = new SyntheticSingleWriterAuthority(accountId, petId, oldWriter, checkpoint);
  const server = new SyntheticIdempotentServer({
    writerAuthority: authority, supportedConfigVersions: [DEV_GAME_CONFIG.version],
    sequencePolicy: { kind: 'monotonic', minimumFirstLocalSequence: 1 }, firstAckSequence: 50, firstConfirmedAtMs: 1_100,
  });

  const targetDb = new NodeSqliteAdapter();
  const targetPets = new LocalPetStore(targetDb, DEV_GAME_CONFIG, { deviceId: 'device-recovered', deviceEpoch: 8 });
  await targetPets.migrate();
  await targetPets.createPet({ ...checkpoint.state, food: 9, coin: 77, revision: 4 });
  const targetQueue = new SqliteSyncQueue(targetDb, projector('device-recovered'));
  const targetRegistrations = new SqliteSyncRegistrationStore(targetDb);
  const targetRecovery = new SqliteServerConfirmedRecoveryStore(targetDb, DEV_GAME_CONFIG);
  const targetClock = { value: 1_200 };
  const targetApp = new SyncApplicationService(
    targetQueue, coordinator(targetQueue, server, targetClock), authority, targetRegistrations,
    { accountId, petId, deviceId: 'device-recovered' }, () => targetClock.value, targetRecovery,
  );
  const beforeFailedRecovery = await targetPets.loadPet(petId);
  targetDb.failOn = 'INSERT INTO local_sync_registration';
  await assert.rejects(
    targetApp.forceRecover({ handoffId: 'recover-1', petId, targetGrant: grant('device-recovered').grant }),
    /injected SQLite failure/,
  );
  targetDb.failOn = null;
  assert.deepEqual(authority.currentWriter(), oldWriter, 'uncommitted preparation cannot fence the old writer');
  assert.deepEqual(await targetPets.loadPet(petId), beforeFailedRecovery, 'registration failure rolls back checkpoint state');
  assert.equal(await targetRecovery.load(petId), null);
  const recovered = await targetApp.forceRecover({ handoffId: 'recover-1', petId, targetGrant: grant('device-recovered').grant });
  assert.deepEqual(recovered.transfer.activeWriter, { deviceId: 'device-recovered', deviceEpoch: 8 });
  assert.deepEqual(recovered.status, {
    status: 'server_confirmed_ready', restoredThroughMs: 900, preservedConflictCount: 0,
    mergeApplied: false, rewardEventsEmitted: false, explanation: 'restored_server_confirmed_state',
  });
  assert.deepEqual(await targetPets.loadPet(petId), checkpoint.state);
  assert.equal((await targetRecovery.load(petId)).checkpoint.confirmedAtMs, 900);
  assert.deepEqual(await new DurableSyncStatusReader(targetQueue, targetRegistrations, targetRecovery).read(petId), {
    status: 'synced', writerAccess: 'active_writer', pendingCount: 0, errorCount: 0, conflictCount: 0,
    lastServerConfirmedAtMs: 900, explanation: 'last_sync_confirmed',
  });

  const oldCoordinator = coordinator(old.queue, server, { value: 1_200 });
  assert.deepEqual(await oldCoordinator.flushOnce(10), { attempted: 1, acknowledged: 0, retryableErrors: 0, conflicts: 1 });
  const oldIds = await old.queue.unconfirmedActionIds(petId);
  const plan = planServerConfirmedRecovery(checkpoint, oldIds.map(actionId => ({ actionId })));
  assert.deepEqual(buildRecoveryStatusViewModel(plan), {
    status: 'server_confirmed_with_preserved_conflicts', restoredThroughMs: 900, preservedConflictCount: 1,
    mergeApplied: false, rewardEventsEmitted: false, explanation: 'restored_server_confirmed_state_local_changes_preserved',
  });
  assert.equal(plan.kind, 'server_confirmed_only');
  assert.equal(plan.mergeLocalActions, false);
  assert.equal((await old.pets.loadPet(petId)).totalExpUnits, 15_000_000);
});

test('handoff rejects forged, revoked, cross-account and cross-pet grants', async () => {
  const authority = new SyntheticSingleWriterAuthority(accountId, petId, oldWriter);
  const summary = {
    status: 'synced', pendingCount: 0, errorCount: 0, conflictCount: 0,
    lastAcknowledgedAtMs: null, lastAckSequence: null,
  };
  const source = grant(oldWriter.deviceId).grant;
  const revokedTarget = grant('revoked-target');
  revokedTarget.authority.revokeConsent();
  await assert.rejects(async () => authority.normalHandoff({ handoffId: 'revoked', sourceGrant: source, targetGrant: revokedTarget.grant, sourceSummary: summary }), /grant required/);
  const crossAccountAuthority = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId: 'other-account', petId, deviceId: 'other-device', consentState: 'verified',
  }));
  const cross = crossAccountAuthority.authorize({ accountId: 'other-account', petId, deviceId: 'other-device', purpose: 'pet_access' });
  if (cross.status !== 'allowed') assert.fail('expected cross-account fixture grant');
  assert.throws(() => authority.normalHandoff({ handoffId: 'cross', sourceGrant: source, targetGrant: cross.grant, sourceSummary: summary }), /account mismatch/);
  const crossPetAuthority = new SyntheticAccessAuthority(createSyntheticAccessFixture({
    accountId, petId: 'other-pet', deviceId: 'other-device', consentState: 'verified',
  }));
  const crossPet = crossPetAuthority.authorize({ accountId, petId: 'other-pet', deviceId: 'other-device', purpose: 'pet_access' });
  if (crossPet.status !== 'allowed') assert.fail('expected cross-pet fixture grant');
  assert.throws(() => authority.normalHandoff({
    handoffId: 'cross-pet', sourceGrant: source, targetGrant: crossPet.grant, sourceSummary: summary,
  }), /pet mismatch/);
  assert.throws(() => authority.normalHandoff({
    handoffId: 'forged', sourceGrant: source,
    targetGrant: { mode: 'DEV_ONLY', accountId, petId, deviceId: 'forged', purpose: 'pet_access' },
    sourceSummary: summary,
  }), /grant required/);
});

test('authority rejects malformed server checkpoints before recovery is exposed', () => {
  const state = initialPet(petId, '구름', 'reserved', 0, DEV_GAME_CONFIG);
  assert.throws(() => new SyntheticSingleWriterAuthority(accountId, petId, oldWriter, {
    petId, state, confirmedActionIds: ['same', 'same'], confirmedAtMs: 10,
    serverRevision: 1, configVersion: DEV_GAME_CONFIG.version,
  }), /Invalid server-confirmed checkpoint/);
  assert.throws(() => new SyntheticSingleWriterAuthority(accountId, petId, oldWriter, {
    petId, state: { ...state, petId: 'other-pet' }, confirmedActionIds: [], confirmedAtMs: 10,
    serverRevision: 1, configVersion: DEV_GAME_CONFIG.version,
  }), /Invalid server-confirmed checkpoint/);
});

test('live authority fence blocks commits even before the local fence observation is persisted', async () => {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG);
  await pets.migrate();
  await pets.createPet(initialPet(petId, '구름', 'reserved', 0, DEV_GAME_CONFIG));
  const registrations = new SqliteSyncRegistrationStore(db);
  await registrations.record({
    accountId, petId, deviceId: oldWriter.deviceId, deviceEpoch: oldWriter.deviceEpoch,
    access: 'active_writer', authorityEventId: 'bootstrap', updatedAtMs: 1,
  });
  const authority = new SyntheticSingleWriterAuthority(accountId, petId, oldWriter);
  authority.normalHandoff({
    handoffId: 'handoff-live-fence', sourceGrant: grant(oldWriter.deviceId).grant,
    targetGrant: grant('device-new').grant,
    sourceSummary: {
      status: 'synced', pendingCount: 0, errorCount: 0, conflictCount: 0,
      lastAcknowledgedAtMs: null, lastAckSequence: null,
    },
  });
  const durableOnly = new DurableLocalWriteAuthorityGuard(registrations);
  await durableOnly.assertCanCommit(petId);
  await assert.rejects(
    new DurableLocalWriteAuthorityGuard(registrations, authority).assertCanCommit(petId),
    ReadOnlyWriterError,
  );
});

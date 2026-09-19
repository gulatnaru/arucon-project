// @ts-nocheck -- Node's built-in SQLite adapter stands in for Expo SQLite; no renderer or device is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ApprovedMvpService } from '../../src/application/approvedMvpService';
import { createLocalSyntheticSyncController } from '../../src/application/syntheticSyncController';
import { nextSyntheticWalk, utcFixtureDay } from '../../src/application/devClock';
import { APPROVED_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { LocalPetStore } from '../../src/storage/sqlite';
import { SqliteSyncRegistrationStore } from '../../src/storage/syncRegistration';
import { ReadOnlyWriterError } from '../../src/sync/writeGuard';
import { approvedSyntheticSleepFixture, drainLocalSyntheticSync } from '../../src/presentation/approvedPresentation';

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

const PET_ID = 'dev-local-pet-1';
const ACCOUNT_ID = 'dev-preview-account';
const DEVICE_ID = 'dev-preview-device';

async function boot(db, atMs, existing = null) {
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  const state = existing ?? initialPet(PET_ID, '모노', 'reserved', atMs, APPROVED_GAME_CONFIG);
  const controller = await createLocalSyntheticSyncController({
    db, state, accountId: ACCOUNT_ID, deviceId: DEVICE_ID, nowMs: () => atMs,
  });
  const service = await ApprovedMvpService.initialize(db, {
    petId: PET_ID, givenName: state.givenName, personalityProfileId: state.personalityProfileId,
    createdAtMs: state.lastSimulatedAtMs, writeGuard: controller.writeGuard, outboxWriter: controller.writer,
  });
  return { store, controller, service };
}

test('approved App call path boots atomically and connects synthetic activity, care, growth, shop, widget and sync status', async () => {
  const db = new NodeSqliteAdapter();
  const atMs = Date.parse('2026-09-19T12:00:00.000Z');
  const runtime = await boot(db, atMs);
  const day = utcFixtureDay(atMs);
  await runtime.service.beginGameDay(day, atMs);

  let state = await runtime.service.currentState();
  for (let index = 0; index < 6; index++) {
    const prepared = await nextSyntheticWalk(state, atMs + index + 1);
    const receipt = await runtime.service.receiveActivity(prepared.activity, prepared.atMs);
    assert.equal(receipt.status, 'applied');
    state = receipt.state;
  }
  assert.equal(state.coin, 30);
  state = await runtime.service.feedDirect(atMs + 10, 'ui:feed:stable');
  assert.ok(state.totalExpUnits > 0);

  const purchase = await runtime.service.purchaseCoinItem({ purchaseId: 'ui:coin:ball:stable', itemId: 'ball', committedAtMs: atMs + 11 });
  assert.equal(purchase.currentState.coin, 0);
  assert.deepEqual(await runtime.service.readOwnedItemKeys(), ['toy:ball']);

  const growth = await runtime.service.resolveEligibleGrowth(() => 0.25);
  assert.equal(growth.state.petId, PET_ID);
  const widget = await runtime.service.readWidgetProjection(atMs + 12);
  assert.deepEqual(Object.keys(widget).sort(), ['displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs']);

  const status = await runtime.controller.status();
  assert.equal(status.writerAccess, 'active_writer');
  assert.ok(status.pendingCount > 0);
  assert.equal(status.lastServerConfirmedAtMs, null);

  const settled = await drainLocalSyntheticSync(runtime.controller);
  assert.equal(settled.pendingCount, 0);
  const handoff = await runtime.controller.handoff('ui:synthetic-handoff:stable', 'dev-preview-target-device');
  assert.equal(handoff.status.writerAccess, 'read_only_fenced');
  await assert.rejects(runtime.service.clean(atMs + 20, 'ui:clean:blocked'), ReadOnlyWriterError);
});

test('restart preserves a durable fence and approved mutations fail closed', async () => {
  const db = new NodeSqliteAdapter();
  const atMs = Date.parse('2026-09-19T12:00:00.000Z');
  const first = await boot(db, atMs);
  const registrations = new SqliteSyncRegistrationStore(db);
  await registrations.record({
    accountId: ACCOUNT_ID, petId: PET_ID, deviceId: DEVICE_ID, deviceEpoch: 1,
    access: 'read_only_fenced', authorityEventId: 'synthetic-handoff-1', updatedAtMs: atMs + 1,
  });

  const restarted = await boot(db, atMs, await first.service.currentState());
  assert.equal((await registrations.load(PET_ID)).access, 'read_only_fenced');
  await assert.rejects(
    restarted.service.interact(atMs + 2, 'ui:touch:blocked', 'touch', '2026-09-19'),
    ReadOnlyWriterError,
  );
  assert.equal((await restarted.service.currentState()).revision, (await first.service.currentState()).revision);
});

test('sleep fixture uses a completed record day at midday and midnight without moving the game clock into the future', async () => {
  for (const now of [Date.parse('2026-09-19T12:00:00.000Z'), Date.parse('2026-09-19T00:00:00.000Z')]) {
    const db = new NodeSqliteAdapter();
    const runtime = await boot(db, now);
    await runtime.service.beginGameDay(utcFixtureDay(now), now);
    const fixture = approvedSyntheticSleepFixture(now, 70);
    assert.ok(fixture.gameDay.endUtcMs <= now);

    const first = await runtime.service.applySyntheticSleep(fixture, now);
    assert.equal(first.benefitDay.startUtcMs, fixture.gameDay.endUtcMs);
    assert.equal(first.benefitApplied, true);
    assert.ok(first.state.lastSimulatedAtMs <= now);
    const firstRevision = first.state.revision;

    const second = await runtime.service.applySyntheticSleep(fixture, now);
    assert.equal(second.state.lastSimulatedAtMs, first.state.lastSimulatedAtMs);
    assert.equal(second.state.revision, firstRevision);
    assert.equal(second.state.sleepGrowthMultiplier, first.state.sleepGrowthMultiplier);
    assert.equal(second.benefitApplied, true);
  }
});

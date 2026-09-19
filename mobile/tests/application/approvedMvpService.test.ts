// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ApprovedMvpService } from '../../src/application/approvedMvpService';
import { APPROVED_GAME_CONFIG, DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { LocalPetStore } from '../../src/storage/sqlite';
import { SqliteSyncRegistrationStore } from '../../src/storage/syncRegistration';
import { DurableLocalWriteAuthorityGuard, ReadOnlyWriterError } from '../../src/sync/writeGuard';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); this.failOn = null; }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) {
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected approved MVP failure');
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

const options = { petId: 'pet-approved', givenName: '구름', personalityProfileId: 'reserved', createdAtMs: 0 };

test('initialize creates or reloads one approved pet with the default toilet', async () => {
  const db = new NodeSqliteAdapter();
  const first = await ApprovedMvpService.initialize(db, options);
  assert.equal((await first.currentState()).toiletInstalled, true);
  assert.equal(first.status.badge, '로컬 미리보기 · 건강 연결 꺼짐');
  const reloaded = await ApprovedMvpService.initialize(db, options);
  assert.equal((await reloaded.currentState()).petId, options.petId);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_snapshot')).count, 1);
});

test('legacy policy upgrade is idempotent and preserves resources, EXP, and unresolved care', async () => {
  const db = new NodeSqliteAdapter();
  const legacyStore = new LocalPetStore(db, DEV_GAME_CONFIG);
  await legacyStore.migrate();
  await legacyStore.createPet({
    ...initialPet(options.petId, '구름', 'reserved', 0, DEV_GAME_CONFIG),
    food: 25, coin: 80, totalExpUnits: 42_000_000, sleepGrowthMultiplier: 0.7,
    poopCount: 4, dirtyElapsedMs: 1_000, condition: 'low',
  });
  const service = await ApprovedMvpService.initialize(db, options);
  const upgraded = await service.currentState();
  assert.deepEqual([upgraded.food, upgraded.coin, upgraded.totalExpUnits], [25, 80, 42_000_000]);
  assert.deepEqual([upgraded.toiletInstalled, upgraded.sleepGrowthMultiplier], [true, 1]);
  assert.deepEqual([upgraded.poopCount, upgraded.condition, upgraded.dirtyElapsedMs], [4, 'low', 1_000]);
  const revision = upgraded.revision;
  assert.equal((await ApprovedMvpService.initialize(db, options).then(next => next.currentState())).revision, revision);
});

test('no-data does not lock the day; valid synthetic score applies only after prior time settlement and recovery waits for eligible wake', async () => {
  const db = new NodeSqliteAdapter();
  const service = await ApprovedMvpService.initialize(db, options);
  const hour = 3_600_000;
  const day = 24 * hour;
  const recordDay = { id: '1970-01-01', timezone: 'UTC', startUtcMs: 0, endUtcMs: day };
  await service.leaveForeground(day);
  const none = await service.applySyntheticSleep({ gameDay: recordDay, personalBaselineMinutes: 240, sessions: [] }, day);
  assert.equal(none.score.status, 'no_data');
  assert.equal(none.recovery, null);
  assert.equal(none.benefitDay.id, '1970-01-02');
  assert.equal((await service.currentState()).sleepGrowthMultiplier, 1);

  const valid = await service.applySyntheticSleep({
    gameDay: recordDay, personalBaselineMinutes: 240,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: 20 * hour, endUtcMs: day }],
  }, day);
  assert.equal(valid.score.score, 100);
  assert.equal(valid.state.sleepGrowthMultiplier, 1.25);
  assert.equal(valid.benefitApplied, true);
  assert.equal(valid.recovery, null);
  const revised = await service.applySyntheticSleep({
    gameDay: recordDay, personalBaselineMinutes: 480,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: 22 * hour, endUtcMs: day }],
  }, day);
  assert.equal(revised.score.growthMultiplier, 1.25, 'first confirmed score remains authoritative');
  await service.sleep(day, 'sleep-1');
  const woke = await service.wake(day + 4 * hour, 'wake-1');
  assert.equal(woke.stamina, APPROVED_GAME_CONFIG.source.staminaMax);
  const replay = await service.wake(day + 4 * hour, 'wake-1');
  assert.equal(replay.stamina, APPROVED_GAME_CONFIG.source.staminaMax);
  await service.sleep(day + 4 * hour, 'sleep-2');
  const secondWake = await service.wake(day + 8 * hour, 'wake-2');
  assert.equal(secondWake.stamina, APPROVED_GAME_CONFIG.source.staminaMax, 'same-day recovery is not applied twice');
});

test('new game day clears the prior bonus and qualified no-data wake recovers after a crash-safe retry', async () => {
  const db = new NodeSqliteAdapter();
  const service = await ApprovedMvpService.initialize(db, options);
  const hour = 3_600_000;
  const day = 24 * hour;
  const firstDay = { id: '1970-01-01', timezone: 'UTC', startUtcMs: 0, endUtcMs: day };
  await service.leaveForeground(day);
  await service.applySyntheticSleep({
    gameDay: firstDay, personalBaselineMinutes: 240,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: 20 * hour, endUtcMs: day }],
  }, day);
  assert.equal((await service.currentState()).sleepGrowthMultiplier, 1.25);

  const benefitDay = { id: '1970-01-02', timezone: 'UTC', startUtcMs: day, endUtcMs: 2 * day };
  const reset = await service.beginGameDay(benefitDay, day);
  assert.equal(reset.sleepGrowthMultiplier, 1.25, 'record day bonus applies during the following day');
  await service.leaveForeground(2 * day);
  assert.equal((await service.currentState()).sleepGrowthMultiplier, 1, 'bonus expires at the next UTC boundary');

  const noData = await service.applySyntheticSleep({ gameDay: benefitDay, personalBaselineMinutes: 240, sessions: [] }, 2 * day);
  assert.equal(noData.state.sleepGrowthMultiplier, 1);
  await service.sleep(2 * day, 'sleep-day-2');
  db.failOn = 'INSERT INTO dev_sleep_benefit_ledger';
  await assert.rejects(service.wake(2 * day + 4 * hour, 'wake-day-2'), /injected approved MVP failure/);
  db.failOn = null;
  assert.equal((await service.currentState()).sleeping, false, 'wake commit survives a later recovery failure');
  const retried = await service.wake(2 * day + 4 * hour, 'wake-day-2');
  assert.equal(retried.stamina, 65);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 1);

  const late = await service.applySyntheticSleep({
    gameDay: firstDay, personalBaselineMinutes: 240,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: 20 * hour, endUtcMs: day }],
  }, 2 * day + 4 * hour);
  assert.equal(late.benefitApplied, false, 'expired historical record cannot reopen an old benefit day');
});

test('journal-derived care resolves once and persists the form into the pet snapshot', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  await store.createPet({
    ...initialPet(options.petId, '구름', 'reserved', 0, APPROVED_GAME_CONFIG),
    totalExpUnits: 3_750 * APPROVED_GAME_CONFIG.proposal.expScale,
  });
  const service = await ApprovedMvpService.initialize(db, options);
  for (let day = 1; day <= 7; day++) {
    await service.interact(0, `touch-${day}`, 'touch', `2026-09-${String(day).padStart(2, '0')}`);
  }
  assert.deepEqual(await service.deriveCareProfile(), {
    observedDays: 7, activeDays: 0, restfulRoutineDays: 0, interactionDays: 7,
  });
  let randomCalls = 0;
  const resolved = await service.resolveEligibleGrowth(() => { randomCalls++; return 0.8; });
  assert.equal(resolved.sex, 'male');
  assert.equal(resolved.form?.formId, 'mallu');
  assert.equal(resolved.state.formId, 'mallu');
  assert.equal(randomCalls, 1);

  const reloaded = await ApprovedMvpService.initialize(db, options);
  const replay = await reloaded.resolveEligibleGrowth(() => { randomCalls++; return 0.1; });
  assert.equal(replay.state.formId, 'mallu');
  assert.equal(replay.sex, 'male');
  assert.equal(randomCalls, 1);
});

test('partial synthetic activity withholds new reward without reducing existing inventory', async () => {
  const db = new NodeSqliteAdapter();
  const service = await ApprovedMvpService.initialize(db, options);
  const before = await service.currentState();
  const receipt = await service.receiveActivity({
    status: 'partial', gameDayId: '2026-09-19',
    gameDay: { id: '2026-09-19', timezone: 'UTC', startUtcMs: 0, endUtcMs: 10_000 },
    selectedProviderId: 'synthetic', providerId: 'synthetic', connectedAtMs: 0,
    interval: { startUtcMs: 0, endUtcMs: 1_000 }, sourceRevision: 1, observedAtMs: 1_000,
    steps: 500, runningSteps: 0,
  }, 1_000);
  assert.equal(receipt.status, 'withheld_partial');
  assert.deepEqual([receipt.state.food, receipt.state.coin], [before.food, before.coin]);
});

test('application purchase path installs a table in the same durable coin commit', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  await store.createPet({ ...initialPet(options.petId, '구름', 'reserved', 0, APPROVED_GAME_CONFIG), coin: 100 });
  const service = await ApprovedMvpService.initialize(db, options);
  const bought = await service.purchaseCoinItem({ purchaseId: 'table-purchase', itemId: 'table', committedAtMs: 10 });
  assert.deepEqual([bought.currentState.coin, bought.currentState.tableInstalled], [40, true]);
  assert.deepEqual(await service.readOwnedItemKeys(), ['facility:table']);
  const replay = await service.purchaseCoinItem({ purchaseId: 'table-purchase', itemId: 'table', committedAtMs: 10 });
  assert.equal(replay.replayed, true);
  assert.deepEqual([replay.currentState.coin, replay.currentState.tableInstalled], [40, true]);
});

test('UTC expiry is committed before an automatic meal at the benefit-day boundary', async () => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  await store.createPet({ ...initialPet(options.petId, '구름', 'reserved', 0, APPROVED_GAME_CONFIG), coin: 60 });
  const service = await ApprovedMvpService.initialize(db, options);
  await service.purchaseCoinItem({ purchaseId: 'table-for-boundary', itemId: 'table', committedAtMs: 0 });
  const day = 86_400_000;
  await service.leaveForeground(day);
  const recordDay = { id: '1970-01-01', timezone: 'UTC', startUtcMs: 0, endUtcMs: day };
  await service.applySyntheticSleep({
    gameDay: recordDay, personalBaselineMinutes: 60,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: day - 3_600_000, endUtcMs: day }],
  }, day);
  const rewardDay = { id: '1970-01-02', timezone: 'UTC', startUtcMs: day, endUtcMs: 2 * day };
  const activity = (revision, steps, endOffset) => ({
    status: 'available' as const, gameDayId: rewardDay.id, gameDay: rewardDay,
    selectedProviderId: 'synthetic', providerId: 'synthetic', connectedAtMs: day,
    interval: { startUtcMs: day, endUtcMs: day + endOffset }, sourceRevision: revision,
    observedAtMs: day + endOffset, steps, runningSteps: 0,
  });
  await service.receiveActivity(activity(1, 500, 1_000), day + 1_000);
  const direct = await service.feedDirect(day + 1_000, 'bonus-direct');
  const afterDirectExp = direct.totalExpUnits;
  await service.receiveActivity(activity(2, 1_000, 2_000), day + 2_000);
  await service.leaveForeground(2 * day);
  const automatic = await service.setAutoFeed(2 * day, 'neutral-auto', true);
  const directDelta = afterDirectExp;
  const automaticDelta = automatic.totalExpUnits - afterDirectExp;
  assert.equal(directDelta, 9_375_000);
  assert.equal(automaticDelta, 7_500_000);
  assert.equal(automatic.sleepGrowthMultiplier, 1);
});

test('new synced pet and active registration are atomic, while a known fence remains readable', async () => {
  const db = new NodeSqliteAdapter();
  const registrations = new SqliteSyncRegistrationStore(db);
  const guard = new DurableLocalWriteAuthorityGuard(registrations);
  const registration = {
    accountId: 'synthetic-account', deviceId: 'local-device', deviceEpoch: 1,
    access: 'active_writer' as const, authorityEventId: 'authority-1', updatedAtMs: 1,
  };
  const active = await ApprovedMvpService.initialize(db, { ...options, writeGuard: guard, initialSyncRegistration: registration });
  assert.equal((await active.currentState()).toiletInstalled, true);
  assert.equal((await registrations.load(options.petId)).access, 'active_writer');

  await registrations.record({ ...registration, petId: options.petId, deviceEpoch: 2,
    access: 'read_only_fenced', authorityEventId: 'authority-2', updatedAtMs: 2 });
  const readOnly = await ApprovedMvpService.initialize(db, { ...options, writeGuard: guard });
  assert.equal((await readOnly.currentState()).petId, options.petId);
  await assert.rejects(readOnly.interact(0, 'blocked-touch', 'touch', '2026-09-19'), ReadOnlyWriterError);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_POLICY,
  FakeLocalNotificationAdapter,
  NotificationDecisionRequired,
  NotificationDeliveryConflictError,
  NotificationScopeRevokedError,
  planSyntheticLocalNotification,
  requireOperationalNotificationPolicy,
  SyntheticNotificationDispatcher,
  validateDevNotificationPolicy,
} from '../../src/notifications';
import type {
  DevNotificationPolicy,
  NotificationHistoryEntry,
  NotificationPlan,
  NotificationPlanInput,
} from '../../src/notifications';

const HOUR = 3_600_000;
const MINUTE = 60_000;
const fixturePolicy = (overrides: Partial<DevNotificationPolicy> = {}): DevNotificationPolicy => ({
  status: 'DEV_FIXTURE_ONLY',
  version: 'notification-test-fixture-v1',
  enabled: true,
  cadence: { maxAcceptedPerGameDay: 2, minIntervalMs: HOUR },
  quietHours: { startMinuteInclusive: 22 * 60, endMinuteExclusive: 7 * 60, behavior: 'defer' },
  ...overrides,
});
const fixtureInput = (overrides: Partial<NotificationPlanInput> = {}): NotificationPlanInput => ({
  petId: 'synthetic-pet-1',
  gameDayId: '2026-09-19',
  conditionId: 'food-full-revision-1',
  copyKey: 'food_full',
  nowMs: 10 * HOUR,
  localMinuteOfDay: 10 * 60,
  syntheticConsent: 'granted',
  history: [],
  ...overrides,
});
const planned = (plan: NotificationPlan) => {
  assert.equal(plan.status, 'planned');
  return plan;
};

test('operational default stays disabled and requires DEC-14', () => {
  assert.deepEqual(DEFAULT_NOTIFICATION_POLICY, {
    status: 'DECISION_REQUIRED', decision: 'DEC-14', enabled: false,
  });
  assert.throws(requireOperationalNotificationPolicy, NotificationDecisionRequired);
});

test('stable date-condition key suppresses a duplicate before dispatch', () => {
  const first = planned(planSyntheticLocalNotification(fixtureInput(), fixturePolicy()));
  const duplicate = planSyntheticLocalNotification(
    fixtureInput({ history: [first.historyEntry] }),
    fixturePolicy({ version: 'notification-test-fixture-v2' }),
  );
  assert.deepEqual(duplicate, {
    status: 'suppressed', reason: 'duplicate', notificationKey: first.request.notificationKey,
  });
  assert.match(first.request.notificationKey, /2026-09-19/);
});

test('cross-midnight quiet hours defer at the inclusive start and stop at the exclusive end', () => {
  const before = planned(planSyntheticLocalNotification(fixtureInput({ nowMs: 0, localMinuteOfDay: 21 * 60 + 59 }), fixturePolicy()));
  const start = planned(planSyntheticLocalNotification(fixtureInput({ nowMs: 0, localMinuteOfDay: 22 * 60 }), fixturePolicy()));
  const beforeEnd = planned(planSyntheticLocalNotification(fixtureInput({ nowMs: 0, localMinuteOfDay: 7 * 60 - 1 }), fixturePolicy()));
  const end = planned(planSyntheticLocalNotification(fixtureInput({ nowMs: 0, localMinuteOfDay: 7 * 60 }), fixturePolicy()));

  assert.equal(before.request.deliverAtMs, 0);
  assert.equal(before.request.deferredForQuietHours, false);
  assert.equal(start.request.deliverAtMs, 9 * HOUR);
  assert.equal(start.request.deferredForQuietHours, true);
  assert.equal(beforeEnd.request.deliverAtMs, MINUTE);
  assert.equal(end.request.deliverAtMs, 0);
  assert.equal(end.request.deferredForQuietHours, false);
});

test('injected cadence applies exact interval and per-game-day boundaries', () => {
  const first = planned(planSyntheticLocalNotification(fixtureInput({ nowMs: 0 }), fixturePolicy()));
  const tooSoon = planSyntheticLocalNotification(fixtureInput({
    nowMs: HOUR - 1,
    conditionId: 'pet-waiting-revision-1',
    copyKey: 'pet_waiting',
    history: [first.historyEntry],
  }), fixturePolicy());
  assert.equal(tooSoon.status, 'suppressed');
  if (tooSoon.status === 'suppressed') assert.equal(tooSoon.reason, 'minimum_interval');

  const exact = planned(planSyntheticLocalNotification(fixtureInput({
    nowMs: HOUR,
    conditionId: 'pet-waiting-revision-1',
    copyKey: 'pet_waiting',
    history: [first.historyEntry],
  }), fixturePolicy()));
  const fullDayHistory: NotificationHistoryEntry[] = [first.historyEntry, exact.historyEntry];
  const capped = planSyntheticLocalNotification(fixtureInput({
    nowMs: 2 * HOUR,
    conditionId: 'activity-unavailable-revision-1',
    copyKey: 'activity_unavailable',
    history: fullDayHistory,
  }), fixturePolicy());
  assert.equal(capped.status, 'suppressed');
  if (capped.status === 'suppressed') assert.equal(capped.reason, 'daily_cadence');
});

test('dispatcher retry is idempotent after an injected adapter failure', async () => {
  const adapter = new FakeLocalNotificationAdapter();
  const dispatcher = new SyntheticNotificationDispatcher(adapter);
  const plan = planned(planSyntheticLocalNotification(fixtureInput(), fixturePolicy()));
  adapter.failNextUpsert();
  await assert.rejects(dispatcher.dispatch(plan), /Injected fake delivery failure/);
  assert.equal(adapter.snapshot().length, 0);

  assert.deepEqual(await dispatcher.dispatch(plan), {
    status: 'scheduled', notificationKey: plan.request.notificationKey, replayed: false,
  });
  assert.deepEqual(await dispatcher.dispatch(plan), {
    status: 'scheduled', notificationKey: plan.request.notificationKey, replayed: true,
  });
  assert.equal(adapter.snapshot().length, 1);

  await assert.rejects(dispatcher.dispatch({
    ...plan,
    request: { ...plan.request, deliverAtMs: plan.request.deliverAtMs + MINUTE },
  }), NotificationDeliveryConflictError);
});

test('cancellation is idempotent and a retry cannot resurrect the cancelled key', async () => {
  const adapter = new FakeLocalNotificationAdapter();
  const dispatcher = new SyntheticNotificationDispatcher(adapter);
  const plan = planned(planSyntheticLocalNotification(fixtureInput(), fixturePolicy()));
  await dispatcher.dispatch(plan);
  assert.deepEqual(await dispatcher.cancel(plan.request.notificationKey), {
    status: 'cancelled', notificationKey: plan.request.notificationKey, replayed: false,
  });
  assert.deepEqual(await dispatcher.cancel(plan.request.notificationKey), {
    status: 'cancelled', notificationKey: plan.request.notificationKey, replayed: true,
  });
  assert.deepEqual(await dispatcher.dispatch(plan), {
    status: 'cancelled', notificationKey: plan.request.notificationKey, replayed: true,
  });
  assert.equal(adapter.snapshot()[0].status, 'cancelled');
});

test('scope revocation cancels pending keys and blocks future upserts only for that scope', async () => {
  const adapter = new FakeLocalNotificationAdapter();
  const dispatcher = new SyntheticNotificationDispatcher(adapter);
  const first = planned(planSyntheticLocalNotification(fixtureInput(), fixturePolicy()));
  const second = planned(planSyntheticLocalNotification(fixtureInput({
    conditionId: 'pet-waiting-revision-1', copyKey: 'pet_waiting',
  }), fixturePolicy()));
  await dispatcher.dispatch(first);
  await dispatcher.dispatch(second);

  assert.deepEqual(await dispatcher.revoke(first.request.scopeKey), {
    scopeKey: first.request.scopeKey, cancelledCount: 2, replayed: false,
  });
  assert.deepEqual(await dispatcher.revoke(first.request.scopeKey), {
    scopeKey: first.request.scopeKey, cancelledCount: 0, replayed: true,
  });
  await assert.rejects(dispatcher.dispatch(first), NotificationScopeRevokedError);

  const otherPet = planned(planSyntheticLocalNotification(fixtureInput({ petId: 'synthetic-pet-2' }), fixturePolicy()));
  assert.equal((await dispatcher.dispatch(otherPet)).status, 'scheduled');
});

test('disabled, denied and revoked plans never reach the delivery adapter', async () => {
  const adapter = new FakeLocalNotificationAdapter();
  const dispatcher = new SyntheticNotificationDispatcher(adapter);
  const disabled = planSyntheticLocalNotification(fixtureInput(), fixturePolicy({ enabled: false }));
  const denied = planSyntheticLocalNotification(fixtureInput({ syntheticConsent: 'denied' }), fixturePolicy());
  const revoked = planSyntheticLocalNotification(fixtureInput({ syntheticConsent: 'revoked' }), fixturePolicy());
  assert.equal((await dispatcher.dispatch(disabled)).status, 'not_dispatched');
  assert.equal((await dispatcher.dispatch(denied)).status, 'not_dispatched');
  assert.equal((await dispatcher.dispatch(revoked)).status, 'not_dispatched');
  assert.equal(adapter.snapshot().length, 0);
});

test('invalid DEV policy cannot become an implicit operational default', () => {
  assert.throws(() => validateDevNotificationPolicy(fixturePolicy({
    quietHours: { startMinuteInclusive: 60, endMinuteExclusive: 60, behavior: 'defer' },
  })), /Invalid DEV notification policy/);
  assert.throws(() => validateDevNotificationPolicy(fixturePolicy({
    cadence: { maxAcceptedPerGameDay: 0, minIntervalMs: HOUR },
  })), /Invalid DEV notification policy/);
  assert.throws(() => planSyntheticLocalNotification(fixtureInput({
    nowMs: HOUR,
    history: [{ notificationKey: 'future', scopeKey: 'pet:synthetic-pet-1', gameDayId: '2026-09-19', acceptedAtMs: HOUR + 1 }],
  }), fixturePolicy()), /Invalid notification history/);
});

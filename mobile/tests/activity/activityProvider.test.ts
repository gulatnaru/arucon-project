import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityStatusMessage, normalizeActivityRead, SyntheticActivityProvider,
  type ActivityRead, type GameDayWindow,
} from '../../src/activity/activityProvider';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { reducePet } from '../../src/domain/engine';
import { initialPet } from '../../src/domain/model';

const day: GameDayWindow = { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 1_000, endUtcMs: 11_000 };
const selection = { gameDay: day, selectedProviderId: 'synthetic-steps', connectedAtMs: 1_000 };
const aggregate = (sourceRevision: number, steps: number, runningSteps: number, providerId = 'synthetic-steps'): ActivityRead => ({
  status: 'available', aggregate: {
    gameDay: day, providerId, sourceRevision, intervalStartUtcMs: 1_000, intervalEndUtcMs: 10_000,
    observedAtMs: 10_000, steps, runningSteps,
  },
});

test('explicit zero differs from empty, denial, unavailable, partial and error', () => {
  const zero = normalizeActivityRead(aggregate(1, 0, 0), selection);
  assert.equal(zero.disposition, 'accepted');
  assert.equal(zero.activity?.steps, 0);
  for (const status of ['empty', 'permission_required', 'denied', 'unavailable', 'error'] as const) {
    const result = normalizeActivityRead({ status, providerId: 'synthetic-steps', gameDay: day }, selection);
    assert.equal(result.disposition, 'no_measurement');
    assert.equal(result.activity, undefined);
    assert.notEqual(activityStatusMessage(status), activityStatusMessage('available'));
  }
  const partial = normalizeActivityRead({ ...(aggregate(2, 60, 10) as Extract<ActivityRead, { aggregate: unknown }>), status: 'partial' }, selection);
  assert.equal(partial.activity?.status, 'partial');
  assert.notEqual(activityStatusMessage('empty'), activityStatusMessage('denied'));
});

test('duplicate and reordered cumulative revisions do not emit another reconciliation input', () => {
  const first = normalizeActivityRead(aggregate(2, 500, 100), selection);
  const same = normalizeActivityRead(aggregate(2, 500, 100), selection, first.cursor);
  const older = normalizeActivityRead(aggregate(1, 900, 200), selection, first.cursor);
  const newer = normalizeActivityRead(aggregate(3, 600, 150), selection, first.cursor);
  assert.equal(same.disposition, 'duplicate');
  assert.equal(older.disposition, 'stale');
  assert.equal(same.activity, undefined);
  assert.equal(older.activity, undefined);
  assert.equal(newer.activity?.steps, 600);
  assert.throws(() => normalizeActivityRead(aggregate(2, 501, 100), selection, first.cursor), /Conflicting/);
});

test('selected source and connection start block cross-source totals and old history', () => {
  assert.equal(normalizeActivityRead(aggregate(1, 500, 0, 'synthetic-other'), selection).disposition, 'blocked');
  assert.equal(normalizeActivityRead(aggregate(1, 500, 0), { ...selection, connectedAtMs: 2_000 }).disposition, 'blocked');
});

test('invalid count, interval and day metadata are rejected before domain reconciliation', () => {
  assert.throws(() => normalizeActivityRead(aggregate(1, 5, 6), selection), /Invalid activity aggregate/);
  assert.throws(() => normalizeActivityRead(aggregate(1, -1, 0), selection), /Invalid activity aggregate/);
  assert.throws(() => normalizeActivityRead(aggregate(1, 1.5, 0), selection), /Invalid activity aggregate/);
  const valid = aggregate(1, 5, 0) as Extract<ActivityRead, { aggregate: unknown }>;
  assert.throws(() => normalizeActivityRead({ status: 'available', aggregate: { ...valid.aggregate, intervalEndUtcMs: 12_000 } }, selection), /Invalid activity aggregate/);
});

test('only APP-02 reconciliation converts normalized totals to food and coin', () => {
  const accepted = normalizeActivityRead(aggregate(1, 500, 100), selection);
  const activity = accepted.activity;
  assert.ok(activity);
  assert.deepEqual(Object.keys(activity).sort(), [
    'connectedAtMs', 'gameDay', 'gameDayId', 'interval', 'observedAtMs', 'providerId',
    'runningSteps', 'selectedProviderId', 'sourceRevision', 'status', 'steps',
  ]);
  const before = initialPet('pet-test', '구름', 'dev-personality', 0, DEV_GAME_CONFIG);
  const after = reducePet(before, {
    type: 'activity', commandId: 'synthetic-1', gameDay: activity.gameDay,
    selectedProviderId: activity.selectedProviderId, providerId: activity.providerId,
    sourceRevision: activity.sourceRevision, interval: activity.interval,
    connectedAtMs: activity.connectedAtMs, observedAtMs: activity.observedAtMs,
    steps: activity.steps, runningSteps: activity.runningSteps,
  }, DEV_GAME_CONFIG).state;
  assert.equal(after.food, 1);
  assert.equal(after.coin, 5);
  assert.equal(after.totalExpUnits, before.totalExpUnits);
  assert.equal(after.stamina, before.stamina);
});

test('synthetic provider replays only its explicit frames and never reads an OS source', async () => {
  const frames: ActivityRead[] = [{ status: 'empty', providerId: 'synthetic-steps', gameDay: day }, aggregate(1, 200, 20)];
  const provider = new SyntheticActivityProvider(frames);
  assert.equal((await provider.read(day)).status, 'empty');
  assert.equal((await provider.read(day)).status, 'available');
  await assert.rejects(() => provider.read(day), /exhausted/);
});

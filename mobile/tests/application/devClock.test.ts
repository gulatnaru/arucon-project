import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { monotonicDevTime, nextSyntheticWalk, retryStableSyntheticWalk, utcFixtureDay } from '../../src/application/devClock';

test('DEV clock keeps explicit advances across wall clock rollback and reload', () => {
  assert.equal(monotonicDevTime(100, 500, 300), 500);
  assert.equal(monotonicDevTime(100, 0, 700), 700);
  assert.throws(() => monotonicDevTime(-1, 0, 0));
});

test('synthetic walk continues cumulative source revision from a persisted day cursor', async () => {
  const atMs = Date.parse('2026-09-19T12:00:00.000Z');
  const day = utcFixtureDay(atMs);
  const initial = initialPet('pet', '구름', 'reserved', atMs, DEV_GAME_CONFIG);
  const first = await nextSyntheticWalk(initial, atMs);
  assert.equal(first.activity.steps, 500);
  assert.equal(first.activity.sourceRevision, 1);
  assert.equal(first.activity.gameDayId, day.id);
  const reloaded = {
    ...initial,
    activityByDay: {
      [day.id]: {
        gameDay: day, selectedProviderId: first.activity.selectedProviderId,
        providerId: first.activity.providerId, connectedAtMs: first.activity.connectedAtMs,
        sourceRevision: first.activity.sourceRevision, interval: first.activity.interval,
        steps: first.activity.steps, runningSteps: first.activity.runningSteps, processedWeightedUnits: 1_000,
      },
    },
  };
  const second = await nextSyntheticWalk(reloaded, atMs + 1_000);
  assert.equal(second.activity.steps, 1_000);
  assert.equal(second.activity.sourceRevision, 2);
  assert.equal(second.activity.providerId, 'synthetic-dev');
});

test('an uncertain retry reuses its first normalized activity instead of granting another 500 steps', async () => {
  const atMs = Date.parse('2026-09-19T12:00:00.000Z');
  const initial = initialPet('pet', '구름', 'reserved', atMs, DEV_GAME_CONFIG);
  let reads = 0;
  const prepare = retryStableSyntheticWalk(async () => { reads++; return initial; }, atMs);
  const first = await prepare();
  const retry = await prepare();
  assert.strictEqual(retry, first);
  assert.equal(reads, 1);
  assert.equal(retry.activity.steps, 500);
  assert.equal(retry.activity.sourceRevision, 1);
});

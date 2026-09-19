import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { reducePet } from '../../src/domain/engine';
import { initialPet } from '../../src/domain/model';
import type { Command, PetState } from '../../src/domain/model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const start = () => initialPet('boundary-pet', '경계', 'reserved', 0, DEV_GAME_CONFIG);
const run = (state: PetState, command: Command) => reducePet(state, command, DEV_GAME_CONFIG);
const activity = (input: {
  id: string;
  day: string;
  dayStart: number;
  revision: number;
  steps: number;
}): Extract<Command, { type: 'activity' }> => ({
  type: 'activity', commandId: input.id,
  gameDay: { id: input.day, timezone: 'Asia/Seoul', startUtcMs: input.dayStart, endUtcMs: input.dayStart + DAY },
  selectedProviderId: 'synthetic-steps', providerId: 'synthetic-steps', connectedAtMs: 0,
  sourceRevision: input.revision,
  interval: { startUtcMs: input.dayStart, endUtcMs: input.dayStart + 1_000 },
  observedAtMs: input.dayStart + 1_000,
  steps: input.steps, runningSteps: 0,
});

test('midnight changes the source day cursor without resetting reward carry', () => {
  const dayOne = run(start(), activity({ id: 'd1', day: '2026-09-19', dayStart: 0, revision: 1, steps: 499 })).state;
  assert.equal(dayOne.food, 0);
  assert.equal(dayOne.carryFoodUnits, 998);

  const dayTwo = run(dayOne, activity({ id: 'd2', day: '2026-09-20', dayStart: DAY, revision: 1, steps: 1 })).state;
  assert.equal(dayTwo.food, 1);
  assert.equal(dayTwo.coin, 5);
  assert.equal(dayTwo.carryFoodUnits, 0);
  assert.deepEqual(Object.keys(dayTwo.activityByDay).sort(), ['2026-09-19', '2026-09-20']);
});

test('past aggregate corrections use a high-water mark and never remove or recreate rewards', () => {
  const first = run(start(), activity({ id: 'r1', day: '2026-09-19', dayStart: 0, revision: 1, steps: 1_000 })).state;
  const correctedDown = run(first, activity({ id: 'r2', day: '2026-09-19', dayStart: 0, revision: 2, steps: 100 })).state;
  assert.equal(correctedDown.food, first.food);
  assert.equal(correctedDown.coin, first.coin);
  assert.equal(correctedDown.activityByDay['2026-09-19'].processedWeightedUnits, 2_000);

  const belowHighWater = run(correctedDown, activity({ id: 'r3', day: '2026-09-19', dayStart: 0, revision: 3, steps: 999 })).state;
  assert.equal(belowHighWater.food, first.food);
  assert.equal(belowHighWater.coin, first.coin);
  const newHighWater = run(belowHighWater, activity({ id: 'r4', day: '2026-09-19', dayStart: 0, revision: 4, steps: 1_100 })).state;
  assert.equal(newHighWater.food, first.food);
  assert.equal(newHighWater.coin, first.coin + 1);
});

test('food suppressed at cap is not banked, while later fresh activity can fill a new vacancy', () => {
  const capped = { ...start(), food: DEV_GAME_CONFIG.source.foodCap };
  const suppressed = run(capped, activity({ id: 'c1', day: '2026-09-19', dayStart: 0, revision: 1, steps: 500 })).state;
  assert.equal(suppressed.food, DEV_GAME_CONFIG.source.foodCap);
  assert.equal(suppressed.carryFoodUnits, 0);

  const vacancy = { ...suppressed, food: suppressed.food - 1 };
  const replay = run(vacancy, activity({ id: 'c2', day: '2026-09-19', dayStart: 0, revision: 1, steps: 500 })).state;
  assert.equal(replay.food, vacancy.food);
  const fresh = run(replay, activity({ id: 'c3', day: '2026-09-19', dayStart: 0, revision: 2, steps: 1_000 })).state;
  assert.equal(fresh.food, DEV_GAME_CONFIG.source.foodCap);
});

test('clock rollback is rejected without mutating the prior state', () => {
  const advanced = run(start(), { type: 'foregroundExit', commandId: 'forward', toMs: 10 * HOUR }).state;
  const before = JSON.stringify(advanced);
  assert.throws(() => run(advanced, { type: 'advance', commandId: 'backward', toMs: 9 * HOUR }), /Clock moved backward/);
  assert.equal(JSON.stringify(advanced), before);
});

test('sleep, recovery and hibernation boundaries are invariant under time splitting', () => {
  const base: PetState = {
    ...start(), sleeping: true, condition: 'recovering', recoveryElapsedMs: 11 * HOUR,
    lastSimulatedAtMs: 23 * HOUR, lastForegroundAtMs: 0,
  };
  const once = run(base, { type: 'advance', commandId: 'once', toMs: DAY }).state;
  const almost = run(base, { type: 'advance', commandId: 'split-a', toMs: DAY - 1 }).state;
  const split = run(almost, { type: 'advance', commandId: 'split-b', toMs: DAY }).state;

  for (const state of [once, split]) {
    assert.equal(state.hibernating, true);
    assert.equal(state.sleeping, true);
    assert.equal(state.condition, 'recovering');
    assert.equal(state.recoveryElapsedMs, 12 * HOUR);
    assert.equal(state.stamina, 100);
    assert.equal(state.hunger, 50);
  }
  for (const key of ['poopCount', 'poopElapsedMs', 'dirtyElapsedMs', 'recoveryElapsedMs', 'condition', 'stamina', 'hunger', 'hibernating'] as const) {
    assert.equal(split[key], once[key]);
  }

  const returned = run(split, { type: 'foregroundReturn', commandId: 'return', toMs: DAY + HOUR }).state;
  assert.equal(returned.condition, 'recovering');
  assert.equal(returned.hibernating, false);
  const resumed = run(returned, { type: 'advance', commandId: 'resume', toMs: DAY + HOUR + 1 }).state;
  assert.equal(resumed.condition, 'well');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_GAME_CONFIG, SOURCE_BALANCE } from '../../src/domain/config';
import { DomainActionRejected, reducePet } from '../../src/domain/engine';
import { initialPet } from '../../src/domain/model';
import type { Command, PetState } from '../../src/domain/model';

const HOUR = 3_600_000;
const start = () => initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG);
const run = (state: PetState, command: Parameters<typeof reducePet>[1]) => reducePet(state, command, DEV_GAME_CONFIG);
const gameDay = { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 0, endUtcMs: 86_400_000 };
const activity = (commandId: string, steps: number, runningSteps: number, sourceRevision: number): Extract<Command, { type: 'activity' }> => ({
  type: 'activity', commandId, gameDay, selectedProviderId: 'synthetic-steps', providerId: 'synthetic-steps',
  connectedAtMs: 0, sourceRevision, interval: { startUtcMs: 0, endUtcMs: 1_000 }, observedAtMs: 1_000,
  steps, runningSteps,
});

test('activity rewards accrue once without EXP or stamina change, including same aggregate under a new command ID', () => {
  const first = run(start(), activity('a1', 499, 0, 1));
  assert.equal(first.state.food, 0);
  const second = run(first.state, activity('a2', 500, 0, 2));
  assert.equal(second.state.food, 1);
  assert.equal(second.state.coin, 5);
  const again = run(second.state, activity('a3', 500, 0, 2));
  assert.equal(again.state.food, 1);
  assert.equal(again.state.coin, 5);
  assert.equal(again.state.totalExpUnits, 0);
  assert.equal(again.state.stamina, 100);
});

test('lowered food cap preserves inventory above cap and coin remains payable', () => {
  const state = { ...start(), food: 20 };
  const config = { ...DEV_GAME_CONFIG, source: { ...SOURCE_BALANCE, foodCap: 15 } };
  const result = reducePet(state, activity('a1', 1_000, 0, 1), config);
  assert.equal(result.state.food, 20);
  assert.equal(result.state.coin, 10);
  assert.deepEqual(result.events[0], { type: 'ActivityRewarded', deltaFood: 0, deltaCoin: 10, suppressedFood: 2, gameDayId: '2026-09-19' });
});

test('running half-step progress carries to the next aggregate without double counting', () => {
  const first = run(start(), activity('r1', 333, 333, 1)).state;
  assert.equal(first.food, 0);
  const second = run(first, activity('r2', 334, 334, 2)).state;
  assert.equal(second.food, 1);
  assert.equal(second.carryFoodUnits, 2);
});

test('direct and opted-in auto meal share eligibility, cost and EXP, even at zero stamina', () => {
  const state = { ...start(), food: 1, hunger: 70, stamina: 0, tableInstalled: true, autoFeedOptIn: true };
  const direct = run(state, { type: 'consumeMeal', commandId: 'd', mealId: 'd', mode: 'direct', observedAtMs: 0 }).state;
  const auto = run(state, { type: 'consumeMeal', commandId: 'a', mealId: 'a', mode: 'auto', observedAtMs: 0 }).state;
  assert.deepEqual(auto, direct);
  assert.equal(auto.totalExpUnits, 7_500_000);
  assert.equal(auto.food, 0);
  assert.equal(auto.stamina, 0);
  assert.throws(() => run({ ...state, autoFeedOptIn: false }, { type: 'consumeMeal', commandId: 'no', mealId: 'no', mode: 'auto', observedAtMs: 0 }));
  assert.throws(() => run({ ...state, hunger: 0 }, { type: 'consumeMeal', commandId: 'full', mealId: 'full', mode: 'direct', observedAtMs: 0 }));
});

test('free touch, greet and observe preserve all economy and condition meters', () => {
  let state = { ...start(), food: 2, coin: 20, stamina: 19, totalExpUnits: 100 };
  for (const kind of ['touch', 'greet', 'observe'] as const) {
    const next = run(state, { type: 'interact', commandId: kind, kind }).state;
    for (const key of ['food', 'coin', 'stamina', 'totalExpUnits', 'condition', 'hunger'] as const) assert.equal(next[key], state[key]);
    state = next;
  }
});

test('meal applies source growth factors once at the pre-meal state', () => {
  const state = { ...start(), food: 1, hunger: 70, stamina: 19, poopCount: 4, condition: 'low' as const, sleepGrowthMultiplier: 0.7 };
  const result = run(state, { type: 'consumeMeal', commandId: 'low-meal', mealId: 'low-meal', mode: 'direct', observedAtMs: 0 });
  assert.equal(result.state.totalExpUnits, 1_968_750);
  assert.equal(result.state.stamina, 18);
});

test('only sustained dirty room causes low condition and cleaning permits medicine-free recovery', () => {
  const dirty = { ...start(), poopCount: 4, hunger: 100, stamina: 0 };
  const halfway = run(dirty, { type: 'foregroundReturn', commandId: 'f1', toMs: 12 * HOUR }).state;
  assert.equal(halfway.condition, 'well');
  const low = run(halfway, { type: 'advance', commandId: 't2', toMs: 24 * HOUR }).state;
  assert.equal(low.condition, 'low');
  const cleaned = run(low, { type: 'clean', commandId: 'c' }).state;
  assert.equal(cleaned.condition, 'recovering');
  const returned = run(cleaned, { type: 'foregroundReturn', commandId: 'f2', toMs: 30 * HOUR }).state;
  const well = run(returned, { type: 'advance', commandId: 't3', toMs: 36 * HOUR }).state;
  assert.equal(well.condition, 'well');
  assert.equal(well.poopCount, 2);
});

test('hibernation freezes deterioration and recovery; return does not backfill', () => {
  const state = { ...start(), condition: 'recovering' as const, recoveryElapsedMs: 2 * HOUR, lastSimulatedAtMs: 23 * HOUR };
  const hibernated = run(state, { type: 'advance', commandId: 'h', toMs: 10 * 24 * HOUR }).state;
  assert.equal(hibernated.hibernating, true);
  assert.equal(hibernated.recoveryElapsedMs, 3 * HOUR);
  const frozen = run(hibernated, { type: 'advance', commandId: 'h2', toMs: 11 * 24 * HOUR }).state;
  assert.equal(frozen.recoveryElapsedMs, hibernated.recoveryElapsedMs);
  assert.equal(frozen.poopCount, hibernated.poopCount);
  const resumed = run(frozen, { type: 'foregroundReturn', commandId: 'r', toMs: 12 * 24 * HOUR }).state;
  assert.equal(resumed.recoveryElapsedMs, frozen.recoveryElapsedMs);
  assert.equal(resumed.hibernating, false);
});

test('invalid activity aggregates are rejected without touching original state', () => {
  const state = start();
  assert.throws(() => run(state, activity('bad', 10, 11, 1)));
  assert.equal(state.revision, 0);
});

test('fixture facility, opt-in and sleep commands enable auto meal but sleeping prevents it', () => {
  let state = { ...start(), food: 1, hunger: 70 };
  state = run(state, { type: 'installFacilityFixture', commandId: 'install', facility: 'table' }).state;
  assert.throws(() => run(state, { type: 'consumeMeal', commandId: 'a0', mealId: 'a0', mode: 'auto', observedAtMs: 0 }));
  state = run(state, { type: 'setAutoFeed', commandId: 'optin', enabled: true }).state;
  state = run(state, { type: 'sleep', commandId: 'sleep' }).state;
  assert.throws(() => run(state, { type: 'consumeMeal', commandId: 'a1', mealId: 'a1', mode: 'auto', observedAtMs: 0 }));
  state = run(state, { type: 'wake', commandId: 'wake' }).state;
  state = run(state, { type: 'setSleepMultiplierFixture', commandId: 'mult', multiplier: 1.2 }).state;
  state = run(state, { type: 'consumeMeal', commandId: 'a2', mealId: 'a2', mode: 'auto', observedAtMs: 0 }).state;
  assert.equal(state.totalExpUnits, 18_000_000);
});

test('time advancement yields identical core meters when split across foreground intervals', () => {
  const one = run(start(), { type: 'advance', commandId: 'once', toMs: 11 * HOUR }).state;
  const first = run(start(), { type: 'advance', commandId: 'part1', toMs: 5 * HOUR }).state;
  const split = run(first, { type: 'advance', commandId: 'part2', toMs: 11 * HOUR }).state;
  for (const key of ['food', 'coin', 'totalExpUnits', 'poopCount', 'poopElapsedMs', 'dirtyElapsedMs', 'condition', 'hunger', 'stamina'] as const) assert.equal(split[key], one[key]);
});

test('expected meal refusals have stable reason codes and do not mutate input', () => {
  const base = { ...start(), food: 1, hunger: 70 };
  const meal = (state: PetState, mode: 'direct' | 'auto' = 'direct', observedAtMs = 0) =>
    run(state, { type: 'consumeMeal', commandId: 'refused', mealId: 'refused', mode, observedAtMs });
  const cases: [PetState, 'direct' | 'auto', number, string][] = [
    [{ ...base, food: 0 }, 'direct', 0, 'no_food'],
    [{ ...base, hunger: 0 }, 'direct', 0, 'not_hungry'],
    [{ ...base, sleeping: true }, 'direct', 0, 'sleeping'],
    [{ ...base, hibernating: true }, 'direct', 0, 'hibernating'],
    [base, 'auto', 0, 'table_required'],
    [{ ...base, tableInstalled: true }, 'auto', 0, 'auto_feed_disabled'],
    [base, 'direct', 1, 'stale_meal_state'],
  ];
  for (const [state, mode, observedAtMs, code] of cases) {
    const before = JSON.stringify(state);
    assert.throws(() => meal(state, mode, observedAtMs), error =>
      error instanceof DomainActionRejected && error.code === code);
    assert.equal(JSON.stringify(state), before);
  }
});

test('foreground exit checkpoints real use without Returned event or hibernation', () => {
  const exit = run(start(), { type: 'foregroundExit', commandId: 'exit', toMs: 25 * HOUR });
  assert.equal(exit.state.lastForegroundAtMs, 25 * HOUR);
  assert.equal(exit.state.lastSimulatedAtMs, 25 * HOUR);
  assert.equal(exit.state.hibernating, false);
  assert.ok(exit.events.every(event => event.type !== 'Returned' && event.type !== 'Hibernated'));
  const hibernated = run(exit.state, { type: 'advance', commandId: 'later', toMs: 50 * HOUR }).state;
  assert.equal(hibernated.hibernating, true);
  assert.equal(hibernated.lastForegroundAtMs, 25 * HOUR);
});

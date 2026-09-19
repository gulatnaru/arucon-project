import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_GAME_CONFIG, DEV_GAME_CONFIG } from '../../src/domain/config';
import { reducePet } from '../../src/domain/engine';
import { initialPet } from '../../src/domain/model';

test('approved upgrade preserves resources and condition while adding the default toilet', () => {
  const legacy = {
    ...initialPet('legacy', '구름', 'reserved', 0, DEV_GAME_CONFIG),
    food: 27, coin: 91, totalExpUnits: 123_000_000, sleepGrowthMultiplier: 0.7,
    poopCount: 4, condition: 'low' as const, dirtyElapsedMs: 99,
  };
  const upgraded = reducePet(legacy, {
    type: 'applyApprovedPolicyUpgrade', commandId: 'upgrade', policyVersion: APPROVED_GAME_CONFIG.version,
  }, APPROVED_GAME_CONFIG).state;
  assert.deepEqual([upgraded.food, upgraded.coin, upgraded.totalExpUnits], [27, 91, 123_000_000]);
  assert.equal(upgraded.toiletInstalled, true);
  assert.equal(upgraded.sleepGrowthMultiplier, 1);
  assert.equal(upgraded.poopCount, 4);
  assert.equal(upgraded.condition, 'low');
  assert.equal(upgraded.dirtyElapsedMs, 99);
});

test('approved sleep multiplier is bonus-only and DEV fixture commands are closed', () => {
  const state = initialPet('approved', '구름', 'reserved', 0, APPROVED_GAME_CONFIG);
  const changed = reducePet(state, {
    type: 'setSleepGrowthMultiplier', commandId: 'sleep-day',
    gameDay: { id: '2026-09-19', timezone: 'UTC', startUtcMs: 0, endUtcMs: 86_400_000 },
    recordDayId: '2026-09-18', policyVersion: APPROVED_GAME_CONFIG.version, multiplier: 1.25, confirmation: 'valid_score',
  }, APPROVED_GAME_CONFIG).state;
  assert.equal(changed.sleepGrowthMultiplier, 1.25);
  assert.throws(() => reducePet(state, {
    type: 'setSleepGrowthMultiplier', commandId: 'bad',
    gameDay: { id: '2026-09-19', timezone: 'UTC', startUtcMs: 0, endUtcMs: 86_400_000 },
    recordDayId: '2026-09-18', policyVersion: APPROVED_GAME_CONFIG.version, multiplier: 0.99, confirmation: 'valid_score',
  }, APPROVED_GAME_CONFIG), /Invalid approved sleep growth multiplier/);
  assert.throws(() => reducePet(state, {
    type: 'installFacilityFixture', commandId: 'fixture', facility: 'table',
  }, APPROVED_GAME_CONFIG), /fixture is disabled/);
});

test('approved direct and opted-in table meals remain economically identical', () => {
  const base = {
    ...initialPet('approved-meal', '구름', 'reserved', 0, APPROVED_GAME_CONFIG),
    tableInstalled: true, autoFeedOptIn: true, food: 2,
  };
  const direct = reducePet(base, {
    type: 'consumeMeal', commandId: 'direct', mealId: 'direct', mode: 'direct', observedAtMs: 0,
  }, APPROVED_GAME_CONFIG).state;
  const automatic = reducePet(base, {
    type: 'consumeMeal', commandId: 'auto', mealId: 'auto', mode: 'auto', observedAtMs: 0,
  }, APPROVED_GAME_CONFIG).state;
  for (const key of ['food', 'coin', 'totalExpUnits', 'stamina', 'hunger', 'foodsSincePoop'] as const) {
    assert.equal(automatic[key], direct[key], key);
  }
});

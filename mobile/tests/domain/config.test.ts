import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_GAME_CONFIG, requireDevFixture } from '../../src/domain/config';
import type { GameConfig } from '../../src/domain/config';
import { reducePet } from '../../src/domain/engine';
import { initialPet } from '../../src/domain/model';

const withRunning = (runningMultiplier: number): GameConfig => ({
  ...DEV_GAME_CONFIG, source: { ...DEV_GAME_CONFIG.source, runningMultiplier },
});

test('development config accepts neutral and double running multipliers with config-derived rewards', () => {
  for (const [multiplier, expectedFood] of [[1, 1], [2, 2]] as const) {
    const config = withRunning(multiplier);
    requireDevFixture(config);
    const state = initialPet('pet', '구름', 'reserved', 0, config);
    const result = reducePet(state, {
      type: 'activity', commandId: `running-${multiplier}`,
      gameDay: { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 0, endUtcMs: 86_400_000 },
      selectedProviderId: 'synthetic', providerId: 'synthetic', connectedAtMs: 0, sourceRevision: 1,
      interval: { startUtcMs: 0, endUtcMs: 1_000 }, observedAtMs: 1_000,
      steps: 500, runningSteps: 500,
    }, config);
    assert.equal(result.state.food, expectedFood);
  }
});

test('invalid multipliers, timers, food cadence and hunger reduction fail before simulation', () => {
  const invalid: GameConfig[] = [
    withRunning(0), withRunning(Number.NaN), withRunning(-1), withRunning(Infinity),
    { ...DEV_GAME_CONFIG, source: { ...DEV_GAME_CONFIG.source, foodCap: 0 } },
    { ...DEV_GAME_CONFIG, source: { ...DEV_GAME_CONFIG.source, expPerFood: Number.NaN } },
    { ...DEV_GAME_CONFIG, source: { ...DEV_GAME_CONFIG.source, staminaDrainPerFood: -1 } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, foodsPerPoop: 0 } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, poopIntervalMs: 0 } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, hibernateAfterMs: Number.NaN } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, hungerPerAwakeHour: Infinity } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, hungerReductionPerMeal: 0 } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, hungerReductionPerMeal: -1 } },
    { ...DEV_GAME_CONFIG, proposal: { ...DEV_GAME_CONFIG.proposal, initialHunger: 101 } },
  ];
  for (const config of invalid) assert.throws(() => requireDevFixture(config), /Invalid game fixture/);
});

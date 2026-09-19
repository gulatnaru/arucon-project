import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BalanceDecisionRequired, MVP_BALANCE_REGISTRY, requireBalanceDecision, validateBalanceRegistry,
} from '../../src/config/balanceRegistry';
import { DEV_GAME_CONFIG, SOURCE_BALANCE } from '../../src/domain/config';
import { DEV_SLEEP_CONFIG } from '../../src/sleep/config';
import { DEV_SHOP_CATALOG } from '../../src/shop';

test('CONFIG-01 registry is versioned and validates its source and decision boundaries', () => {
  validateBalanceRegistry(MVP_BALANCE_REGISTRY);
  assert.equal(MVP_BALANCE_REGISTRY.schemaVersion, 1);
  assert.equal(MVP_BALANCE_REGISTRY.status, 'DEV_FIXTURE_ONLY');
  assert.match(MVP_BALANCE_REGISTRY.version, /^mvp-balance-registry-v\d+$/);
  assert.throws(
    () => requireBalanceDecision(MVP_BALANCE_REGISTRY.unresolved.hungerOperational),
    (error: unknown) => error instanceof BalanceDecisionRequired && error.decisions.includes('DEC-24'),
  );
  assert.throws(
    () => requireBalanceDecision(MVP_BALANCE_REGISTRY.unresolved.sleepScorer),
    (error: unknown) => error instanceof BalanceDecisionRequired && error.decisions.includes('DEC-05'),
  );
});

test('domain compatibility exports are projections of the single registry', () => {
  const source = MVP_BALANCE_REGISTRY.source;
  assert.equal(SOURCE_BALANCE.stepsPerFood, source.activity.stepsPerFood);
  assert.equal(SOURCE_BALANCE.coinPer100Steps, source.activity.coinPer100Steps);
  assert.equal(SOURCE_BALANCE.runningMultiplier, source.activity.runningMultiplier);
  assert.equal(SOURCE_BALANCE.foodCap, source.activity.foodCap);
  assert.equal(SOURCE_BALANCE.expPerFood, source.growth.expPerFood);
  assert.equal(SOURCE_BALANCE.staminaMax, source.stamina.max);
  assert.equal(SOURCE_BALANCE.sickPoopThreshold, source.hygiene.sickPoopThreshold);
  assert.deepEqual(DEV_GAME_CONFIG.proposal, MVP_BALANCE_REGISTRY.devFixture.domain);
  assert.equal(DEV_GAME_CONFIG.version, MVP_BALANCE_REGISTRY.version);
});

test('sleep mapping and shop prices derive from the registry without approving open policy', () => {
  assert.strictEqual(DEV_SLEEP_CONFIG.curve, MVP_BALANCE_REGISTRY.source.sleep.curve);
  assert.equal(DEV_SLEEP_CONFIG.noDataMultiplier, MVP_BALANCE_REGISTRY.source.sleep.noDataMultiplier);
  assert.equal(DEV_SLEEP_CONFIG.version, MVP_BALANCE_REGISTRY.version);
  const medicine = DEV_SHOP_CATALOG.find(item => item.id === 'medicine');
  const toilet = DEV_SHOP_CATALOG.find(item => item.id === 'toilet-dev');
  const table = DEV_SHOP_CATALOG.find(item => item.id === 'table-dev');
  const furniture = DEV_SHOP_CATALOG.find(item => item.id === 'furniture-pending');
  assert.equal(medicine?.category === 'utility' && medicine.coinPrice, MVP_BALANCE_REGISTRY.source.shop.medicinePriceCoin);
  assert.equal(toilet?.category === 'utility' && toilet.coinPrice, MVP_BALANCE_REGISTRY.devFixture.shop.toiletPriceCoin);
  assert.equal(table?.category === 'utility' && table.coinPrice, MVP_BALANCE_REGISTRY.devFixture.shop.tablePriceCoin);
  assert.equal(furniture?.category === 'utility' && furniture.coinPrice, null);
  assert.deepEqual(MVP_BALANCE_REGISTRY.unresolved.toiletOperationalPrice.decisions, ['DEC-09', 'DEC-24']);
  assert.equal(MVP_BALANCE_REGISTRY.unresolved.sleepScorer.value, null);
});

test('registry containers reject accidental mutation', () => {
  assert.equal(Object.isFrozen(MVP_BALANCE_REGISTRY), true);
  assert.equal(Object.isFrozen(MVP_BALANCE_REGISTRY.source.activity), true);
  assert.equal(Object.isFrozen(MVP_BALANCE_REGISTRY.source.sleep.curve), true);
  assert.equal(Object.isFrozen(MVP_BALANCE_REGISTRY.devFixture.domain), true);
  assert.throws(() => {
    (MVP_BALANCE_REGISTRY.source.activity as unknown as { foodCap: number }).foodCap = 999;
  }, TypeError);
  assert.equal(MVP_BALANCE_REGISTRY.source.activity.foodCap, 20);
});

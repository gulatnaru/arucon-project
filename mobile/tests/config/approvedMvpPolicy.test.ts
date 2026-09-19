import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_MVP_POLICY, validateApprovedMvpPolicy } from '../../src/config/approvedMvpPolicy';
import { MVP_BALANCE_REGISTRY } from '../../src/config/balanceRegistry';
import { APPROVED_GAME_CONFIG, DEV_GAME_CONFIG, requireDevFixture, requireGameConfig } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';

test('approved policy is versioned and leaves the historical DEV registry isolated', () => {
  validateApprovedMvpPolicy(APPROVED_MVP_POLICY);
  assert.equal(APPROVED_MVP_POLICY.status, 'APPROVED');
  assert.equal(APPROVED_MVP_POLICY.healthSource, 'SYNTHETIC_LOCAL_ONLY');
  assert.equal(MVP_BALANCE_REGISTRY.status, 'DEV_FIXTURE_ONLY');
  assert.notEqual(APPROVED_GAME_CONFIG.version, DEV_GAME_CONFIG.version);
  requireGameConfig(APPROVED_GAME_CONFIG);
  assert.throws(() => requireDevFixture(APPROVED_GAME_CONFIG), /DecisionRequired/);
});

test('new approved pets start with a free toilet while DEV history remains unchanged', () => {
  const approved = initialPet('approved', '구름', 'reserved', 0, APPROVED_GAME_CONFIG);
  const historical = initialPet('dev', '구름', 'reserved', 0, DEV_GAME_CONFIG);
  assert.equal(approved.toiletInstalled, true);
  assert.equal(approved.tableInstalled, false);
  assert.equal(historical.toiletInstalled, false);
  assert.equal(approved.food, 0);
  assert.equal(approved.coin, 0);
  assert.equal(approved.totalExpUnits, 0);
});

test('approved growth policy keeps separate level 6 sex and level 16 form boundaries', () => {
  assert.deepEqual(
    [APPROVED_MVP_POLICY.growth.sexResolutionLevel, APPROVED_MVP_POLICY.growth.firstEvolutionLevel],
    [6, 16],
  );
  assert.throws(() => validateApprovedMvpPolicy({
    ...APPROVED_MVP_POLICY,
    growth: { ...APPROVED_MVP_POLICY.growth, firstEvolutionLevel: 6 },
  } as unknown as typeof APPROVED_MVP_POLICY), /Invalid approved growth policy/);
});

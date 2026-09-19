import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_SLEEP_CONFIG, validateSleepConfig } from '../../src/sleep/config';
import {
  DevSleepBenefitPolicy,
  NotConfiguredSleepProvider,
  multiplierForScore,
} from '../../src/sleep';
import type { SleepBalanceConfig } from '../../src/sleep/config';

// Arbitrary TEST_ONLY values for isolating the bonus-only policy family.
// They are not a recommendation or an approved DQ-01/DQ-02 operating curve.
const TEST_ONLY_BONUS_CONFIG: SleepBalanceConfig = Object.freeze({
  mode: 'DEV_FIXTURE_ONLY',
  version: 'test-only-bonus-family-v1',
  provenance: 'TEST_ONLY arbitrary curve; not an approved recommendation',
  noDataMultiplier: 1,
  curve: Object.freeze([
    Object.freeze({ score: 0, multiplier: 1 }),
    Object.freeze({ score: 100, multiplier: 1.25 }),
  ]),
});

const readyMultiplier = (result: ReturnType<DevSleepBenefitPolicy['resolve']>): number => {
  assert.equal(result.status, 'ready');
  return result.growthMultiplier;
};

test('TEST_ONLY bonus family is applied only through explicit config injection', () => {
  validateSleepConfig(TEST_ONLY_BONUS_CONFIG);
  const policy = new DevSleepBenefitPolicy(TEST_ONLY_BONUS_CONFIG);
  assert.deepEqual(policy.resolve({ status: 'valid', score: 0 }), {
    status: 'ready', growthMultiplier: 1, scoreStatus: 'valid', provisional: false,
  });
  assert.deepEqual(policy.resolve({ status: 'valid', score: 50 }), {
    status: 'ready', growthMultiplier: 1.125, scoreStatus: 'valid', provisional: false,
  });
  assert.deepEqual(policy.resolve({ status: 'valid', score: 100 }), {
    status: 'ready', growthMultiplier: 1.25, scoreStatus: 'valid', provisional: false,
  });
  for (const score of [0, 25, 50, 75, 100]) {
    assert.ok(multiplierForScore(score, TEST_ONLY_BONUS_CONFIG) >= 1);
  }
});

test('no_data stays neutral and score boundaries remain strict for the injected family', () => {
  const policy = new DevSleepBenefitPolicy(TEST_ONLY_BONUS_CONFIG);
  assert.deepEqual(policy.resolve({ status: 'no_data' }), {
    status: 'ready', growthMultiplier: 1, scoreStatus: 'no_data', provisional: false,
  });
  assert.equal(multiplierForScore(0, TEST_ONLY_BONUS_CONFIG), 1);
  assert.equal(multiplierForScore(100, TEST_ONLY_BONUS_CONFIG), 1.25);
  assert.throws(() => multiplierForScore(-Number.EPSILON, TEST_ONLY_BONUS_CONFIG), RangeError);
  assert.throws(() => multiplierForScore(100.000001, TEST_ONLY_BONUS_CONFIG), RangeError);
  assert.throws(() => policy.resolve({ status: 'valid', score: Number.NaN }), RangeError);
  assert.throws(() => policy.resolve({ status: 'valid', score: Number.POSITIVE_INFINITY }), RangeError);
  assert.throws(() => policy.resolve({ status: 'valid', score: 50 }, 0.99), RangeError);
  assert.throws(() => policy.resolve({ status: 'valid', score: 50 }, 1.26), RangeError);
});

test('injected policy instances cannot alter the source-backed default or each other', () => {
  const sourceBefore = DEV_SLEEP_CONFIG.curve.map(point => ({ ...point }));
  const bonus = new DevSleepBenefitPolicy(TEST_ONLY_BONUS_CONFIG);
  const otherConfig: SleepBalanceConfig = Object.freeze({
    ...TEST_ONLY_BONUS_CONFIG,
    version: 'test-only-other-instance',
    curve: Object.freeze([
      Object.freeze({ score: 0, multiplier: 1 }),
      Object.freeze({ score: 100, multiplier: 1.1 }),
    ]),
  });
  const other = new DevSleepBenefitPolicy(otherConfig);
  const sourceDefault = new DevSleepBenefitPolicy();

  assert.equal(readyMultiplier(bonus.resolve({ status: 'valid', score: 100 })), 1.25);
  assert.equal(readyMultiplier(other.resolve({ status: 'valid', score: 100 })), 1.1);
  assert.equal(readyMultiplier(sourceDefault.resolve({ status: 'valid', score: 0 })), 0.7);
  assert.equal(readyMultiplier(sourceDefault.resolve({ status: 'valid', score: 100 })), 1.5);
  assert.deepEqual(DEV_SLEEP_CONFIG.curve, sourceBefore);
  assert.equal(multiplierForScore(0), 0.7);
  assert.equal(multiplierForScore(100), 1.5);
});

test('production provider remains not_configured under source and injected DEV policies', async () => {
  const score = await new NotConfiguredSleepProvider().getScore('synthetic-day');
  assert.deepEqual(score, { status: 'not_configured' });
  assert.deepEqual(new DevSleepBenefitPolicy().resolve(score), {
    status: 'decision_required', decision: 'DEC-05',
  });
  assert.deepEqual(new DevSleepBenefitPolicy(TEST_ONLY_BONUS_CONFIG).resolve(score), {
    status: 'decision_required', decision: 'DEC-05',
  });
});

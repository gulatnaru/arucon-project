import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_SLEEP_CONFIG } from '../../src/sleep/config';
import {
  DevSleepBenefitPolicy, NotConfiguredSleepProvider, SYNTHETIC_SLEEP_FIXTURES,
  SyntheticSleepProvider, multiplierForScore,
} from '../../src/sleep/index';

test('AT-SLEEP-01/02: source curve distinguishes valid zero from no data', async () => {
  const provider = new SyntheticSleepProvider(SYNTHETIC_SLEEP_FIXTURES);
  const policy = new DevSleepBenefitPolicy();
  for (const [score, expected] of [[0, 0.7], [40, 0.7], [55, 0.85], [70, 1], [77.5, 1.1], [85, 1.2], [100, 1.5]]) {
    assert.ok(Math.abs(multiplierForScore(score) - expected) < 1e-12);
  }
  assert.deepEqual(policy.resolve(await provider.getScore('fixture-null')), {
    status: 'ready', growthMultiplier: 1, scoreStatus: 'no_data', provisional: false,
  });
  assert.deepEqual(policy.resolve(await provider.getScore('fixture-0')), {
    status: 'ready', growthMultiplier: 0.7, scoreStatus: 'valid', provisional: false,
  });
  assert.equal(policy.resolve(await provider.getScore('fixture-70')).status, 'ready');
  assert.equal(policy.resolve(await provider.getScore('fixture-100')).status, 'ready');
});

test('AT-SLEEP-03/12: invalid, absent, error, and unconfigured remain distinct', async () => {
  const provider = new SyntheticSleepProvider(SYNTHETIC_SLEEP_FIXTURES);
  const policy = new DevSleepBenefitPolicy();
  assert.throws(() => policy.resolve({ status: 'valid', score: Number.NaN }), RangeError);
  assert.throws(() => policy.resolve({ status: 'valid', score: 101 }), RangeError);
  assert.throws(() => new SyntheticSleepProvider({ bad: -1 }), RangeError);
  assert.deepEqual(await provider.getScore('missing-day'), { status: 'unavailable' });
  assert.deepEqual(policy.resolve({ status: 'error' }), {
    status: 'ready', growthMultiplier: 1, scoreStatus: 'error', provisional: true,
  });
  assert.deepEqual(policy.resolve({ status: 'unavailable' }, 1.2), {
    status: 'ready', growthMultiplier: 1.2, scoreStatus: 'unavailable', provisional: true,
  });
  assert.deepEqual(await new NotConfiguredSleepProvider().getScore('2026-09-19'), { status: 'not_configured' });
  assert.deepEqual(policy.resolve({ status: 'not_configured' }), { status: 'decision_required', decision: 'DEC-05' });
});

test('AT-SLEEP-05: a confirmed day does not change on a later revised score', () => {
  const policy = new DevSleepBenefitPolicy();
  assert.deepEqual(policy.resolve({ status: 'valid', score: 100 }, 0.7), {
    status: 'ready', growthMultiplier: 0.7, scoreStatus: 'valid', provisional: false,
  });
});

test('sleep mapping reads an injected, validated development curve', () => {
  const config = { ...DEV_SLEEP_CONFIG, version: 'test-curve', curve: [{ score: 0, multiplier: 0.7 }, { score: 100, multiplier: 1.5 }] };
  assert.equal(new DevSleepBenefitPolicy(config).resolve({ status: 'valid', score: 50 }).status, 'ready');
  assert.ok(Math.abs(multiplierForScore(50, config) - 1.1) < 1e-12);
  assert.throws(() => new DevSleepBenefitPolicy({ ...config, curve: [{ score: 0, multiplier: 1 }, { score: 100, multiplier: 0.7 }] }));
  assert.throws(() => new DevSleepBenefitPolicy({ ...config, curve: [{ score: 0, multiplier: 0.7 }, { score: 0, multiplier: 1.5 }] }));
});

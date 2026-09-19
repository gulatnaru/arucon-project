import test from 'node:test';
import assert from 'node:assert/strict';
import { CappedExponentialRetryPolicy } from '../../src/sync/retryPolicy';

test('equal-jitter exponential retry grows, caps, and never creates a terminal attempt', () => {
  const policy = new CappedExponentialRetryPolicy({
    version: 'fixture-v1', baseDelayMs: 1_000, maximumDelayMs: 8_000,
  });
  assert.equal(policy.nextDelayMs(1, 0), 500);
  assert.equal(policy.nextDelayMs(1, 0.999), 999);
  assert.equal(policy.nextDelayMs(2, 0), 1_000);
  assert.equal(policy.nextDelayMs(4, 0), 4_000);
  assert.equal(policy.nextDelayMs(4, 0.999), 7_996);
  assert.equal(policy.nextDelayMs(1_000_000, 0), 4_000);
});

test('retry policy rejects unsafe timing and randomness inputs', () => {
  assert.throws(() => new CappedExponentialRetryPolicy({ version: '', baseDelayMs: 1, maximumDelayMs: 1 }), /version/);
  assert.throws(() => new CappedExponentialRetryPolicy({ version: 'bad', baseDelayMs: 0, maximumDelayMs: 1 }), /configuration/);
  assert.throws(() => new CappedExponentialRetryPolicy({ version: 'bad', baseDelayMs: 2, maximumDelayMs: 1 }), /configuration/);
  const policy = new CappedExponentialRetryPolicy({ version: 'fixture', baseDelayMs: 2, maximumDelayMs: 2 });
  assert.throws(() => policy.nextDelayMs(0, 0), /attempt/);
  assert.throws(() => policy.nextDelayMs(1, 1), /random/);
  assert.throws(() => policy.nextDelayMs(1, Number.NaN), /random/);
});

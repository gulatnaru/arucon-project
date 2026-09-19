// @ts-nocheck -- focused contract fakes keep the scheduler test independent of SQLite/privacy fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncCoordinator } from '../../src/sync/coordinator';
import { CappedExponentialRetryPolicy } from '../../src/sync/retryPolicy';
import { DurableSyncScheduler } from '../../src/sync/scheduler';

const action = {
  actionId: 'action-1', petId: 'pet-1', localSequence: 1,
  writer: { deviceId: 'synthetic-device', deviceEpoch: 1 },
  configVersion: 'fixture', attemptCount: 0, envelope: {},
};

class FakeQueue {
  listCalls = 0;
  acknowledged = 0;
  due = 0;
  async listDispatchable(_limit, nowMs) {
    this.listCalls++;
    return this.acknowledged === 0 && nowMs >= this.due ? [action] : [];
  }
  async nextRunnableAtMs() { return this.acknowledged === 0 ? this.due : null; }
  async acknowledge() { this.acknowledged++; }
  async recordRetryableError() { throw new Error('not used'); }
  async recordConflict() { throw new Error('not used'); }
  async summary() { throw new Error('not used'); }
}

class FakeTimer {
  nextId = 1;
  entries = new Map();
  set(delayMs, callback) {
    const id = this.nextId++;
    this.entries.set(id, { delayMs, callback });
    return id;
  }
  clear(handle) { this.entries.delete(handle); }
  onlyDelay() {
    assert.equal(this.entries.size, 1);
    return [...this.entries.values()][0].delayMs;
  }
  async fireOnly() {
    assert.equal(this.entries.size, 1);
    const [id, entry] = [...this.entries.entries()][0];
    this.entries.delete(id);
    entry.callback();
    await new Promise(resolve => setImmediate(resolve));
  }
}

const policy = new CappedExponentialRetryPolicy({ version: 'fixture', baseDelayMs: 10, maximumDelayMs: 100 });
const config = { batchLimit: 5, idlePollMs: 20_000, offlinePollMs: 30_000 };

test('coordinator persists policy, attempt time, and jittered due time for retryable responses', async () => {
  let recorded = null;
  const retryAction = { ...action, attemptCount: 2 };
  const queue = {
    async listDispatchable() { return [retryAction]; },
    async nextRunnableAtMs() { return null; },
    async acknowledge() { throw new Error('not used'); },
    async recordRetryableError(...args) { recorded = args; },
    async recordConflict() { throw new Error('not used'); },
    async summary() { throw new Error('not used'); },
  };
  const sync = new SyncCoordinator(
    queue,
    { async deliver() { return { kind: 'retryable_error', code: 'synthetic_busy' }; } },
    policy,
    { nowMs: () => 500 },
    { unit: () => 0.5 },
  );
  assert.deepEqual(await sync.flushOnce(1), { attempted: 1, acknowledged: 0, retryableErrors: 1, conflicts: 0 });
  assert.deepEqual(recorded, ['action-1', 'synthetic_busy', 500, 530, 'fixture']);
});

test('offline gate performs no queue read or transport call', async () => {
  const queue = new FakeQueue();
  let deliveries = 0;
  const clock = { nowMs: () => 0 };
  const coordinator = new SyncCoordinator(queue, { async deliver() { deliveries++; throw new Error('unexpected'); } }, policy, clock, { unit: () => 0 });
  const scheduler = new DurableSyncScheduler(coordinator, queue, { isOnline: () => false }, clock, new FakeTimer(), config);
  assert.deepEqual(await scheduler.runDue(), { kind: 'offline' });
  assert.equal(queue.listCalls, 0);
  assert.equal(deliveries, 0);
});

test('singleflight coalesces overlapping scheduler runs into one delivery', async () => {
  const queue = new FakeQueue();
  const clock = { nowMs: () => 0 };
  let release;
  let deliveries = 0;
  const delivered = new Promise(resolve => { release = resolve; });
  const coordinator = new SyncCoordinator(queue, {
    async deliver(received) {
      deliveries++;
      await delivered;
      return { kind: 'ack', actionId: received.actionId, ackSequence: 1, confirmedAtMs: 1 };
    },
  }, policy, clock, { unit: () => 0 });
  const scheduler = new DurableSyncScheduler(coordinator, queue, { isOnline: () => true }, clock, new FakeTimer(), config);
  const first = scheduler.runDue();
  const second = scheduler.runDue();
  assert.strictEqual(first, second);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deliveries, 1);
  release();
  assert.deepEqual(await first, {
    kind: 'flushed', result: { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 },
  });
  assert.equal(queue.acknowledged, 1);
});

test('actor coalesces wakeups and uses the injected offline polling delay', async () => {
  const queue = new FakeQueue();
  const clock = { nowMs: () => 0 };
  const timer = new FakeTimer();
  const coordinator = new SyncCoordinator(queue, { async deliver() { throw new Error('unexpected'); } }, policy, clock, { unit: () => 0 });
  const scheduler = new DurableSyncScheduler(coordinator, queue, { isOnline: () => false }, clock, timer, config);
  scheduler.start();
  assert.equal(timer.onlyDelay(), 0);
  scheduler.poke();
  assert.equal(timer.onlyDelay(), 0);
  await timer.fireOnly();
  assert.equal(timer.onlyDelay(), 30_000);
  assert.equal(queue.listCalls, 0);
  scheduler.stop();
  assert.equal(timer.entries.size, 0);
});

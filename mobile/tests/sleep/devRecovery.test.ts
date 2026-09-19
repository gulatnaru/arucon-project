// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG, DecisionRequired } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { DevSleepRecoveryService } from '../../src/sleep/devRecovery';
import { DevAtomicTransactionStore } from '../../src/storage/devTransactions';
import { LocalPetStore } from '../../src/storage/sqlite';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); this.failOn = null; }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) {
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected SQLite failure');
    return this.native.prepare(sql).run(...params);
  }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail; let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous; this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
}

const writer = { deviceId: 'synthetic-sleep-device', deviceEpoch: 1 };

async function setup() {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG, writer);
  await pets.migrate();
  await pets.createPet({ ...initialPet('pet-1', '구름', 'reserved', 0, DEV_GAME_CONFIG), stamina: 40 });
  const transactions = new DevAtomicTransactionStore(db, DEV_GAME_CONFIG, writer);
  return { db, pets, transactions };
}

const request = { commandId: 'sleep-benefit-1', petId: 'pet-1', gameDayId: 'synthetic-day-1', appliedAtMs: 100 };
const approvedPolicy = {
  calls: 0,
  decide(_request, current) {
    this.calls++;
    return { kind: 'approved', nextStamina: current.stamina + 10, policyVersion: 'synthetic-recovery-1' };
  },
};

test('unconfigured sleep recovery fails closed without changing stamina or writing a ledger', async () => {
  const { db, pets, transactions } = await setup();
  await assert.rejects(new DevSleepRecoveryService(transactions).apply(request), DecisionRequired);
  assert.equal((await pets.loadPet('pet-1')).stamina, 40);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 0);
});

test('synthetic approved recovery persists once per day and command replay does not call policy again', async () => {
  const { db, pets, transactions } = await setup();
  approvedPolicy.calls = 0;
  const service = new DevSleepRecoveryService(transactions, approvedPolicy);
  const first = await service.apply(request);
  assert.equal(first.kind, 'applied');
  assert.equal(first.replayed, false);
  assert.equal(first.appliedDelta, 10);
  assert.equal((await pets.loadPet('pet-1')).stamina, 50);
  const replay = await service.apply(request);
  assert.equal(replay.kind, 'applied');
  assert.equal(replay.replayed, true);
  assert.equal(approvedPolicy.calls, 1);
  await assert.rejects(service.apply({ ...request, commandId: 'sleep-benefit-2' }), /Sleep benefit already applied/);
  assert.equal((await pets.loadPet('pet-1')).stamina, 50);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 1);
});

test('not-eligible and invalid policy decisions preserve the prior state with no ledger', async () => {
  const { db, pets, transactions } = await setup();
  const notEligible = new DevSleepRecoveryService(transactions, { decide() { return { kind: 'not_eligible', reason: 'synthetic_not_eligible' }; } });
  assert.deepEqual(await notEligible.apply(request), { kind: 'not_eligible', reason: 'synthetic_not_eligible', currentState: await pets.loadPet('pet-1') });
  const lower = new DevSleepRecoveryService(transactions, { decide(_request, current) { return { kind: 'approved', nextStamina: current.stamina - 1, policyVersion: 'bad' }; } });
  await assert.rejects(lower.apply(request), /Invalid approved sleep recovery state/);
  assert.equal((await pets.loadPet('pet-1')).stamina, 40);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 0);
});

test('policy receives a deeply frozen activity snapshot and mutation or callback exceptions roll back completely', async () => {
  const { db, pets, transactions } = await setup();
  await pets.execute('pet-1', {
    type: 'activity', commandId: 'activity-before-recovery',
    gameDay: { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 1_000, endUtcMs: 11_000 },
    selectedProviderId: 'synthetic-provider', providerId: 'synthetic-provider', connectedAtMs: 1_000,
    sourceRevision: 1, interval: { startUtcMs: 1_000, endUtcMs: 10_000 }, observedAtMs: 10_000,
    steps: 500, runningSteps: 0,
  });
  const before = await pets.loadPet('pet-1');
  const mutating = new DevSleepRecoveryService(transactions, {
    decide(_request, current) {
      const cursor = current.activityByDay['2026-09-19'];
      assert.equal(Object.isFrozen(current), true);
      assert.equal(Object.isFrozen(current.activityByDay), true);
      assert.equal(Object.isFrozen(cursor), true);
      assert.equal(Object.isFrozen(cursor.gameDay), true);
      assert.equal(Object.isFrozen(cursor.interval), true);
      cursor.steps = 999;
      return { kind: 'approved', nextStamina: current.stamina + 10, policyVersion: 'malicious' };
    },
  });
  await assert.rejects(mutating.apply(request), TypeError);
  assert.deepEqual(await pets.loadPet('pet-1'), before);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 1, 'only prior activity remains');

  const throwing = new DevSleepRecoveryService(transactions, { decide() { throw new Error('synthetic callback failure'); } });
  await assert.rejects(throwing.apply(request), /synthetic callback failure/);
  assert.deepEqual(await pets.loadPet('pet-1'), before);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 0);

  const approved = new DevSleepRecoveryService(transactions, {
    decide(_request, current) { return { kind: 'approved', nextStamina: current.stamina + 10, policyVersion: 'synthetic-safe' }; },
  });
  await approved.apply(request);
  const after = await pets.loadPet('pet-1');
  assert.equal(after.stamina, before.stamina + 10);
  assert.deepEqual(after.activityByDay, before.activityByDay);
});

test('failure after state update rolls back sleep benefit state, ledger, and outbox before clean retry', async () => {
  const { db, pets, transactions } = await setup();
  approvedPolicy.calls = 0;
  const service = new DevSleepRecoveryService(transactions, approvedPolicy);
  db.failOn = 'INSERT INTO dev_sleep_benefit_ledger';
  await assert.rejects(service.apply(request), /injected SQLite failure/);
  db.failOn = null;
  assert.equal((await pets.loadPet('pet-1')).stamina, 40);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_sleep_benefit_ledger')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 0);
  await service.apply(request);
  assert.equal((await pets.loadPet('pet-1')).stamina, 50);
});

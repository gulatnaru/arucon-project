// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG, DecisionRequired } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { ApprovedCoinPurchaseService } from '../../src/shop/approvedCatalog';
import { DevCoinPurchaseService } from '../../src/shop/devPurchase';
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

const writer = { deviceId: 'synthetic-purchase-device', deviceEpoch: 1 };
const catalog = {
  decide(itemId) {
    return { itemId, coinCost: 7, catalogVersion: 'synthetic-catalog-1', effectKey: `synthetic:${itemId}`, scope: 'DEV_FIXTURE_ONLY' };
  },
};
const effects = { ownershipKey(decision) { return decision.effectKey; } };

async function setup() {
  const db = new NodeSqliteAdapter();
  const pets = new LocalPetStore(db, DEV_GAME_CONFIG, writer);
  await pets.migrate();
  await pets.createPet({ ...initialPet('pet-1', '구름', 'expressive', 0, DEV_GAME_CONFIG), coin: 20 });
  const transactions = new DevAtomicTransactionStore(db, DEV_GAME_CONFIG, writer);
  return { db, pets, transactions };
}

const request = { purchaseId: 'purchase-1', petId: 'pet-1', itemId: 'synthetic-item', committedAtMs: 100 };

test('unconfigured purchase catalog fails closed without debit, ownership, or ledger', async () => {
  const { db, pets, transactions } = await setup();
  await assert.rejects(new DevCoinPurchaseService(transactions).purchase(request), DecisionRequired);
  assert.equal((await pets.loadPet('pet-1')).coin, 20);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_purchase_ledger')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 0);
});

test('synthetic coin purchase debits and grants ownership atomically, then replays without duplicate effect', async () => {
  const { db, pets, transactions } = await setup();
  const service = new DevCoinPurchaseService(transactions, catalog, effects);
  const first = await service.purchase(request);
  assert.equal(first.replayed, false);
  assert.equal(first.currentState.coin, 13);
  const replay = await service.purchase(request);
  assert.equal(replay.replayed, true);
  assert.equal(replay.committedState.coin, 13);
  assert.equal((await pets.loadPet('pet-1')).coin, 13);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_purchase_ledger')).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership')).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 1);
  await assert.rejects(service.purchase({ ...request, purchaseId: 'purchase-2' }), /Ownership already granted/);
  assert.equal((await pets.loadPet('pet-1')).coin, 13);
});

test('failure after snapshot and ownership writes rolls back every purchase row and permits one clean retry', async () => {
  const { db, pets, transactions } = await setup();
  const service = new DevCoinPurchaseService(transactions, catalog, effects);
  db.failOn = 'INSERT INTO dev_purchase_ledger';
  await assert.rejects(service.purchase(request), /injected SQLite failure/);
  db.failOn = null;
  assert.equal((await pets.loadPet('pet-1')).coin, 20);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 0);
  await service.purchase(request);
  assert.equal((await pets.loadPet('pet-1')).coin, 13);
});

test('insufficient coin and reused purchase ID preserve the committed snapshot', async () => {
  const { db, pets, transactions } = await setup();
  const expensiveCatalog = { decide(itemId) { return { itemId, coinCost: 21, catalogVersion: 'synthetic', effectKey: itemId, scope: 'DEV_FIXTURE_ONLY' }; } };
  await assert.rejects(new DevCoinPurchaseService(transactions, expensiveCatalog, effects).purchase(request), /Insufficient coin/);
  assert.equal((await pets.loadPet('pet-1')).coin, 20);
  const service = new DevCoinPurchaseService(transactions, catalog, effects);
  await service.purchase(request);
  await assert.rejects(service.purchase({ ...request, itemId: 'changed-item' }), /purchaseId reused with different payload/);
  assert.equal((await pets.loadPet('pet-1')).coin, 13);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_purchase_ledger')).count, 1);
});

test('approved table purchase atomically debits coin, installs the table, grants ownership, and replays once', async () => {
  const { db, pets, transactions } = await setup();
  await db.runAsync('UPDATE pet_snapshot SET state_json = ? WHERE pet_id = ?', [
    JSON.stringify({ ...(await pets.loadPet('pet-1')), coin: 100 }), 'pet-1',
  ]);
  const service = new ApprovedCoinPurchaseService(transactions);
  const first = await service.purchase({ purchaseId: 'approved-table-1', petId: 'pet-1', itemId: 'table', committedAtMs: 200 });
  assert.equal(first.replayed, false);
  assert.equal(first.currentState.coin, 40);
  assert.equal(first.currentState.tableInstalled, true);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership WHERE ownership_key = ?', ['facility:table'])).count, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox WHERE command_id = ?', ['approved-table-1'])).count, 1);
  const replay = await service.purchase({ purchaseId: 'approved-table-1', petId: 'pet-1', itemId: 'table', committedAtMs: 200 });
  assert.equal(replay.replayed, true);
  assert.equal(replay.currentState.coin, 40);
  await assert.rejects(
    service.purchase({ purchaseId: 'approved-table-2', petId: 'pet-1', itemId: 'table', committedAtMs: 201 }),
    /Ownership already granted|Table already installed/,
  );
  assert.equal((await pets.loadPet('pet-1')).coin, 40);
});

test('approved medicine is repeatable only for low or recovering condition and resets condition timers atomically', async () => {
  const { db, pets, transactions } = await setup();
  const low = { ...(await pets.loadPet('pet-1')), coin: 100, condition: 'low', dirtyElapsedMs: 8_000, recoveryElapsedMs: 3_000 };
  await db.runAsync('UPDATE pet_snapshot SET state_json = ? WHERE pet_id = ?', [JSON.stringify(low), 'pet-1']);
  const service = new ApprovedCoinPurchaseService(transactions);
  const result = await service.purchase({ purchaseId: 'approved-medicine-1', petId: 'pet-1', itemId: 'medicine', committedAtMs: 300 });
  assert.deepEqual(
    [result.currentState.coin, result.currentState.condition, result.currentState.dirtyElapsedMs, result.currentState.recoveryElapsedMs],
    [50, 'well', 0, 0],
  );
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership')).count, 0);
  await assert.rejects(
    service.purchase({ purchaseId: 'approved-medicine-2', petId: 'pet-1', itemId: 'medicine', committedAtMs: 301 }),
    /requires a low or recovering condition/,
  );
  assert.equal((await pets.loadPet('pet-1')).coin, 50);
});

test('approved item failure after snapshot mutation rolls back state, ownership, ledger, and outbox', async () => {
  const { db, pets, transactions } = await setup();
  await db.runAsync('UPDATE pet_snapshot SET state_json = ? WHERE pet_id = ?', [
    JSON.stringify({ ...(await pets.loadPet('pet-1')), coin: 100 }), 'pet-1',
  ]);
  const service = new ApprovedCoinPurchaseService(transactions);
  db.failOn = 'INSERT INTO dev_purchase_ledger';
  await assert.rejects(
    service.purchase({ purchaseId: 'approved-table-rollback', petId: 'pet-1', itemId: 'table', committedAtMs: 400 }),
    /injected SQLite failure/,
  );
  db.failOn = null;
  const unchanged = await pets.loadPet('pet-1');
  assert.equal(unchanged.coin, 100);
  assert.equal(unchanged.tableInstalled, false);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_item_ownership')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_purchase_ledger')).count, 0);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM local_outbox')).count, 0);
});

// @ts-nocheck -- Node's built-in SQLite is only the integration test adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import { LocalPetStore } from '../../src/storage/sqlite';
import { DevLifeService } from '../../src/application/devLifeService';

const HOUR = 3_600_000;

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) { return this.native.prepare(sql).run(...params); }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
}

async function setup(overrides = {}, config = DEV_GAME_CONFIG) {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, config);
  await store.migrate();
  await store.createPet({ ...initialPet('pet-1', '구름', 'reserved', 0, config), ...overrides });
  return { db, store, service: new DevLifeService(store, db, 'pet-1', config) };
}

function syntheticActivity(steps, revision = 1) {
  return {
    status: 'available', gameDayId: '2026-09-19',
    gameDay: { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 0, endUtcMs: 24 * HOUR },
    selectedProviderId: 'synthetic', connectedAtMs: 0,
    interval: { startUtcMs: 0, endUtcMs: 1_000 },
    providerId: 'synthetic', sourceRevision: revision, observedAtMs: 1_000, steps, runningSteps: 0,
  };
}

test('direct and opted-in auto meal have identical consumption and EXP at the same state', async () => {
  const direct = await setup({ food: 1, tableInstalled: true, autoFeedOptIn: false });
  const auto = await setup({ food: 1, tableInstalled: true, autoFeedOptIn: true });
  const manualState = await direct.service.feedDirect(0, 'direct-1');
  const autoState = await auto.service.advanceTo(0);
  for (const key of ['food', 'coin', 'totalExpUnits', 'stamina', 'hunger', 'poopCount']) {
    assert.equal(autoState[key], manualState[key], key);
  }
  assert.equal(autoState.totalExpUnits, 15_000_000);
  assert.equal((await auto.db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 1);
});

test('automatic meals settle at hunger thresholds independent of catch-up slicing', async () => {
  const a = await setup({ food: 3, hunger: 40, tableInstalled: true, autoFeedOptIn: true });
  const b = await setup({ food: 3, hunger: 40, tableInstalled: true, autoFeedOptIn: true });
  const whole = await a.service.advanceTo(5 * HOUR);
  await b.service.advanceTo(2.5 * HOUR);
  const split = await b.service.advanceTo(5 * HOUR);
  for (const key of ['food', 'coin', 'totalExpUnits', 'stamina', 'hunger', 'poopCount', 'lastSimulatedAtMs']) {
    assert.equal(split[key], whole[key], key);
  }
  assert.equal(whole.food, 1);
  assert.equal(whole.totalExpUnits, 30_000_000);
  assert.equal((await a.db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 2);
});

test('hibernation at the exact meal threshold wins and preserves existing food', async () => {
  const config = { ...DEV_GAME_CONFIG, version: 'hibernation-test', proposal: { ...DEV_GAME_CONFIG.proposal, hibernateAfterMs: HOUR } };
  const { service } = await setup({ food: 1, hunger: 46, tableInstalled: true, autoFeedOptIn: true }, config);
  const state = await service.advanceTo(HOUR);
  assert.equal(state.hibernating, true);
  assert.equal(state.food, 1);
  assert.equal(state.totalExpUnits, 0);
  assert.equal((await service.readJournal()).some(entry => entry.event.type === 'MealConsumed'), false);
});

test('new activity is applied after absence; food cannot feed a past interval', async () => {
  const { db, service } = await setup({ food: 0, tableInstalled: true, autoFeedOptIn: true });
  const before = await service.advanceTo(3 * HOUR);
  assert.equal(before.totalExpUnits, 0);
  assert.equal(before.hunger, 62);
  const after = await service.receiveActivity(syntheticActivity(500), 3 * HOUR);
  assert.equal(after.food, 0);
  assert.equal(after.totalExpUnits, 15_000_000);
  assert.equal(after.lastForegroundAtMs, 0); // Activity is not foreground use.
  const meal = await db.getFirstAsync("SELECT command_json FROM command_ledger WHERE command_json LIKE '%consumeMeal%'");
  assert.equal(JSON.parse(meal.command_json).observedAtMs, 3 * HOUR);
});

test('sleep blocks automatic feeding until an explicit wake command', async () => {
  const { service } = await setup({ food: 1, tableInstalled: true, autoFeedOptIn: true, sleeping: true });
  const asleep = await service.advanceTo(2 * HOUR);
  assert.equal(asleep.food, 1);
  assert.equal(asleep.totalExpUnits, 0);
  const awake = await service.wake(2 * HOUR, 'wake-1');
  assert.equal(awake.food, 0);
  assert.equal(awake.totalExpUnits, 15_000_000);
});

test('foreground return resumes after hibernation without retroactively feeding late activity', async () => {
  const { service } = await setup({ food: 0, tableInstalled: true, autoFeedOptIn: true });
  const returned = await service.returnToForeground(26 * HOUR, syntheticActivity(500));
  assert.equal(returned.hibernating, false);
  assert.equal(returned.lastForegroundAtMs, 26 * HOUR);
  assert.equal(returned.food, 0);
  assert.equal(returned.totalExpUnits, 6_750_000);
  const meals = (await service.readJournal()).filter(entry => entry.event.type === 'MealConsumed');
  assert.equal(meals.length, 1);
  assert.equal(meals[0].commandId.includes(String(26 * HOUR)), true);
});

test('continuous foreground exit at 25 hours keeps activity checkpoint and auto meals', async () => {
  const { service } = await setup({ food: 3, hunger: 40, tableInstalled: true, autoFeedOptIn: true });
  await service.interact(23 * HOUR, 'foreground-touch', 'touch');
  const state = await service.leaveForeground(25 * HOUR);
  assert.equal(state.hibernating, false);
  assert.equal(state.lastForegroundAtMs, 25 * HOUR);
  assert.ok((await service.readJournal()).some(entry => entry.event.type === 'MealConsumed'));
  assert.equal((await service.readJournal()).some(entry => entry.commandId.startsWith('foreground-exit:') && entry.event.type === 'Returned'), false);
});

test('persisted activity cursor rejects a different source after reload and repeated revision', async () => {
  const { db, service } = await setup();
  const first = await service.receiveActivity(syntheticActivity(500), 1_000);
  const reloaded = new DevLifeService(new LocalPetStore(db, DEV_GAME_CONFIG), db, 'pet-1');
  const duplicate = await reloaded.receiveActivity(syntheticActivity(500), 1_000);
  assert.equal(duplicate.food, first.food);
  assert.equal(duplicate.coin, first.coin);
  await assert.rejects(reloaded.receiveActivity({
    ...syntheticActivity(700, 2), providerId: 'other', selectedProviderId: 'other',
  }, 1_000), /provider|source|locked/i);
  await assert.rejects(reloaded.receiveActivity(syntheticActivity(600), 1_000), /commandId reused|revision|conflict/i);
  const state = await reloaded.currentState();
  assert.equal(state.food, first.food);
  assert.equal(state.coin, first.coin);
});

test('reloading and replaying a direct command returns currentState and does not duplicate the journal', async () => {
  const { db, store, service } = await setup({ food: 1 });
  const first = await service.feedDirect(0, 'feed-1');
  await service.interact(0, 'touch-1', 'touch');
  const reloaded = new DevLifeService(new LocalPetStore(db, DEV_GAME_CONFIG), db, 'pet-1');
  const replay = await reloaded.feedDirect(0, 'feed-1');
  assert.ok(replay.revision > first.revision);
  assert.deepEqual(replay, await store.loadPet('pet-1'));
  const journal = await reloaded.readJournal();
  assert.equal(journal.filter(entry => entry.event.type === 'MealConsumed').length, 1);
  assert.equal(journal.filter(entry => entry.event.type === 'InteractionObserved').length, 1);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM meal_ledger')).count, 1);
  await assert.rejects(reloaded.interact(0, 'touch-1', 'greet'), /different payload/);
});

test('widget projection and journal reads do not execute game commands', async () => {
  const { db, service } = await setup();
  const projection = await service.readWidgetProjection(2_000);
  assert.deepEqual(Object.keys(projection).sort(), [
    'displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs',
  ]);
  assert.equal(projection.updatedAtMs, 0); // A read must not pretend the persisted state was freshly updated.
  await service.readJournal();
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM command_ledger')).count, 0);
});

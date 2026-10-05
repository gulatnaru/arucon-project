// @ts-nocheck -- Node SQLite integration exercises the actual transaction services.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { prepareExperience, latestGrowthExperience } from '../../src/living/experience';
import { GrowthPlaythrough } from '../../src/living/growthPlaythrough';
import { LEVEL_EXPRESSIONS, growthGesture, levelExpression } from '../../src/living/levelExpressions';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../../src/progression/projection';
import { chooseLifeLine, emptyLifeMemory } from '../../src/living/content';

class DB {
  native = new DatabaseSync(':memory:'); tail = Promise.resolve(); failProgress = false; failAfterMeal = false;
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) {
    if (this.failProgress && sql.startsWith('UPDATE growth_playthrough')) { this.failProgress = false; throw Error('uncertain progress write'); }
    if (this.failAfterMeal && sql.startsWith('UPDATE growth_playthrough') && JSON.parse(params[0]).sequence === 1 && JSON.parse(params[0]).pending === null) {
      this.failAfterMeal = false; throw Error('progress failed after durable meal');
    }
    return this.native.prepare(sql).run(...params);
  }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const earlier = this.tail; let release; this.tail = new Promise(resolve => { release = resolve; }); await earlier;
    this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; } finally { release(); }
  }
}
const origin = Date.UTC(2026, 9, 6, 8);
test('one isolated pet genuinely consumes from Lv.1 to 20 with seven observed days and a persisted evolution', async () => {
  const db = new DB();
  const service = await prepareExperience(db, '보리', 'reserved', origin, 'growth_playthrough', '1');
  const start = await service.currentState();
  assert.equal(start.totalExpUnits, 0); assert.equal(start.food, 0); assert.equal(start.formId, 'arucon');
  const driver = await GrowthPlaythrough.open(db, service);
  for (let level = 2; level <= 20; level++) {
    const result = await driver.advanceLevel();
    assert.equal(projectGrowth(result.state.totalExpUnits, APPROVED_GROWTH_POLICY).level, level);
    assert.equal(result.state.petId, start.petId); assert.equal(result.state.givenName, '보리');
    assert.equal(result.state.personalityProfileId, 'reserved'); assert.equal(result.state.sleeping, false); assert.equal(result.state.hibernating, false);
    const meals = await db.getAllAsync('SELECT event_json FROM local_outbox WHERE pet_id=?', [start.petId]);
    const consumed = meals.flatMap(row => JSON.parse(row.event_json)).filter(x => x.type === 'MealConsumed');
    assert.equal(result.state.totalExpUnits, consumed.reduce((sum, event) => sum + event.expUnits, 0));
    if (level >= 16) { assert.notEqual(result.state.formId, 'arucon'); assert.ok(result.progress.checkpoints.at(-1).observedDays >= 7); }
  }
  const finished = await driver.advanceLevel();
  const same = await prepareExperience(db, '절대 덮어쓰지 않음', 'expressive', finished.state.lastSimulatedAtMs, 'growth_playthrough', '1');
  const loaded = await GrowthPlaythrough.open(db, same);
  assert.deepEqual(await loaded.progress(), finished.progress);
  assert.deepEqual(await same.currentState(), finished.state);
  assert.equal(finished.progress.checkpoints.length, 20);
  assert.ok(APPROVED_GROWTH_POLICY.finalLevel > 20);
  const replay = await loaded.advanceLevel(); assert.deepEqual(replay.state, finished.state);
});

test('a durable meal followed by failed progress save replays the plan, and the same completed level request cannot advance again', async () => {
  const db = new DB(); const service = await prepareExperience(db, '단일 요청', 'reserved', origin, 'growth_playthrough', '3');
  const driver = await GrowthPlaythrough.open(db,service);
  db.failAfterMeal = true;
  await assert.rejects(driver.advanceLevel(()=>true,2), /progress failed after durable meal/u);
  const afterFailure = await service.currentState(); assert.ok(afterFailure.totalExpUnits > 0);
  const mealCount = db.native.prepare('SELECT COUNT(*) AS count FROM meal_ledger').get().count;
  const pending = await driver.progress(); assert.ok(pending.pending);
  await driver.advanceLevel(()=>false,2);
  assert.deepEqual(await service.currentState(),afterFailure); assert.equal(db.native.prepare('SELECT COUNT(*) AS count FROM meal_ledger').get().count,mealCount);
  const reached = await driver.advanceLevel(()=>true,2);
  const repeat = await driver.advanceLevel(()=>true,2);
  assert.deepEqual(repeat.state,reached.state); assert.deepEqual(repeat.progress,reached.progress);
});

test('interrupted driver and failed progress acknowledgement continue the pending target without granting an extra meal', async () => {
  const db = new DB(); const service = await prepareExperience(db, '같은 아이', 'expressive', origin, 'growth_playthrough', '2');
  const driver = await GrowthPlaythrough.open(db, service);
  let steps = 0;
  const paused = await driver.advanceLevel(() => ++steps <= 2);
  assert.equal(paused.interrupted, true); assert.equal(paused.progress.targetLevel, 2);
  const first = await driver.advanceLevel(); assert.equal(first.progress.checkpoints.at(-1).level, 2);
  const before = await service.currentState();
  db.failProgress = true;
  await assert.rejects(driver.advanceLevel(), /uncertain progress write/u);
  assert.deepEqual(await service.currentState(), before);
  const later = await driver.advanceLevel(); assert.equal(later.progress.checkpoints.at(-1).level, 3);
  const growthCommands = await db.getAllAsync("SELECT command_json FROM command_ledger WHERE json_extract(command_json,'$.type')='consumeMeal'");
  assert.equal(new Set(growthCommands.map(x => JSON.parse(x.command_json).mealId)).size, growthCommands.length);
});

test('20 authored growth acts are distinct, restore at endpoints and have normal life routes', () => {
  assert.deepEqual(LEVEL_EXPRESSIONS.map(x => x.level), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(new Set(LEVEL_EXPRESSIONS.map(x => x.motion)).size, 20);
  for (const beat of LEVEL_EXPRESSIONS) {
    assert.ok(beat.scene); assert.ok(beat.reserved !== beat.expressive);
    for (const progress of [0, 1]) {
      const v = growthGesture(beat.motion, progress, 1);
      for (const [key, value] of Object.entries(v)) if (typeof value === 'number') assert.ok(Math.abs(value) < 1e-8, `${beat.level}:${key}`);
    }
    assert.ok([.2,.45,.7].some(p => Object.entries(growthGesture(beat.motion,p,1)).some(([,v]) => typeof v === 'number' && Math.abs(v) > .05)));
  }
  assert.equal(levelExpression(46).level, 20);
});

test('normal touch content reads level, place and interrupted activity without changing personality or manufacturing memory', () => {
  const memory = emptyLifeMemory('same');
  const seen = new Set();
  for (let i = 0; i < 12; i++) seen.add(chooseLifeLine(memory,'touch','reserved',origin+i*1000,false,()=>.6,undefined,undefined,
    { level: 13, touchTarget: i%2 ? 'head':'body', previousScene: 'explore' }).id);
  assert.ok(seen.size >= 7);
  assert.equal(memory.completed.length, 0);
  for (const beat of LEVEL_EXPRESSIONS) {
    assert.equal(chooseLifeLine(memory,'growth','reserved',origin,false,()=>0,undefined,undefined,{level:beat.level}).text, beat.reserved);
  }
});

test('one eligible growth line remains reachable on replay rather than excluding the entire history with slice(-0)', () => {
  const memory = emptyLifeMemory('same');
  const first = chooseLifeLine(memory,'growth','reserved',origin,false,()=>0,undefined,undefined,{level:7});
  const repeated = chooseLifeLine({...memory},'growth','reserved',origin+1000,false,()=>0,undefined,undefined,{level:7});
  assert.equal(repeated.id,first.id); assert.equal(repeated.text,'뒤쪽도 봤어.'); assert.deepEqual(repeated.excludedRecent,[]);
});

test('returning from the original room selects the saved growth pet and does not top up or create a replacement', async () => {
  const db = new DB(); assert.equal(await latestGrowthExperience(db),null);
  const service = await prepareExperience(db,'루미','reserved',origin,'growth_playthrough','4');
  const driver = await GrowthPlaythrough.open(db,service); await driver.advanceLevel();
  const before = await service.currentState(); const rows = db.native.prepare('SELECT COUNT(*) AS count FROM pet_snapshot').get().count;
  assert.equal(await latestGrowthExperience(db),'growth_playthrough#4');
  const restored = await prepareExperience(db,'변경 금지','expressive',before.lastSimulatedAtMs,'growth_playthrough','4');
  assert.deepEqual(await restored.currentState(),before); assert.equal(db.native.prepare('SELECT COUNT(*) AS count FROM pet_snapshot').get().count,rows);
});

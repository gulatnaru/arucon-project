// @ts-nocheck -- Node SQLite adapter exercises the production transaction services.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { LivingPet } from '../../src/living/life';
import { chooseLifeLine, emptyLifeMemory, rememberLifeCompletion, lifePreference, LIFE_LINES } from '../../src/living/content';
import { LifeMemoryStore } from '../../src/living/memory';
import { prepareExperience, EXPERIENCE } from '../../src/living/experience';
import { initialPet } from '../../src/domain/model';
import { APPROVED_GAME_CONFIG } from '../../src/domain/config';
import { LocalPetStore } from '../../src/storage/sqlite';
import { committedToiletScene } from '../../src/living/committedLife';
import { projectGrowth, APPROVED_GROWTH_POLICY } from '../../src/progression/projection';
import { confirmedMealCue } from '../../src/application/mealCue';
import { growthExpression } from '../../src/living/growthExpression';

class DB {
  native = new DatabaseSync(':memory:'); tail = Promise.resolve(); fail = '';
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, p = []) { if (this.fail && sql.includes(this.fail)) throw Error('injected write failure'); return this.native.prepare(sql).run(...p); }
  async getFirstAsync(sql, p = []) { return this.native.prepare(sql).get(...p) ?? null; }
  async getAllAsync(sql, p = []) { return this.native.prepare(sql).all(...p); }
  async withExclusiveTransactionAsync(work) {
    const before = this.tail; let release; this.tail = new Promise(r => { release = r; }); await before;
    this.native.exec('BEGIN IMMEDIATE');
    try { const v = await work(this); this.native.exec('COMMIT'); return v; }
    catch (e) { this.native.exec('ROLLBACK'); throw e; } finally { release(); }
  }
}
function actor(random = () => .4) {
  const world = { awake: true, enabled: true, touching: false, moving: false, committed: false,
    ball: true, cushion: true, toilet: true, position: { x: 0, z: 1.8 } };
  const events = []; let target = null;
  const life = new LivingPet({ event: e => events.push(e), stop: () => { target = null; world.moving = false; },
    navigate: p => { target = p; world.moving = true; return true; } }, random);
  function step(seconds) {
    for (let t = 0; t < seconds; t += .025) {
      if (target) {
        const dx = target.x - world.position.x, dz = target.z - world.position.z, d = Math.hypot(dx, dz);
        if (d < .06) { world.position = target; target = null; world.moving = false; }
        else { world.position.x += dx / d * .06; world.position.z += dz / d * .06; }
      }
      life.update(.025, world);
    }
  }
  return { life, world, events, step };
}
test('LIFE-01 three-minute observation includes purposeful families and an optional finite offer', () => {
  const a = actor(); a.step(180);
  assert.ok(new Set(a.events.filter(e => e.phase === 'perform').map(e => e.scene)).size >= 3);
  assert.ok(a.events.some(e => e.scene === 'offer' && e.phase === 'waiting'));
  assert.ok(a.events.some(e => e.scene === 'offer' && e.phase === 'complete'));
});
test('roll -> follow -> contact -> return uses a real bounded ball; cancellation has no stale completion', () => {
  const a = actor(); a.life.command({ token: 'roll', kind: 'roll', target: { x: -100, z: 300 } }, a.world);
  a.step(12);
  assert.ok(a.events.some(e => e.scene === 'ball' && e.phase === 'complete'));
  assert.ok(a.life.ball.x >= -1.8 && a.life.ball.x <= 1.8 && a.life.ball.z <= 5.5);
  a.life.command({ token: 'next', kind: 'ball' }, a.world);
  a.life.cancel(); const id = a.events.at(-1).id; a.step(1);
  assert.equal(a.events.some(e => e.id === id && e.phase === 'complete'), false);
});
test('missing objects, background, contact, sleep and committed meals gate decorative actions', () => {
  const a = actor(); a.world.ball = false;
  assert.equal(a.life.command({ token: 'no-ball', kind: 'ball' }, a.world), false);
  for (const flag of ['touching', 'committed']) {
    a.life.command({ token: flag, kind: 'peek' }, a.world); a.world[flag] = true; a.step(.1);
    assert.equal(a.life.active, null); a.world[flag] = false;
  }
  a.life.command({ token: 'rest', kind: 'rest' }, a.world); a.world.enabled = false; a.step(10);
  assert.equal(a.life.active, null);
});
test('20 same-context selections avoid recent three lines; recent-play claims require completed play', () => {
  const m = emptyLifeMemory('pet');
  const seen = [];
  for (let i = 0; i < 20; i++) seen.push(chooseLifeLine(m, 'touch', 'reserved', i * 1000, false, () => 0).id);
  for (let i = 3; i < seen.length; i++) assert.ok(!seen.slice(i - 3, i).includes(seen[i]));
  assert.ok(Object.values(LIFE_LINES).flatMap(x => [...x.reserved, ...x.expressive]).length >= 60);
  assert.ok(!chooseLifeLine(m, 'offer', 'reserved', 30_000, false, () => .99).id.endsWith('remember'));
  rememberLifeCompletion(m, 'ball', 31_000);
  assert.ok(chooseLifeLine(m, 'offer', 'reserved', 32_000, false, () => .99).id.endsWith('remember'));
});

test('twenty mixed director inputs reach five families; preference requires diverse experience; replay is marked', () => {
  const a = actor(); const kinds = ['touch', 'ball', 'left', 'high_five', 'rest'];
  const m = emptyLifeMemory('p');
  for (let i = 0; i < 20; i++) { a.life.command({ token: `mix:${i}`, kind: kinds[i % 5] }, a.world); a.step(20); }
  assert.ok(new Set(a.events.filter(e => e.phase === 'complete' && !e.automatic).map(e => e.scene)).size >= 5);
  for (let i = 0; i < 8; i++) rememberLifeCompletion(m, 'ball', i * 1000);
  assert.equal(lifePreference(m), undefined);
  for (const [i, scene] of ['ball', 'peek', 'ball', 'rest', 'ball', 'gesture'].entries()) rememberLifeCompletion(m, scene, 60_000 + i * 31_000);
  assert.equal(lifePreference(m), 'ball');
  a.life.command({ token: 'album', kind: 'touch', replay: true }, a.world); a.step(9);
  assert.ok(a.events.some(e => e.replay && e.scene === 'release' && e.phase === 'complete'));
});

test('content data extension is reachable with the unchanged selector and reports exclusion trace', () => {
  const m = emptyLifeMemory('p');
  const extended = { ...LIFE_LINES, touch: { ...LIFE_LINES.touch, reserved: [...LIFE_LINES.touch.reserved, '조금만 더 기대 있을게.'] } };
  const result = chooseLifeLine(m, 'touch', 'reserved', 50_000, false, () => .999, extended);
  assert.equal(result.text, '조금만 더 기대 있을게.'); assert.equal(result.eligible.length, 5);
});
test('experience starter is once-only, uses actual shop/meal ledgers and preserves ordinary snapshots', async () => {
  const db = new DB(); const store = new LocalPetStore(db, APPROVED_GAME_CONFIG); await store.migrate();
  const original = initialPet('ordinary', 'Sim', 'reserved', 0, APPROVED_GAME_CONFIG); await store.createPet(original);
  const service = await prepareExperience(db, '모찌', 'expressive', 0);
  const before = await service.currentState();
  assert.equal(before.food, EXPERIENCE.food); assert.equal(before.coin, 270);
  assert.equal((await service.readOwnedItemKeys()).length, 3);
  const ate = await service.feedDirect(0, 'meal-1'); assert.ok(ate.totalExpUnits > before.totalExpUnits);
  const again = await prepareExperience(db, '바꾸면 안 됨', 'reserved', 50);
  assert.deepEqual(await again.currentState(), ate);
  assert.deepEqual(await store.loadPet('ordinary'), original);
});
test('optional memory survives restart; damaged/future data stays intact and write failures recover', async () => {
  const db = new DB(); const repo = new LifeMemoryStore(db, 'p'); const memory = await repo.load();
  rememberLifeCompletion(memory, 'ball', 1); await repo.save(memory);
  assert.deepEqual(await new LifeMemoryStore(db, 'p').load(), memory);
  db.fail = 'INSERT INTO living_memory'; await assert.rejects(repo.save(memory)); db.fail = ''; await repo.save(memory);
  await db.runAsync('UPDATE living_memory SET snapshot = ?', ['{"schemaVersion":9,"petId":"p"}']);
  await assert.rejects(repo.load()); assert.match((await db.getFirstAsync('SELECT snapshot FROM living_memory')).snapshot, /9/);
});

test('isolated toilet and growth fixtures use ordinary time/meal services; absent events are not projected', async () => {
  const db = new DB();
  const toilet = await prepareExperience(db, '아루콘', 'reserved', 0, 'toilet');
  const before = await toilet.currentState(); const after = await toilet.advanceTo(30_000);
  assert.ok(committedToiletScene(before, after)); assert.equal(after.poopCount, 0);
  assert.equal(committedToiletScene(after, after), null);
  assert.equal(committedToiletScene(before, { ...after, lastSimulatedAtMs: 100_000 }), null);
  const growth = await prepareExperience(db, '아루콘', 'reserved', 0, 'growth');
  const beforeMeal = await growth.currentState(); const afterMeal = await growth.feedDirect(0, 'fixture-real-meal');
  assert.ok(projectGrowth(afterMeal.totalExpUnits, APPROVED_GROWTH_POLICY).stage > projectGrowth(beforeMeal.totalExpUnits, APPROVED_GROWTH_POLICY).stage);
  assert.equal((await toilet.currentState()).totalExpUnits, 0);
});

const origin = Date.parse('2026-09-29T12:00:00Z');
test('synthetic activity -> earned food -> unattended threshold meal -> actual level and persistence, no manual play', async () => {
  const db = new DB(); const service = await prepareExperience(db, '보리', 'reserved', origin, 'auto_growth', '1');
  const before = await service.currentState(); assert.equal(before.food, 1); assert.equal(before.autoFeedOptIn, true);
  assert.equal(projectGrowth(before.totalExpUnits, APPROVED_GROWTH_POLICY).level, 5);
  const eaten = await service.advanceTo(origin + 30_000);
  const view = await service.resolveEligibleGrowth(() => .3);
  assert.equal(view.projection.level, 6); assert.equal(eaten.food, 0);
  assert.equal(eaten.totalExpUnits - before.totalExpUnits, 15_000_000);
  assert.ok(confirmedMealCue(before.totalExpUnits, eaten.totalExpUnits, await service.readJournal(), { mode: 'auto', sinceMs: origin, atMs: origin + 30_000 }, before.petId));
  assert.equal((await service.deriveCareProfile()).interactionDays, 0);
  const reload = await prepareExperience(db, '이름 변경 금지', 'expressive', origin + 30_000, 'auto_growth', '1');
  const same = await reload.resolveEligibleGrowth(() => { throw Error('must not reroll'); });
  assert.equal(same.state.givenName, '보리'); assert.equal(same.state.personalityProfileId, 'reserved');
  assert.equal(same.state.totalExpUnits, eaten.totalExpUnits); assert.equal(same.sex, view.sex);
});
for (const form of ['piko', 'mongle', 'mallu', 'mono']) test(`real auto meal resolves ${form} from labeled synthetic care history and stays fixed after restart`, async () => {
  const db = new DB(); const service = await prepareExperience(db, '아루콘', 'reserved', origin, `evolution_${form}`);
  const before = await service.currentState(); assert.equal(before.formId, 'arucon');
  assert.equal(projectGrowth(before.totalExpUnits, APPROVED_GROWTH_POLICY).level, 15);
  await service.advanceTo(origin + 30_000); const grown = await service.resolveEligibleGrowth(() => .4);
  assert.equal(grown.state.formId, form); assert.equal(grown.projection.level, 16);
  const loaded = await prepareExperience(db, 'other', 'expressive', origin + 60_000, `evolution_${form}`);
  const restored = await loaded.resolveEligibleGrowth(() => { throw Error('must not reroll'); });
  assert.equal(restored.state.formId, form); assert.equal(restored.state.totalExpUnits, grown.state.totalExpUnits);
  assert.equal(restored.state.personalityProfileId, 'reserved');
});
test('otherwise equal isolated no-data and synthetic sleep bonus cases consume through the same service', async () => {
  const db = new DB(); const plain = await prepareExperience(db, '같은 아이', 'reserved', origin, 'sleep_plain');
  const bonus = await prepareExperience(db, '같은 아이', 'reserved', origin, 'sleep_bonus');
  const a = await plain.advanceTo(origin + 30_000), b = await bonus.advanceTo(origin + 30_000);
  assert.equal(a.food, 0); assert.equal(b.food, 0);
  assert.equal(a.totalExpUnits, 15_000_000); assert.equal(b.totalExpUnits, 18_750_000);
  assert.equal(a.sleepGrowthMultiplier, 1); assert.equal(b.sleepGrowthMultiplier, 1.25);
});
test('hunger is one episode per need-state, does not require a ball and never becomes an economic interaction', () => {
  const a = actor(); a.world.ball = false; a.world.cushion = false; a.world.hungry = true; a.world.mealAvailability = 'no_food';
  a.step(180); assert.equal(a.events.filter(e => e.scene === 'hungry' && e.phase === 'perform').length, 1);
  assert.ok(new Set(a.events.filter(e => e.phase === 'complete').map(e => e.scene)).size >= 3);
  a.world.hungry = false; a.step(30); a.world.hungry = true; a.step(60);
  assert.equal(a.events.filter(e => e.scene === 'hungry' && e.phase === 'perform').length, 2);
});
test('growth changes body presence and autonomous stretch/settle expressions without touching EXP policy', () => {
  const baby = growthExpression(1), child = growthExpression(2), evolved = growthExpression(3);
  assert.ok(child.scale > baby.scale && child.stretchLift > baby.stretchLift && child.settleLean > baby.settleLean);
  assert.ok(evolved.scale > child.scale); assert.equal(growthExpression('final').maturity, 4);
});

test('cancelled meal completion cannot be confused with a later meal or album replay', () => {
  const a = actor(); a.life.command({ token: 'meal:first', kind: 'meal' }, a.world); a.step(1);
  a.life.cancel(); a.life.command({ token: 'meal:second', kind: 'meal' }, a.world); a.step(5);
  assert.ok(a.events.some(e => e.commandToken === 'meal:first' && e.phase === 'cancel'));
  assert.ok(!a.events.some(e => e.commandToken === 'meal:first' && e.phase === 'complete'));
  assert.ok(a.events.some(e => e.commandToken === 'meal:second' && e.phase === 'complete'));
  a.life.command({ token: 'album:meal', kind: 'meal', replay: true }, a.world); a.step(5);
  assert.ok(a.events.some(e => e.commandToken === 'album:meal' && e.replay && e.phase === 'complete'));
});

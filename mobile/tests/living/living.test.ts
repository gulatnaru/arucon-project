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
test('two minutes include purposeful nonmovement families and a finite unpressured offer', () => {
  const a = actor(); a.step(120);
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

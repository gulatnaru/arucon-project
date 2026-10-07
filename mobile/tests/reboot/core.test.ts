import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { RebootMemoryStore } from '../../src/reboot/memory';
import { RebootDirector, type RebootWorld } from '../../src/reboot/director';
import { hatReaction, REBOOT_ITEM, type RebootFact, type RebootEvent } from '../../src/reboot/contracts';
import { RebootSemanticQueue, EMBEDDING_IDENTITY, cosine, type RealEmbeddingPort } from '../../src/reboot/semantic';
import type { SqlConnection, SqlExecutor } from '../../src/storage/sqlite';
import * as THREE from 'three';
import { applyRebootPose } from '../../src/reboot/pose';

class DB implements SqlConnection {
  native = new DatabaseSync(':memory:'); tail: Promise<void> = Promise.resolve(); failWrite = false;
  async execAsync(sql: string) { this.native.exec(sql); }
  async runAsync(sql: string, p: readonly (string | number | null)[] = []) {
    if (this.failWrite) { this.failWrite = false; throw new Error('test disk failure'); }
    return this.native.prepare(sql).run(...p);
  }
  async getFirstAsync<T>(sql: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(sql).get(...p) as T ?? null; }
  async getAllAsync<T>(sql: string, p: readonly (string | number | null)[] = []) { return this.native.prepare(sql).all(...p) as T[]; }
  async withExclusiveTransactionAsync<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    let release = () => {}; const previous = this.tail; this.tail = new Promise(resolve => { release = resolve; }); await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (e) { this.native.exec('ROLLBACK'); throw e; } finally { release(); }
  }
}
const fact: RebootFact = { petId: 'reboot-01:main', eventId: 'hat:1', kind: 'hat_used', itemId: REBOOT_ITEM.hat,
  atMs: 100, completed: true, stage: 'baby' };
test('first wear, completed familiarity, busy context and cold read use this pet only', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId), initial = await store.load();
  assert.equal(hatReaction(initial), 'hat_first');
  const worn = await store.wear(true); assert.equal(hatReaction(worn), 'hat_first');
  await store.complete(fact, worn.revision);
  const restored = await new RebootMemoryStore(db, fact.petId).load();
  assert.equal(hatReaction(restored), 'hat_again'); assert.equal(hatReaction(restored, 'explore'), 'hat_busy');
  const other = await new RebootMemoryStore(db, 'reboot-01:other').load();
  assert.equal(hatReaction(other), 'hat_first'); await assert.rejects(store.complete({ ...fact, petId: other.petId }, 0));
});
test('stale/canceled gear and duplicate completion cannot manufacture memory', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId); await store.load();
  const worn = await store.wear(true); await store.wear(false);
  assert.equal((await store.complete(fact, worn.revision)).events.length, 0);
  const again = await store.wear(true); await store.complete(fact, again.revision);
  assert.equal((await store.complete(fact, again.revision)).events.length, 1);
  const x = await store.wear(false); assert.equal((await store.wear(true, 0)).hatWorn, false); assert.equal((await store.load()).revision, x.revision);
});
test('actual cushion coordinates/revision outrank remembered old location and stale retry', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId); const old = await store.load();
  await store.complete({ ...fact, kind: 'cushion_used', itemId: REBOOT_ITEM.cushion, position: old.cushion, itemRevision: 0 }, old.revision);
  const moved = await store.moveCushion({ x: 1.1, z: 1.3 });
  assert.notDeepEqual(moved.events[0].position, moved.cushion);
  await store.complete({ ...fact, eventId: 'bad', kind: 'cushion_used', itemId: REBOOT_ITEM.cushion, position: old.cushion, itemRevision: 0 }, moved.revision);
  assert.equal((await store.load()).events.length, 1);
  assert.deepEqual((await store.moveCushion({ x: -1, z: 0 }, 0)).cushion, moved.cushion);
});
test('write failure rolls back; bounded memory and economic tables remain separate', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId); await store.load();
  db.failWrite = true; await assert.rejects(store.wear(true)); assert.equal((await store.load()).hatWorn, false);
  let s = await store.wear(true);
  for (let i = 0; i < 90; i++) s = await store.complete({ ...fact, eventId: 'done:'+i }, s.revision);
  assert.equal(s.events.length, 64); assert.equal(db.native.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='meal_ledger'").get()?.n, 0);
});
test('hand is not contact before approach; early withdrawal never completes experience', () => {
  const events: RebootEvent[] = [], world: RebootWorld = { enabled: true, awake: true, moving: false, touching: false,
    position: { x: 0, z: 1 }, view: { stage: 'baby', hatWorn: false, revision: 0, handOffered: true, cushion: { x: -1, z: 0, revision: 0 } } };
  const director = new RebootDirector({ navigate: () => { world.moving = true; return true; }, stop: () => {}, event: e => events.push(e) }, () => .4);
  director.update(.1, world); assert.equal(events.some(e => e.phase === 'contact'), false);
  for (let i = 0; i < 8; i++) director.update(.1, world);
  world.view = { ...world.view, handOffered: false }; director.update(.1, world);
  assert.equal(events.some(e => e.phase === 'complete'), false); assert.ok(events.some(e => e.phase === 'cancel'));
});
test('all three stages keep contact until withdrawal then recover into independent life', () => {
  for (const stage of ['baby', 'growing', 'evolved'] as const) {
    const events: RebootEvent[] = [], world: RebootWorld = { enabled: true, awake: true, moving: false, touching: false, position: { x: 0, z: 1 },
      view: { stage, hatWorn: false, revision: 0, handOffered: true, cushion: { x: -1, z: 0, revision: 0 } } };
    const director = new RebootDirector({ navigate: p => { world.position = p; return true; }, stop: () => {}, event: e => events.push(e) }, () => .4);
    for (let i = 0; i < 100; i++) director.update(.1, world);
    assert.equal(events.filter(e => e.phase === 'complete').length, 0); assert.equal(director.pose?.phase, 'contact');
    world.view = { ...world.view, handOffered: false };
    for (let i = 0; i < 60; i++) director.update(.1, world);
    assert.equal(events.filter(e => e.kind === 'hand' && e.phase === 'complete').length, 1);
    for (let i = 0; i < 130; i++) director.update(.1, world);
    assert.ok(events.some(e => e.automatic)); world.awake = false; director.update(.1, world); assert.equal(director.pose, undefined);
  }
});
test('removing the hat cancels unfinished wear without a completed experience', () => {
  const events: RebootEvent[] = [], world: RebootWorld = { enabled: true, awake: true, moving: false, touching: false,
    position: { x: 0, z: 1 }, view: { stage: 'baby', hatWorn: true, revision: 1, handOffered: false,
      cushion: { x: -1, z: 0, revision: 0 }, command: { token: 'wear:1', kind: 'hat_first', sourceRevision: 1 } } };
  const director = new RebootDirector({ navigate: p => { world.position = p; return true; }, stop: () => {}, event: e => events.push(e) });
  for (let i = 0; i < 12; i++) director.update(.1, world);
  assert.equal(director.pose?.phase, 'contact');
  world.view = { ...world.view, hatWorn: false, revision: 2 }; director.update(.1, world);
  assert.equal(director.pose, undefined); assert.ok(events.some(e => e.phase === 'cancel'));
  assert.equal(events.filter(e => e.kind === 'hat_first' && e.phase === 'complete').length, 0);
});
test('withdrawal starts at held weight and returns body/feet to neutral in every growth preview', () => {
  const model = new THREE.Group(), orientation = new THREE.Group();
  for (const name of ['Foot_R_Front', 'Foot_L_Front', 'Foot_R_Back', 'Foot_L_Back']) { const foot = new THREE.Group(); foot.name = name; model.add(foot); }
  const snapshot = () => [ ...orientation.position.toArray(), ...orientation.rotation.toArray().slice(0, 3),
    ...orientation.scale.toArray(), ...model.children.flatMap(x => x.position.toArray()) ] as number[];
  for (const stage of ['baby', 'growing', 'evolved'] as const) {
    for (const releaseFrom of [.15, 1]) {
      applyRebootPose(orientation, model, { kind: 'hand', phase: 'contact', progress: releaseFrom, stage, held: true }, 0, false, false);
      const held = snapshot();
      applyRebootPose(orientation, model, { kind: 'hand', phase: 'recover', progress: 0, releaseFrom, stage, held: false }, 0, false, false);
      assert.deepEqual(snapshot(), held, `${stage} release does not jump`);
      applyRebootPose(orientation, model, { kind: 'hand', phase: 'recover', progress: 1, releaseFrom, stage, held: false }, 0, false, false);
      const restored = snapshot();
      applyRebootPose(orientation, model, undefined, 0, false, false);
      assert.ok(restored.every((x, i) => Math.abs(x - snapshot()[i]) < 1e-12), `${stage} neutral restored`);
    }
  }
});
test('semantic queue TEST DOUBLE rejects stale owner/state and invalid vectors, never invents actions', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId); await store.load(); const worn = await store.wear(true);
  const snapshot = await store.complete(fact, worn.revision);
  let state = { petId: snapshot.petId, revision: snapshot.revision, awake: true };
  const vector = Array(768).fill(1) as number[];
  const port: RealEmbeddingPort = { identity: EMBEDDING_IDENTITY, embed: async () => { state = { ...state, awake: false }; return [vector, vector]; } };
  assert.equal(await new RebootSemanticQueue(port).decide(snapshot, REBOOT_ITEM.hat, ['hat_again'], 'hat_again', () => state), null);
  assert.throws(() => cosine([NaN], [1])); assert.throws(() => cosine(Array(128).fill(0), Array(128).fill(0)));
  state = { ...state, awake: true };
  await assert.rejects(new RebootSemanticQueue(null).decide(snapshot, REBOOT_ITEM.hat, ['hat_first'], 'hat_again', () => state));
});
test('semantic timeout TEST DOUBLE falls back and late result cannot resurrect a scene', async () => {
  const db = new DB(), store = new RebootMemoryStore(db, fact.petId); await store.load(); const worn = await store.wear(true); const snapshot = await store.complete(fact, worn.revision);
  const port: RealEmbeddingPort = { identity: EMBEDDING_IDENTITY, embed: async (_texts, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))) };
  const decision = await new RebootSemanticQueue(port, 10).decide(snapshot, REBOOT_ITEM.hat, ['hat_again'], 'hat_again', () => ({ petId: snapshot.petId, revision: snapshot.revision, awake: true }));
  assert.equal(decision?.backend, 'A_FALLBACK'); assert.deepEqual(decision?.memoryIds, [fact.eventId]);
});

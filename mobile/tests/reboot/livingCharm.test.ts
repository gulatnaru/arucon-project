import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { selectLivingScene } from '../../src/reboot/autonomy';
import { PERSONALITY_IDS, newPersonality } from '../../src/reboot/personality';
import { BabyLines } from '../../src/reboot/babyLife';
import { RebootDirector } from '../../src/reboot/director';
import { LivingObservation } from '../../src/reboot/observation';
import { applyBabyPose, babyExpressionSnapshot } from '../../src/reboot/babyPose';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { batchStaticRoom } from '../../src/scene/staticRoomBatch';
import type { RebootEvent, RebootFact, RebootView } from '../../src/reboot/contracts';
const base = (id: typeof PERSONALITY_IDS[number]) => ({ profile: id, axes: newPersonality(id).latent,
  petId: newPersonality(id).petId, position: { x: 0, z: 1.8 }, cushion: { x: -1.6, z: .2, revision: 0 },
  facts: [] as RebootFact[], recent: [] as string[], activeScenes: 0, random: .4, atMs: 1_000_000 });
test('contextual motives remain diverse and quiet over time, not a two-scene or random-only loop', () => {
  for (const id of PERSONALITY_IDS) { let x = base(id); const seen = new Set<string>(); let outcome;
    for (let i = 0; i < 40; i++) { const s = selectLivingScene({ ...x, lastOutcome: outcome }); seen.add(s.focus);
      assert.ok(s.reason.includes('score=')); assert.ok(s.plan.beats.length >= 3);
      outcome = s.outcome; x = { ...x, position: s.target, recent: [...x.recent, s.id].slice(-12), activeScenes: ['cushion', 'user', 'quiet_floor'].includes(s.focus) ? 0 : x.activeScenes + 1 };
    } assert.ok(seen.size >= 5, `${id}: ${[...seen]}`);
  }
  const x = base('playful'); assert.equal(selectLivingScene(x).focus, selectLivingScene({ ...x, random: .9 }).focus);
});
test('owned completed experience changes visible approach/settling; foreign/future facts do not', () => {
  const x = base('warm'), f: RebootFact = { petId: x.petId, eventId: 'actual-hand', kind: 'hand', itemId: 'user:hand', atMs: x.atMs - 1000, completed: true, stage: 'baby' };
  const first = selectLivingScene(x), known = selectLivingScene({ ...x, facts: [f] });
  assert.equal(known.focus, 'user'); assert.deepEqual(known.evidenceIds, ['actual-hand']); assert.notDeepEqual(first.plan, known.plan);
  assert.deepEqual(selectLivingScene({ ...x, facts: [{ ...f, petId: 'other' }] }), first);
  assert.deepEqual(selectLivingScene({ ...x, facts: [{ ...f, atMs: x.atMs + 1 }] }), first);
});
test('resting reads current cushion truth, and expression creates no reward commands', () => {
  const s = selectLivingScene({ ...base('poised'), activeScenes: 9, cushion: { x: 1.3, z: 2, revision: 4 } });
  assert.ok(['cushion', 'quiet_floor'].includes(s.focus)); if (s.focus === 'cushion') assert.deepEqual(s.target, { x: 1.3, z: 2, revision: 4 }); assert.equal('reward' in s, false);
});
test('speech respects semantic cooldown and silence; contextual head/body response differs', () => {
  const v = new BabyLines(), s = selectLivingScene(base('playful')); assert.ok(s.speechBeat);
  assert.ok(v.selectScene(s, s.speechBeat!, 'a', 1000)); assert.equal(v.selectScene(s, s.speechBeat!, 'b', 60_000), null);
  assert.equal(v.lastDecision, 'RECENT_MEANING');
  const a = v.selectHand('hand_paw_offer', 'h1', 70_000, 'playful', 'head'), b = v.selectHand('hand_paw_offer', 'h2', 71_000, 'playful', 'body', 'baby_discover');
  assert.ok(a && b); assert.notEqual(a.text, b.text); assert.equal(v.selectHand('hand_silent', 'h3', 72_000, 'warm', 'head'), null);
});
test('ten-minute normal director simulation completes varied goals and no-input rest', () => {
  for (const profile of PERSONALITY_IDS) { const f = newPersonality(profile), events: RebootEvent[] = []; let at = 1_000_000, position = { x: 0, z: 1.8 };
    const view: RebootView = { stage: 'baby', revision: 0, hatWorn: false, cushion: { x: -1.6, z: .2, revision: 0 }, handOffered: false, babyCharm: true, livingCharm: true, recentExperience: [], personality: { foundation: f, axes: f.latent, randomState: f.seed, evidenceIds: [] } };
    const d = new RebootDirector({ navigate: p => { position = p; return true; }, stop: () => {}, event: e => events.push(e) }, () => .4, () => at);
    for (let i = 0; i < 12_000; i++) { at += 50; d.update(.05, { enabled: true, awake: true, moving: false, touching: false, position, view }); }
    const done = events.filter(e => e.phase === 'complete'); assert.ok(done.length >= 15); assert.ok(new Set(done.map(e => e.scene?.focus)).size >= 5);
    assert.ok(done.some(e => e.scene?.focus === 'cushion')); assert.ok(done.every(e => e.automatic));
    const n = done.length; d.update(.05, { enabled: false, awake: true, moving: false, touching: false, position, view }); assert.equal(events.filter(e => e.phase === 'complete').length, n);
  }
});
test('observation cannot turn a short or interrupted input interval into ten-minute proof', () => {
  const o = new LivingObservation(); o.start(100); o.stop(300, 'USER_INPUT'); assert.equal(o.snapshot(900).status, 'INTERRUPTED'); assert.equal(o.snapshot(900).elapsedMs, 200);
  o.start(1000); o.stop(601_000); assert.equal(o.snapshot(601_000).elapsedMs, 600_000); assert.equal(o.snapshot(601_000).status, 'COMPLETE');
});
test('actual two-paw interest controls stay balanced and recover without a persistent sly-eye modifier', async () => {
  const bytes = readFileSync('assets/reboot-04/baby-two-paws.glb'), gltf = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer), o = new THREE.Group();
  for (let i = 0; i < 40; i++) { o.scale.setScalar(1); applyBabyPose(o, gltf.scene, { kind: 'baby_discover', phase: 'contact', progress: .3, stage: 'baby', held: false, personalityId: 'poised', baby: { beat: { id: 'scan', seconds: 1, expression: 'curious' }, progress: .3 } }, i * .05, .05, false, false, true); }
  const eyes = babyExpressionSnapshot(gltf.scene)!.eyes; assert.equal(eyes.length, 2); assert.equal(eyes[0].weights.Mischief, 0); assert.deepEqual(eyes[0].weights, eyes[1].weights);
  for (let i = 0; i < 60; i++) { o.scale.setScalar(1); applyBabyPose(o, gltf.scene, undefined, 3 + i * .05, .05, false, false, true); }
  assert.ok(babyExpressionSnapshot(gltf.scene)!.eyes.every(e => e.weights.Surprised < .001));
});
test('actual Blender room has four independent roles, finite opaque batched meshes and unchanged movable pivots', async () => {
  const bytes = readFileSync('assets/reboot-05/sunlit-room.glb'), gltf = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  for (const role of ['RoomStatic', 'Cushion', 'Toilet', 'Table']) {
    const source = gltf.scene.getObjectByName(role)!; assert.ok(source); assert.equal(source.position.length(), 0);
    const batch = batchStaticRoom([source], 'vertex_lit'); assert.ok(batch.geometry.getAttribute('position').count > 0);
    assert.ok(Array.from(batch.geometry.getAttribute('normal').array).every(Number.isFinite)); batch.geometry.computeBoundingBox();
    if (role === 'Cushion') { assert.ok(batch.geometry.boundingBox!.max.y < .6); assert.ok(batch.geometry.boundingBox!.max.x < 1.1); }
  }
});

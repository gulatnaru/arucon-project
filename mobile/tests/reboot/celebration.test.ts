import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { celebrationAct, celebrationPlan } from '../../src/reboot/celebration';
import { evaluateLifeContext, emptyContextHistory, syntheticLifeContext } from '../../src/reboot/lifeContext';
import { PERSONALITY_IDS, newPersonality } from '../../src/reboot/personality';
import { RebootDirector, type RebootWorld } from '../../src/reboot/director';
import { selectLivingScene } from '../../src/reboot/autonomy';
import { applyBabyPose, babyExpressionSnapshot, resetBabyPose } from '../../src/reboot/babyPose';
import { parseGlb } from '../../src/scene/gltfRuntime';
import type { RebootEvent, RebootView, ResumableIntent } from '../../src/reboot/contracts';
import { ComparisonWindow } from '../../src/scene/comparisonWindow';

test('same goal celebrates hands-free, then settles; a new real synthetic day can vary without bypassing claims', () => {
  for (const profile of PERSONALITY_IDS) {
    const c = syntheticLifeContext('goal', 0), cue = evaluateLifeContext(c, emptyContextHistory(), profile, c.queriedAtMs).cue!;
    assert.equal(cue.plan.beats[0].id, 'cheer_notice');
    assert.ok(cue.plan.beats.findIndex(b => b.id === cue.speechBeat) > 0);
    assert.ok(!cue.plan.beats.some(b => ['lean', 'side_nuzzle', 'head_lean', 'paw_flick'].includes(b.id)));
    assert.equal(cue.plan.beats.at(-1)!.id, 'cheer_settle');
    const next = syntheticLifeContext('goal', 1);
    assert.notEqual(evaluateLifeContext(next, emptyContextHistory(), profile, next.queriedAtMs).cue!.text, cue.text);
  }
  assert.equal(celebrationPlan('playful').beats.filter(b => b.id === 'cheer_bounce').length, 1);
  const warm = celebrationAct('cheer_share', .4, 'warm'), poised = celebrationAct('cheer_salute', .4, 'poised');
  assert.ok(warm.z > poised.z); assert.ok(poised.pawLift > warm.pawLift); assert.ok(warm.x < 0 && poised.x < 0);
});
test('paws and weight return to support at beat boundaries, with no constant wink or unsupported hand lean', () => {
  for (const profile of PERSONALITY_IDS) for (const b of celebrationPlan(profile, 1).beats) {
    for (const p of [0, 1]) { const a = celebrationAct(b.id, p, profile); assert.ok(Math.abs(a.pawLift) < 1e-8); assert.ok(Math.abs(a.x) < 1e-8); }
    for (let i = 0; i <= 50; i++) { const a = celebrationAct(b.id, i / 50, profile); assert.ok(Object.values(a).filter(x => typeof x === 'number').every(Number.isFinite)); assert.ok(!('Mischief' in a.face)); assert.ok(!('Sleepy' in a.face)); }
  }
});

function world(profile: typeof PERSONALITY_IDS[number]): RebootWorld {
  const f = newPersonality(profile), c = syntheticLifeContext('goal', 0);
  return { enabled: true, awake: true, moving: false, touching: false, position: { x: 0, z: 2.55 },
    view: { stage: 'baby', babyCharm: true, sizeCandidate: 1.35, revision: 1, hatWorn: false, handOffered: false,
      cushion: { x: -1.6, z: .2, revision: 0 }, personality: { foundation: f, axes: f.latent, randomState: f.seed, evidenceIds: [] },
      contextGeneration: 1, command: { token: 'goal', kind: 'life_context', sourceRevision: 1, contextGeneration: 1,
        contextCue: evaluateLifeContext(c, emptyContextHistory(), profile, c.queriedAtMs).cue!, target: { x: 0, z: 2.55 } } } };
}
test('goal at current position completes; poised returns to the actual interrupted interest, cancel never revives it', () => {
  for (const cancel of [false, true]) {
    const w = world('poised'), f = w.view.personality!.foundation, events: RebootEvent[] = [];
    const scene = selectLivingScene({ profile: 'poised', axes: f.latent, petId: f.petId, position: w.position, cushion: w.view.cushion, facts: [], recent: [], activeScenes: 0, random: .1, atMs: 1_000_000 });
    assert.equal(scene.kind, 'baby_discover');
    w.view = { ...w.view, command: { ...w.view.command!, resume: scene.kind as ResumableIntent, resumeTarget: scene.target, resumeScene: scene } };
    const d = new RebootDirector({ navigate: p => { w.position = p; return true; }, stop: () => {}, event: e => events.push(e) });
    for (let i = 0; i < 180; i++) { if (cancel && i === 30) w.enabled = false; d.update(.05, w); }
    assert.equal(events.filter(e => e.token === 'goal' && e.phase === 'complete').length, cancel ? 0 : 1);
    assert.equal(events.some(e => e.phase === 'start' && e.token.includes(':resume:') && e.scene?.focus === scene.focus), !cancel);
    if (cancel) { assert.equal(d.pose, undefined); w.enabled = true; for (let i = 0; i < 25; i++) d.update(.05, w); assert.equal(events.some(e => e.token.includes(':resume:')), false); }
  }
});
test('readability size adjusts the same hand-contact geometry without changing the world target or game state', () => {
const targets: {x:number;z:number}[] = [];
  for (const candidate of [false, true]) {
    const w = world('warm'); w.view = { ...w.view, command: undefined, handOffered: true, readabilityCandidate: candidate } as RebootView;
    const d = new RebootDirector({ navigate: p => { targets.push(p); return true; }, stop: () => {}, event: () => {} });
    for (let i = 0; i < 20; i++) d.update(.05, w);
  }
  assert.equal(targets.length, 2); assert.equal(targets[0].x, targets[1].x); assert.ok(targets[1].z < targets[0].z);
  assert.ok(Math.abs((3.35 - targets[1].z - .205) / (3.35 - targets[0].z - .205) - 1.12) < .00001);
});
test('opening a menu invalidates the benchmark, while closing it allows normal celebration and life again', () => {
  const c = new ComparisonWindow('case'); c.step(0, 1000, true, true); c.step(30000, 31000, true, true);
  assert.equal(c.step(31000, 32000, true, false)?.phase, 'interrupted');
  assert.equal(c.finish(100000), undefined); assert.equal(c.phase, 'interrupted');
  assert.equal(c.actorEnabled, false); assert.equal(c.ordinaryPlayEnabled, true); assert.equal(c.step(32000, 33000, true, true), undefined);
  const w = world('warm'), events: RebootEvent[] = [], d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) });
  for (let i = 0; i < 200; i++) d.update(.05, { ...w, enabled: c.ordinaryPlayEnabled });
  assert.equal(events.filter(e => e.token === 'goal' && e.phase === 'complete').length, 1);
});
test('actual two-paw facial morphs remain symmetric through goal/cancel recovery for all profiles', async () => {
  const bytes = readFileSync('assets/reboot-04/baby-two-paws.glb'), gltf = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer), o = new THREE.Group();
  for (const profile of PERSONALITY_IDS) {
    resetBabyPose(gltf.scene);
    for (const beat of celebrationPlan(profile).beats) for (let i = 0; i < 20; i++) {
      o.scale.setScalar(1); applyBabyPose(o, gltf.scene, { kind: 'life_context', phase: 'contact', progress: i / 20, stage: 'baby', held: false, personalityId: profile, baby: { beat, progress: i / 20 } }, i * .05, .05, false, false, true, false, true);
      const eyes = babyExpressionSnapshot(gltf.scene)!.eyes; assert.deepEqual(eyes[0].weights, eyes[1].weights); assert.equal(eyes[0].weights.Mischief, 0);
    }
    for (let i = 0; i < 60; i++) { o.scale.setScalar(1); applyBabyPose(o, gltf.scene, undefined, i * .05, .05, false, false, true); }
    assert.ok(babyExpressionSnapshot(gltf.scene)!.eyes.every(e => e.weights.Happy < .001));
  }
});

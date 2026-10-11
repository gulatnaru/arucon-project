import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { applyBabyPose, resetBabyPose, babyExpressionSnapshot } from '../../src/reboot/babyPose';
import { BlenderBabyRig } from '../../src/reboot/blenderRig';
import { RebootDirector, type RebootPose, type RebootWorld } from '../../src/reboot/director';
import { BabyLines } from '../../src/reboot/babyLife';
import { PERSONALITY_IDS, newPersonality } from '../../src/reboot/personality';
import type { BabyExpression, RebootEvent } from '../../src/reboot/contracts';

async function rig() {
  const bytes = await readFile(new NodeURL('../../assets/reboot-04/baby-two-paws.glb', import.meta.url));
  const g = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const bridge = new BlenderBabyRig(g.scene, true), root = new THREE.Group(); root.add(g.scene);
  const step = (pose?: RebootPose, seconds = 1, start = 0, reduced = false) => {
    for (let i = 0; i < seconds * 60; i++) { root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(1);
      applyBabyPose(root, g.scene, pose, start + i / 60, 1 / 60, false, reduced, true, false, true); bridge.apply(); }
  };
  return { ...g, bridge, step, root };
}
const pose = (expression: BabyExpression, id = 'notice', progress = .5): RebootPose => ({ kind: 'baby_discover', stage: 'baby', phase: 'contact', held: false, progress,
  baby: { beat: { id, seconds: 1, expression }, progress } });

test('actual baby interest uses balanced eyes/lids; intentional wink is brief and restores both eyes', async () => {
  const r = await rig();
  for (const expression of ['curious', 'excited', 'surprised', 'content', 'playful'] as const) {
    r.step(pose(expression), 2);
    const eyes = babyExpressionSnapshot(r.scene)!.eyes;
    assert.deepEqual(eyes[0].weights, eyes[1].weights);
    assert.equal(eyes[0].weights.Curious, 0);
    for (const side of [-1, 1]) {
      const lid = r.scene.getObjectByName(`Lid_${side}`) as THREE.Mesh;
      const eye = r.scene.getObjectByName(side < 0 ? 'Eye_L' : 'Eye_R') as THREE.Mesh;
      for (const key of ['Blink', 'Curious', 'Surprised']) assert.equal(lid.morphTargetInfluences![lid.morphTargetDictionary![key]], eye.morphTargetInfluences![eye.morphTargetDictionary![key]]);
    }
  }
  r.step(pose('playful', 'paw_flick', .30), .1, 2.5);
  let e = babyExpressionSnapshot(r.scene)!.eyes; assert.ok(e[0].weights.Blink > .8 && e[1].weights.Blink < .05);
  r.step(pose('playful', 'paw_flick', .65), .5, 2.5); e = babyExpressionSnapshot(r.scene)!.eyes; assert.equal(e[0].weights.Blink, e[1].weights.Blink);
  r.bridge.apply(true); resetBabyPose(r.scene); r.step(undefined, 1, 2.5);
  assert.ok(babyExpressionSnapshot(r.scene)!.eyes.every(x => x.weights.Curious === 0 && x.weights.Blink < .05));
});

test('actual ear bones retain attachment/rest and express event tension without periodic flapping', async () => {
  const r = await rig(), left = r.scene.getObjectByName('EarL')!, right = r.scene.getObjectByName('EarR')!;
  const positions = [left.position.clone(), right.position.clone()];
  r.step(pose('curious'), 3, 1); const interest = babyExpressionSnapshot(r.scene)!.ears;
  r.step(pose('curious'), 3, 120); const later = babyExpressionSnapshot(r.scene)!.ears;
  assert.ok(Math.abs(interest[0].z - later[0].z) < 1e-8);
  r.step(pose('content'), 3); const relaxed = babyExpressionSnapshot(r.scene)!.ears;
  assert.ok(interest[0].z > .1 && relaxed[0].z < -.1);
  assert.ok(left.position.equals(positions[0]) && right.position.equals(positions[1]));
  r.step(pose('curious'), 3, 0, true); const reduced = babyExpressionSnapshot(r.scene)!.ears;
  assert.ok(reduced[0].z > 0 && reduced[0].z < interest[0].z);
});

test('spoken hand beat/face agrees with the actual continuous hand act; cancel never completes', () => {
  for (const id of PERSONALITY_IDS) {
    const f = newPersonality(id), events: RebootEvent[] = [];
    const w: RebootWorld = { enabled: true, awake: true, touching: false, moving: false, position: { x: 0, z: 2.6 },
      view: { stage: 'baby', babyCharm: true, hatWorn: false, revision: 0, cushion: { x: -1, z: .2, revision: 0 }, handOffered: true,
        personality: { foundation: f, axes: f.latent, randomState: f.seed, evidenceIds: [] } } };
    const d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) });
    for (let i = 0; i < 100; i++) d.update(.05, w);
    const contacts = events.filter(e => e.handActing); assert.ok(contacts.length >= 3);
    for (const e of contacts) { assert.equal(e.babyBeat, e.handActing!.beat); assert.equal(e.expression, e.handActing!.expression); }
    w.enabled = false; d.update(.05, w); assert.equal(d.pose, undefined); assert.equal(events.some(e => e.phase === 'complete'), false);
  }
});

test('witnessed cushion move looks to current truth; unseen change may glance at owned old position', () => {
  for (const observation of ['witnessed', 'remembered'] as const) {
    const current = { x: 1.2, z: .5, revision: 2 }, old = { x: -1.3, z: .1 };
    const w: RebootWorld = { enabled: true, awake: true, touching: false, moving: false, position: { x: 0, z: 2 },
      view: { stage: 'baby', babyCharm: true, hatWorn: false, revision: 3, handOffered: false, cushion: current,
        command: { token: observation, kind: 'cushion_changed', sourceRevision: 3, itemRevision: 2, target: old, observation } } };
    const targets: object[] = [], d = new RebootDirector({ navigate: p => { targets.push(p); return true; }, stop: () => {}, event: () => {} });
    d.update(.05, w); assert.deepEqual(d.pose!.gazeTarget, observation === 'witnessed' ? current : old);
    for (let i = 0; i < 24; i++) d.update(.05, w); assert.deepEqual(targets, [current]);
  }
});

test('speech follows meaningful acts, excludes recent meaning across aliases and does not narrate imaginary hands', () => {
  for (const id of PERSONALITY_IDS) {
    const voice = new BabyLines(), texts: string[] = [];
    assert.equal(voice.select('hand_silent', 'peek', false, 0, id), null);
    for (let n = 0; n < 8; n++) { const key = n % 2 ? 'hand_paw_flick' : 'hand_paw_offer';
      const line = voice.select(key, String(n), false, 4000 * n, id)!; assert.ok(line); assert.ok(!texts.slice(-3).includes(line.text)); texts.push(line.text);
      assert.equal(voice.select('hand_paw_flick', String(n), false, 4000 * n + 3500, id), null);
    }
    const free = voice.select('side_nuzzle', 'free', true, 100000, id)!; assert.ok(free && !/손/.test(free.text));
    const seen = voice.select('cushion_seen', 'move', false, 120000, id)!; assert.ok(!/저기였|다시 찾아/.test(seen.text));
  }
});

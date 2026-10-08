import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RebootDirector, type RebootWorld, type RebootPose } from '../../src/reboot/director';
import { babyPlan, babyTarget, BabyLines, BABY_SIZE_CANDIDATES, BABY_SIZE_APPROVAL } from '../../src/reboot/babyLife';
import { applyBabyPose, resetBabyPose } from '../../src/reboot/babyPose';
import { hatReaction, type RebootEvent, type RebootSnapshot } from '../../src/reboot/contracts';
import { petBubbleBounds } from '../../src/scene/projectedHits';

function world(): RebootWorld {
  return { enabled: true, awake: true, moving: false, touching: false, position: { x: 0, z: 2.6 },
    view: { stage: 'baby', babyCharm: true, sizeCandidate: 1.25, hatWorn: false, revision: 0, handOffered: false, cushion: { x: 1.55, z: 1.54, revision: 3 } } };
}
test('three review sizes remain unapproved; moving interests use actual cushion or existing decor', () => {
  assert.deepEqual(BABY_SIZE_CANDIDATES, [1.15, 1.25, 1.35]); assert.equal(BABY_SIZE_APPROVAL.finalSize, null);
  const at = { x: -1.4, z: 2.1 };
  assert.deepEqual(babyTarget('rest', at, () => .5), at);
  assert.equal(babyTarget('baby_scout', at, () => .5).z, at.z + .1);
  assert.ok(babyTarget('baby_sneak', at, () => .5).z < -2);
});
test('three minutes of one persistent actor reach distinct causal episodes and seven expressions without inputs/rewards', () => {
  const w = world(), events: RebootEvent[] = []; let clock = 0, seed = 901, moving = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const director = new RebootDirector({ navigate: p => { w.position = { ...p }; moving = .45; w.moving = true; return true; }, stop: () => { w.moving = false; }, event: e => events.push(e) }, random, () => clock);
  for (let frame = 0; frame < 1800; frame++) { clock += 100; moving -= .1; if (moving <= 0) w.moving = false; director.update(.1, w); }
  const kinds = new Set(events.filter(e => e.phase === 'complete').map(e => e.kind));
  assert.ok(kinds.size >= 5); assert.equal(new Set(events.filter(e => e.expression).map(e => e.expression)).size, 7);
  assert.ok(events.some(e => e.babyBeat === 'too_close')); assert.ok(events.some(e => e.babyBeat === 'look_back'));
  assert.ok(events.every(e => e.automatic)); assert.equal(w.view.revision, 0); assert.equal(w.view.hatWorn, false);
});
test('in-flight interest is kept until arrival, and disabling input does not advance the plan', () => {
  const w = world(); let routes = 0;
  const d = new RebootDirector({ navigate: () => { routes++; w.moving = true; return true; }, stop: () => {}, event: () => {} }, () => .05);
  for (let i = 0; i < 35; i++) d.update(.1, w);
  const intent = d.current; for (let i = 0; i < 35; i++) d.update(.1, w);
  assert.equal(routes, 1); assert.equal(d.current?.token, intent?.token);
  const progress = d.pose?.progress; w.enabled = false; for (let i = 0; i < 60; i++) d.update(.1, w);
  assert.equal(d.pose?.progress, progress); w.awake = false; d.update(.1, w); assert.equal(d.current, null);
});
test('region, real interrupted action, completed memory and rapid-repeat history yield different motor responses', () => {
  assert.equal(babyPlan('hand', 'head').touchStyle, 'head_lean');
  assert.equal(babyPlan('hand', 'body').touchStyle, 'body_wiggle');
  assert.equal(babyPlan('hand', 'body', false, 'baby_discover').touchStyle, 'startle_then_lean');
  assert.equal(babyPlan('hand', 'body', false, undefined, 'completed-hand:1').rememberedHandId, 'completed-hand:1');
  assert.equal(babyPlan('hand', 'body', false, undefined, 'completed-hand:1').touchStyle, 'familiar_nuzzle');
  assert.equal(babyPlan('hand', 'head', true, undefined, undefined, 1).touchStyle, 'tickle');
  assert.equal(babyPlan('hand', 'head', true, undefined, undefined, 2).touchStyle, 'side_nuzzle');
  assert.equal(babyPlan('hand', 'head', true, undefined, undefined, 3).touchStyle, 'paw_offer');
});
test('real head/body cause is retained at completion; pause/clock gap does not stay rapid-repeat forever', () => {
  const w = world(), events: RebootEvent[] = []; let clock = 0;
  const d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) }, () => .5, () => clock);
  w.touching = true; w.touchRegion = 'head'; d.update(.1, w); assert.equal(d.pose?.baby?.touchStyle, 'head_lean');
  w.touching = false; d.update(.1, w); for (let i = 0; i < 20; i++) { clock += 100; d.update(.1, w); }
  assert.equal(events.find(e => e.kind === 'hand' && e.phase === 'complete')?.touchRegion, 'head');
  w.touching = true; d.update(.1, w); assert.equal(d.pose?.baby?.touchStyle, 'tickle');
  w.touching = false; d.update(.1, w); clock += 60_000; w.touching = true; d.update(.1, w);
  assert.equal(d.pose?.baby?.touchStyle, 'head_lean');
});
test('long repeated contact cannot get stuck alternating the same two motor responses', () => {
  const recent: string[] = [];
  for (const region of ['head','body'] as const) {
    recent.length = 0;
    for (let burst=1;burst<=24;burst++) {
      const style=babyPlan('hand',region,true,'baby_discover','completed-hand:7',burst,recent).touchStyle!;
      if(burst>=4)assert.ok(!recent.slice(-2).includes(style));
      recent.push(style);
    }
    assert.ok(new Set(recent.slice(3)).size>=4);
  }
});
test('a canceled touch and background cannot complete or revive its old reaction', () => {
  const w = world(), events: RebootEvent[] = [];
  const d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) });
  w.touching = true; d.update(.1, w); const token = d.current?.token; w.awake = false; d.update(.1, w);
  for (let i = 0; i < 20; i++) d.update(.1, w);
  assert.ok(events.some(e => e.token === token && e.phase === 'cancel'));
  assert.equal(events.some(e => e.token === token && e.phase === 'complete'), false);
});
test('familiar hat differs from first wear and real baby activity can resume its actual target', () => {
  const memory: RebootSnapshot = { schemaVersion: 1, petId: 'reboot-01:main', revision: 2, hatWorn: false, previewStage: 'baby', cushion: { x: 1, z: 1, revision: 0 }, events: [] };
  assert.equal(hatReaction(memory, 'baby_discover'), 'hat_busy');
  assert.notDeepEqual(babyPlan('hat_first').beats, babyPlan('hat_again').beats);
  const w = world(), events: RebootEvent[] = [], target = { x: -.3, z: -2.7 };
  w.view = { ...w.view, hatWorn: true, command: { token: 'wear:1', kind: 'hat_busy', sourceRevision: 0, resume: 'baby_discover', resumeTarget: target } };
  const d = new RebootDirector({ navigate: () => true, stop: () => {}, event: e => events.push(e) });
  for (let i = 0; i < 70; i++) d.update(.1, w);
  assert.deepEqual(events.find(e => e.kind === 'baby_discover' && e.phase === 'start')?.target, target);
});
test('speech excludes recent three, permits quiet beats, and keeps one sentence readable per short cue', () => {
  const voice = new BabyLines(), used: string[] = [];
  for (let i = 0; i < 12; i++) { const result = voice.select('head_lean', 'touch:'+i, false, i * 3_000); assert.ok(result); assert.ok(!used.slice(-3).includes(result.lineId)); used.push(result.lineId); }
  assert.equal(voice.select('no-speech-body-beat', 'q', false, 50_000), null);
  assert.ok(voice.select('hat_recognize', 'same-cue', false, 60_000));
  assert.equal(voice.select('hat_show', 'same-cue', false, 60_550), null);
  assert.ok(voice.select('sniff', 'auto:1', true, 80_000)); assert.equal(voice.select('peek', 'auto:2', true, 85_000), null);
});
test('small bubble stays in safe areas at edges/large text without covering the forehead', () => {
  for (const x of [12, 195, 378]) for (const y of [155, 500, 690]) {
    const rect = petBubbleBounds({ x, y }, 390, 110, 740, 92, 164, 50);
    assert.equal(rect.width, 164); assert.ok(rect.left >= 12 && rect.left + rect.width <= 378);
    assert.ok(rect.top >= 118 && rect.top + 92 <= 732); assert.ok(rect.tailLeft >= 16);
  }
});
async function draft() {
  const bytes = await readFile(new NodeURL('../../assets/reboot-02/baby-charm.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '')).scene;
}
test('actual GLB has one horn and curved non-spherical face patches/morphs with finite geometry', async () => {
  const model = await draft(); let horns = 0;
  model.traverse(n => { if (n.name === 'Horn') horns++; if (n instanceof THREE.Mesh) for (const target of [n.geometry.attributes.position, ...(n.geometry.morphAttributes.position ?? [])]) assert.ok(Array.from(target.array).every(Number.isFinite)); });
  assert.equal(horns, 1);
  for (const name of ['Eye_L', 'Eye_R', 'Mouth']) { const mesh = model.getObjectByName(name) as THREE.Mesh; assert.ok(Object.keys(mesh.morphTargetDictionary ?? {}).length >= 4); assert.ok(mesh.geometry.attributes.position.count < 150); }
});
test('seven applied facial weight sets differ on actual model; sleep reset clears decorative expression', async () => {
  const model = await draft(), orientation = new THREE.Group(), signatures = new Set<string>();
  for (const expression of ['curious', 'excited', 'playful', 'surprised', 'content', 'embarrassed', 'sleepy'] as const) {
    const pose: RebootPose = { kind: 'baby_peek', phase: 'contact', progress: .5, stage: 'baby', held: false, baby: { beat: { id: 'look_back', expression, seconds: 1 }, progress: .5 } };
    for (let i = 0; i < 60; i++) { orientation.position.set(0, 0, 0); orientation.rotation.set(0, 0, 0); applyBabyPose(orientation, model, pose, .1, 1 / 60, false, false); }
    const weights = ['Eye_L', 'Eye_R', 'Mouth'].flatMap(name => (model.getObjectByName(name) as THREE.Mesh).morphTargetInfluences ?? []);
    assert.ok(weights.every(x => Number.isFinite(x) && x >= 0 && x <= 1)); signatures.add(weights.map(x => x.toFixed(3)).join(','));
  }
  assert.equal(signatures.size, 7); resetBabyPose(model);
  assert.ok((model.getObjectByName('Eye_L') as THREE.Mesh).morphTargetInfluences?.every(x => x === 0));
});
test('sniff, paw flick, cushion kneading have different actual motor transforms; reduced motion keeps expression', async () => {
  const snapshots: number[][] = [];
  for (const id of ['sniff', 'paw_flick', 'cushion_knead']) {
    const model = await draft(), orientation = new THREE.Group();
    const pose: RebootPose = { kind: 'baby_silly', phase: 'contact', progress: .25, stage: 'baby', held: false,
      baby: { beat: { id, expression: 'curious', seconds: 1 }, progress: .25 } };
    for (let i=0;i<30;i++) { orientation.position.set(0,0,0); orientation.rotation.set(0,0,0);
      for (const name of ['Foot_R_Front','Foot_L_Front']) model.getObjectByName(name)?.position.set(0,0,0);
      applyBabyPose(orientation, model, pose, .1, 1/60, false, false); }
    snapshots.push([...orientation.position.toArray(), orientation.rotation.x, orientation.rotation.y, orientation.rotation.z, ...model.getObjectByName('Foot_R_Front')!.position.toArray()]);
    resetBabyPose(model); applyBabyPose(orientation,model,pose,.1,1/60,false,true);
    assert.ok((model.getObjectByName('Eye_L') as THREE.Mesh).morphTargetInfluences?.some(x=>x>0));
  }
  assert.equal(new Set(snapshots.map(x=>x.map(y=>y.toFixed(4)).join(','))).size,3);
});

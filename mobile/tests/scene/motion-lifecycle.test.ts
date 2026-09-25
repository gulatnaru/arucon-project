import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  FrameSubmissionGate,
  RafGate,
  retainLoadedModel,
  shouldPublishProjection,
  shouldResumeRoomOnContext,
} from '../../src/scene/lifecycle';
import { MOTION, advanceWalk, shouldPauseDecorativeMotion, springStep, reducedPoseTime, cueDuration } from '../../src/scene/motion';
import { holdReducedPose } from '../../src/scene/clipPresentation';
import { projectedHitsEqual, type ProjectedHits } from '../../src/scene/projectedHits';

test('late GLB parse after unmount disposes geometry and material', () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  let geometryDisposed = 0; let materialDisposed = 0;
  geometry.addEventListener('dispose', () => { geometryDisposed++; });
  material.addEventListener('dispose', () => { materialDisposed++; });
  const root = new THREE.Group(); root.add(new THREE.Mesh(geometry, material));
  assert.equal(retainLoadedModel(root, true), null);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
});

test('foreground resume schedules exactly one RAF and pause cancels it', () => {
  let nextId = 1; let requests = 0; const scheduled = new Map<number, FrameRequestCallback>(); const cancelled: number[] = [];
  const gate = new RafGate((callback) => { requests++; const id = nextId++; scheduled.set(id, callback); return id; }, (id) => { cancelled.push(id); scheduled.delete(id); });
  assert.equal(gate.resume(() => {}), true);
  assert.equal(gate.schedule(() => {}), false);
  assert.equal(requests, 1);
  gate.stop(); gate.stop();
  assert.deepEqual(cancelled, [1]);
  assert.equal(gate.resume(() => {}), true);
  scheduled.get(2)!(0);
  assert.equal(gate.scheduled, false);
  assert.equal(gate.schedule(() => {}), true);
  const stale = scheduled.get(3)!;
  gate.stop(); stale(0);
  assert.equal(gate.scheduled, false);
  assert.equal(gate.running, false);
});

test('frame submission keeps the first and dirty frames while throttling continuous cadence', () => {
  const submissions = new FrameSubmissionGate(100);
  assert.equal(submissions.shouldSubmit(0, false), true);
  assert.equal(submissions.shouldSubmit(16, false), false);
  assert.equal(submissions.shouldSubmit(99, true), false);
  assert.equal(submissions.shouldSubmit(100, true), true);
  assert.equal(submissions.shouldSubmit(150, true), false);
  submissions.markDirty();
  submissions.markDirty();
  assert.equal(submissions.shouldSubmit(151, false), true);
  assert.equal(submissions.shouldSubmit(152, false), false);
  assert.equal(submissions.shouldSubmit(250, true), false);
  assert.equal(submissions.shouldSubmit(251, true), true);
});

test('throttled hit projections publish only with the frame that contains their positions', () => {
  assert.equal(shouldPublishProjection(true, false, 1_000), false);
  assert.equal(shouldPublishProjection(true, true, 0), true);
  assert.equal(shouldPublishProjection(false, true, 79), false);
  assert.equal(shouldPublishProjection(false, true, 80), true);
});

test('cold Android GL context starts while initial AppState is unresolved', () => {
  let requests = 0;
  const cancelled: number[] = [];
  const gate = new RafGate(() => { requests++; return requests; }, id => cancelled.push(id));
  assert.equal(shouldResumeRoomOnContext(null), true);
  assert.equal(shouldResumeRoomOnContext('unknown'), true);
  assert.equal(shouldResumeRoomOnContext('active'), true);
  assert.equal(shouldResumeRoomOnContext('inactive'), false);
  assert.equal(shouldResumeRoomOnContext('background'), false);
  if (shouldResumeRoomOnContext(null)) gate.resume(() => {});
  assert.equal(requests, 1);
  assert.equal(gate.running, true);
  assert.equal(gate.scheduled, true);
  gate.stop();
  assert.deepEqual(cancelled, [1]);
});

test('idle hit projections are deduplicated while visible movement is published', () => {
  const previous: ProjectedHits = {
    pet: { x: 100, y: 200, visible: true },
    table: { x: 20, y: 30, visible: true },
    cushion: { x: 40, y: 50, visible: false },
    toilet: { x: 60, y: 70, visible: false },
    ball: { x: 80, y: 90, visible: false },
  };
  const unchanged = Object.fromEntries(
    Object.entries(previous).map(([name, hit]) => [name, { ...hit }]),
  ) as ProjectedHits;
  assert.equal(projectedHitsEqual(previous, unchanged), true);
  assert.equal(projectedHitsEqual(previous, {
    ...unchanged,
    pet: { ...unchanged.pet, x: unchanged.pet.x + 0.49 },
  }), true);
  assert.equal(projectedHitsEqual(previous, {
    ...unchanged,
    pet: { ...unchanged.pet, x: unchanged.pet.x + 0.51 },
  }), false);
  assert.equal(projectedHitsEqual(previous, {
    ...unchanged,
    ball: { ...unchanged.ball, visible: true },
  }), false);
});

test('reduced motion holds idle, touch and meal poses while keeping manual travel', () => {
  assert.equal(shouldPauseDecorativeMotion(true, false, false, false), true);
  assert.equal(shouldPauseDecorativeMotion(true, false, true, false), true);
  assert.equal(shouldPauseDecorativeMotion(true, false, false, true), true);
  assert.equal(shouldPauseDecorativeMotion(true, true, false, false), false);
  assert.equal(reducedPoseTime('pet_reserved', 1.2), 0.25);
  assert.equal(reducedPoseTime('eat', 0.3), 0.15);
  assert.equal(reducedPoseTime('honest_ball', 3), 0.25);
  assert.equal(reducedPoseTime('walk', 1.2), null);
  assert.equal(cueDuration(3, 1.2, true), 0.45);
  assert.equal(cueDuration(3, 1.2, false), 2.5);
});

test('reduced GLB cue samples a static pose and its clip time does not advance', () => {
  const root = new THREE.Object3D();
  const clip = new THREE.AnimationClip('eat', 3, [new THREE.NumberKeyframeTrack('.position[y]', [0, 1, 3], [0, 1, 0])]);
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  assert.equal(holdReducedPose(action), true);
  const poseTime = action.time;
  mixer.update(0);
  mixer.update(1);
  assert.equal(action.time, poseTime);
  assert.equal(action.paused, true);
  action.stop();
  assert.equal(holdReducedPose(mixer.clipAction(new THREE.AnimationClip('walk', 1, []))), false);
});

test('reserved and expressive walking use reference speed and response values', () => {
  assert.equal(MOTION.walkReserved, 1.55);
  assert.equal(MOTION.walkExpressive, 1.72);
  assert.equal(MOTION.acceleration, 14);
  assert.equal(MOTION.arrivalResponse, 6);
  assert.equal(MOTION.idleReserved, 5.8);
  assert.equal(MOTION.idleExpressive, 4.3);
  const initial = { position: { x: 0, z: 0 }, facing: 0, speed: 0 };
  let reserved = initial, expressive = initial;
  for (let i = 0; i < 240; i++) {
    reserved = advanceWalk(reserved, { x: 0, z: 20 }, MOTION.simulationStep, 'reserved', true);
    expressive = advanceWalk(expressive, { x: 0, z: 20 }, MOTION.simulationStep, 'expressive', true);
  }
  assert.ok(expressive.position.z > reserved.position.z);
  assert.ok(reserved.speed <= MOTION.walkReserved);
  assert.ok(expressive.speed <= MOTION.walkExpressive);
});

test('touch spring uses 1/120 second integration and settles after release', () => {
  let press = 0, velocity = 0;
  for (let i = 0; i < 60; i++) ({ press, velocity } = springStep(press, velocity, true, MOTION.simulationStep));
  assert.ok(press > 0.8 && press < 1.2);
  for (let i = 0; i < 240; i++) ({ press, velocity } = springStep(press, velocity, false, MOTION.simulationStep));
  assert.ok(Math.abs(press) < 0.01);
  assert.ok(Math.abs(velocity) < 0.01);
  assert.equal(MOTION.postTouchSeconds, 2.1);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparisonCameraYaw,
  EMPTY_ROOM_PRESENTATION,
  presentationMorphWeights,
  reduceRoomPresentation,
  RoomPresentationBatchGate,
} from '../../src/scene/presentationBridge';

test('presentation command batches run once per token and removal clears once', () => {
  const gate = new RoomPresentationBatchGate();
  const first = {
    token: 'reaction:1:open',
    commands: [{ type: 'play_clip', clip: 'tsundere_greet', rate: 1 }] as const,
  };
  assert.deepEqual(gate.take(first), first.commands);
  assert.equal(gate.take({ ...first, commands: [{ type: 'set_emotion', emotion: 'content' }] }), null);
  assert.deepEqual(gate.take({ token: 'reaction:1:follow-up', commands: [{ type: 'set_gaze', direction: 'user' }] }), [
    { type: 'set_gaze', direction: 'user' },
  ]);
  assert.deepEqual(gate.take(undefined), [{ type: 'clear_presentation' }]);
  assert.equal(gate.take(undefined), null);
});

test('ordered visual commands retain partial state and clear every temporary channel', () => {
  const started = reduceRoomPresentation(EMPTY_ROOM_PRESENTATION, [
    { type: 'play_clip', clip: 'pet_reserved', rate: 1.2 },
    { type: 'set_gaze', direction: 'aside' },
    { type: 'set_emotion', emotion: 'shy' },
    { type: 'hold_pose', clip: 'pet_reserved', normalizedTime: 0.4, durationMs: 350 },
  ]);
  assert.deepEqual(started, {
    clip: { name: 'pet_reserved', rate: 1.2 },
    holdPose: { type: 'hold_pose', clip: 'pet_reserved', normalizedTime: 0.4, durationMs: 350 },
    gaze: 'aside',
    emotion: 'shy',
  });
  assert.deepEqual(reduceRoomPresentation(started, [{ type: 'set_gaze', direction: 'down' }]), {
    ...started,
    gaze: 'down',
  });
  assert.equal(reduceRoomPresentation(started, [{ type: 'clear_presentation' }]), EMPTY_ROOM_PRESENTATION);
});

test('candidate comparison angles and expression overlays stay deterministic and bounded', () => {
  assert.equal(comparisonCameraYaw('front'), 0);
  assert.equal(comparisonCameraYaw('side'), Math.PI / 2);
  assert.equal(comparisonCameraYaw('back'), Math.PI);
  assert.equal(comparisonCameraYaw('three_quarter'), Math.PI / 4);
  const shyAside = presentationMorphWeights('aside', 'shy');
  assert.equal(shyAside.GlanceLeft, 0.58);
  assert.equal(shyAside.DryLook, 0.34);
  assert.equal(shyAside.TinySmile, 0.22);
  for (const weight of Object.values(shyAside)) assert.ok(weight >= 0 && weight <= 1);
  assert.deepEqual(presentationMorphWeights('user', 'neutral'), {});
});

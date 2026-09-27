import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartRoomInteraction, PetGestureSession, resolveRoomInteraction, ROOM_INTERACTION_PRIORITY } from '../../src/scene/interactionLifecycle';

test('room priorities let direct petting interrupt movement but keep committed cues atomic', () => {
  assert.ok(ROOM_INTERACTION_PRIORITY.panel > ROOM_INTERACTION_PRIORITY.sleep);
  assert.equal(canStartRoomInteraction('move', 'pet'), true);
  assert.equal(canStartRoomInteraction('pet', 'move'), false);
  assert.equal(canStartRoomInteraction('committed_cue', 'pet'), false);
  assert.equal(canStartRoomInteraction('committed_cue', 'panel'), true);
});

test('pet gesture owns one pointer and always clears on release or cancellation', () => {
  const gesture = new PetGestureSession();
  assert.equal(gesture.begin(7, 1, () => true), 'started');
  assert.equal(gesture.active, true);
  assert.equal(gesture.begin(8, 2, () => true), 'ignored_extra_pointer');
  assert.equal(gesture.end(8), 'ignored');
  assert.equal(gesture.end(7), 'ended');
  assert.equal(gesture.active, false);
  assert.equal(gesture.begin(9, 1, () => true), 'started');
  assert.equal(gesture.cancel(), 'cancelled');
  assert.equal(gesture.active, false);
  assert.equal(gesture.cancel(), 'ignored');
  assert.equal(gesture.begin(10, 1, () => false), 'rejected');
  assert.equal(gesture.active, false);
});

test('pet activation commits once when onPress arrives before onPressOut', () => {
  const gesture = new PetGestureSession();
  assert.equal(gesture.begin(1, 1, () => true), 'started');
  assert.equal(gesture.activate(), 'committed_active');
  assert.equal(gesture.end(1), 'ignored');
});

test('pet activation commits once when onPressOut arrives before onPress', () => {
  const gesture = new PetGestureSession();
  assert.equal(gesture.begin(2, 1, () => true), 'started');
  assert.equal(gesture.end(2), 'ended');
  assert.equal(gesture.activate(), 'committed_released');
});

test('cancelled and multitouch gestures cannot commit a later press event', () => {
  const gesture = new PetGestureSession();
  assert.equal(gesture.begin(3, 1, () => true), 'started');
  assert.equal(gesture.cancel(), 'cancelled');
  assert.equal(gesture.activate(), 'ignored');
  assert.equal(gesture.begin(4, 1, () => true), 'started');
  assert.equal(gesture.begin(5, 2, () => true), 'ignored_extra_pointer');
  assert.equal(gesture.cancel(), 'cancelled');
  assert.equal(gesture.activate(), 'ignored');
});

test('accessibility activation commits without starting a physical gesture', () => {
  const gesture = new PetGestureSession();
  assert.equal(gesture.active, false);
  assert.equal(gesture.activate(), 'accessible_activation');
  assert.equal(gesture.active, false);
});

test('awaiting-choice presentation stays interruptible while meal and sleep remain blocking', () => {
  const freePresentation = resolveRoomInteraction({
    interactionEnabled: true, sleeping: false, committedCueActive: false,
    touching: false, moving: false, freePresentationActive: true,
  });
  assert.equal(freePresentation, 'autonomous');
  for (let tap = 0; tap < 10; tap++) assert.equal(canStartRoomInteraction(freePresentation, 'pet'), true);
  assert.equal(canStartRoomInteraction(freePresentation, 'move'), true);
  const meal = resolveRoomInteraction({
    interactionEnabled: true, sleeping: false, committedCueActive: true,
    touching: false, moving: false, freePresentationActive: true,
  });
  assert.equal(meal, 'committed_cue');
  assert.equal(canStartRoomInteraction(meal, 'pet'), false);
  assert.equal(canStartRoomInteraction(meal, 'move'), false);
  const sleep = resolveRoomInteraction({
    interactionEnabled: true, sleeping: true, committedCueActive: false,
    touching: false, moving: false, freePresentationActive: true,
  });
  assert.equal(canStartRoomInteraction(sleep, 'pet'), false);
});

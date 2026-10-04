import assert from 'node:assert/strict';
import test from 'node:test';
import { projectPetRest } from '../../src/presentation/petRest';
import { canStartRoomInteraction, resolveRoomInteraction } from '../../src/scene/interactionLifecycle';

test('awake/manual sleep/hibernation share renderer gating, label and the correct recovery command', () => {
  for (const [sleeping, hibernating, mode, action] of [
    [false, false, 'awake', 'sleep'], [true, false, 'sleeping', 'wake'],
    [false, true, 'hibernating', 'return'], [true, true, 'hibernating', 'return'],
  ] as const) {
    const rest = projectPetRest({ sleeping, hibernating });
    assert.equal(rest.mode, mode); assert.equal(rest.action, action);
    assert.equal(rest.label === '깨어 있어요', mode === 'awake');
    const input = resolveRoomInteraction({ interactionEnabled: true, sleeping: rest.resting,
      committedCueActive: false, touching: false, moving: false, freePresentationActive: true });
    assert.equal(canStartRoomInteraction(input, 'move'), mode === 'awake');
    assert.equal(canStartRoomInteraction(input, 'pet'), mode === 'awake');
    assert.equal(resolveRoomInteraction({ interactionEnabled: false, sleeping: rest.resting,
      committedCueActive: false, touching: false, moving: false, freePresentationActive: false }), 'panel');
  }
});

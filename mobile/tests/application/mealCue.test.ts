import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedMealCue } from '../../src/application/mealCue';
import type { JournalEntry } from '../../src/application/devLifeService';

const auto: JournalEntry = {
  id: 'auto:pet:100:4:0', sequence: 4, commandId: 'auto:pet:100:4',
  event: { type: 'MealConsumed', mealId: 'auto:pet:100:4', mode: 'auto', expUnits: 15 },
};
const direct: JournalEntry = {
  id: 'direct-1:0', sequence: 5, commandId: 'direct-1',
  event: { type: 'MealConsumed', mealId: 'direct:direct-1', mode: 'direct', expUnits: 15 },
};

test('only confirmed new EXP and the current meal event generate a room cue', () => {
  assert.deepEqual(confirmedMealCue(0, 15, [auto], { mode: 'auto', atMs: 100 }, 'pet'), { token: auto.id, mode: 'auto' });
  assert.deepEqual(confirmedMealCue(15, 30, [auto, direct], { mode: 'direct' }, 'pet'), { token: direct.id, mode: 'direct' });
  assert.equal(confirmedMealCue(15, 15, [auto], { mode: 'auto', atMs: 100 }, 'pet'), null);
  assert.equal(confirmedMealCue(0, 15, [auto], { mode: 'auto', atMs: 200 }, 'pet'), null);
  assert.equal(confirmedMealCue(0, 15, [], { mode: 'direct' }, 'pet'), null);
});

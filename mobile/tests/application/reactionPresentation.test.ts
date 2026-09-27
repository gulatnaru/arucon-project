import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confirmedGrowthReactionCue,
  reactionDialogueDisplayMode,
  splitReactionCommands,
} from '../../src/presentation/reactionPresentation';
import { APPROVED_GROWTH_POLICY } from '../../src/progression/projection';

test('reaction adapter preserves command order and exposes dialogue choices without locking input', () => {
  const split = splitReactionCommands([
    { type: 'play_clip', clip: 'pet_reserved', rate: 1 },
    { type: 'set_gaze', direction: 'aside' },
    { type: 'show_dialogue', text: '……거긴 괜찮네.', choices: [{ id: 'more', label: '한 번 더' }] },
  ]);
  assert.deepEqual(split.visualCommands.map(command => command.type), ['play_clip', 'set_gaze']);
  assert.deepEqual(split.dialogue, { text: '……거긴 괜찮네.', choices: [{ id: 'more', label: '한 번 더' }] });
});

test('clear presentation explicitly removes dialogue while visual-only updates keep it', () => {
  assert.equal(splitReactionCommands([{ type: 'set_emotion', emotion: 'content' }]).dialogue, undefined);
  assert.equal(splitReactionCommands([{ type: 'clear_presentation' }]).dialogue, null);
});

test('growth cue requires a confirmed meal identity and an actual approved level transition', () => {
  const oneLevel = APPROVED_GROWTH_POLICY.bands[0].expPerLevel * APPROVED_GROWTH_POLICY.expScale;
  assert.equal(confirmedGrowthReactionCue('meal-1', 100, 0, oneLevel - 1), null);
  const cue = confirmedGrowthReactionCue('meal-1', 100, oneLevel - 1, oneLevel);
  assert.equal(cue?.kind, 'committed_growth');
  assert.equal(cue?.eventId, 'meal-1');
  assert.equal(cue?.before.level, 1);
  assert.equal(cue?.after.level, 2);
  assert.equal(confirmedGrowthReactionCue('', 100, oneLevel - 1, oneLevel), null);
  assert.equal(confirmedGrowthReactionCue('meal-replay', 100, oneLevel, oneLevel), null);
});

test('reduced dialogue hides only one-way lines and always keeps choices visible', () => {
  assert.equal(reactionDialogueDisplayMode({ text: '짧은 대사', choices: [] }, true), 'reduced_line');
  assert.equal(reactionDialogueDisplayMode({
    text: '같이 놀까?', choices: [{ id: 'play', label: '같이 놀기' }],
  }, true), 'full');
  assert.equal(reactionDialogueDisplayMode({ text: '짧은 대사', choices: [] }, false), 'full');
});

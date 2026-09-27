import type { PresentationCommand, ReactionEvidence } from '../reactions';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../progression/projection';

export type ReactionDialogueView = Readonly<{
  text: string;
  choices: readonly Readonly<{ id: string; label: string }>[];
}>;

export type ReactionPresentationBatch = Readonly<{
  visualCommands: readonly Exclude<PresentationCommand, { type: 'show_dialogue' }>[];
  dialogue: ReactionDialogueView | null | undefined;
}>;

export function reactionDialogueDisplayMode(
  view: ReactionDialogueView,
  reduceDialogue: boolean,
): 'full' | 'reduced_line' {
  return reduceDialogue && view.choices.length === 0 ? 'reduced_line' : 'full';
}

/** Undefined keeps the current bubble, null clears it, and a value replaces it. */
export function splitReactionCommands(commands: readonly PresentationCommand[]): ReactionPresentationBatch {
  const visualCommands: Exclude<PresentationCommand, { type: 'show_dialogue' }>[] = [];
  let dialogue: ReactionDialogueView | null | undefined;
  for (const command of commands) {
    if (command.type === 'show_dialogue') dialogue = { text: command.text, choices: command.choices };
    else {
      visualCommands.push(command);
      if (command.type === 'clear_presentation') dialogue = null;
    }
  }
  return { visualCommands, dialogue };
}

/** Builds a cue only from the EXP delta of an already committed meal. */
export function confirmedGrowthReactionCue(
  eventId: string,
  committedAtMs: number,
  beforeExpUnits: number,
  afterExpUnits: number,
): Extract<ReactionEvidence, { kind: 'committed_growth' }> | null {
  if (!eventId || !Number.isSafeInteger(committedAtMs) || committedAtMs < 0 ||
      !Number.isSafeInteger(beforeExpUnits) || !Number.isSafeInteger(afterExpUnits) ||
      beforeExpUnits < 0 || afterExpUnits <= beforeExpUnits) return null;
  const before = projectGrowth(beforeExpUnits, APPROVED_GROWTH_POLICY);
  const after = projectGrowth(afterExpUnits, APPROVED_GROWTH_POLICY);
  if (after.level === before.level && after.stage === before.stage) return null;
  return { kind: 'committed_growth', eventId, committedAtMs, before, after };
}

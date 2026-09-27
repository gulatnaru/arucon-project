import type { GrowthProjection, ReactionContext, ReactionEvidence } from './types';
import { assertValidReactionContext } from './validation';

export type GrowthContextBase = Omit<ReactionContext, 'trigger' | 'source' | 'growthStage' | 'evidence'>;

/** Builds a visual cue only from an already committed event and its before/after read projections. */
export function createCommittedGrowthContext(
  base: GrowthContextBase,
  event: Readonly<{ eventId: string; committedAtMs: number; before: GrowthProjection; after: GrowthProjection }>,
): ReactionContext {
  if (!event.eventId || !Number.isSafeInteger(event.committedAtMs) || event.committedAtMs < 0) throw new Error('Invalid committed growth event identity');
  const evidence: ReactionEvidence = { kind: 'committed_growth', ...event };
  const context: ReactionContext = {
    ...base,
    trigger: 'growth_committed',
    source: 'live',
    growthStage: event.after.stage,
    evidence,
  };
  assertValidReactionContext(context);
  return Object.freeze(context);
}

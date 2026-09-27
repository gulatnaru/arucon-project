import { REACTION_CATALOG } from './catalog';
import { selectReaction } from './selector';
import { createReactionSession } from './session';
import type { ReactionCatalog, ReactionContext, ReactionMemorySnapshot, ReactionSelection, ReactionSession, PresentationCommand } from './types';

let sessionSequence = 0;

export type DispatchReactionDependencies = Readonly<{
  now?: () => number;
  random?: () => number;
  catalog?: ReactionCatalog;
  sessionId?: (context: ReactionContext, nowMs: number) => string;
}>;

export type DispatchedReaction = Readonly<{
  selection: ReactionSelection;
  session: ReactionSession;
  commands: readonly PresentationCommand[];
}>;

export function dispatchReaction(
  context: ReactionContext,
  memory: ReactionMemorySnapshot,
  dependencies: DispatchReactionDependencies = {},
): DispatchedReaction {
  const nowMs = (dependencies.now ?? Date.now)();
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Reaction clock must return a nonnegative integer');
  const selection = selectReaction({
    catalog: dependencies.catalog ?? REACTION_CATALOG,
    context,
    memory,
    nowMs,
    random: dependencies.random,
  });
  const sessionId = dependencies.sessionId?.(context, nowMs) ?? `reaction:${context.petId}:${nowMs}:${sessionSequence++}`;
  const created = createReactionSession(selection, context, nowMs, sessionId);
  return { selection, session: created.session, commands: created.commands };
}

export function emptyReactionMemory(petId: string, source: 'live' | 'fixture' = 'live'): ReactionMemorySnapshot {
  if (!petId) throw new Error('Reaction memory petId is required');
  return Object.freeze({ schemaVersion: 1, petId, source, records: Object.freeze([]) });
}

import { REACTION_CATALOG } from './catalog';
import { createReactionSession } from './session';
import { selectReaction } from './selector';
import { validateReactionCatalog } from './validation';
import type {
  PresentationCommand,
  ReactionCatalog,
  ReactionContext,
  ReactionMemoryRecord,
  ReactionSelection,
  ReactionSession,
} from './types';

export type ReactionPreviewInput = Readonly<{
  context: ReactionContext;
  recent?: readonly ReactionMemoryRecord[];
  nowMs: number;
  random?: () => number;
  catalog?: ReactionCatalog;
  preferredReactionId?: string;
}>;

export type ReactionPreview = Readonly<{
  selection: ReactionSelection;
  session: ReactionSession;
  commands: readonly PresentationCommand[];
}>;

/** Read-only authoring surface: selects and materializes commands without persistence. */
export function previewReaction(input: ReactionPreviewInput): ReactionPreview {
  const source = input.context.source ?? 'live';
  const catalog = input.catalog ?? REACTION_CATALOG;
  const catalogErrors = validateReactionCatalog(catalog);
  if (catalogErrors.length) throw new Error(`Cannot preview invalid reaction catalog: ${catalogErrors.join('; ')}`);
  const preferred = input.preferredReactionId
    ? catalog.find(reaction => reaction.id === input.preferredReactionId)
    : undefined;
  if (input.preferredReactionId && !preferred) throw new Error(`Unknown preview reaction ${input.preferredReactionId}`);
  const selection = selectReaction({
    catalog: preferred ? [preferred] : catalog,
    context: input.context,
    memory: { schemaVersion: 1, petId: input.context.petId, source, records: input.recent ?? [] },
    nowMs: input.nowMs,
    random: input.random,
  });
  if (preferred && selection.reaction.id !== preferred.id) throw new Error(`Preview reaction ${preferred.id} does not match the supplied context`);
  const created = createReactionSession(selection, input.context, input.nowMs, `preview:${input.context.petId}:${input.nowMs}`);
  return { selection, session: created.session, commands: created.commands };
}

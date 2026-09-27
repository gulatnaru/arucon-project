import type {
  ReactionCatalog,
  ReactionContext,
  ReactionDefinition,
  ReactionClip,
  ReactionMemorySnapshot,
  ReactionSelection,
} from './types';
import { assertValidMemorySnapshot, assertValidReactionContext, validateReactionCatalog } from './validation';

const allTriggers = [
  'petting', 'ball', 'rest', 'greeting', 'meal_committed',
  'sleep', 'wake', 'furniture', 'growth_committed', 'clean',
] as const;

function fallbackFor(context: ReactionContext): ReactionDefinition {
  const reserved = context.personality === 'reserved';
  const resting = context.domainState.sleeping || context.domainState.hibernating;
  const clip: ReactionClip = resting ? 'sleep' : reserved ? 'idle_reserved' : 'idle_expressive';
  const fallback: ReactionDefinition = {
    id: resting ? 'safe.sleeping' : reserved ? 'safe.reserved' : 'safe.expressive',
    family: 'safe.fallback',
    priority: 0,
    conditions: { triggers: allTriggers },
    presentation: {
      clip,
      rate: 1,
      emotion: resting ? 'sleepy' : 'neutral',
      gaze: resting ? 'rest' : reserved ? 'aside' : 'user',
      minVisibleMs: 600,
    },
    repeat: { reactionCooldownMs: 0, familyWindowMs: 0, maxFamilyInWindow: 1 },
  };
  return Object.freeze(fallback);
}

function contextReasons(reaction: ReactionDefinition, context: ReactionContext): string[] {
  const c = reaction.conditions;
  const reasons: string[] = [];
  const growthStage = context.growthStage === 'final' ? Number.MAX_SAFE_INTEGER : context.growthStage;
  if (!c.triggers.includes(context.trigger)) reasons.push('trigger');
  if (c.sources && !c.sources.includes(context.source ?? 'live')) reasons.push('source');
  if (c.personalities && !c.personalities.includes(context.personality)) reasons.push('personality');
  if (growthStage < (c.minGrowthStage ?? 1) || growthStage > (c.maxGrowthStage ?? Number.MAX_SAFE_INTEGER)) reasons.push('growth_stage');
  if (c.requireAffordances?.some(value => !context.affordances.includes(value))) reasons.push('missing_affordance');
  if (c.forbidAffordances?.some(value => context.affordances.includes(value))) reasons.push('forbidden_affordance');
  if (c.sleeping !== undefined && c.sleeping !== context.domainState.sleeping) reasons.push('sleeping_state');
  if (c.hibernating !== undefined && c.hibernating !== context.domainState.hibernating) reasons.push('hibernating_state');
  if (c.conditions && !c.conditions.includes(context.domainState.condition)) reasons.push('condition');
  if (c.cleanliness && !c.cleanliness.includes(context.domainState.cleanliness)) reasons.push('cleanliness');
  if (c.touchTargets && (!context.touchTarget || !c.touchTargets.includes(context.touchTarget))) reasons.push('touch_target');
  if (c.evidenceKinds && (!context.evidence || !c.evidenceKinds.includes(context.evidence.kind))) reasons.push('evidence');
  if (c.cleanResults && (context.evidence?.kind !== 'clean_result' || !c.cleanResults.includes(context.evidence.result))) reasons.push('clean_result');
  return reasons;
}

function repeatReasons(reaction: ReactionDefinition, memory: ReactionMemorySnapshot, nowMs: number): string[] {
  const reasons: string[] = [];
  const latestSame = memory.records.find(record => record.reactionId === reaction.id);
  if (latestSame && nowMs - latestSame.shownAtMs < reaction.repeat.reactionCooldownMs) reasons.push('reaction_cooldown');
  const familyCount = memory.records.filter(record =>
    record.family === reaction.family && nowMs - record.shownAtMs < reaction.repeat.familyWindowMs,
  ).length;
  if (familyCount >= reaction.repeat.maxFamilyInWindow) reasons.push('family_window');
  return reasons;
}

function choose(candidates: readonly ReactionDefinition[], random: () => number): ReactionDefinition {
  const maxPriority = Math.max(...candidates.map(candidate => candidate.priority));
  const top = candidates.filter(candidate => candidate.priority === maxPriority).sort((a, b) => a.id.localeCompare(b.id));
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Reaction random source must return a value in [0, 1)');
  return top[Math.floor(value * top.length)];
}

export type SelectReactionOptions = Readonly<{
  catalog: ReactionCatalog;
  context: ReactionContext;
  memory: ReactionMemorySnapshot;
  nowMs: number;
  random?: () => number;
}>;

export function selectReaction(options: SelectReactionOptions): ReactionSelection {
  assertValidReactionContext(options.context);
  assertValidMemorySnapshot(options.memory);
  if (options.memory.petId !== options.context.petId || options.memory.source !== (options.context.source ?? 'live')) {
    throw new Error('Reaction memory scope does not match context');
  }
  if (!Number.isSafeInteger(options.nowMs) || options.nowMs < 0) throw new Error('Invalid reaction selection time');
  const catalogErrors = [...validateReactionCatalog(options.catalog)];
  if (catalogErrors.length) {
    const reaction = fallbackFor(options.context);
    return {
      reaction,
      explanation: {
        considered: options.catalog.length, eligible: [], excluded: [], selectedId: reaction.id,
        usedRepeatOverride: false, usedSafeFallback: true, catalogErrors,
      },
    };
  }

  const excluded: { reactionId: string; reasons: readonly string[] }[] = [];
  const contextual: ReactionDefinition[] = [];
  const eligible: ReactionDefinition[] = [];
  for (const reaction of options.catalog) {
    const mismatch = contextReasons(reaction, options.context);
    if (mismatch.length) { excluded.push({ reactionId: reaction.id, reasons: mismatch }); continue; }
    contextual.push(reaction);
    const repetition = repeatReasons(reaction, options.memory, options.nowMs);
    if (repetition.length) excluded.push({ reactionId: reaction.id, reasons: repetition });
    else eligible.push(reaction);
  }

  const usedRepeatOverride = eligible.length === 0 && contextual.length > 0;
  const pool = eligible.length ? eligible : contextual;
  const reaction = pool.length ? choose(pool, options.random ?? Math.random) : fallbackFor(options.context);
  return {
    reaction,
    explanation: {
      considered: options.catalog.length,
      eligible: eligible.map(value => value.id),
      excluded,
      selectedId: reaction.id,
      usedRepeatOverride,
      usedSafeFallback: pool.length === 0,
      catalogErrors,
    },
  };
}

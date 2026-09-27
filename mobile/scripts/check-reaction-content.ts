import { REACTION_CATALOG } from '../src/reactions/catalog';
import { selectReaction } from '../src/reactions/selector';
import type { ReactionContext, ReactionDefinition, ReactionMemoryRecord, ReactionMemorySnapshot } from '../src/reactions/types';
import { validateReactionCatalog } from '../src/reactions/validation';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../src/progression/projection';
import { previewReaction } from '../src/reactions/preview';

function baseContext(personality: 'reserved' | 'expressive', trigger: ReactionContext['trigger']): ReactionContext {
  return {
    petId: 'content-check-pet', trigger, personality, growthStage: 1, source: 'live',
    domainState: { sleeping: trigger === 'sleep', hibernating: false, condition: 'well', cleanliness: 'clean' },
    affordances: ['ball', 'cushion', 'table', 'toilet'], touchTarget: 'head',
  };
}

function memory(context: ReactionContext, recent: readonly ReactionMemoryRecord[] = []): ReactionMemorySnapshot {
  return { schemaVersion: 1, petId: context.petId, source: context.source ?? 'live', records: recent };
}

function select(context: ReactionContext, random: number): ReactionDefinition {
  return selectReaction({ catalog: REACTION_CATALOG, context, memory: memory(context), nowMs: 100_000, random: () => random }).reaction;
}

function fail(message: string): never { throw new Error(message); }

const stageTwoThreshold = APPROVED_GROWTH_POLICY.bands[0].expPerLevel * APPROVED_GROWTH_POLICY.expScale *
  (APPROVED_GROWTH_POLICY.bands[0].toLevel - APPROVED_GROWTH_POLICY.bands[0].fromLevel + 1);

function reachableContext(reaction: ReactionDefinition): ReactionContext {
  const c = reaction.conditions;
  const trigger = c.triggers[0];
  const source = c.sources?.[0] ?? 'live';
  const personality = c.personalities?.[0] ?? 'reserved';
  const stage = c.minGrowthStage ?? 1;
  const base: ReactionContext = {
    petId: 'reachability-pet', trigger, personality, growthStage: stage, source,
    domainState: {
      sleeping: c.sleeping ?? false,
      hibernating: c.hibernating ?? false,
      condition: c.conditions?.[0] ?? 'well',
      cleanliness: c.cleanliness?.[0] ?? 'clean',
    },
    affordances: c.requireAffordances ?? [],
    touchTarget: c.touchTargets?.[0] ?? 'head',
  };
  const evidenceKind = c.evidenceKinds?.[0];
  if (evidenceKind === 'committed_meal') return { ...base, evidence: { kind: evidenceKind, eventId: 'reachability-meal', committedAtMs: 90_000, mode: 'direct' } };
  if (evidenceKind === 'clean_result') return { ...base, evidence: { kind: evidenceKind, result: c.cleanResults?.[0] ?? 'nothing_to_clean' } };
  if (evidenceKind === 'committed_growth' || evidenceKind === 'synthetic_growth_fixture') {
    const before = projectGrowth(stageTwoThreshold - 1, APPROVED_GROWTH_POLICY);
    const after = projectGrowth(stageTwoThreshold, APPROVED_GROWTH_POLICY);
    if (after.stage !== stage) fail(`${reaction.id} reachability helper cannot produce growth stage ${stage}`);
    return {
      ...base, growthStage: after.stage,
      evidence: evidenceKind === 'committed_growth'
        ? { kind: evidenceKind, eventId: 'reachability-growth', committedAtMs: 90_000, before, after }
        : { kind: evidenceKind, fixtureId: 'reachability', before, after },
    };
  }
  return base;
}

// Prove every definition can pass the production selector. Structural validation
// alone cannot detect a permanently shadowed, contradictory, or source-mismatched scene.
for (const target of REACTION_CATALOG) {
  const context = reachableContext(target);
  const recent: ReactionMemoryRecord[] = REACTION_CATALOG
    .filter(candidate => candidate.id !== target.id && candidate.family !== target.family)
    .map((candidate, index) => ({
      schemaVersion: 1, sessionId: `reach-${index}`, petId: context.petId, source: context.source ?? 'live',
      reactionId: candidate.id, family: candidate.family, shownAtMs: 99_000 - index,
      outcome: 'completed', settledAtMs: 99_500 - index,
    }));
  const selected = selectReaction({
    catalog: REACTION_CATALOG, context, memory: memory(context, recent), nowMs: 100_000, random: () => 0,
  });
  if (selected.reaction.id !== target.id) {
    fail(`${target.id} is not reachable through selector; selected ${selected.reaction.id}`);
  }
}

const structural = validateReactionCatalog(REACTION_CATALOG);
if (structural.length) fail(`Reaction catalog invalid:\n${structural.join('\n')}`);

for (const personality of ['reserved', 'expressive'] as const) {
  for (const trigger of ['petting', 'rest', 'greeting'] as const) {
    const context = baseContext(personality, trigger);
    const families = new Set([select(context, 0).family, select(context, 0.999_999).family]);
    if (families.size < 2) fail(`${personality}/${trigger} needs two distinct scene families`);
  }
  const before = projectGrowth(stageTwoThreshold - 1, APPROVED_GROWTH_POLICY);
  const after = projectGrowth(stageTwoThreshold, APPROVED_GROWTH_POLICY);
  const context: ReactionContext = {
    ...baseContext(personality, 'growth_committed'), growthStage: after.stage,
    evidence: { kind: 'committed_growth', eventId: 'event-growth-check', committedAtMs: 99_000, before, after },
  };
  const growth = select(context, 0);
  if (growth.id.startsWith('safe.')) fail(`${personality} has no committed growth scene`);
  const reservedClip = growth.presentation.clip.includes('reserved') || growth.presentation.clip.includes('tsundere');
  const expressiveClip = growth.presentation.clip.includes('expressive') || growth.presentation.clip.includes('honest');
  if (personality === 'reserved' ? !reservedClip : !expressiveClip) fail(`${personality} growth scene breaks personality expression continuity`);
}

for (const result of ['nothing_to_clean', 'auto_toilet', 'cleaned'] as const) {
  const context: ReactionContext = { ...baseContext('reserved', 'clean'), evidence: { kind: 'clean_result', result } };
  const selected = select(context, 0);
  if (selected.id.startsWith('safe.') || !selected.conditions.cleanResults?.includes(result)) fail(`clean result ${result} has no exact scene`);
}

const fixtureBefore = projectGrowth(stageTwoThreshold - 1, APPROVED_GROWTH_POLICY);
const fixtureAfter = projectGrowth(stageTwoThreshold, APPROVED_GROWTH_POLICY);
const fixtureContext: ReactionContext = {
  ...baseContext('expressive', 'growth_committed'), source: 'fixture', growthStage: fixtureAfter.stage,
  evidence: { kind: 'synthetic_growth_fixture', fixtureId: 'content_check', before: fixtureBefore, after: fixtureAfter },
};
const fixture = select(fixtureContext, 0);
if (fixture.id.startsWith('safe.') || !fixture.conditions.sources?.includes('fixture')) fail('Synthetic growth fixture has no fixture-only scene');

const lockedBefore = projectGrowth(stageTwoThreshold - 2, APPROVED_GROWTH_POLICY);
const lockedAfter = projectGrowth(stageTwoThreshold - 1, APPROVED_GROWTH_POLICY);
const lockedFixture: ReactionContext = {
  ...baseContext('expressive', 'growth_committed'), source: 'fixture', growthStage: lockedAfter.stage,
  evidence: { kind: 'synthetic_growth_fixture', fixtureId: 'content_check_locked', before: lockedBefore, after: lockedAfter },
};
if (!select(lockedFixture, 0).id.startsWith('safe.')) fail('Growth unlock scene is reachable below minGrowthStage');

const sleepingRest = {
  ...baseContext('reserved', 'rest'),
  domainState: { sleeping: true, hibernating: false, condition: 'well' as const, cleanliness: 'clean' as const },
};
const quiet = select(sleepingRest, 0);
if (quiet.id !== 'rest_sleeping_quiet' || quiet.presentation.clip !== 'sleep' || quiet.dialogue) {
  fail('Sleeping rest must stay quiet and must not run a wake presentation');
}

for (const personality of ['reserved', 'expressive'] as const) {
  const withoutBall = { ...baseContext(personality, 'ball'), affordances: [] };
  if (!select(withoutBall, 0).id.startsWith('safe.')) fail('Ball scene is reachable without a ball affordance');
  if (select(baseContext(personality, 'ball'), 0).id.startsWith('safe.')) fail(`${personality} ball scene is missing`);
}

const previewArgument = process.argv.find(argument => argument.startsWith('--preview='));
if (previewArgument) {
  const reactionId = previewArgument.slice('--preview='.length);
  const definition = REACTION_CATALOG.find(reaction => reaction.id === reactionId);
  if (!definition) fail(`Unknown reaction preview id ${reactionId}`);
  const preview = previewReaction({
    context: { ...reachableContext(definition), displayName: '미리보기콘' },
    preferredReactionId: definition.id,
    nowMs: 100_000,
  });
  console.log(JSON.stringify({
    selectedId: preview.selection.reaction.id,
    family: preview.selection.reaction.family,
    phase: preview.session.phase,
    commands: preview.commands,
  }, null, 2));
} else {
  console.log(`reaction content OK: ${REACTION_CATALOG.length} definitions`);
}

import {
  REACTION_CLIPS,
  type DialogueNode,
  type GrowthProjection,
  type ReactionCatalog,
  type ReactionContext,
  type ReactionDefinition,
  type ReactionAffordance,
  type ReactionTrigger,
  type ReactionEvidence,
  type ReactionMemoryRecord,
  type ReactionMemorySnapshot,
} from './types';
import { normalizeReactionDisplayName, validateReactionTextTemplate } from './text';

const clipSet = new Set<string>(REACTION_CLIPS);
const idPattern = /^[a-z0-9][a-z0-9._-]{1,79}$/u;

function finiteNonnegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validateProjection(value: GrowthProjection, label: string, errors: string[]): void {
  if (!Number.isSafeInteger(value.level) || value.level < 1) errors.push(`${label}.level must be a positive integer`);
  if (value.stage !== 'final' && (!Number.isSafeInteger(value.stage) || value.stage < 1)) errors.push(`${label}.stage must be a positive integer or final`);
  if (!Number.isSafeInteger(value.totalExpUnits) || value.totalExpUnits < 0) errors.push(`${label}.totalExpUnits must be a nonnegative integer`);
  if (!finiteNonnegative(value.expIntoLevelUnits)) errors.push(`${label}.expIntoLevelUnits must be nonnegative`);
  if (value.expToNextLevelUnits !== null && !finiteNonnegative(value.expToNextLevelUnits)) errors.push(`${label}.expToNextLevelUnits must be nonnegative or null`);
}

function validateDialogue(reaction: ReactionDefinition, errors: string[]): void {
  const dialogue = reaction.dialogue;
  if (!dialogue) return;
  const prefix = `${reaction.id}.dialogue`;
  const nodes = new Map<string, DialogueNode>();
  for (const node of dialogue.nodes) {
    if (!idPattern.test(node.id)) errors.push(`${prefix} has invalid node id ${node.id}`);
    if (nodes.has(node.id)) errors.push(`${prefix} has duplicate node id ${node.id}`);
    nodes.set(node.id, node);
    if (node.kind === 'line') {
      if (!node.text.trim() || node.text.length > 120) errors.push(`${prefix}.${node.id} line must be 1..120 characters`);
      for (const error of validateReactionTextTemplate(node.text)) errors.push(`${prefix}.${node.id} ${error}`);
      if (!Number.isSafeInteger(node.minReadMs) || node.minReadMs < 600 || node.minReadMs > 15_000) errors.push(`${prefix}.${node.id} has invalid minReadMs`);
      if (node.presentation) validatePresentation(reaction.id, node.presentation, errors, `${prefix}.${node.id}`);
    } else if (node.kind === 'choice') {
      if (!node.prompt.trim() || node.prompt.length > 100) errors.push(`${prefix}.${node.id} has invalid prompt`);
      for (const error of validateReactionTextTemplate(node.prompt)) errors.push(`${prefix}.${node.id} ${error}`);
      if (node.choices.length < 1 || node.choices.length > 3) errors.push(`${prefix}.${node.id} must have 1..3 choices`);
      if (node.timeoutMs !== null && (!Number.isSafeInteger(node.timeoutMs) || node.timeoutMs < 1_000 || node.timeoutMs > 120_000)) errors.push(`${prefix}.${node.id} has invalid timeoutMs`);
      if (node.timeoutMs === null && node.timeoutNextId) errors.push(`${prefix}.${node.id} cannot auto-transition without a timeout`);
      const choiceIds = new Set<string>();
      for (const choice of node.choices) {
        if (!idPattern.test(choice.id) || choiceIds.has(choice.id)) errors.push(`${prefix}.${node.id} has invalid or duplicate choice ${choice.id}`);
        choiceIds.add(choice.id);
        if (!choice.label.trim() || choice.label.length > 40) errors.push(`${prefix}.${node.id}.${choice.id} has invalid label`);
        for (const error of validateReactionTextTemplate(choice.label)) errors.push(`${prefix}.${node.id}.${choice.id} ${error}`);
      }
    }
  }
  if (!nodes.has(dialogue.startId)) errors.push(`${prefix} startId is missing`);

  const edges = (node: DialogueNode): string[] => node.kind === 'line'
    ? (node.nextId ? [node.nextId] : [])
    : node.kind === 'choice'
      ? [...node.choices.map(choice => choice.nextId), ...(node.timeoutNextId ? [node.timeoutNextId] : [])]
      : [];
  for (const node of nodes.values()) for (const target of edges(node)) {
    if (!nodes.has(target)) errors.push(`${prefix}.${node.id} references missing node ${target}`);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) { errors.push(`${prefix} has an unbounded cycle through ${nodeId}`); return; }
    if (visited.has(nodeId)) return;
    const node = nodes.get(nodeId);
    if (!node) return;
    visiting.add(nodeId);
    for (const target of edges(node)) visit(target);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  visit(dialogue.startId);
  for (const nodeId of nodes.keys()) if (!visited.has(nodeId)) errors.push(`${prefix}.${nodeId} is unreachable`);
  if (![...visited].some(nodeId => nodes.get(nodeId)?.kind === 'end')) errors.push(`${prefix} has no reachable end node`);
}

function duplicateValues(values: readonly string[] | undefined): boolean {
  return !!values && new Set(values).size !== values.length;
}

export function validateReactionCatalog(catalog: ReactionCatalog): readonly string[] {
  const errors: string[] = [];
  if (!Array.isArray(catalog) || catalog.length === 0) return ['catalog must contain at least one reaction'];
  const ids = new Set<string>();
  for (const reaction of catalog) {
    if (!idPattern.test(reaction.id) || ids.has(reaction.id)) errors.push(`invalid or duplicate reaction id ${reaction.id}`);
    ids.add(reaction.id);
    if (!idPattern.test(reaction.family)) errors.push(`${reaction.id} has invalid family`);
    if (!Number.isSafeInteger(reaction.priority) || reaction.priority < 0 || reaction.priority > 1_000) errors.push(`${reaction.id} has invalid priority`);
    const c = reaction.conditions;
    if (!c.triggers.length || duplicateValues(c.triggers)) errors.push(`${reaction.id} has empty or duplicate triggers`);
    if (duplicateValues(c.sources) || duplicateValues(c.personalities) || duplicateValues(c.requireAffordances) || duplicateValues(c.forbidAffordances) || duplicateValues(c.conditions) || duplicateValues(c.cleanliness) || duplicateValues(c.touchTargets) || duplicateValues(c.evidenceKinds) || duplicateValues(c.cleanResults)) {
      errors.push(`${reaction.id} has duplicate condition values`);
    }
    if (c.minGrowthStage !== undefined && (!Number.isSafeInteger(c.minGrowthStage) || c.minGrowthStage < 1)) errors.push(`${reaction.id} has invalid minGrowthStage`);
    if (c.maxGrowthStage !== undefined && (!Number.isSafeInteger(c.maxGrowthStage) || c.maxGrowthStage < 1)) errors.push(`${reaction.id} has invalid maxGrowthStage`);
    if ((c.minGrowthStage ?? 1) > (c.maxGrowthStage ?? Number.MAX_SAFE_INTEGER)) errors.push(`${reaction.id} has contradictory growth stages`);
    const required = new Set(c.requireAffordances ?? []);
    if ((c.forbidAffordances ?? []).some((value: ReactionAffordance) => required.has(value))) errors.push(`${reaction.id} both requires and forbids an affordance`);
    if (c.hibernating === true && c.triggers.some((trigger: ReactionTrigger) => trigger !== 'wake')) errors.push(`${reaction.id} is unreachable while hibernating`);
    if (c.sleeping === true && c.triggers.some((trigger: ReactionTrigger) => ['ball', 'petting', 'meal_committed'].includes(trigger))) errors.push(`${reaction.id} contradicts sleeping state`);
    if (c.triggers.includes('growth_committed') && !c.evidenceKinds?.some((kind: ReactionEvidence['kind']) => kind === 'committed_growth' || kind === 'synthetic_growth_fixture')) errors.push(`${reaction.id} growth cue lacks growth evidence`);
    if (c.triggers.includes('meal_committed') && !c.evidenceKinds?.includes('committed_meal')) errors.push(`${reaction.id} meal cue lacks committed evidence`);
    if (c.triggers.includes('clean') && !c.evidenceKinds?.includes('clean_result')) errors.push(`${reaction.id} clean cue lacks result evidence`);
    if (c.cleanResults && (!c.triggers.includes('clean') || !c.evidenceKinds?.includes('clean_result'))) errors.push(`${reaction.id} cleanResults cannot be reached without clean_result evidence`);
    if (c.evidenceKinds?.includes('synthetic_growth_fixture') && !c.sources?.includes('fixture')) errors.push(`${reaction.id} synthetic growth evidence must be fixture-only`);
    if (c.evidenceKinds?.includes('committed_growth') && c.sources?.includes('fixture')) errors.push(`${reaction.id} committed growth evidence cannot target fixtures`);
    validatePresentation(reaction.id, reaction.presentation, errors);
    if (!Number.isSafeInteger(reaction.repeat.reactionCooldownMs) || reaction.repeat.reactionCooldownMs < 0 ||
        !Number.isSafeInteger(reaction.repeat.familyWindowMs) || reaction.repeat.familyWindowMs < 0 ||
        !Number.isSafeInteger(reaction.repeat.maxFamilyInWindow) || reaction.repeat.maxFamilyInWindow < 1) {
      errors.push(`${reaction.id} has invalid repeat policy`);
    }
    validateDialogue(reaction, errors);
  }
  return errors;
}

function validatePresentation(reactionId: string, p: ReactionDefinition['presentation'], errors: string[], label = reactionId): void {
  if (!clipSet.has(p.clip)) errors.push(`${label} references unsupported clip ${p.clip}`);
  if (!Number.isFinite(p.rate) || p.rate <= 0 || p.rate > 4) errors.push(`${label} has invalid clip rate`);
  if (!Number.isSafeInteger(p.minVisibleMs) || p.minVisibleMs < 250 || p.minVisibleMs > 30_000) errors.push(`${label} has invalid minVisibleMs`);
  if (p.holdPose && (!clipSet.has(p.holdPose.clip) || p.holdPose.normalizedTime < 0 || p.holdPose.normalizedTime > 1 || !Number.isSafeInteger(p.holdPose.durationMs) || p.holdPose.durationMs < 0 || p.holdPose.durationMs > 30_000)) {
    errors.push(`${label} has invalid hold pose`);
  }
}

export function assertValidReactionContext(context: ReactionContext): void {
  if (!context.petId || (context.growthStage !== 'final' && (!Number.isSafeInteger(context.growthStage) || context.growthStage < 1))) throw new Error('Invalid reaction context identity or growth stage');
  normalizeReactionDisplayName(context.displayName);
  if (new Set(context.affordances).size !== context.affordances.length) throw new Error('Reaction context has duplicate affordances');
  const source = context.source ?? 'live';
  if (context.trigger === 'growth_committed') {
    const evidence = context.evidence;
    if (!evidence || (evidence.kind !== 'committed_growth' && evidence.kind !== 'synthetic_growth_fixture')) throw new Error('Growth reaction requires committed or fixture projection evidence');
    if (source === 'live' && evidence.kind !== 'committed_growth') throw new Error('Live growth reaction requires committed event evidence');
    if (source === 'fixture' && evidence.kind !== 'synthetic_growth_fixture') throw new Error('Fixture growth reaction requires synthetic fixture evidence');
    const errors: string[] = [];
    validateProjection(evidence.before, 'growth.before', errors);
    validateProjection(evidence.after, 'growth.after', errors);
    if (evidence.after.totalExpUnits <= evidence.before.totalExpUnits || evidence.after.level < evidence.before.level) errors.push('growth projection did not advance');
    if (context.growthStage !== evidence.after.stage) errors.push('context growthStage differs from committed projection');
    if (errors.length) throw new Error(errors.join('; '));
  }
  if (context.trigger === 'meal_committed' && context.evidence?.kind !== 'committed_meal') throw new Error('Meal reaction requires committed meal evidence');
  if (context.trigger === 'clean' && context.evidence?.kind !== 'clean_result') throw new Error('Clean reaction requires clean result evidence');
}

export function assertValidMemoryRecord(record: ReactionMemoryRecord, expectedPetId?: string, expectedSource?: 'live' | 'fixture'): void {
  if (record.schemaVersion !== 1 || !record.sessionId || !record.petId || !idPattern.test(record.reactionId) || !idPattern.test(record.family) ||
      !Number.isSafeInteger(record.shownAtMs) || record.shownAtMs < 0 ||
      (record.settledAtMs !== null && (!Number.isSafeInteger(record.settledAtMs) || record.settledAtMs < record.shownAtMs)) ||
      (record.outcome === 'shown' ? record.settledAtMs !== null : record.settledAtMs === null) ||
      (expectedPetId !== undefined && record.petId !== expectedPetId) ||
      (expectedSource !== undefined && record.source !== expectedSource)) throw new Error('Invalid reaction memory record');
}

export function assertValidMemorySnapshot(snapshot: ReactionMemorySnapshot): void {
  if (snapshot.schemaVersion !== 1 || !snapshot.petId || snapshot.records.length > 32) throw new Error('Invalid reaction memory snapshot');
  const sessions = new Set<string>();
  let previous = Number.POSITIVE_INFINITY;
  for (const record of snapshot.records) {
    assertValidMemoryRecord(record, snapshot.petId, snapshot.source);
    if (sessions.has(record.sessionId) || record.shownAtMs > previous) throw new Error('Invalid reaction memory ordering or duplicate session');
    sessions.add(record.sessionId);
    previous = record.shownAtMs;
  }
}

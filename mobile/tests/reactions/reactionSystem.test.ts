import test from 'node:test';
import assert from 'node:assert/strict';
import { REACTION_CATALOG } from '../../src/reactions/catalog';
import { dispatchReaction, emptyReactionMemory } from '../../src/reactions/dispatch';
import { previewReaction } from '../../src/reactions/preview';
import { selectReaction } from '../../src/reactions/selector';
import { advanceReactionSession, cancelReactionSession, chooseReactionSession } from '../../src/reactions/session';
import type { ReactionCatalog, ReactionContext, ReactionMemoryRecord } from '../../src/reactions/types';
import { validateReactionCatalog } from '../../src/reactions/validation';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../../src/progression/projection';

const context = (overrides: Partial<ReactionContext> = {}): ReactionContext => ({
  petId: 'pet-reaction', trigger: 'petting', personality: 'reserved', growthStage: 1, source: 'live',
  domainState: { sleeping: false, hibernating: false, condition: 'well', cleanliness: 'clean' },
  affordances: ['ball', 'cushion', 'table', 'toilet'], touchTarget: 'head', ...overrides,
});

test('catalog is structurally valid and deterministic selection explains family repetition', () => {
  assert.deepEqual(validateReactionCatalog(REACTION_CATALOG), []);
  const input = context();
  const first = selectReaction({ catalog: REACTION_CATALOG, context: input, memory: emptyReactionMemory(input.petId), nowMs: 100_000, random: () => 0 });
  const recent: ReactionMemoryRecord = {
    schemaVersion: 1, sessionId: 'recent-1', petId: input.petId, source: 'live', reactionId: first.reaction.id,
    family: first.reaction.family, shownAtMs: 99_000, outcome: 'completed', settledAtMs: 99_500,
  };
  const next = selectReaction({
    catalog: REACTION_CATALOG, context: input,
    memory: { schemaVersion: 1, petId: input.petId, source: 'live', records: [recent] },
    nowMs: 100_000, random: () => 0,
  });
  assert.notEqual(next.reaction.family, first.reaction.family);
  assert.equal(next.explanation.excluded.some(item => item.reactionId === first.reaction.id && item.reasons.includes('reaction_cooldown')), true);
});

test('invalid or inapplicable catalogs fail safely with a visible supported fallback', () => {
  const duplicate = [...REACTION_CATALOG, REACTION_CATALOG[0]] as ReactionCatalog;
  const input = context();
  const invalid = selectReaction({ catalog: duplicate, context: input, memory: emptyReactionMemory(input.petId), nowMs: 1, random: () => 0 });
  assert.equal(invalid.explanation.usedSafeFallback, true);
  assert.equal(invalid.explanation.catalogErrors.some(error => error.includes('duplicate')), true);
  assert.equal(invalid.reaction.presentation.clip, 'idle_reserved');

  const noBall = context({ trigger: 'ball', affordances: [] });
  const fallback = selectReaction({ catalog: REACTION_CATALOG, context: noBall, memory: emptyReactionMemory(noBall.petId), nowMs: 1, random: () => 0 });
  assert.equal(fallback.reaction.id, 'safe.reserved');
});

test('reserved ball dialogue choices produce distinct actual actions and wait until choice or explicit cancellation', () => {
  const input = context({ trigger: 'ball' });
  const dispatched = dispatchReaction(input, emptyReactionMemory(input.petId), {
    now: () => 10_000, random: () => 0, sessionId: () => 'ball-session',
  });
  assert.equal(dispatched.selection.reaction.id, 'ball_reserved');
  const choice = advanceReactionSession(dispatched.session, { type: 'presentation_finished', nowMs: dispatched.session.deadlineAtMs! });
  assert.equal(choice.session.phase, 'awaiting_choice');
  assert.equal(choice.session.deadlineAtMs, null);
  const play = chooseReactionSession(choice.session, 'play', 12_000);
  const rest = chooseReactionSession(choice.session, 'rest', 12_000);
  assert.equal(play.session.phase, 'follow_up');
  assert.equal(rest.session.phase, 'follow_up');
  assert.equal(play.commands.find(command => command.type === 'play_clip')?.clip, 'tsundere_ball');
  assert.equal(rest.commands.find(command => command.type === 'play_clip')?.clip, 'idle_reserved');

  const ignoredTimeout = advanceReactionSession(choice.session, { type: 'timeout', nowMs: 999_999 });
  assert.equal(ignoredTimeout.session, choice.session);
  assert.deepEqual(ignoredTimeout.commands, []);
  const dismissed = cancelReactionSession(choice.session, 'user', 12_001);
  assert.equal(dismissed.session.phase, 'cancelled');
  assert.equal(dismissed.outcome?.kind, 'cancelled');
  assert.deepEqual(dismissed.commands, [{ type: 'clear_presentation' }]);
});

test('background cancellation is immediate and all outputs remain presentation-only', () => {
  const input = context({ personality: 'expressive', trigger: 'greeting' });
  const domainState = Object.freeze({ food: 2, coins: 30, totalExpUnits: 100 });
  const before = JSON.stringify(domainState);
  const preview = previewReaction({ context: input, nowMs: 5_000, random: () => 0 });
  const cancelled = cancelReactionSession(preview.session, 'background', 5_001);
  assert.equal(cancelled.session.phase, 'cancelled');
  assert.equal(cancelled.outcome?.kind, 'cancelled');
  assert.equal((cancelled.outcome as { reason: string }).reason, 'background');
  const allowed = new Set(['play_clip', 'hold_pose', 'set_gaze', 'set_emotion', 'show_dialogue', 'clear_presentation']);
  for (const command of [...preview.commands, ...cancelled.commands]) assert.equal(allowed.has(command.type), true);
  assert.equal(JSON.stringify(domainState), before);
  assert.equal(Object.values(cancelled.outcome ?? {}).some(value => typeof value === 'function'), false);
});

test('content validator catches missing refs, cycles, contradictions, and unreachable nodes', () => {
  const base = REACTION_CATALOG[0];
  const broken = [{
    ...base,
    id: 'broken_graph',
    conditions: { triggers: ['petting'], minGrowthStage: 3, maxGrowthStage: 2 },
    dialogue: {
      startId: 'a', nodes: [
        { id: 'a', kind: 'line', text: '{unknown}', minReadMs: 700, nextId: 'b' },
        { id: 'b', kind: 'line', text: 'b', minReadMs: 700, nextId: 'a' },
        { id: 'orphan', kind: 'end' },
      ],
    },
  }] as ReactionCatalog;
  const errors = validateReactionCatalog(broken);
  assert.equal(errors.some(error => error.includes('contradictory')), true);
  assert.equal(errors.some(error => error.includes('cycle')), true);
  assert.equal(errors.some(error => error.includes('unreachable')), true);
  assert.equal(errors.some(error => error.includes('no reachable end')), true);
  assert.equal(errors.some(error => error.includes('unsupported text token')), true);
});

test('petting, rest, and greeting expose two semantic scene families for both expression profiles', () => {
  for (const personality of ['reserved', 'expressive'] as const) {
    for (const trigger of ['petting', 'rest', 'greeting'] as const) {
      const input = context({ personality, trigger });
      const first = selectReaction({ catalog: REACTION_CATALOG, context: input, memory: emptyReactionMemory(input.petId), nowMs: 1_000, random: () => 0 });
      const last = selectReaction({ catalog: REACTION_CATALOG, context: input, memory: emptyReactionMemory(input.petId), nowMs: 1_000, random: () => 0.999_999 });
      assert.notEqual(first.reaction.family, last.reaction.family, `${personality}/${trigger} family`);
      assert.notEqual(first.reaction.presentation.clip, last.reaction.presentation.clip, `${personality}/${trigger} motion`);
    }
  }
});

test('dialogue cannot advance before its readable deadline and a choice produces follow-up motion', () => {
  const input = context({ trigger: 'ball' });
  const started = dispatchReaction(input, emptyReactionMemory(input.petId), {
    now: () => 20_000, random: () => 0, sessionId: () => 'readable-ball',
  });
  const tooEarly = advanceReactionSession(started.session, {
    type: 'presentation_finished', nowMs: started.session.deadlineAtMs! - 1,
  });
  assert.equal(tooEarly.session, started.session);
  assert.deepEqual(tooEarly.commands, []);

  const choices = advanceReactionSession(started.session, {
    type: 'presentation_finished', nowMs: started.session.deadlineAtMs!,
  });
  const followUp = chooseReactionSession(choices.session, 'rest', 22_000);
  assert.equal(followUp.session.phase, 'follow_up');
  assert.equal(followUp.commands.find(command => command.type === 'play_clip')?.clip, 'idle_reserved');
});

test('sleeping rest stays quiet while normal rest never selects a sleep scene', () => {
  const sleeping = context({
    trigger: 'rest',
    domainState: { sleeping: true, hibernating: false, condition: 'well', cleanliness: 'clean' },
  });
  const quiet = selectReaction({ catalog: REACTION_CATALOG, context: sleeping, memory: emptyReactionMemory(sleeping.petId), nowMs: 1, random: () => 0 });
  assert.equal(quiet.reaction.id, 'rest_sleeping_quiet');
  assert.equal(quiet.reaction.presentation.clip, 'sleep');
  assert.equal(quiet.reaction.dialogue, undefined);

  const awake = context({ trigger: 'rest' });
  const normal = selectReaction({ catalog: REACTION_CATALOG, context: awake, memory: emptyReactionMemory(awake.petId), nowMs: 1, random: () => 0 });
  assert.notEqual(normal.reaction.presentation.clip, 'sleep');

  const invalidCatalog = [...REACTION_CATALOG, REACTION_CATALOG[0]] as ReactionCatalog;
  const safe = selectReaction({ catalog: invalidCatalog, context: sleeping, memory: emptyReactionMemory(sleeping.petId), nowMs: 1, random: () => 0 });
  assert.equal(safe.reaction.id, 'safe.sleeping');
  assert.equal(safe.reaction.presentation.clip, 'sleep');
});

test('growth unlock is stage-gated and fixture evidence cannot select a live growth scene', () => {
  const threshold = APPROVED_GROWTH_POLICY.bands[0].expPerLevel * APPROVED_GROWTH_POLICY.expScale *
    (APPROVED_GROWTH_POLICY.bands[0].toLevel - APPROVED_GROWTH_POLICY.bands[0].fromLevel + 1);
  const stageOneBefore = projectGrowth(threshold - 2, APPROVED_GROWTH_POLICY);
  const stageOneAfter = projectGrowth(threshold - 1, APPROVED_GROWTH_POLICY);
  const locked = context({
    trigger: 'growth_committed', source: 'fixture', growthStage: stageOneAfter.stage,
    evidence: { kind: 'synthetic_growth_fixture', fixtureId: 'locked', before: stageOneBefore, after: stageOneAfter },
  });
  assert.equal(selectReaction({ catalog: REACTION_CATALOG, context: locked, memory: emptyReactionMemory(locked.petId, 'fixture'), nowMs: 1, random: () => 0 }).explanation.usedSafeFallback, true);

  const before = projectGrowth(threshold - 1, APPROVED_GROWTH_POLICY);
  const after = projectGrowth(threshold, APPROVED_GROWTH_POLICY);
  const unlocked = context({
    trigger: 'growth_committed', source: 'fixture', growthStage: after.stage,
    evidence: { kind: 'synthetic_growth_fixture', fixtureId: 'unlocked', before, after },
  });
  const selected = selectReaction({ catalog: REACTION_CATALOG, context: unlocked, memory: emptyReactionMemory(unlocked.petId, 'fixture'), nowMs: 1, random: () => 0 });
  assert.equal(selected.reaction.id, 'growth_fixture_reserved');
  assert.deepEqual(selected.reaction.conditions.sources, ['fixture']);
  assert.deepEqual(selected.reaction.conditions.evidenceKinds, ['synthetic_growth_fixture']);
});

test('all three clean outcomes select only their exact result scene', () => {
  const expected = {
    nothing_to_clean: 'clean_noop', auto_toilet: 'clean_auto_toilet', cleaned: 'cleaned',
  } as const;
  for (const result of Object.keys(expected) as (keyof typeof expected)[]) {
    const input = context({ trigger: 'clean', evidence: { kind: 'clean_result', result } });
    const selected = selectReaction({ catalog: REACTION_CATALOG, context: input, memory: emptyReactionMemory(input.petId), nowMs: 1, random: () => 0 });
    assert.equal(selected.reaction.id, expected[result]);
  }
});

test('authoring preview adds a templated scene as data and safely renders a long Unicode pet name', () => {
  const added = {
    ...REACTION_CATALOG[0],
    id: 'authoring_name_preview', family: 'authoring.name_preview', priority: 999,
    conditions: { triggers: ['greeting'] as const, personalities: ['expressive'] as const },
    dialogue: {
      startId: 'start', nodes: [
        { id: 'start', kind: 'line' as const, text: '{petName}, 새 장면 미리보기야.', minReadMs: 1_400, nextId: 'end' },
        { id: 'end', kind: 'end' as const },
      ],
    },
  };
  const displayName = `${'👨‍👩‍👧‍👦'.repeat(12)}콘`;
  const preview = previewReaction({
    context: context({ personality: 'expressive', trigger: 'greeting', displayName }),
    catalog: [...REACTION_CATALOG, added], preferredReactionId: added.id, nowMs: 50_000,
  });
  assert.equal(preview.selection.reaction.id, added.id);
  const dialogue = preview.commands.find(command => command.type === 'show_dialogue');
  assert.equal(dialogue?.type, 'show_dialogue');
  assert.equal(dialogue?.text, `${displayName}, 새 장면 미리보기야.`);
  assert.equal(dialogue?.text.includes('\n'), false);
  assert.throws(() => previewReaction({
    context: context({ personality: 'expressive', trigger: 'greeting', displayName: '잘못된\n이름' }),
    catalog: [added], preferredReactionId: added.id, nowMs: 50_000,
  }), /invalid characters/);
});

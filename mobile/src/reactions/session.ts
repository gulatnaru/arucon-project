import type {
  DialogueNode,
  PresentationCommand,
  ReactionContext,
  ReactionOutcome,
  ReactionPresentation,
  ReactionSelection,
  ReactionSession,
  SessionTransition,
} from './types';
import { normalizeReactionDisplayName, renderReactionText } from './text';

function commandsForPresentation(presentation: ReactionPresentation): PresentationCommand[] {
  const commands: PresentationCommand[] = [
    { type: 'play_clip', clip: presentation.clip, rate: presentation.rate },
    { type: 'set_gaze', direction: presentation.gaze },
    { type: 'set_emotion', emotion: presentation.emotion },
  ];
  if (presentation.holdPose) commands.push({ type: 'hold_pose', ...presentation.holdPose });
  return commands;
}

function nodeFor(session: ReactionSession, nodeId: string): DialogueNode {
  const node = session.dialogue?.nodes.find(candidate => candidate.id === nodeId);
  if (!node) throw new Error(`Dialogue node ${nodeId} is missing`);
  return node;
}

function completed(session: ReactionSession, nowMs: number): SessionTransition {
  const next: ReactionSession = { ...session, phase: 'completed', deadlineAtMs: null, dialogueNodeId: null };
  const outcome: ReactionOutcome = {
    kind: 'completed', sessionId: session.id, petId: session.petId, source: session.source,
    reactionId: session.reactionId, family: session.family, atMs: nowMs,
  };
  return { session: next, commands: [{ type: 'clear_presentation' }], outcome };
}

function enterNode(session: ReactionSession, nodeId: string, nowMs: number, followUp: boolean): SessionTransition {
  const node = nodeFor(session, nodeId);
  if (node.kind === 'end') return completed(session, nowMs);
  if (node.kind === 'choice') {
    return {
      session: { ...session, phase: 'awaiting_choice', dialogueNodeId: node.id, deadlineAtMs: node.timeoutMs === null ? null : nowMs + node.timeoutMs },
      commands: [{
        type: 'show_dialogue',
        text: renderReactionText(node.prompt, session.displayName),
        choices: node.choices.map(choice => ({ id: choice.id, label: renderReactionText(choice.label, session.displayName) })),
      }],
    };
  }
  const presentation = node.presentation ?? session.presentation;
  return {
    session: {
      ...session,
      phase: followUp ? 'follow_up' : 'presenting',
      dialogueNodeId: node.id,
      deadlineAtMs: nowMs + Math.max(node.minReadMs, presentation.minVisibleMs),
    },
    commands: [
      ...commandsForPresentation(presentation),
      { type: 'show_dialogue', text: renderReactionText(node.text, session.displayName), choices: [] },
    ],
  };
}

function assertTime(nowMs: number): void {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Invalid reaction session time');
}

export function createReactionSession(
  selection: ReactionSelection,
  context: ReactionContext,
  nowMs: number,
  sessionId: string,
): SessionTransition {
  assertTime(nowMs);
  if (!sessionId) throw new Error('Reaction session id is required');
  const reaction = selection.reaction;
  const session: ReactionSession = {
    id: sessionId,
    petId: context.petId,
    displayName: normalizeReactionDisplayName(context.displayName),
    source: context.source ?? 'live',
    reactionId: reaction.id,
    family: reaction.family,
    phase: 'presenting',
    startedAtMs: nowMs,
    deadlineAtMs: nowMs + reaction.presentation.minVisibleMs,
    dialogueNodeId: null,
    presentation: reaction.presentation,
    dialogue: reaction.dialogue,
  };
  if (!reaction.dialogue) return { session, commands: commandsForPresentation(reaction.presentation) };
  const entered = enterNode(session, reaction.dialogue.startId, nowMs, false);
  const node = nodeFor(session, reaction.dialogue.startId);
  if (node.kind === 'choice') {
    return { ...entered, commands: [...commandsForPresentation(reaction.presentation), ...entered.commands] };
  }
  return entered;
}

export function chooseReactionSession(session: ReactionSession, choiceId: string, nowMs: number): SessionTransition {
  assertTime(nowMs);
  if (session.phase === 'completed' || session.phase === 'cancelled') return { session, commands: [] };
  if (session.phase !== 'awaiting_choice' || !session.dialogueNodeId) throw new Error('Reaction session is not awaiting a choice');
  if (session.deadlineAtMs !== null && nowMs >= session.deadlineAtMs) return advanceReactionSession(session, { type: 'timeout', nowMs });
  const node = nodeFor(session, session.dialogueNodeId);
  if (node.kind !== 'choice') throw new Error('Reaction session choice state is corrupt');
  const choice = node.choices.find(candidate => candidate.id === choiceId);
  if (!choice) throw new Error(`Unknown reaction choice ${choiceId}`);
  return enterNode(session, choice.nextId, nowMs, true);
}

export function advanceReactionSession(
  session: ReactionSession,
  event: Readonly<{ type: 'presentation_finished' | 'timeout'; nowMs: number }>,
): SessionTransition {
  assertTime(event.nowMs);
  if (session.phase === 'completed' || session.phase === 'cancelled') return { session, commands: [] };
  if (session.deadlineAtMs !== null && event.nowMs < session.deadlineAtMs) return { session, commands: [] };
  if (session.phase === 'awaiting_choice') {
    if (event.type !== 'timeout' || !session.dialogueNodeId) return { session, commands: [] };
    if (session.deadlineAtMs === null) return { session, commands: [] };
    const node = nodeFor(session, session.dialogueNodeId);
    if (node.kind !== 'choice') throw new Error('Reaction session choice state is corrupt');
    return node.timeoutNextId ? enterNode(session, node.timeoutNextId, event.nowMs, true) : completed(session, event.nowMs);
  }
  if (session.dialogueNodeId) {
    const node = nodeFor(session, session.dialogueNodeId);
    if (node.kind !== 'line') throw new Error('Reaction session presentation state is corrupt');
    return node.nextId ? enterNode(session, node.nextId, event.nowMs, session.phase === 'follow_up') : completed(session, event.nowMs);
  }
  return completed(session, event.nowMs);
}

export function cancelReactionSession(
  session: ReactionSession,
  reason: 'user' | 'background' | 'scene_change' | 'superseded',
  nowMs: number,
): SessionTransition {
  assertTime(nowMs);
  if (session.phase === 'completed' || session.phase === 'cancelled') return { session, commands: [] };
  const next: ReactionSession = { ...session, phase: 'cancelled', deadlineAtMs: null, dialogueNodeId: null };
  return {
    session: next,
    commands: [{ type: 'clear_presentation' }],
    outcome: {
      kind: 'cancelled', sessionId: session.id, petId: session.petId, source: session.source,
      reactionId: session.reactionId, family: session.family, atMs: nowMs, reason,
    },
  };
}

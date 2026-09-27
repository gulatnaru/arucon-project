import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyReactionMemory, type ReactionContext, type ReactionMemorySnapshot, type ReactionOutcome, type ReactionSession } from '../../src/reactions';
import { ReactionRuntime, type ReactionMemoryWriter } from '../../src/presentation/reactionRuntime';

const context = (trigger: ReactionContext['trigger'] = 'ball'): ReactionContext => ({
  petId: 'pet-runtime', trigger, personality: 'reserved', growthStage: 1, source: 'live',
  domainState: { sleeping: false, hibernating: false, condition: 'well', cleanliness: 'clean' },
  affordances: ['ball', 'cushion', 'table', 'toilet'], touchTarget: 'head',
});

function memoryWriter(log: string[]): ReactionMemoryWriter {
  let snapshot: ReactionMemorySnapshot = emptyReactionMemory('pet-runtime');
  return {
    async recordShown(session: ReactionSession) {
      log.push(`shown:${session.reactionId}`);
      snapshot = { ...snapshot, records: [{
        schemaVersion: 1, sessionId: session.id, petId: session.petId, source: session.source,
        reactionId: session.reactionId, family: session.family, shownAtMs: session.startedAtMs,
        outcome: 'shown', settledAtMs: null,
      }, ...snapshot.records] };
      return snapshot;
    },
    async recordCompleted(outcome: Extract<ReactionOutcome, { kind: 'completed' }>) {
      log.push(`completed:${outcome.reactionId}`);
      snapshot = { ...snapshot, records: snapshot.records.map(item => item.sessionId === outcome.sessionId
        ? { ...item, outcome: 'completed', settledAtMs: outcome.atMs } : item) };
      return snapshot;
    },
    async recordCancelled(outcome: Extract<ReactionOutcome, { kind: 'cancelled' }>) {
      log.push(`cancelled:${outcome.reason}:${outcome.reactionId}`);
      snapshot = { ...snapshot, records: snapshot.records.map(item => item.sessionId === outcome.sessionId
        ? { ...item, outcome: 'cancelled', settledAtMs: outcome.atMs } : item) };
      return snapshot;
    },
  };
}

test('actual input reaches choice, distinct follow-up clips and completed memory in order', async () => {
  let now = 10_000;
  const scheduled: (() => void)[] = [];
  const commands: string[][] = [];
  const memoryLog: string[] = [];
  const runtime = new ReactionRuntime({
    memory: emptyReactionMemory('pet-runtime'), writer: memoryWriter(memoryLog), now: () => now, random: () => 0,
    sessionId: () => 'runtime-ball', schedule: callback => { scheduled.push(callback); return 1 as never; }, clearSchedule: () => undefined,
    onCommands: batch => commands.push(batch.map(command => command.type === 'play_clip' ? `${command.type}:${command.clip}` : command.type)),
  });

  runtime.start(context());
  now = runtime.currentSession()!.deadlineAtMs!;
  scheduled.shift()!();
  assert.equal(runtime.currentSession()?.phase, 'awaiting_choice');
  now += 1;
  runtime.choose('rest');
  assert.equal(runtime.currentSession()?.phase, 'follow_up');
  assert.equal(commands.some(batch => batch.includes('play_clip:idle_reserved')), true);
  now = runtime.currentSession()!.deadlineAtMs!;
  scheduled.pop()!();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(runtime.currentSession(), null);
  assert.deepEqual(memoryLog, ['shown:ball_reserved', 'completed:ball_reserved']);
});

test('superseding input and dispose cancel sessions, clear timers and never complete cancelled scenes', async () => {
  let now = 20_000;
  let cleared = 0;
  const memoryLog: string[] = [];
  const runtime = new ReactionRuntime({
    memory: emptyReactionMemory('pet-runtime'), writer: memoryWriter(memoryLog), now: () => now, random: () => 0,
    sessionId: (_context, atMs) => `session-${atMs}`,
    schedule: () => ({}) as never, clearSchedule: () => { cleared++; }, onCommands: () => undefined,
  });
  runtime.start(context('petting'));
  const firstId = runtime.currentSession()!.reactionId;
  now++;
  runtime.start(context('rest'));
  const secondId = runtime.currentSession()!.reactionId;
  now++;
  runtime.dispose();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(memoryLog, [
    `shown:${firstId}`,
    `cancelled:superseded:${firstId}`,
    `shown:${secondId}`,
    `cancelled:scene_change:${secondId}`,
  ]);
  assert.equal(cleared, 2);
  assert.equal(memoryLog.some(item => item.startsWith('completed:')), false);
  assert.deepEqual(runtime.currentMemory().records.map(item => item.outcome), ['cancelled', 'cancelled']);
});

test('a direct interaction intent cancels an indefinitely pending choice instead of completing it', async () => {
  let now = 30_000;
  const scheduled: (() => void)[] = [];
  const memoryLog: string[] = [];
  const runtime = new ReactionRuntime({
    memory: emptyReactionMemory('pet-runtime'), writer: memoryWriter(memoryLog), now: () => now, random: () => 0,
    sessionId: (_context, atMs) => `pending-${atMs}`,
    schedule: callback => { scheduled.push(callback); return 1 as never; }, clearSchedule: () => undefined,
    onCommands: () => undefined,
  });
  runtime.start(context('ball'));
  now = runtime.currentSession()!.deadlineAtMs!;
  scheduled.shift()!();
  assert.equal(runtime.currentSession()?.phase, 'awaiting_choice');
  assert.equal(runtime.currentSession()?.deadlineAtMs, null);

  runtime.cancel('superseded');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(runtime.currentSession(), null);
  assert.equal(runtime.currentMemory().records[0].outcome, 'cancelled');
  assert.deepEqual(memoryLog, ['shown:ball_reserved', 'cancelled:superseded:ball_reserved']);
  assert.equal(memoryLog.some(item => item.startsWith('completed:')), false);
});

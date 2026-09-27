import {
  advanceReactionSession,
  cancelReactionSession,
  chooseReactionSession,
  dispatchReaction,
  type DispatchReactionDependencies,
  type DispatchedReaction,
  type PresentationCommand,
  type ReactionContext,
  type ReactionMemoryRecord,
  type ReactionMemorySnapshot,
  type ReactionOutcome,
  type ReactionSession,
  type SessionTransition,
} from '../reactions';

export type ReactionMemoryWriter = Readonly<{
  recordShown: (session: ReactionSession) => Promise<ReactionMemorySnapshot>;
  recordCompleted: (outcome: Extract<ReactionOutcome, { kind: 'completed' }>) => Promise<ReactionMemorySnapshot>;
  recordCancelled: (outcome: Extract<ReactionOutcome, { kind: 'cancelled' }>) => Promise<ReactionMemorySnapshot>;
}>;

type ScheduledHandle = ReturnType<typeof setTimeout>;

export type ReactionRuntimeOptions = Readonly<{
  memory: ReactionMemorySnapshot;
  writer?: ReactionMemoryWriter;
  now?: () => number;
  random?: () => number;
  sessionId?: DispatchReactionDependencies['sessionId'];
  schedule?: (callback: () => void, delayMs: number) => ScheduledHandle;
  clearSchedule?: (handle: ScheduledHandle) => void;
  onCommands: (commands: readonly PresentationCommand[], session: ReactionSession) => void;
  onSelection?: (reaction: DispatchedReaction) => void;
  onMemoryError?: (error: unknown) => void;
}>;

function shownMemory(memory: ReactionMemorySnapshot, session: ReactionSession): ReactionMemorySnapshot {
  const record: ReactionMemoryRecord = {
    schemaVersion: 1,
    sessionId: session.id,
    petId: session.petId,
    source: session.source,
    reactionId: session.reactionId,
    family: session.family,
    shownAtMs: session.startedAtMs,
    outcome: 'shown',
    settledAtMs: null,
  };
  return { ...memory, records: [record, ...memory.records.filter(item => item.sessionId !== session.id)].slice(0, 32) };
}

function settledMemory(memory: ReactionMemorySnapshot, outcome: ReactionOutcome): ReactionMemorySnapshot {
  return {
    ...memory,
    records: memory.records.map(record => record.sessionId === outcome.sessionId
      ? { ...record, outcome: outcome.kind, settledAtMs: outcome.atMs }
      : record),
  };
}

/**
 * Owns presentation timers and bounded reaction-memory writes. It has no game
 * service or economy callback, so finishing a clip cannot grant resources.
 */
export class ReactionRuntime {
  private memory: ReactionMemorySnapshot;
  private session: ReactionSession | null = null;
  private timer: ScheduledHandle | null = null;
  private persistenceTail: Promise<void> = Promise.resolve();
  private disposed = false;

  private readonly now: () => number;
  private readonly schedule: NonNullable<ReactionRuntimeOptions['schedule']>;
  private readonly clearSchedule: NonNullable<ReactionRuntimeOptions['clearSchedule']>;

  constructor(private readonly options: ReactionRuntimeOptions) {
    this.memory = options.memory;
    this.now = options.now ?? Date.now;
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.clearSchedule = options.clearSchedule ?? (handle => clearTimeout(handle));
  }

  currentSession(): ReactionSession | null { return this.session; }
  currentMemory(): ReactionMemorySnapshot { return this.memory; }

  start(context: ReactionContext): DispatchedReaction | null {
    if (this.disposed) return null;
    this.cancel('superseded');
    const nowMs = this.readNow();
    const dispatched = dispatchReaction(context, this.memory, {
      now: () => nowMs,
      random: this.options.random,
      sessionId: this.options.sessionId,
    });
    this.session = dispatched.session;
    this.memory = shownMemory(this.memory, dispatched.session);
    this.enqueue(writer => writer.recordShown(dispatched.session));
    this.options.onSelection?.(dispatched);
    this.options.onCommands(dispatched.commands, dispatched.session);
    this.armTimer(dispatched.session);
    return dispatched;
  }

  choose(choiceId: string): void {
    if (!this.session || this.disposed) return;
    this.apply(chooseReactionSession(this.session, choiceId, this.readNow()));
  }

  cancel(reason: Extract<ReactionOutcome, { kind: 'cancelled' }>['reason']): void {
    if (!this.session || this.disposed) return;
    this.apply(cancelReactionSession(this.session, reason, this.readNow()));
  }

  dispose(): void {
    if (this.disposed) return;
    if (this.session) {
      const transition = cancelReactionSession(this.session, 'scene_change', this.readNow());
      this.session = transition.session;
      if (transition.outcome) this.recordOutcome(transition.outcome);
    }
    this.disposed = true;
    this.clearTimer();
  }

  private readNow(): number {
    const value = this.now();
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Reaction runtime clock must return a nonnegative integer');
    return value;
  }

  private apply(transition: SessionTransition): void {
    this.clearTimer();
    this.session = transition.session;
    if (transition.commands.length) this.options.onCommands(transition.commands, transition.session);
    if (transition.outcome) {
      this.recordOutcome(transition.outcome);
      this.session = null;
      return;
    }
    this.armTimer(transition.session);
  }

  private recordOutcome(outcome: ReactionOutcome): void {
    this.memory = settledMemory(this.memory, outcome);
    if (outcome.kind === 'completed') this.enqueue(writer => writer.recordCompleted(outcome));
    else this.enqueue(writer => writer.recordCancelled(outcome));
  }

  private armTimer(session: ReactionSession): void {
    if (session.deadlineAtMs === null || this.disposed) return;
    const sessionId = session.id;
    const deadline = session.deadlineAtMs;
    this.timer = this.schedule(() => {
      this.timer = null;
      if (this.disposed || !this.session || this.session.id !== sessionId || this.session.deadlineAtMs !== deadline) return;
      const nowMs = Math.max(deadline, this.readNow());
      const event = this.session.phase === 'awaiting_choice' ? 'timeout' : 'presentation_finished';
      this.apply(advanceReactionSession(this.session, { type: event, nowMs }));
    }, Math.max(0, deadline - this.readNow()));
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    this.clearSchedule(this.timer);
    this.timer = null;
  }

  private enqueue(operation: (writer: ReactionMemoryWriter) => Promise<ReactionMemorySnapshot>): void {
    if (!this.options.writer) return;
    this.persistenceTail = this.persistenceTail
      // Optimistic memory already includes this transition. Replacing it with
      // an earlier queued write result could briefly discard a newer session.
      .then(async () => { await operation(this.options.writer!); })
      .catch(error => { this.options.onMemoryError?.(error); });
  }
}

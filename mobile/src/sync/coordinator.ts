import type { DeliveryResult, SyncQueue, SyncTransport } from './contracts';
import type { SyncRetryPolicy } from './retryPolicy';

export type SyncClock = Readonly<{ nowMs(): number }>;
export type SyncRandom = Readonly<{ unit(): number }>;

export type FlushResult = Readonly<{
  attempted: number;
  acknowledged: number;
  retryableErrors: number;
  conflicts: number;
}>;

/**
 * Sends durable local actions without choosing an operational retry limit.
 * Callers decide when to invoke another pass; rows are never discarded here.
 */
export class SyncCoordinator {
  constructor(
    private readonly queue: SyncQueue,
    private readonly transport: SyncTransport,
    private readonly retryPolicy: SyncRetryPolicy,
    private readonly clock: SyncClock,
    private readonly random: SyncRandom,
  ) {}

  private async recordRetry(actionId: string, attemptCount: number, code: string): Promise<void> {
    const attemptedAtMs = this.clock.nowMs();
    if (!Number.isSafeInteger(attemptedAtMs) || attemptedAtMs < 0) throw new Error('Invalid sync clock');
    const delayMs = this.retryPolicy.nextDelayMs(attemptCount + 1, this.random.unit());
    const nextAttemptAtMs = attemptedAtMs + delayMs;
    if (!Number.isSafeInteger(nextAttemptAtMs)) throw new Error('Sync retry time overflow');
    await this.queue.recordRetryableError(actionId, code, attemptedAtMs, nextAttemptAtMs, this.retryPolicy.version);
  }

  async flushOnce(limit: number): Promise<FlushResult> {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Invalid sync batch limit');
    const nowMs = this.clock.nowMs();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Invalid sync clock');
    const actions = await this.queue.listDispatchable(limit, nowMs);
    let acknowledged = 0;
    let retryableErrors = 0;
    let conflicts = 0;
    for (const action of actions) {
      let result: DeliveryResult;
      try {
        result = await this.transport.deliver(action);
      } catch (error) {
        const code = error instanceof Error && error.name ? `transport:${error.name}` : 'transport:unknown';
        await this.recordRetry(action.actionId, action.attemptCount, code);
        retryableErrors++;
        continue;
      }
      if (result.kind === 'ack') {
        if (result.actionId !== action.actionId) throw new Error('Sync acknowledgement actionId mismatch');
        await this.queue.acknowledge(action.actionId, result.ackSequence, result.confirmedAtMs);
        acknowledged++;
      } else if (result.kind === 'retryable_error') {
        await this.recordRetry(action.actionId, action.attemptCount, result.code);
        retryableErrors++;
      } else {
        await this.queue.recordConflict(action.actionId, result.code);
        conflicts++;
      }
    }
    return { attempted: actions.length, acknowledged, retryableErrors, conflicts };
  }
}

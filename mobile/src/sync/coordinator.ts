import type { SyncQueue, SyncTransport } from './contracts';

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
  constructor(private readonly queue: SyncQueue, private readonly transport: SyncTransport) {}

  async flushOnce(limit: number): Promise<FlushResult> {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Invalid sync batch limit');
    const actions = await this.queue.listDispatchable(limit);
    let acknowledged = 0;
    let retryableErrors = 0;
    let conflicts = 0;
    for (const action of actions) {
      try {
        const result = await this.transport.deliver(action);
        if (result.kind === 'ack') {
          if (result.actionId !== action.actionId) throw new Error('Sync acknowledgement actionId mismatch');
          await this.queue.acknowledge(action.actionId, result.ackSequence, result.confirmedAtMs);
          acknowledged++;
        } else if (result.kind === 'retryable_error') {
          await this.queue.recordRetryableError(action.actionId, result.code);
          retryableErrors++;
        } else {
          await this.queue.recordConflict(action.actionId, result.code);
          conflicts++;
        }
      } catch (error) {
        const code = error instanceof Error && error.name ? `transport:${error.name}` : 'transport:unknown';
        await this.queue.recordRetryableError(action.actionId, code);
        retryableErrors++;
      }
    }
    return { attempted: actions.length, acknowledged, retryableErrors, conflicts };
  }
}

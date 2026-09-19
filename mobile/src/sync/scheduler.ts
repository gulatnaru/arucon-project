import type { FlushResult, SyncClock, SyncCoordinator } from './coordinator';
import type { SyncQueue } from './contracts';

export type SyncConnectivity = Readonly<{ isOnline(): boolean | Promise<boolean> }>;
export type SyncTimer = Readonly<{
  set(delayMs: number, callback: () => void): unknown;
  clear(handle: unknown): void;
}>;

export type SyncSchedulerConfig = Readonly<{
  batchLimit: number;
  idlePollMs: number;
  offlinePollMs: number;
}>;

export type SchedulerRunResult =
  | Readonly<{ kind: 'offline' }>
  | Readonly<{ kind: 'flushed'; result: FlushResult }>;

/**
 * One local actor owns dispatch timing. The durable queue remains authoritative,
 * so stopping or recreating this actor cannot lose a pending retry.
 */
export class DurableSyncScheduler {
  private started = false;
  private scheduled: unknown | null = null;
  private inFlight: Promise<SchedulerRunResult> | null = null;

  constructor(
    private readonly coordinator: SyncCoordinator,
    private readonly queue: SyncQueue,
    private readonly connectivity: SyncConnectivity,
    private readonly clock: SyncClock,
    private readonly timer: SyncTimer,
    private readonly config: SyncSchedulerConfig,
  ) {
    if (!Number.isSafeInteger(config.batchLimit) || config.batchLimit <= 0 ||
        !Number.isSafeInteger(config.idlePollMs) || config.idlePollMs <= 0 ||
        !Number.isSafeInteger(config.offlinePollMs) || config.offlinePollMs <= 0) {
      throw new Error('Invalid sync scheduler configuration');
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.schedule(0);
  }

  stop(): void {
    this.started = false;
    if (this.scheduled !== null) this.timer.clear(this.scheduled);
    this.scheduled = null;
  }

  /** Signal that connectivity or local queue state may have changed. */
  poke(): void {
    if (!this.started) return;
    this.schedule(0);
  }

  runDue(): Promise<SchedulerRunResult> {
    if (this.inFlight) return this.inFlight;
    const work = this.performRun();
    this.inFlight = work;
    void work.then(
      () => { if (this.inFlight === work) this.inFlight = null; },
      () => { if (this.inFlight === work) this.inFlight = null; },
    );
    return work;
  }

  private async performRun(): Promise<SchedulerRunResult> {
    if (!await this.connectivity.isOnline()) return { kind: 'offline' };
    return { kind: 'flushed', result: await this.coordinator.flushOnce(this.config.batchLimit) };
  }

  private schedule(delayMs: number): void {
    if (!this.started) return;
    if (!Number.isSafeInteger(delayMs) || delayMs < 0) throw new Error('Invalid scheduler delay');
    if (this.scheduled !== null) this.timer.clear(this.scheduled);
    this.scheduled = this.timer.set(delayMs, () => {
      this.scheduled = null;
      void this.tick();
    });
  }

  private async tick(): Promise<void> {
    try {
      const result = await this.runDue();
      if (!this.started) return;
      if (result.kind === 'offline') {
        this.schedule(this.config.offlinePollMs);
        return;
      }
      const nextAtMs = await this.queue.nextRunnableAtMs();
      if (nextAtMs === null) {
        this.schedule(this.config.idlePollMs);
        return;
      }
      const nowMs = this.clock.nowMs();
      if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Invalid sync clock');
      this.schedule(Math.max(0, nextAtMs - nowMs));
    } catch {
      // Local/transport failure evidence stays in the queue where possible. A
      // later actor pass retries; this layer never classifies or drops data.
      if (this.started) this.schedule(this.config.idlePollMs);
    }
  }
}

export type SyncRetryPolicy = Readonly<{
  version: string;
  nextDelayMs(attemptNumber: number, randomUnit: number): number;
}>;

export type CappedExponentialRetryConfig = Readonly<{
  version: string;
  baseDelayMs: number;
  maximumDelayMs: number;
}>;

/**
 * Reversible technical defaults. Equal jitter chooses a delay in [cap / 2, cap)
 * and no attempt count ever causes a row to be discarded.
 */
export const SYNC_RETRY_V1: CappedExponentialRetryConfig = Object.freeze({
  version: 'sync-retry-v1',
  baseDelayMs: 1_000,
  maximumDelayMs: 300_000,
});

export class CappedExponentialRetryPolicy implements SyncRetryPolicy {
  readonly version: string;
  private readonly baseDelayMs: number;
  private readonly maximumDelayMs: number;

  constructor(config: CappedExponentialRetryConfig = SYNC_RETRY_V1) {
    if (!config.version.trim() || config.version.length > 80) throw new Error('Invalid retry policy version');
    if (!Number.isSafeInteger(config.baseDelayMs) || config.baseDelayMs < 2 ||
        !Number.isSafeInteger(config.maximumDelayMs) || config.maximumDelayMs < config.baseDelayMs) {
      throw new Error('Invalid retry delay configuration');
    }
    this.version = config.version;
    this.baseDelayMs = config.baseDelayMs;
    this.maximumDelayMs = config.maximumDelayMs;
  }

  nextDelayMs(attemptNumber: number, randomUnit: number): number {
    if (!Number.isSafeInteger(attemptNumber) || attemptNumber <= 0) throw new Error('Invalid retry attempt number');
    if (!Number.isFinite(randomUnit) || randomUnit < 0 || randomUnit >= 1) throw new Error('Invalid retry random value');
    const exponent = Math.min(attemptNumber - 1, 52);
    const capped = Math.min(this.maximumDelayMs, this.baseDelayMs * (2 ** exponent));
    return Math.floor((capped / 2) + (randomUnit * capped / 2));
  }
}

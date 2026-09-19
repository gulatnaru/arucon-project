import type {
  ActivityAggregate,
  ActivityProvider,
  ActivityRead,
  GameDayWindow,
} from '../activity/activityProvider';
import type { SleepScoreProvider, SleepScoreResult } from '../sleep';

export type NativeHealthPlatform = 'ios' | 'android';
export type NativeHealthScope = 'activity' | 'sleep';

export type NativeHealthAvailability =
  | { status: 'available'; platform: NativeHealthPlatform }
  | { status: 'unavailable'; platform: NativeHealthPlatform; reason: 'unsupported_os' | 'missing_service' | 'missing_hardware' };

/** iOS read authorization may remain unknown by design; do not reinterpret it as granted or denied. */
export type NativeReadPermission =
  | 'not_requested'
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'unknown';

export type NativeActivityAggregateRead =
  | { status: 'available' | 'partial'; aggregate: ActivityAggregate }
  | { status: 'empty' | 'error'; providerId: string };

export type NativeSleepScoreRead = Exclude<SleepScoreResult, { status: 'not_configured' }>;

/**
 * The native boundary returns only a daily aggregate or an approved score.
 * Raw samples, source payloads, GPS, audio, and identifiers are not part of this contract.
 */
export interface NativeHealthBridge {
  inspectAvailability(scope: NativeHealthScope): Promise<NativeHealthAvailability>;
  getReadPermission(scope: NativeHealthScope): Promise<NativeReadPermission>;
  requestReadPermission(scope: NativeHealthScope): Promise<NativeReadPermission>;
  readActivityAggregate(gameDay: GameDayWindow): Promise<NativeActivityAggregateRead>;
  readSleepScore(gameDayId: string, scorerVersion: string): Promise<NativeSleepScoreRead>;
}

export type NativeDeadlineRunner = <T>(operation: () => Promise<T>, timeoutMs: number) => Promise<T>;

export class NativeReadTimeoutError extends Error {
  constructor() {
    super('Native health read timed out');
  }
}

export const runWithNativeDeadline: NativeDeadlineRunner = async <T>(operation: () => Promise<T>, timeoutMs: number) => {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new RangeError('Invalid native deadline');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new NativeReadTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

export type NativeHealthAdapterOptions = Readonly<{
  activityReadEnabled?: boolean;
  sleepReadEnabled?: boolean;
  sleepScorerVersion?: string | null;
  timeoutMs?: number;
  deadlineRunner?: NativeDeadlineRunner;
}>;

function validOptions(options: NativeHealthAdapterOptions): Required<Pick<NativeHealthAdapterOptions, 'activityReadEnabled' | 'sleepReadEnabled' | 'timeoutMs' | 'deadlineRunner'>> & Pick<NativeHealthAdapterOptions, 'sleepScorerVersion'> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new RangeError('Invalid native deadline');
  return {
    activityReadEnabled: options.activityReadEnabled ?? false,
    sleepReadEnabled: options.sleepReadEnabled ?? false,
    sleepScorerVersion: options.sleepScorerVersion ?? null,
    timeoutMs,
    deadlineRunner: options.deadlineRunner ?? runWithNativeDeadline,
  };
}

function allowlistedActivityAggregate(value: ActivityAggregate): ActivityAggregate {
  return {
    gameDay: {
      id: value.gameDay.id,
      timezone: value.gameDay.timezone,
      startUtcMs: value.gameDay.startUtcMs,
      endUtcMs: value.gameDay.endUtcMs,
    },
    providerId: value.providerId,
    sourceRevision: value.sourceRevision,
    intervalStartUtcMs: value.intervalStartUtcMs,
    intervalEndUtcMs: value.intervalEndUtcMs,
    observedAtMs: value.observedAtMs,
    steps: value.steps,
    runningSteps: value.runningSteps,
  };
}

function allowlistedSleepScore(value: NativeSleepScoreRead): NativeSleepScoreRead {
  if (value.status === 'valid') {
    if (!Number.isFinite(value.score) || value.score < 0 || value.score > 100) return { status: 'error' };
    return { status: 'valid', score: value.score };
  }
  return { status: value.status };
}

async function inspectRead(
  bridge: NativeHealthBridge,
  scope: NativeHealthScope,
  options: ReturnType<typeof validOptions>,
): Promise<'readable' | 'permission_required' | 'denied' | 'unavailable' | 'error'> {
  try {
    const availability = await options.deadlineRunner(() => bridge.inspectAvailability(scope), options.timeoutMs);
    if (availability.status === 'unavailable') return 'unavailable';
    const permission = await options.deadlineRunner(() => bridge.getReadPermission(scope), options.timeoutMs);
    if (permission === 'not_requested') return 'permission_required';
    if (permission === 'denied' || permission === 'restricted') return 'denied';
    // HealthKit intentionally hides read denial. `unknown` must reach the query and
    // an empty result remains empty rather than becoming a denial or zero value.
    return 'readable';
  } catch {
    return 'error';
  }
}

export class FailClosedNativeActivityProvider implements ActivityProvider {
  private readonly options: ReturnType<typeof validOptions>;

  constructor(private readonly bridge: NativeHealthBridge, options: NativeHealthAdapterOptions = {}) {
    this.options = validOptions(options);
  }

  async read(gameDay: GameDayWindow): Promise<ActivityRead> {
    if (!this.options.activityReadEnabled) {
      return { status: 'unavailable', providerId: 'native-disabled', gameDay };
    }
    const access = await inspectRead(this.bridge, 'activity', this.options);
    if (access !== 'readable') {
      const status = access === 'permission_required' || access === 'denied' || access === 'unavailable' ? access : 'error';
      return { status, providerId: 'native-health', gameDay };
    }
    try {
      const read = await this.options.deadlineRunner(() => this.bridge.readActivityAggregate(gameDay), this.options.timeoutMs);
      switch (read.status) {
        case 'available':
        case 'partial':
          return { status: read.status, aggregate: allowlistedActivityAggregate(read.aggregate) };
        case 'empty':
        case 'error':
          return { status: read.status, providerId: read.providerId, gameDay };
      }
    } catch {
      return { status: 'error', providerId: 'native-health', gameDay };
    }
  }
}

export class FailClosedNativeSleepScoreProvider implements SleepScoreProvider {
  private readonly options: ReturnType<typeof validOptions>;

  constructor(private readonly bridge: NativeHealthBridge, options: NativeHealthAdapterOptions = {}) {
    this.options = validOptions(options);
  }

  async getScore(gameDayId: string): Promise<SleepScoreResult> {
    if (!gameDayId || !this.options.sleepReadEnabled || !this.options.sleepScorerVersion) {
      return { status: 'not_configured' };
    }
    const access = await inspectRead(this.bridge, 'sleep', this.options);
    if (access === 'unavailable' || access === 'denied' || access === 'permission_required') return { status: 'unavailable' };
    if (access === 'error') return { status: 'error' };
    try {
      const read = await this.options.deadlineRunner(
        () => this.bridge.readSleepScore(gameDayId, this.options.sleepScorerVersion!),
        this.options.timeoutMs,
      );
      return allowlistedSleepScore(read);
    } catch {
      return { status: 'error' };
    }
  }
}

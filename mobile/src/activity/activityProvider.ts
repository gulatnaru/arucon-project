/** No OS APIs or raw health records cross this port. All counts are synthetic until approved adapters exist. */
export type GameDayWindow = {
  id: string;
  timezone: string;
  startUtcMs: number;
  endUtcMs: number;
};

export type ActivityAggregate = {
  gameDay: GameDayWindow;
  providerId: string;
  sourceRevision: number;
  intervalStartUtcMs: number;
  intervalEndUtcMs: number;
  observedAtMs: number;
  steps: number;
  runningSteps: number;
};

export type ActivityRead =
  | { status: 'available' | 'partial'; aggregate: ActivityAggregate }
  | { status: 'empty' | 'permission_required' | 'denied' | 'unavailable' | 'error'; providerId: string; gameDay: GameDayWindow };

export interface ActivityProvider {
  read(gameDay: GameDayWindow): Promise<ActivityRead>;
}

/** Deterministic read frames for local tests; exhaustion is explicit instead of implying zero steps. */
export class SyntheticActivityProvider implements ActivityProvider {
  private index = 0;
  private readonly frames: readonly ActivityRead[];
  constructor(frames: readonly ActivityRead[]) { this.frames = frames; }

  async read(gameDay: GameDayWindow): Promise<ActivityRead> {
    const frame = this.frames[this.index++];
    if (!frame) throw new Error('Synthetic activity frames exhausted');
    const frameDay = 'aggregate' in frame ? frame.aggregate.gameDay : frame.gameDay;
    if (frameDay.id !== gameDay.id || frameDay.startUtcMs !== gameDay.startUtcMs || frameDay.endUtcMs !== gameDay.endUtcMs || frameDay.timezone !== gameDay.timezone) {
      throw new Error('Synthetic activity frame has the wrong game day');
    }
    return frame;
  }
}

/** Optional read-session gate; APP-02's persisted cursor is authoritative across reloads. */
export type ActivityNormalizationCursor = {
  gameDay: GameDayWindow;
  providerId: string;
  sourceRevision: number;
  steps: number;
  runningSteps: number;
};

/** Only these totals may be passed to APP-02's activity reconciliation command. */
export type NormalizedActivity = {
  status: 'available' | 'partial';
  gameDayId: string;
  gameDay: GameDayWindow;
  selectedProviderId: string;
  connectedAtMs: number;
  interval: { startUtcMs: number; endUtcMs: number };
  providerId: string;
  sourceRevision: number;
  observedAtMs: number;
  steps: number;
  runningSteps: number;
};

export type ActivityNormalizationResult = {
  disposition: 'accepted' | 'duplicate' | 'stale' | 'blocked' | 'no_measurement';
  cursor?: ActivityNormalizationCursor;
  activity?: NormalizedActivity;
  readStatus: ActivityRead['status'];
};

function safeNonnegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function assertGameDay(day: GameDayWindow): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.id) || !day.timezone || !safeNonnegativeInteger(day.startUtcMs) || !safeNonnegativeInteger(day.endUtcMs) || day.endUtcMs <= day.startUtcMs) {
    throw new Error('Invalid game day window');
  }
}

function sameDay(a: GameDayWindow, b: GameDayWindow): boolean {
  return a.id === b.id && a.timezone === b.timezone && a.startUtcMs === b.startUtcMs && a.endUtcMs === b.endUtcMs;
}

export function normalizeActivityRead(
  read: ActivityRead,
  selection: { gameDay: GameDayWindow; selectedProviderId: string; connectedAtMs: number },
  cursor?: ActivityNormalizationCursor,
): ActivityNormalizationResult {
  assertGameDay(selection.gameDay);
  if (!selection.selectedProviderId || !safeNonnegativeInteger(selection.connectedAtMs)) throw new Error('Invalid activity selection');
  const readDay = 'aggregate' in read ? read.aggregate.gameDay : read.gameDay;
  const providerId = 'aggregate' in read ? read.aggregate.providerId : read.providerId;
  if (!sameDay(readDay, selection.gameDay) || !providerId) throw new Error('Mismatched activity read');
  if (cursor && (!sameDay(cursor.gameDay, selection.gameDay) || cursor.providerId !== selection.selectedProviderId)) throw new Error('Mismatched activity cursor');
  if (providerId !== selection.selectedProviderId) return { disposition: 'blocked', cursor, readStatus: read.status };
  if (read.status !== 'available' && read.status !== 'partial') return { disposition: 'no_measurement', cursor, readStatus: read.status };

  const aggregate = read.aggregate;
  if (!safeNonnegativeInteger(aggregate.sourceRevision) || !safeNonnegativeInteger(aggregate.steps) ||
      !safeNonnegativeInteger(aggregate.runningSteps) || aggregate.runningSteps > aggregate.steps ||
      !Number.isSafeInteger(2 * aggregate.steps + aggregate.runningSteps) ||
      !safeNonnegativeInteger(aggregate.intervalStartUtcMs) || !safeNonnegativeInteger(aggregate.intervalEndUtcMs) ||
      !safeNonnegativeInteger(aggregate.observedAtMs) ||
      aggregate.intervalStartUtcMs < selection.gameDay.startUtcMs || aggregate.intervalEndUtcMs > selection.gameDay.endUtcMs ||
      aggregate.intervalEndUtcMs <= aggregate.intervalStartUtcMs) throw new Error('Invalid activity aggregate');
  // A daily aggregate spanning the connection boundary cannot be safely split into eligible history.
  if (aggregate.intervalStartUtcMs < selection.connectedAtMs) return { disposition: 'blocked', cursor, readStatus: read.status };

  if (cursor && aggregate.sourceRevision < cursor.sourceRevision) return { disposition: 'stale', cursor, readStatus: read.status };
  if (cursor && aggregate.sourceRevision === cursor.sourceRevision) {
    if (aggregate.steps !== cursor.steps || aggregate.runningSteps !== cursor.runningSteps) throw new Error('Conflicting activity revision');
    return { disposition: 'duplicate', cursor, readStatus: read.status };
  }
  const nextCursor: ActivityNormalizationCursor = {
    gameDay: selection.gameDay, providerId, sourceRevision: aggregate.sourceRevision,
    steps: aggregate.steps, runningSteps: aggregate.runningSteps,
  };
  return {
    disposition: 'accepted', cursor: nextCursor, readStatus: read.status,
    activity: {
      status: read.status, gameDayId: selection.gameDay.id, gameDay: selection.gameDay,
      selectedProviderId: selection.selectedProviderId, connectedAtMs: selection.connectedAtMs,
      interval: { startUtcMs: aggregate.intervalStartUtcMs, endUtcMs: aggregate.intervalEndUtcMs },
      providerId, sourceRevision: aggregate.sourceRevision, observedAtMs: aggregate.observedAtMs,
      steps: aggregate.steps, runningSteps: aggregate.runningSteps,
    },
  };
}

/** Text is intentionally conservative: an empty read never proves denial or zero activity. */
export function activityStatusMessage(status: ActivityRead['status']): string {
  switch (status) {
    case 'available': return '활동 집계를 읽었습니다.';
    case 'partial': return '활동 일부만 확인되었습니다.';
    case 'empty': return '기록이 없거나 읽을 수 없습니다.';
    case 'permission_required': return '활동 연결을 위한 권한 확인이 필요합니다.';
    case 'denied': return '활동 읽기 권한이 거부된 것으로 확인되었습니다.';
    case 'unavailable': return '이 기기에서 활동 측정을 사용할 수 없습니다.';
    case 'error': return '활동을 읽는 중 오류가 발생했습니다. 다시 시도할 수 있습니다.';
  }
}

import type { PetState } from '../domain/model';
import {
  normalizeActivityRead, SyntheticActivityProvider,
  type ActivityNormalizationCursor, type GameDayWindow, type NormalizedActivity,
} from '../activity/activityProvider';

const DAY_MS = 24 * 60 * 60 * 1_000;
const SYNTHETIC_PROVIDER_ID = 'synthetic-dev';

export class DevInputRejected extends Error {
  constructor(message: string) { super(message); this.name = 'DevInputRejected'; }
}

/** Wall clock rollback never rewinds a saved game or an explicit DEV time advance. */
export function monotonicDevTime(wallNowMs: number, devClockMs: number, persistedMs: number): number {
  for (const value of [wallNowMs, devClockMs, persistedMs]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid DEV clock');
  }
  return Math.max(wallNowMs, devClockMs, persistedMs);
}

export function utcFixtureDay(atMs: number): GameDayWindow {
  if (!Number.isSafeInteger(atMs) || atMs < 0) throw new Error('Invalid fixture time');
  const id = new Date(atMs).toISOString().slice(0, 10);
  const startUtcMs = Date.parse(`${id}T00:00:00.000Z`);
  return { id, timezone: 'UTC', startUtcMs, endUtcMs: startUtcMs + DAY_MS };
}

/** A cumulative DEV aggregate sourced from the persisted cursor, not a resettable UI counter. */
export async function nextSyntheticWalk(state: PetState, requestedAtMs: number): Promise<{ activity: NormalizedActivity; atMs: number }> {
  const gameDay = utcFixtureDay(requestedAtMs);
  const previous = state.activityByDay[gameDay.id];
  if (previous && previous.providerId !== SYNTHETIC_PROVIDER_ID) throw new DevInputRejected('오늘은 다른 활동 공급자가 선택되어 있어요.');
  const atMs = Math.max(requestedAtMs, gameDay.startUtcMs + 1);
  const connectedAtMs = previous?.connectedAtMs ?? gameDay.startUtcMs;
  const selectedProviderId = previous?.selectedProviderId ?? SYNTHETIC_PROVIDER_ID;
  const aggregate = {
    gameDay, providerId: SYNTHETIC_PROVIDER_ID, sourceRevision: (previous?.sourceRevision ?? 0) + 1,
    intervalStartUtcMs: previous?.interval.startUtcMs ?? gameDay.startUtcMs,
    intervalEndUtcMs: atMs, observedAtMs: atMs,
    steps: (previous?.steps ?? 0) + 500, runningSteps: previous?.runningSteps ?? 0,
  };
  const provider = new SyntheticActivityProvider([{ status: 'available', aggregate }]);
  const read = await provider.read(gameDay);
  const cursor: ActivityNormalizationCursor | undefined = previous && {
    gameDay: previous.gameDay, providerId: previous.providerId,
    sourceRevision: previous.sourceRevision, steps: previous.steps, runningSteps: previous.runningSteps,
  };
  const result = normalizeActivityRead(read, { gameDay, selectedProviderId, connectedAtMs }, cursor);
  if (result.disposition !== 'accepted' || !result.activity) throw new DevInputRejected('합성 활동을 적용할 수 없어요.');
  return { activity: result.activity, atMs };
}

/** One UI intent keeps its first normalized input across uncertain SQLite retries. */
export function retryStableSyntheticWalk(readCurrent: () => Promise<PetState>, requestedAtMs: number) {
  let prepared: Promise<{ activity: NormalizedActivity; atMs: number }> | null = null;
  return () => {
    if (!prepared) {
      prepared = readCurrent().then(state => nextSyntheticWalk(state, requestedAtMs)).catch(error => {
        prepared = null;
        throw error;
      });
    }
    return prepared;
  };
}

import { APPROVED_SLEEP_CONFIG } from './config';
import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';
import type { GameDayWindow } from '../domain/model';

export type SyntheticSleepSession = Readonly<{
  source: 'SYNTHETIC_LOCAL';
  startUtcMs: number;
  endUtcMs: number;
}>;

export type ApprovedSleepScoreInput = Readonly<{
  gameDay: Readonly<{ id: string; timezone: string; startUtcMs: number; endUtcMs: number }>;
  /** User-controlled game baseline example; it is not a recommended sleep duration. */
  personalBaselineMinutes: number;
  sessions: readonly SyntheticSleepSession[];
}>;

export type ApprovedSleepScore = Readonly<{
  status: 'valid' | 'no_data';
  score: number | null;
  growthMultiplier: number;
  coveredMinutes: number;
  explanation: string;
  policyVersion: string;
  source: 'SYNTHETIC_LOCAL_ONLY';
}>;

function validTime(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function approvedUtcGameDay(atMs: number): GameDayWindow {
  if (!validTime(atMs)) throw new Error('Invalid UTC game-day time');
  const duration = APPROVED_MVP_POLICY.sleep.gameDayDurationMs;
  const startUtcMs = Math.floor(atMs / duration) * duration;
  const date = new Date(startUtcMs);
  if (!Number.isFinite(date.getTime())) throw new Error('UTC game-day time is outside the supported range');
  return Object.freeze({
    id: date.toISOString().slice(0, 10), timezone: APPROVED_MVP_POLICY.sleep.gameDayTimezone,
    startUtcMs, endUtcMs: startUtcMs + duration,
  });
}

function assertApprovedGameDay(gameDay: ApprovedSleepScoreInput['gameDay']): void {
  const expected = approvedUtcGameDay(gameDay.startUtcMs);
  if (gameDay.id !== expected.id || gameDay.timezone !== expected.timezone ||
      gameDay.startUtcMs !== expected.startUtcMs || gameDay.endUtcMs !== expected.endUtcMs) {
    throw new Error('Sleep game day must use the approved fixed UTC boundary');
  }
}

function approvedMultiplier(score: number): number {
  const [left, right] = APPROVED_SLEEP_CONFIG.curve;
  return left.multiplier + (right.multiplier - left.multiplier) *
    (score - left.score) / (right.score - left.score);
}

/** Pure interval union for synthetic local sessions. No platform health API is read. */
export function scoreApprovedSyntheticSleep(input: ApprovedSleepScoreInput): ApprovedSleepScore {
  const { gameDay } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameDay?.id ?? '') || !gameDay.timezone?.trim() || !validTime(gameDay.startUtcMs) ||
      !validTime(gameDay.endUtcMs) || gameDay.endUtcMs <= gameDay.startUtcMs) {
    throw new Error('Invalid sleep game day');
  }
  assertApprovedGameDay(gameDay);
  if (!Number.isFinite(input.personalBaselineMinutes) || input.personalBaselineMinutes <= 0 ||
      input.personalBaselineMinutes > (gameDay.endUtcMs - gameDay.startUtcMs) / 60_000) {
    throw new Error('Invalid personal game baseline');
  }

  const intervals = input.sessions.map(session => {
    if (session.source !== 'SYNTHETIC_LOCAL' || !validTime(session.startUtcMs) || !validTime(session.endUtcMs) ||
        session.endUtcMs <= session.startUtcMs) throw new Error('Invalid synthetic sleep session');
    return {
      start: Math.max(session.startUtcMs, gameDay.startUtcMs),
      end: Math.min(session.endUtcMs, gameDay.endUtcMs),
    };
  }).filter(interval => interval.end > interval.start).sort((a, b) => a.start - b.start || a.end - b.end);

  let coveredMs = 0;
  let start: number | undefined;
  let end: number | undefined;
  for (const interval of intervals) {
    if (start === undefined) {
      start = interval.start;
      end = interval.end;
    } else if (interval.start <= end!) {
      end = Math.max(end!, interval.end);
    } else {
      coveredMs += end! - start;
      start = interval.start;
      end = interval.end;
    }
  }
  if (start !== undefined) coveredMs += end! - start;
  const coveredMinutes = coveredMs / 60_000;

  if (coveredMs === 0) return Object.freeze({
    status: 'no_data', score: null, growthMultiplier: APPROVED_SLEEP_CONFIG.noDataMultiplier,
    coveredMinutes: 0, explanation: '합성 수면 기록이 없어 오늘의 게임 보너스는 중립이에요.',
    policyVersion: APPROVED_SLEEP_CONFIG.version, source: 'SYNTHETIC_LOCAL_ONLY',
  });

  const score = Math.min(100, coveredMinutes / input.personalBaselineMinutes * 100);
  return Object.freeze({
    status: 'valid', score, growthMultiplier: approvedMultiplier(score), coveredMinutes,
    explanation: `합성 세션의 겹침을 제외한 ${coveredMinutes}분을 개인 게임 기준과 비교했어요.`,
    policyVersion: APPROVED_SLEEP_CONFIG.version, source: 'SYNTHETIC_LOCAL_ONLY',
  });
}

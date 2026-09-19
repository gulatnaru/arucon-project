import type { DomainEvent } from '../domain/model';
import type { LocalSyntheticSyncController } from '../application/syntheticSyncController';
import type { ApprovedSleepScoreInput } from '../sleep';
import type { SyncStatusViewModel } from '../sync/status';

const DAY_MS = 24 * 60 * 60 * 1_000;

export function previousUtcGameDay(atMs: number): ApprovedSleepScoreInput['gameDay'] {
  if (!Number.isSafeInteger(atMs) || atMs < DAY_MS) throw new Error('Invalid synthetic fixture clock');
  const today = new Date(atMs).toISOString().slice(0, 10);
  const endUtcMs = Date.parse(`${today}T00:00:00.000Z`);
  const startUtcMs = endUtcMs - DAY_MS;
  return Object.freeze({ id: new Date(startUtcMs).toISOString().slice(0, 10), timezone: 'UTC', startUtcMs, endUtcMs });
}

/** Local fixture only. `score` is a game input and never a health recommendation. */
export function approvedSyntheticSleepFixture(atMs: number, score: number | null): ApprovedSleepScoreInput {
  const gameDay = previousUtcGameDay(atMs);
  if (score === null) return Object.freeze({ gameDay, personalBaselineMinutes: 100, sessions: Object.freeze([]) });
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('Invalid synthetic sleep score');
  return Object.freeze({
    gameDay,
    personalBaselineMinutes: 100,
    sessions: Object.freeze(score === 0 ? [] : [Object.freeze({
      source: 'SYNTHETIC_LOCAL' as const,
      startUtcMs: gameDay.startUtcMs,
      endUtcMs: gameDay.startUtcMs + score * 60_000,
    })]),
  });
}

export function utcTimestampText(atMs: number | null): string {
  return atMs === null ? '확인 기록 없음' : new Date(atMs).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export function ownedRoomAffordances(keys: readonly string[]): Readonly<{ ballVisible: boolean; cushionVisible: boolean }> {
  return Object.freeze({
    ballVisible: keys.includes('toy:ball'),
    cushionVisible: keys.includes('furniture:cushion'),
  });
}

export function syncStatusText(status: SyncStatusViewModel): string {
  const last = utcTimestampText(status.lastServerConfirmedAtMs);
  switch (status.explanation) {
    case 'last_sync_never_confirmed': return `합성 동기화 확인 기록 없음 · 로컬 대기 ${status.pendingCount}건`;
    case 'last_sync_confirmed': return `마지막 합성 동기화 확인 ${last}`;
    case 'local_changes_waiting': return `로컬 변경 ${status.pendingCount}건 대기 · 외부 전송 안 함`;
    case 'local_changes_retrying': return `재시도 대기 ${status.errorCount}건 · 합성 동기화 상태`;
    case 'conflict_preserved_not_merged': return `충돌 ${status.conflictCount}건 보존 · 자동 병합 안 함`;
    case 'read_only_fenced_device': return '이 기기는 읽기 전용 · 쓰기 권한이 다른 기기로 이동됨';
  }
}

/** Drains the ordered in-process fake without treating it as a remote-server result. */
export async function drainLocalSyntheticSync(
  controller: Pick<LocalSyntheticSyncController, 'status' | 'flush'>,
  maximumAttempts = 100,
): Promise<SyncStatusViewModel> {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts <= 0) throw new Error('Invalid synthetic drain limit');
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    const status = await controller.status();
    if (status.pendingCount === 0 && status.errorCount === 0) return status;
    if (status.conflictCount > 0) throw new Error('Synthetic sync conflict is preserved and cannot be auto-merged');
    const result = await controller.flush(20);
    if (result.attempted === 0) throw new Error('Synthetic sync made no progress');
  }
  throw new Error('Synthetic sync drain limit reached');
}

export function journalEventText(event: DomainEvent): string {
  switch (event.type) {
    case 'MealConsumed': return `먹이 1개를 먹었어요 (${event.mode === 'auto' ? '자동' : '직접'}).`;
    case 'ActivityRewarded': return `합성 활동 정산: 먹이 +${event.deltaFood}, 코인 +${event.deltaCoin}`;
    case 'InteractionObserved': return '함께 시간을 보냈어요.';
    case 'Cleaned': return `방을 청소했어요 (${event.removed}개).`;
    case 'Hibernated': return '잠시 동면에 들어갔어요.';
    case 'Returned': return '방으로 돌아왔어요.';
    case 'SleepChanged': return event.sleeping ? '쉬기 시작했어요.' : '일어났어요.';
    case 'AutoFeedChanged': return event.enabled ? '자동급식을 켰어요.' : '자동급식을 껐어요.';
    case 'FacilityInstalled': return event.facility === 'table' ? '식탁을 놓았어요.' : '기본 화장실을 확인했어요.';
    case 'ConditionChanged': return event.condition === 'well' ? '기운을 되찾았어요.' : '상태가 바뀌었어요.';
    case 'SleepMultiplierFixtureChanged': return '이전 개발용 수면 fixture가 기록되어 있어요.';
    case 'ApprovedPolicyUpgraded': return '승인된 로컬 정책으로 저장 상태를 옮겼어요.';
    case 'SleepGrowthMultiplierChanged': return '합성 수면 점수를 성장 배율에 반영했어요.';
    case 'EvolutionFormApplied': return '성장 형태를 저장했어요.';
  }
}

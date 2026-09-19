import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvedSyntheticSleepFixture, drainLocalSyntheticSync, journalEventText, ownedRoomAffordances, previousUtcGameDay, syncStatusText, utcTimestampText,
} from '../../src/presentation/approvedPresentation';

test('approved synthetic sleep fixtures use a completed UTC day and explicit synthetic sessions', () => {
  const now = Date.parse('2026-09-19T12:00:00.000Z');
  const day = previousUtcGameDay(now);
  assert.deepEqual(day, {
    id: '2026-09-18',
    timezone: 'UTC',
    startUtcMs: Date.parse('2026-09-18T00:00:00.000Z'),
    endUtcMs: Date.parse('2026-09-19T00:00:00.000Z'),
  });
  assert.deepEqual(approvedSyntheticSleepFixture(now, null).sessions, []);
  const scored = approvedSyntheticSleepFixture(now, 70);
  assert.equal(scored.gameDay.id, '2026-09-18');
  assert.ok(scored.gameDay.endUtcMs <= now);
  assert.equal(scored.sessions[0]?.source, 'SYNTHETIC_LOCAL');
  assert.equal((scored.sessions[0]?.endUtcMs ?? 0) - (scored.sessions[0]?.startUtcMs ?? 0), 70 * 60_000);
  assert.throws(() => approvedSyntheticSleepFixture(now, 101), /Invalid/);
  const midnight = Date.parse('2026-09-19T00:00:00.000Z');
  assert.equal(approvedSyntheticSleepFixture(midnight, 70).gameDay.endUtcMs, midnight);
});

test('sync copy distinguishes local pending, confirmed and fenced states', () => {
  const base = { status: 'pending' as const, writerAccess: 'active_writer' as const, pendingCount: 2, errorCount: 0, conflictCount: 0, lastServerConfirmedAtMs: null };
  assert.match(syncStatusText({ ...base, explanation: 'local_changes_waiting' }), /외부 전송 안 함/);
  assert.match(syncStatusText({ ...base, status: 'synced', pendingCount: 0, lastServerConfirmedAtMs: 1_000, explanation: 'last_sync_confirmed' }), /1970-01-01 00:00:01/);
  assert.match(syncStatusText({ ...base, writerAccess: 'read_only_fenced', explanation: 'read_only_fenced_device' }), /읽기 전용/);
  assert.equal(utcTimestampText(null), '확인 기록 없음');
});

test('journal copy marks synthetic rewards and approved migration without implying live health', () => {
  assert.match(journalEventText({ type: 'ActivityRewarded', deltaFood: 1, deltaCoin: 5, suppressedFood: 0, gameDayId: '2026-09-18' }), /합성 활동/);
  assert.match(journalEventText({ type: 'ApprovedPolicyUpgraded', policyVersion: 'v1', toiletInstalled: true, sleepMultiplierRaised: false }), /승인된 로컬 정책/);
  assert.match(journalEventText({ type: 'SleepGrowthMultiplierChanged', gameDayId: '2026-09-18', recordDayId: '2026-09-18', policyVersion: 'v1', multiplier: 1.175, confirmation: 'valid_score' }), /합성 수면/);
});

test('purchased room affordances expose only durable ball and cushion ownership', () => {
  assert.deepEqual(ownedRoomAffordances([]), { ballVisible: false, cushionVisible: false });
  assert.deepEqual(ownedRoomAffordances(['toy:ball', 'facility:table']), { ballVisible: true, cushionVisible: false });
  assert.deepEqual(ownedRoomAffordances(['furniture:cushion']), { ballVisible: false, cushionVisible: true });
});

test('synthetic drain advances one ordered fake action at a time and stops at settled status', async () => {
  let pending = 2;
  const controller = {
    async status() {
      return { status: pending ? 'pending' as const : 'synced' as const, writerAccess: 'active_writer' as const,
        pendingCount: pending, errorCount: 0, conflictCount: 0, lastServerConfirmedAtMs: pending ? null : 10,
        explanation: pending ? 'local_changes_waiting' as const : 'last_sync_confirmed' as const };
    },
    async flush() { pending -= 1; return { attempted: 1, acknowledged: 1, retryableErrors: 0, conflicts: 0 }; },
  };
  assert.equal((await drainLocalSyntheticSync(controller)).status, 'synced');
  assert.equal(pending, 0);
});

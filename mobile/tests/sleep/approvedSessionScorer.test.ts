import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreApprovedSyntheticSleep } from '../../src/sleep';

const MINUTE = 60_000;
const day = { id: '1970-01-01', timezone: 'UTC', startUtcMs: 0, endUtcMs: 24 * 60 * MINUTE };
const session = (startMinute: number, endMinute: number) => ({
  source: 'SYNTHETIC_LOCAL' as const, startUtcMs: startMinute * MINUTE, endUtcMs: endMinute * MINUTE,
});

test('session union removes overlap and split sessions preserve the approved score', () => {
  const joined = scoreApprovedSyntheticSleep({ gameDay: day, personalBaselineMinutes: 480, sessions: [session(0, 480)] });
  const split = scoreApprovedSyntheticSleep({
    gameDay: day, personalBaselineMinutes: 480,
    sessions: [session(0, 180), session(120, 300), session(300, 480)],
  });
  assert.deepEqual({ score: split.score, covered: split.coveredMinutes, multiplier: split.growthMultiplier },
    { score: joined.score, covered: joined.coveredMinutes, multiplier: joined.growthMultiplier });
  assert.equal(joined.score, 100);
  assert.equal(joined.growthMultiplier, 1.25);
});

test('score is bonus-only, capped, and no data stays neutral', () => {
  const half = scoreApprovedSyntheticSleep({ gameDay: day, personalBaselineMinutes: 480, sessions: [session(0, 240)] });
  assert.equal(half.score, 50);
  assert.equal(half.growthMultiplier, 1.125);
  const capped = scoreApprovedSyntheticSleep({ gameDay: day, personalBaselineMinutes: 60, sessions: [session(0, 120)] });
  assert.equal(capped.score, 100);
  assert.equal(capped.growthMultiplier, 1.25);
  const none = scoreApprovedSyntheticSleep({ gameDay: day, personalBaselineMinutes: 480, sessions: [] });
  assert.deepEqual([none.status, none.score, none.growthMultiplier], ['no_data', null, 1]);
});

test('only valid synthetic intervals and a positive per-user game baseline are accepted', () => {
  assert.throws(() => scoreApprovedSyntheticSleep({
    gameDay: day, personalBaselineMinutes: 0, sessions: [],
  }), /personal game baseline/);
  assert.throws(() => scoreApprovedSyntheticSleep({
    gameDay: day, personalBaselineMinutes: 480,
    sessions: [{ source: 'SYNTHETIC_LOCAL', startUtcMs: 10, endUtcMs: 5 }],
  }), /Invalid synthetic sleep session/);
});

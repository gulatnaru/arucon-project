import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_GROWTH_POLICY, APPROVED_SEX_POLICY, APPROVED_SEX_SLOT, approvedFormPolicy,
  isApprovedSexValue, projectGrowth, resolveOnce, selectApprovedForm,
} from '../../src/progression';

const units = (exp: number) => exp * APPROVED_GROWTH_POLICY.expScale;

test('approved growth retains SRS level 6 sex and level 16 form boundaries', () => {
  assert.deepEqual([projectGrowth(units(749), APPROVED_GROWTH_POLICY).level, projectGrowth(units(750), APPROVED_GROWTH_POLICY).level], [5, 6]);
  assert.deepEqual([projectGrowth(units(3_749), APPROVED_GROWTH_POLICY).level, projectGrowth(units(3_750), APPROVED_GROWTH_POLICY).level], [15, 16]);
  assert.equal(APPROVED_SEX_POLICY.isEligible({ level: 5, stage: 1 }), false);
  assert.equal(APPROVED_SEX_POLICY.isEligible({ level: 6, stage: 2 }), true);
});

test('sex resolution is one-time and uses one injected random sample at level 6', () => {
  let calls = 0;
  const first = resolveOnce({
    slot: APPROVED_SEX_SLOT, existing: null, context: { level: 6, stage: 2 },
    policy: APPROVED_SEX_POLICY, validateStoredValue: isApprovedSexValue,
    random: () => { calls++; return 0.49; },
  });
  assert.equal(first.status, 'resolved');
  if (first.status !== 'resolved') assert.fail('expected resolution');
  assert.equal(first.record.value.sex, 'female');
  const replay = resolveOnce({
    slot: APPROVED_SEX_SLOT, existing: first.record, context: { level: 46, stage: 'final' },
    policy: APPROVED_SEX_POLICY, validateStoredValue: isApprovedSexValue,
    random: () => { calls++; return 0.9; },
  });
  assert.equal(replay.status, 'resolved');
  assert.equal(replay.randomCalls, 0);
  assert.equal(calls, 1);
});

test('care table is explainable, deterministic, and has no personality input', () => {
  assert.equal(selectApprovedForm({ observedDays: 10, activeDays: 6, restfulRoutineDays: 2, interactionDays: 2 }).formId, 'piko');
  assert.equal(selectApprovedForm({ observedDays: 10, activeDays: 2, restfulRoutineDays: 6, interactionDays: 2 }).formId, 'mongle');
  assert.equal(selectApprovedForm({ observedDays: 10, activeDays: 2, restfulRoutineDays: 2, interactionDays: 6 }).formId, 'mallu');
  assert.equal(selectApprovedForm({ observedDays: 10, activeDays: 6, restfulRoutineDays: 6, interactionDays: 0 }).formId, 'mono');
  assert.equal(approvedFormPolicy({ observedDays: 6, activeDays: 6, restfulRoutineDays: 0, interactionDays: 0 })
    .isEligible({ level: 16, stage: 3 }), false);
  assert.equal(approvedFormPolicy({ observedDays: 7, activeDays: 7, restfulRoutineDays: 0, interactionDays: 0 })
    .isEligible({ level: 15, stage: 2 }), false);
  assert.equal(approvedFormPolicy({ observedDays: 7, activeDays: 7, restfulRoutineDays: 0, interactionDays: 0 })
    .isEligible({ level: 16, stage: 3 }), true);
  assert.throws(() => selectApprovedForm({ observedDays: 0, activeDays: 0, restfulRoutineDays: 0, interactionDays: 0 }),
    /Care observations are required/);
});

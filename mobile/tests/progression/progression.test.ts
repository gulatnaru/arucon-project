import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEV_SOURCE_GROWTH_POLICY,
  projectGrowth,
  projectGrowthTransition,
  requireOperationalAppearanceResolutionPolicy,
  requireOperationalGrowthPolicy,
  requireOperationalSexResolutionPolicy,
  resolveOnce,
  validateGrowthProjectionPolicy,
} from '../../src/progression';
import type { GrowthProjectionPolicy, InjectedResolutionPolicy, JsonValue } from '../../src/progression';

const UNIT = DEV_SOURCE_GROWTH_POLICY.expScale;
const exp = (value: number) => value * UNIT;

test('source thresholds stay behind the DEV-only DEC-03 interpretation boundary', () => {
  assert.deepEqual(projectGrowth(exp(749), DEV_SOURCE_GROWTH_POLICY), {
    totalExpUnits: exp(749), level: 5, stage: 1, expIntoLevelUnits: exp(149),
    expToNextLevelUnits: exp(1), overflowExpUnits: 0, atFinalLevel: false,
  });
  assert.deepEqual(projectGrowth(exp(750), DEV_SOURCE_GROWTH_POLICY), {
    totalExpUnits: exp(750), level: 6, stage: 2, expIntoLevelUnits: 0,
    expToNextLevelUnits: exp(300), overflowExpUnits: 0, atFinalLevel: false,
  });
  assert.equal(projectGrowth(exp(27_749), DEV_SOURCE_GROWTH_POLICY).level, 45);
  assert.deepEqual(projectGrowth(exp(27_750) + 7, DEV_SOURCE_GROWTH_POLICY), {
    totalExpUnits: exp(27_750) + 7, level: 46, stage: 'final', expIntoLevelUnits: 0,
    expToNextLevelUnits: null, overflowExpUnits: 7, atFinalLevel: true,
  });
});

test('a multi-level projection reports every crossed boundary once and in order', () => {
  const transition = projectGrowthTransition(exp(149), exp(3_750), DEV_SOURCE_GROWTH_POLICY);
  assert.deepEqual(transition.crossed.map(boundary => boundary.level), Array.from({ length: 15 }, (_, index) => index + 2));
  assert.deepEqual(transition.crossed.filter(boundary => boundary.stageChanged).map(boundary => [boundary.level, boundary.stage]), [[6, 2], [16, 3]]);
  assert.equal(transition.after.level, 16);
  assert.equal(transition.after.stage, 3);
});

test('one-time resolution calls injected RNG once and reuses the frozen result on retry', () => {
  let calls = 0;
  const isFixtureBinary = (value: JsonValue): value is 'fixture-a' | 'fixture-b' =>
    value === 'fixture-a' || value === 'fixture-b';
  const policy: InjectedResolutionPolicy<'fixture-a' | 'fixture-b'> = {
    status: 'DEV_FIXTURE_ONLY', id: 'test-only-binary', version: '1', decision: 'DEC-03',
    isEligible: context => context.stage === 2,
    resolve: sample => sample < 0.25 ? 'fixture-a' : 'fixture-b',
    validateResult: value => value === 'fixture-a' || value === 'fixture-b',
  };
  const first = resolveOnce({
    slot: 'stage-2-result', existing: null, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: isFixtureBinary,
    random: () => { calls++; return 0.9; },
  });
  assert.equal(first.status, 'resolved');
  assert.equal(first.randomCalls, 1);
  assert.equal(calls, 1);
  if (first.status !== 'resolved') assert.fail('expected resolution');
  assert.equal(first.record.value, 'fixture-b');

  const retried = resolveOnce({
    slot: 'stage-2-result', existing: first.record, context: { level: 30, stage: 3 },
    policy: { ...policy, version: '2', resolve: () => 'fixture-a' as const },
    validateStoredValue: isFixtureBinary,
    random: () => { calls++; return 0; },
  });
  assert.equal(retried.status, 'resolved');
  assert.equal(retried.randomCalls, 0);
  assert.deepEqual(retried.record, first.record);
  assert.equal(calls, 1);
});

test('ineligible and invalid injected policies cannot silently resolve a result', () => {
  let calls = 0;
  const policy: InjectedResolutionPolicy<'fixture'> = {
    status: 'DEV_FIXTURE_ONLY', id: 'test-policy', version: '1', decision: 'DEC-08',
    isEligible: context => context.stage === 2,
    resolve: () => 'fixture', validateResult: value => value === 'fixture',
  };
  assert.deepEqual(resolveOnce({
    slot: 'appearance', existing: null, context: { level: 1, stage: 1 }, policy,
    validateStoredValue: (value): value is 'fixture' => value === 'fixture',
    random: () => { calls++; return 0.5; },
  }), { status: 'pending', record: null, randomCalls: 0 });
  assert.equal(calls, 0);

  assert.throws(() => resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: (value): value is 'fixture' => value === 'fixture',
    random: () => 1,
  }), /\[0, 1\)/);
  assert.throws(() => resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 },
    policy: { ...policy, resolve: () => 'fixture', validateResult: () => false },
    validateStoredValue: (value): value is 'fixture' => value === 'fixture', random: () => 0.5,
  }), /invalid result/);
  assert.throws(() => resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 },
    policy: { ...policy, id: '' }, validateStoredValue: (value): value is 'fixture' => value === 'fixture',
    random: () => 0.5,
  }), /Invalid injected resolution policy/);
});

test('object outcomes are defensively copied and invalid saved values cannot trigger a reroll', () => {
  type ObjectOutcome = Readonly<{ branch: string; inputs: readonly string[] }>;
  const isObjectOutcome = (value: JsonValue): value is ObjectOutcome => {
    if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
    const record = value as Readonly<Record<string, JsonValue>>;
    return typeof record.branch === 'string' && Array.isArray(record.inputs) &&
      record.inputs.every((item: JsonValue) => typeof item === 'string');
  };
  const source = { branch: 'test-only', inputs: ['synthetic'] };
  const policy: InjectedResolutionPolicy<ObjectOutcome> = {
    status: 'DEV_FIXTURE_ONLY', id: 'object-fixture', version: '1', decision: 'DEC-08',
    isEligible: () => true, resolve: () => source, validateResult: isObjectOutcome,
  };
  let calls = 0;
  const issued = resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: isObjectOutcome, random: () => { calls++; return 0.5; },
  });
  assert.equal(issued.status, 'resolved');
  if (issued.status !== 'resolved') assert.fail('expected resolution');
  source.branch = 'mutated-after-issue';
  source.inputs.push('mutated');
  assert.deepEqual(issued.record.value, { branch: 'test-only', inputs: ['synthetic'] });
  assert.equal(Object.isFrozen(issued.record.value), true);
  assert.equal(Object.isFrozen(issued.record.value.inputs), true);

  const hydrated = JSON.parse(JSON.stringify(issued.record)) as typeof issued.record;
  const reused = resolveOnce({
    slot: 'appearance', existing: hydrated, context: { level: 99, stage: 'final' },
    policy: { ...policy, version: 'changed-policy-that-must-not-run', isEligible: () => { throw new Error('must not run'); } },
    validateStoredValue: isObjectOutcome, random: () => { calls++; return 0.1; },
  });
  assert.equal(reused.status, 'resolved');
  assert.equal(reused.randomCalls, 0);
  assert.deepEqual(reused.record, issued.record);
  assert.equal(reused.record === hydrated, false);
  assert.equal(Object.isFrozen(reused.record.value), true);
  assert.equal(calls, 1);

  const forged = { ...hydrated, value: { branch: 42, inputs: [] } } as unknown as typeof hydrated;
  assert.throws(() => resolveOnce({
    slot: 'appearance', existing: forged, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: isObjectOutcome, random: () => { calls++; return 0.2; },
  }), /Invalid stored resolution value/);
  assert.equal(calls, 1);
});

test('unsafe keys in a parsed stored result are rejected without policy or RNG access', () => {
  let calls = 0;
  const dangerous = JSON.parse('{"__proto__":{"polluted":true}}') as JsonValue;
  const existing = {
    slot: 'appearance', policyId: 'stored-policy', policyVersion: '1', decision: 'DEC-08' as const,
    resolvedAt: { level: 6, stage: 2 as const }, value: dangerous,
  };
  const policy: InjectedResolutionPolicy<JsonValue> = {
    status: 'DEV_FIXTURE_ONLY', id: 'current-policy', version: '2', decision: 'DEC-08',
    isEligible: () => { throw new Error('current policy must not run'); },
    resolve: () => { throw new Error('resolver must not run'); },
    validateResult: () => true,
  };
  assert.throws(() => resolveOnce({
    slot: 'appearance', existing, context: { level: 46, stage: 'final' }, policy,
    validateStoredValue: (value): value is JsonValue => value !== undefined,
    random: () => { calls++; return 0.5; },
  }), /unsafe JSON key/);
  assert.equal(calls, 0);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('unsafe keys returned by an injected policy are rejected before a record is issued', () => {
  let calls = 0;
  const dangerous = JSON.parse('{"safe":{"constructor":{"polluted":true}}}') as JsonValue;
  const policy: InjectedResolutionPolicy<JsonValue> = {
    status: 'DEV_FIXTURE_ONLY', id: 'dangerous-output', version: '1', decision: 'DEC-08',
    isEligible: () => true, resolve: () => dangerous, validateResult: () => true,
  };
  assert.throws(() => resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: (value): value is JsonValue => value !== undefined,
    random: () => { calls++; return 0.5; },
  }), /unsafe JSON key/);
  assert.equal(calls, 1);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('invalid growth fixtures and all operational defaults remain DecisionRequired', () => {
  const invalid = {
    ...DEV_SOURCE_GROWTH_POLICY,
    bands: DEV_SOURCE_GROWTH_POLICY.bands.map((band, index) => index === 1 ? { ...band, fromLevel: 7 } : band),
  } satisfies GrowthProjectionPolicy;
  assert.throws(() => validateGrowthProjectionPolicy(invalid), /Invalid growth projection policy band/);
  assert.throws(() => projectGrowthTransition(exp(10), exp(9), DEV_SOURCE_GROWTH_POLICY), /Invalid growth transition/);
  for (const operation of [requireOperationalGrowthPolicy, requireOperationalSexResolutionPolicy, requireOperationalAppearanceResolutionPolicy]) {
    assert.throws(operation, error => error instanceof Error && error.name === 'DecisionRequired');
  }
});

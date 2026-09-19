import { BalanceDecisionRequired } from '../config/balanceRegistry';
import type { GrowthStage } from './projection';

export type ResolutionDecision = 'DEC-03' | 'DEC-08';
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;

export type ResolutionContext = Readonly<{
  level: number;
  stage: GrowthStage;
}>;

/** No sex ratio or appearance branch ships here; a DEV policy must be injected. */
export type InjectedResolutionPolicy<T extends JsonValue> = Readonly<{
  status: 'DEV_FIXTURE_ONLY' | 'APPROVED';
  id: string;
  version: string;
  decision: ResolutionDecision;
  isEligible: (context: ResolutionContext) => boolean;
  resolve: (sample: number, context: ResolutionContext) => T;
  validateResult: (value: T) => boolean;
}>;

export type FrozenResolution<T extends JsonValue> = Readonly<{
  slot: string;
  policyId: string;
  policyVersion: string;
  decision: ResolutionDecision;
  resolvedAt: ResolutionContext;
  value: T;
}>;

export type ResolutionResult<T extends JsonValue> =
  | Readonly<{ status: 'pending'; record: null; randomCalls: 0 }>
  | Readonly<{ status: 'resolved'; record: FrozenResolution<T>; randomCalls: 0; reused: true }>
  | Readonly<{ status: 'resolved'; record: FrozenResolution<T>; randomCalls: 1; reused: false }>;

function validateContext(context: ResolutionContext): void {
  if (!context || !Number.isSafeInteger(context.level) || context.level < 1 ||
      !(context.stage === 'final' || (Number.isSafeInteger(context.stage) && context.stage > 0))) {
    throw new Error('Invalid one-time resolution context');
  }
}

function validatePolicy<T extends JsonValue>(policy: InjectedResolutionPolicy<T>): void {
  if (!policy || !['DEV_FIXTURE_ONLY', 'APPROVED'].includes(policy.status) || !policy.id || !policy.version ||
      !['DEC-03', 'DEC-08'].includes(policy.decision) || typeof policy.isEligible !== 'function' ||
      typeof policy.resolve !== 'function' || typeof policy.validateResult !== 'function') {
    throw new Error('Invalid injected resolution policy');
  }
}

function validateExisting<T extends JsonValue>(slot: string, record: FrozenResolution<T>): void {
  if (!record || record.slot !== slot || !record.policyId || !record.policyVersion ||
      !['DEC-03', 'DEC-08'].includes(record.decision)) {
    throw new Error('Invalid frozen resolution');
  }
  validateContext(record.resolvedAt);
}

function cloneAndFreezeJson(value: unknown, ancestors = new Set<object>()): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Resolution value must be finite JSON data');
    return value;
  }
  if (typeof value !== 'object') throw new Error('Resolution value must be JSON data');
  if (ancestors.has(value)) throw new Error('Resolution value must not be cyclic');

  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    return Object.freeze(value.map(item => cloneAndFreezeJson(item, nextAncestors)));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Resolution value must be plain JSON data');
  const copy: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Resolution value contains an unsafe JSON key');
    }
    copy[key] = cloneAndFreezeJson(item, nextAncestors);
  }
  return Object.freeze(copy);
}

function immutableRecord<T extends JsonValue>(record: FrozenResolution<T>, value: T): FrozenResolution<T> {
  return Object.freeze({
    slot: record.slot,
    policyId: record.policyId,
    policyVersion: record.policyVersion,
    decision: record.decision,
    resolvedAt: Object.freeze({ ...record.resolvedAt }),
    value,
  });
}

/** Validates and isolates a record read from or prepared for durable storage. */
export function freezeStoredResolution<T extends JsonValue>(
  slot: string,
  record: FrozenResolution<T>,
  validateStoredValue: (value: JsonValue) => value is T,
): FrozenResolution<T> {
  if (!slot) throw new Error('Missing one-time resolution slot');
  if (typeof validateStoredValue !== 'function') throw new Error('Missing stored resolution validator');
  validateExisting(slot, record);
  const value = cloneAndFreezeJson(record.value);
  if (!validateStoredValue(value)) throw new Error('Invalid stored resolution value');
  return immutableRecord(record, value);
}

/**
 * Returns an already committed result before consulting policy or RNG. Persistence
 * remains the caller's responsibility; the frozen record is the retry contract.
 */
export function resolveOnce<T extends JsonValue>(input: Readonly<{
  slot: string;
  existing: FrozenResolution<T> | null;
  context: ResolutionContext;
  policy: InjectedResolutionPolicy<T>;
  /** Stable saved-format validation, independent from the policy that originally resolved the value. */
  validateStoredValue: (value: JsonValue) => value is T;
  random: () => number;
}>): ResolutionResult<T> {
  if (!input.slot) throw new Error('Missing one-time resolution slot');
  if (typeof input.validateStoredValue !== 'function') throw new Error('Missing stored resolution validator');
  if (input.existing) {
    return Object.freeze({
      status: 'resolved',
      record: freezeStoredResolution(input.slot, input.existing, input.validateStoredValue),
      randomCalls: 0,
      reused: true,
    });
  }

  validateContext(input.context);
  validatePolicy(input.policy);
  if (typeof input.random !== 'function') throw new Error('Missing random source');
  if (!input.policy.isEligible(input.context)) return Object.freeze({ status: 'pending', record: null, randomCalls: 0 });

  const sample = input.random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('Random sample must be in [0, 1)');
  const resolved = input.policy.resolve(sample, input.context);
  if (!input.policy.validateResult(resolved)) throw new Error('Injected resolution policy produced an invalid result');
  const value = cloneAndFreezeJson(resolved);
  if (!input.validateStoredValue(value)) throw new Error('Resolved value does not match its stored format');

  const record: FrozenResolution<T> = {
    slot: input.slot,
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    decision: input.policy.decision,
    resolvedAt: Object.freeze({ ...input.context }),
    value,
  };
  return Object.freeze({
    status: 'resolved',
    record: immutableRecord(record, value),
    randomCalls: 1,
    reused: false,
  });
}

export function requireOperationalSexResolutionPolicy(): never {
  throw new BalanceDecisionRequired(['DEC-03']);
}

export function requireOperationalAppearanceResolutionPolicy(): never {
  throw new BalanceDecisionRequired(['DEC-08']);
}

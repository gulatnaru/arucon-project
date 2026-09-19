import {
  isIssuedSyntheticAccessGrant,
  type SyntheticAccessGrant,
} from '../auth/syntheticAccess';
import type { PetProjection } from '../widget';

export type OutboundAggregateInput =
  | Readonly<{ kind: 'activity_aggregate'; gameDayId: string; steps: number; runningSteps: number; sourceRevision: number }>
  | Readonly<{ kind: 'sleep_score'; gameDayId: string; score: number; scorerVersion: string }>
  | Readonly<{ kind: 'pet_projection'; projection: PetProjection }>;

export type SyntheticOutboundEnvelope = Readonly<{
  mode: 'DEV_ONLY';
  accountId: string;
  petId: string;
  deviceId: string;
  payload: Readonly<Record<string, string | number>>;
}>;

const ALLOWED_KEYS: Record<OutboundAggregateInput['kind'], ReadonlySet<string>> = {
  activity_aggregate: new Set(['kind', 'gameDayId', 'steps', 'runningSteps', 'sourceRevision']),
  sleep_score: new Set(['kind', 'gameDayId', 'score', 'scorerVersion']),
  pet_projection: new Set(['kind', 'projection']),
};

const OUTPUT_ALLOWED_KEYS: Record<OutboundAggregateInput['kind'], ReadonlySet<string>> = {
  activity_aggregate: new Set(['kind', 'gameDayId', 'steps', 'runningSteps', 'sourceRevision']),
  sleep_score: new Set(['kind', 'gameDayId', 'score', 'scorerVersion']),
  pet_projection: new Set(['kind', 'petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState']),
};

const issuedEnvelopes = new WeakMap<object, SyntheticAccessGrant>();

const FORBIDDEN_FIELD_NAMES = new Set([
  'rawsamples', 'samples', 'rawsleep', 'sleepsessions', 'audio', 'audiobytes', 'microphone',
  'gps', 'latitude', 'longitude', 'birthdate', 'dateofbirth', 'dob', 'password', 'secret',
  'apikey', 'accesstoken', 'refreshtoken', 'authorization', 'cookie', 'privatekey',
  'healthrecords', 'healthkitpayload', 'healthconnectpayload',
]);

function normalizedKey(value: string): string {
  return value.replace(/[^a-z0-9]/giu, '').toLowerCase();
}

function assertSafeValue(value: unknown, seen: WeakSet<object>): void {
  if (typeof value === 'string') {
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]+|\bsk-[A-Za-z0-9_-]{12,}/u.test(value)) {
      throw new Error('Outbound secret material rejected');
    }
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) throw new Error('Cyclic outbound value rejected');
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new Error('Non-plain outbound value rejected');
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(normalizedKey(key))) throw new Error(`Forbidden outbound field: ${key}`);
    assertSafeValue(child, seen);
  }
  seen.delete(value);
}

/** Rejects raw health, audio, location, birth data, credentials, and obvious secret material recursively. */
export function assertNoRawOrSecretMaterial(value: unknown): void {
  assertSafeValue(value, new WeakSet());
}

function exactKeys(input: OutboundAggregateInput): void {
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Non-plain outbound input rejected');
  const allowed = ALLOWED_KEYS[input.kind];
  if (!allowed) throw new Error('Unknown outbound payload kind');
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new Error(`Unapproved outbound field: ${key}`);
  }
}

function safeId(value: string, name: string): string {
  if (!value || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`Invalid outbound ${name}`);
  return value;
}

function activityPayload(input: Extract<OutboundAggregateInput, { kind: 'activity_aggregate' }>): Readonly<Record<string, string | number>> {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.gameDayId) || !Number.isSafeInteger(input.steps) || input.steps < 0 ||
      !Number.isSafeInteger(input.runningSteps) || input.runningSteps < 0 || input.runningSteps > input.steps ||
      !Number.isSafeInteger(input.sourceRevision) || input.sourceRevision < 0) throw new Error('Invalid outbound activity aggregate');
  return Object.freeze({ kind: input.kind, gameDayId: input.gameDayId, steps: input.steps, runningSteps: input.runningSteps, sourceRevision: input.sourceRevision });
}

function sleepPayload(input: Extract<OutboundAggregateInput, { kind: 'sleep_score' }>): Readonly<Record<string, string | number>> {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.gameDayId) || !Number.isFinite(input.score) || input.score < 0 || input.score > 100 || !input.scorerVersion) {
    throw new Error('Invalid outbound sleep score');
  }
  return Object.freeze({ kind: input.kind, gameDayId: input.gameDayId, score: input.score, scorerVersion: safeId(input.scorerVersion, 'scorer version') });
}

function projectionPayload(input: Extract<OutboundAggregateInput, { kind: 'pet_projection' }>): Readonly<Record<string, string | number>> {
  const value = input.projection;
  if (!value.petId || !value.formId || !value.personalityProfileId || !Number.isSafeInteger(value.stateRevision) || value.stateRevision < 0 ||
      !Number.isSafeInteger(value.updatedAtMs) || value.updatedAtMs < 0 || !['awake', 'sleeping', 'hibernating', 'needs_care'].includes(value.displayState)) {
    throw new Error('Invalid outbound pet projection');
  }
  return Object.freeze({
    kind: input.kind, petId: value.petId, stateRevision: value.stateRevision, updatedAtMs: value.updatedAtMs,
    formId: value.formId, personalityProfileId: value.personalityProfileId, displayState: value.displayState,
  });
}

/** Builds a local DEV envelope only; this module contains no transport or logging API. */
export function buildSyntheticOutboundEnvelope(
  grant: SyntheticAccessGrant,
  input: OutboundAggregateInput,
): SyntheticOutboundEnvelope {
  if (!isIssuedSyntheticAccessGrant(grant, 'outbound_aggregate')) throw new Error('Valid DEV outbound access grant required');
  exactKeys(input);
  assertNoRawOrSecretMaterial(input);
  const payload = input.kind === 'activity_aggregate' ? activityPayload(input) :
    input.kind === 'sleep_score' ? sleepPayload(input) : projectionPayload(input);
  if ('petId' in payload && payload.petId !== grant.petId) throw new Error('Outbound pet mismatch');
  const envelope = Object.freeze({
    mode: 'DEV_ONLY',
    accountId: grant.accountId,
    petId: grant.petId,
    deviceId: grant.deviceId,
    payload,
  });
  issuedEnvelopes.set(envelope, grant);
  return envelope;
}

/** Transport guard: copied claims or objects that bypass the builder are rejected. */
export function isIssuedSyntheticOutboundEnvelope(value: unknown): value is SyntheticOutboundEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const grant = issuedEnvelopes.get(value);
  if (!grant || !isIssuedSyntheticAccessGrant(grant, 'outbound_aggregate')) return false;
  const envelope = value as SyntheticOutboundEnvelope;
  if (envelope.mode !== 'DEV_ONLY' || !envelope.accountId || !envelope.petId || !envelope.deviceId ||
      Object.keys(envelope).some(key => !['mode', 'accountId', 'petId', 'deviceId', 'payload'].includes(key))) return false;
  const kind = envelope.payload.kind;
  if (kind !== 'activity_aggregate' && kind !== 'sleep_score' && kind !== 'pet_projection') return false;
  if (Object.keys(envelope.payload).some(key => !OUTPUT_ALLOWED_KEYS[kind].has(key))) return false;
  try {
    assertNoRawOrSecretMaterial(envelope);
    return kind !== 'pet_projection' || envelope.payload.petId === envelope.petId;
  } catch {
    return false;
  }
}

import { NOTIFICATION_COPY_CATALOG, type NotificationCopyKey } from './contract';

const MINUTES_PER_DAY = 1_440;
const MINUTE_MS = 60_000;

export type DevNotificationPolicy = Readonly<{
  status: 'DEV_FIXTURE_ONLY';
  version: string;
  enabled: boolean;
  cadence: Readonly<{ maxAcceptedPerGameDay: number; minIntervalMs: number }>;
  quietHours: Readonly<{
    startMinuteInclusive: number;
    endMinuteExclusive: number;
    behavior: 'defer';
  }>;
}>;

export type SyntheticNotificationConsent = 'granted' | 'denied' | 'revoked';

export type NotificationHistoryEntry = Readonly<{
  notificationKey: string;
  scopeKey: string;
  gameDayId: string;
  acceptedAtMs: number;
}>;

export type LocalNotificationRequest = Readonly<{
  notificationKey: string;
  scopeKey: string;
  policyVersion: string;
  copyKey: NotificationCopyKey;
  copy: Readonly<{ title: string; body: string }>;
  createdAtMs: number;
  deliverAtMs: number;
  deferredForQuietHours: boolean;
}>;

export type NotificationPlan =
  | Readonly<{ status: 'disabled'; reason: 'policy_disabled' | 'synthetic_consent_denied' | 'synthetic_consent_revoked' }>
  | Readonly<{ status: 'suppressed'; reason: 'duplicate' | 'daily_cadence' | 'minimum_interval'; notificationKey: string }>
  | Readonly<{ status: 'planned'; request: LocalNotificationRequest; historyEntry: NotificationHistoryEntry }>;

export type NotificationPlanInput = Readonly<{
  petId: string;
  gameDayId: string;
  conditionId: string;
  copyKey: NotificationCopyKey;
  nowMs: number;
  localMinuteOfDay: number;
  syntheticConsent: SyntheticNotificationConsent;
  history: readonly NotificationHistoryEntry[];
}>;

function whole(value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function validateDevNotificationPolicy(policy: DevNotificationPolicy): void {
  if (!policy || policy.status !== 'DEV_FIXTURE_ONLY' || !policy.version || typeof policy.enabled !== 'boolean' ||
      !policy.cadence || !whole(policy.cadence.maxAcceptedPerGameDay, 1) ||
      !whole(policy.cadence.minIntervalMs, 0) || !policy.quietHours ||
      !whole(policy.quietHours.startMinuteInclusive, 0, MINUTES_PER_DAY - 1) ||
      !whole(policy.quietHours.endMinuteExclusive, 0, MINUTES_PER_DAY - 1) ||
      policy.quietHours.startMinuteInclusive === policy.quietHours.endMinuteExclusive ||
      policy.quietHours.behavior !== 'defer') {
    throw new Error('Invalid DEV notification policy');
  }
}

function requiredText(value: string, name: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid notification ${name}`);
}

function scopeKey(petId: string): string {
  return `pet:${encodeURIComponent(petId)}`;
}

function notificationKey(input: NotificationPlanInput): string {
  return ['local', input.petId, input.gameDayId, input.copyKey, input.conditionId]
    .map(encodeURIComponent).join(':');
}

function quietDelayMinutes(minute: number, start: number, end: number): number {
  if (start < end) return minute >= start && minute < end ? end - minute : 0;
  if (minute >= start) return MINUTES_PER_DAY - minute + end;
  return minute < end ? end - minute : 0;
}

function validateHistory(history: readonly NotificationHistoryEntry[], nowMs: number): void {
  if (!Array.isArray(history)) throw new Error('Invalid notification history');
  for (const entry of history) {
    if (!entry || !entry.notificationKey || !entry.scopeKey || !entry.gameDayId ||
        !whole(entry.acceptedAtMs, 0) || entry.acceptedAtMs > nowMs) {
      throw new Error('Invalid notification history');
    }
  }
}

/** Pure synthetic planner. It does not inspect OS permission state or schedule an OS notification. */
export function planSyntheticLocalNotification(
  input: NotificationPlanInput,
  policy: DevNotificationPolicy,
): NotificationPlan {
  validateDevNotificationPolicy(policy);
  requiredText(input.petId, 'petId');
  requiredText(input.conditionId, 'conditionId');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.gameDayId) || !whole(input.nowMs, 0) ||
      !whole(input.localMinuteOfDay, 0, MINUTES_PER_DAY - 1) || !(input.copyKey in NOTIFICATION_COPY_CATALOG)) {
    throw new Error('Invalid notification plan input');
  }
  validateHistory(input.history, input.nowMs);

  if (!policy.enabled) return Object.freeze({ status: 'disabled', reason: 'policy_disabled' });
  if (input.syntheticConsent === 'denied') return Object.freeze({ status: 'disabled', reason: 'synthetic_consent_denied' });
  if (input.syntheticConsent === 'revoked') return Object.freeze({ status: 'disabled', reason: 'synthetic_consent_revoked' });
  if (input.syntheticConsent !== 'granted') throw new Error('Invalid synthetic notification consent');

  const key = notificationKey(input);
  const scope = scopeKey(input.petId);
  if (input.history.some(entry => entry.notificationKey === key)) {
    return Object.freeze({ status: 'suppressed', reason: 'duplicate', notificationKey: key });
  }
  const currentDay = input.history.filter(entry => entry.scopeKey === scope && entry.gameDayId === input.gameDayId);
  if (currentDay.length >= policy.cadence.maxAcceptedPerGameDay) {
    return Object.freeze({ status: 'suppressed', reason: 'daily_cadence', notificationKey: key });
  }
  const latest = input.history
    .filter(entry => entry.scopeKey === scope && entry.acceptedAtMs <= input.nowMs)
    .reduce((maximum, entry) => Math.max(maximum, entry.acceptedAtMs), -1);
  if (latest >= 0 && input.nowMs - latest < policy.cadence.minIntervalMs) {
    return Object.freeze({ status: 'suppressed', reason: 'minimum_interval', notificationKey: key });
  }

  const quietDelay = quietDelayMinutes(
    input.localMinuteOfDay,
    policy.quietHours.startMinuteInclusive,
    policy.quietHours.endMinuteExclusive,
  );
  const deliverAtMs = input.nowMs + quietDelay * MINUTE_MS;
  if (!Number.isSafeInteger(deliverAtMs)) throw new Error('Invalid deferred notification time');
  const request = Object.freeze({
    notificationKey: key,
    scopeKey: scope,
    policyVersion: policy.version,
    copyKey: input.copyKey,
    copy: NOTIFICATION_COPY_CATALOG[input.copyKey],
    createdAtMs: input.nowMs,
    deliverAtMs,
    deferredForQuietHours: quietDelay > 0,
  });
  return Object.freeze({
    status: 'planned',
    request,
    historyEntry: Object.freeze({ notificationKey: key, scopeKey: scope, gameDayId: input.gameDayId, acceptedAtMs: input.nowMs }),
  });
}

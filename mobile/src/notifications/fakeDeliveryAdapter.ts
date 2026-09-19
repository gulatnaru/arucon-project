import type {
  DeliveryCancelResult,
  DeliveryRevocationResult,
  DeliveryUpsertResult,
  IdempotentLocalNotificationPort,
} from './dispatcher';
import type { LocalNotificationRequest } from './planner';

export class NotificationDeliveryConflictError extends Error {
  constructor() {
    super('Notification key reused with a different payload');
    this.name = 'NotificationDeliveryConflictError';
  }
}

export class NotificationScopeRevokedError extends Error {
  constructor() {
    super('Notification scope has been revoked');
    this.name = 'NotificationScopeRevokedError';
  }
}

type FakeEntry = { request: LocalNotificationRequest; status: 'scheduled' | 'cancelled' };

function sameRequest(left: LocalNotificationRequest, right: LocalNotificationRequest): boolean {
  return left.notificationKey === right.notificationKey && left.scopeKey === right.scopeKey &&
    left.policyVersion === right.policyVersion && left.copyKey === right.copyKey &&
    left.copy.title === right.copy.title && left.copy.body === right.copy.body &&
    left.createdAtMs === right.createdAtMs && left.deliverAtMs === right.deliverAtMs &&
    left.deferredForQuietHours === right.deferredForQuietHours;
}

function freezeRequest(request: LocalNotificationRequest): LocalNotificationRequest {
  return Object.freeze({ ...request, copy: Object.freeze({ ...request.copy }) });
}

/** In-memory fake. Its idempotency state intentionally does not survive a new instance. */
export class FakeLocalNotificationAdapter implements IdempotentLocalNotificationPort {
  private readonly entries = new Map<string, FakeEntry>();
  private readonly revokedScopes = new Set<string>();
  private nextFailure: Error | null = null;

  failNextUpsert(error = new Error('Injected fake delivery failure')): void {
    this.nextFailure = error;
  }

  async upsert(request: LocalNotificationRequest): Promise<DeliveryUpsertResult> {
    if (this.nextFailure) {
      const error = this.nextFailure;
      this.nextFailure = null;
      throw error;
    }
    if (this.revokedScopes.has(request.scopeKey)) throw new NotificationScopeRevokedError();
    const existing = this.entries.get(request.notificationKey);
    if (existing) {
      if (!sameRequest(existing.request, request)) throw new NotificationDeliveryConflictError();
      return Object.freeze({ status: existing.status, notificationKey: request.notificationKey, replayed: true });
    }
    this.entries.set(request.notificationKey, { request: freezeRequest(request), status: 'scheduled' });
    return Object.freeze({ status: 'scheduled', notificationKey: request.notificationKey, replayed: false });
  }

  async cancel(notificationKey: string): Promise<DeliveryCancelResult> {
    const existing = this.entries.get(notificationKey);
    if (!existing) return Object.freeze({ status: 'absent', notificationKey, replayed: false });
    if (existing.status === 'cancelled') return Object.freeze({ status: 'cancelled', notificationKey, replayed: true });
    existing.status = 'cancelled';
    return Object.freeze({ status: 'cancelled', notificationKey, replayed: false });
  }

  async revoke(scopeKey: string): Promise<DeliveryRevocationResult> {
    const replayed = this.revokedScopes.has(scopeKey);
    this.revokedScopes.add(scopeKey);
    let cancelledCount = 0;
    for (const entry of this.entries.values()) {
      if (entry.request.scopeKey === scopeKey && entry.status === 'scheduled') {
        entry.status = 'cancelled';
        cancelledCount++;
      }
    }
    return Object.freeze({ scopeKey, cancelledCount, replayed });
  }

  snapshot(): readonly Readonly<FakeEntry>[] {
    return Object.freeze([...this.entries.values()].map(entry => Object.freeze({
      request: freezeRequest(entry.request), status: entry.status,
    })));
  }
}

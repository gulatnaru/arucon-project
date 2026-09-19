import type { LocalNotificationRequest, NotificationPlan } from './planner';

export type DeliveryUpsertResult = Readonly<{
  status: 'scheduled' | 'cancelled';
  notificationKey: string;
  replayed: boolean;
}>;

export type DeliveryCancelResult = Readonly<{
  status: 'cancelled' | 'absent';
  notificationKey: string;
  replayed: boolean;
}>;

export type DeliveryRevocationResult = Readonly<{
  scopeKey: string;
  cancelledCount: number;
  replayed: boolean;
}>;

export interface IdempotentLocalNotificationPort {
  upsert(request: LocalNotificationRequest): Promise<DeliveryUpsertResult>;
  cancel(notificationKey: string): Promise<DeliveryCancelResult>;
  revoke(scopeKey: string): Promise<DeliveryRevocationResult>;
}

export type DispatchResult = DeliveryUpsertResult | Readonly<{
  status: 'not_dispatched';
  reason: Exclude<NotificationPlan, { status: 'planned' }>['reason'];
}>;

/** Coordinates an injected local port. It does not request permission or call an OS API. */
export class SyntheticNotificationDispatcher {
  constructor(private readonly port: IdempotentLocalNotificationPort) {}

  async dispatch(plan: NotificationPlan): Promise<DispatchResult> {
    if (plan.status !== 'planned') return Object.freeze({ status: 'not_dispatched', reason: plan.reason });
    return this.port.upsert(plan.request);
  }

  cancel(notificationKey: string): Promise<DeliveryCancelResult> {
    if (!notificationKey) throw new Error('Missing notification key');
    return this.port.cancel(notificationKey);
  }

  revoke(scopeKey: string): Promise<DeliveryRevocationResult> {
    if (!scopeKey) throw new Error('Missing notification scope');
    return this.port.revoke(scopeKey);
  }
}

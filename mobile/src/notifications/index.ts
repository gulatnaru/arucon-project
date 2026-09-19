export const NOTIFICATION_COPY_CATALOG = Object.freeze({
  food_full: Object.freeze({ title: '먹이가 가득 찼어요!', body: '앱에서 아루콘의 방을 확인해 보세요.' }),
  pet_waiting: Object.freeze({ title: '아루콘이 기다리고 있어요.', body: '편할 때 방에 들러 주세요.' }),
  activity_unavailable: Object.freeze({ title: '활동 연결을 확인해 주세요.', body: '앱에서 연결 상태와 설정 안내를 확인할 수 있어요.' }),
});

export type NotificationCopyKey = keyof typeof NOTIFICATION_COPY_CATALOG;

export type DisabledNotificationPlan = Readonly<{
  status: 'disabled';
  decision: 'DEC-14';
  copy: Readonly<{ title: string; body: string }>;
}>;

export class NotificationDecisionRequired extends Error {
  readonly decision = 'DEC-14' as const;

  constructor() {
    super('DecisionRequired: notification consent, cadence, quiet hours, deduplication and cancellation policy');
    this.name = 'NotificationDecisionRequired';
  }
}

/** Copy can be reviewed locally while every local/push delivery path remains disabled. */
export class DisabledNotificationDelivery {
  plan(copyKey: NotificationCopyKey): DisabledNotificationPlan {
    return Object.freeze({ status: 'disabled', decision: 'DEC-14', copy: NOTIFICATION_COPY_CATALOG[copyKey] });
  }

  deliver(): never {
    throw new NotificationDecisionRequired();
  }
}

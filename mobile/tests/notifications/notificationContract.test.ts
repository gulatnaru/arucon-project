import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DisabledNotificationDelivery,
  NOTIFICATION_COPY_CATALOG,
  NotificationDecisionRequired,
} from '../../src/notifications';

test('AT-COPY-01: catalog contains invitational copy without blame or medical claims', () => {
  const copy = Object.values(NOTIFICATION_COPY_CATALOG).flatMap(value => [value.title, value.body]).join('\n');
  for (const forbidden of ['돌보지 않아', '방치', '아팠', '병에 걸', '운동 부족', '게을러', '죄책감']) {
    assert.equal(copy.includes(forbidden), false, forbidden);
  }
});

test('AT-COPY-02: copy is previewable but delivery remains disabled while DEC-14 is unresolved', () => {
  const delivery = new DisabledNotificationDelivery();
  assert.deepEqual(delivery.plan('food_full'), {
    status: 'disabled', decision: 'DEC-14', copy: NOTIFICATION_COPY_CATALOG.food_full,
  });
  assert.throws(() => delivery.deliver(), NotificationDecisionRequired);
});

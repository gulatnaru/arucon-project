import React from 'react';
import { Text, View } from 'react-native';
import { activityStatusMessage, type ActivityRead } from './activityProvider';

/** Read-only status. A future native adapter must supply confirmed states. */
export function ActivityStatusView({ status }: { status: ActivityRead['status'] }) {
  return <View accessibilityLabel="활동 연결 상태">
    <Text accessibilityRole="text">{activityStatusMessage(status)}</Text>
  </View>;
}

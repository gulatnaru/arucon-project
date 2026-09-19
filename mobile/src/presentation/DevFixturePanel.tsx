import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DevFixtureAction =
  | 'synthetic_walk' | 'advance_three_hours' | 'install_table' | 'install_toilet'
  | 'sleep_null' | 'sleep_0' | 'sleep_70' | 'sleep_100' | 'shop_preview'
  | 'widget_ready' | 'widget_stale' | 'widget_missing' | 'widget_error' | 'widget_unsupported';

const ROWS: readonly { action: DevFixtureAction; label: string }[] = [
  { action: 'synthetic_walk', label: '합성 걸음 500' },
  { action: 'advance_three_hours', label: '합성 시간 +3시간' },
  { action: 'install_table', label: '식탁 설치 fixture' },
  { action: 'install_toilet', label: '화장실 설치 fixture' },
  { action: 'sleep_null', label: '합성 수면: 무기록' },
  { action: 'sleep_0', label: '합성 수면: 0점' },
  { action: 'sleep_70', label: '합성 수면: 70점' },
  { action: 'sleep_100', label: '합성 수면: 100점' },
  { action: 'shop_preview', label: '상점 미리보기' },
  { action: 'widget_ready', label: '위젯: ready' },
  { action: 'widget_stale', label: '위젯: stale' },
  { action: 'widget_missing', label: '위젯: missing' },
  { action: 'widget_error', label: '위젯: error' },
  { action: 'widget_unsupported', label: '위젯: unsupported' },
];

/** Separate development controls. No payment, health permission, or direct meter mutation. */
export function DevFixturePanel({ onAction }: { onAction: (action: DevFixtureAction) => void }) {
  return <View style={styles.panel}>
    <Text style={styles.heading}>DEV_FIXTURE_ONLY</Text>
    <Text>합성 입력과 읽기 전용 미리보기</Text>
    <View style={styles.row}>
      {ROWS.map(row => <Pressable key={row.action} accessibilityRole="button" onPress={() => onAction(row.action)} style={styles.button}>
        <Text style={styles.buttonText}>{row.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#e9f1ed', borderRadius: 16, padding: 12, gap: 6 },
  heading: { fontWeight: '800', color: '#274d40' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { backgroundColor: '#46695b', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  buttonText: { color: '#ffffff', fontSize: 12 },
});

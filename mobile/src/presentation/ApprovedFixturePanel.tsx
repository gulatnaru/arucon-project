import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ApprovedFixtureAction =
  | 'synthetic_walk' | 'synthetic_sleep_none' | 'synthetic_sleep_70'
  | 'growth_status' | 'resolve_growth' | 'shop_medicine' | 'shop_table'
  | 'shop_ball' | 'shop_cushion' | 'widget_snapshot' | 'sync_status' | 'sync_handoff';

const ROWS: readonly { action: ApprovedFixtureAction; label: string }[] = [
  { action: 'synthetic_walk', label: 'SOURCE_SYNTHETIC · 걸음 500' },
  { action: 'synthetic_sleep_none', label: 'SOURCE_SYNTHETIC · 수면 무기록' },
  { action: 'synthetic_sleep_70', label: 'SOURCE_SYNTHETIC · 수면 70점' },
  { action: 'growth_status', label: '성장 상태 보기' },
  { action: 'resolve_growth', label: '승인 성장 판정' },
  { action: 'shop_medicine', label: '코인 상점 · 약' },
  { action: 'shop_table', label: '코인 상점 · 식탁' },
  { action: 'shop_ball', label: '코인 상점 · 공' },
  { action: 'shop_cushion', label: '코인 상점 · 쿠션' },
  { action: 'widget_snapshot', label: '위젯 마지막 확인 시각' },
  { action: 'sync_status', label: '로컬 동기화 상태' },
  { action: 'sync_handoff', label: '기기 이전 준비 상태' },
];

export function ApprovedFixturePanel({ onAction }: { onAction: (action: ApprovedFixtureAction) => void }) {
  return <View style={styles.panel}>
    <Text style={styles.heading}>SOURCE_SYNTHETIC · LOCAL_ONLY</Text>
    <Text>실제 건강정보, 계정, 결제, 서버 동기화를 사용하지 않습니다.</Text>
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

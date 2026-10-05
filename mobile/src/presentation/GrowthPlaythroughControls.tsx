import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { levelExpression } from '../living/levelExpressions';
import type { GrowthPlaythroughProgress, GrowthCheckpoint } from '../living/growthPlaythrough';

export function GrowthPlaythroughControls({ progress, running, working, comparison, onToggle, onCompare, onReveal }:
  { progress: GrowthPlaythroughProgress; running: boolean; working: boolean; comparison: GrowthCheckpoint | null;
    onToggle(): void; onCompare(): void; onReveal(): void }) {
  const point = progress.checkpoints.at(-1)!;
  const level = comparison?.level ?? point.level;
  return <View style={styles.panel}>
    <Text style={styles.title}>{comparison ? `이전 모습 비교 · Lv.${level} (저장은 Lv.${point.level})` : `Lv.${point.level} / 20 · ${levelExpression(level).name}`}</Text>
    <Text style={styles.scope}>합성 활동·수면 / 가상 {point.observedDays}일 관찰 · 같은 아이 · {working ? '식사로 자라는 중' : '동작은 정상 속도'}</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onToggle} disabled={point.level === 20 && !running}><Text>{running ? '성장 일시정지' : point.level === 20 ? 'Lv.20 체험 완료' : '계속 키우기'}</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onReveal} disabled={working}><Text>이번 몸짓 보기</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onCompare} disabled={working || point.level < 2}><Text>{comparison ? '현재 모습으로' : '전후 비교'}</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 8, borderRadius: 14, gap: 5, backgroundColor: '#fff9edea' },
  title: { color: '#51392b', fontWeight: '700', fontSize: 13 }, scope: { color: '#46695b', fontSize: 11 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  button: { backgroundColor: '#eadfce', padding: 8, borderRadius: 10, minHeight: 40, justifyContent: 'center' },
});

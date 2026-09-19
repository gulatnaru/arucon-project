import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ApprovedStatusPanelProps = Readonly<{
  badge: string;
  migrationNotice: string;
  syncText: string;
  syncRuntimeNotice: string;
  growthText: string;
  widgetText: string;
  writerMode: 'active_writer' | 'read_only_fenced';
}>;

export function ApprovedStatusPanel(props: ApprovedStatusPanelProps) {
  return <View style={styles.panel} accessibilityLabel="승인 MVP 로컬 상태">
    <Text style={styles.badge}>{props.badge}</Text>
    <Text>합성 기록 · 실제 가입, 보호자 확인, 서버 권한이 아닙니다.</Text>
    <Text>{props.migrationNotice}</Text>
    <Text>{props.writerMode === 'active_writer' ? '이 설치에서 로컬 쓰기 가능' : '이 설치는 읽기 전용'}</Text>
    <Text>{props.syncRuntimeNotice}</Text>
    <Text>{props.syncText}</Text>
    <Text>{props.growthText}</Text>
    <Text>{props.widgetText}</Text>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff9eddd', borderRadius: 12, padding: 10, gap: 3 },
  badge: { fontSize: 12, fontWeight: '800', color: '#604638' },
});

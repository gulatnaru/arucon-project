import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type ApprovedStatusPanelProps = Readonly<{
  name: string;
  badge: string;
  migrationNotice: string;
  syncText: string;
  syncRuntimeNotice: string;
  growthText: string;
  widgetText: string;
  writerMode: 'active_writer' | 'read_only_fenced';
}>;

export function ApprovedStatusPanel(props: ApprovedStatusPanelProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  return <View style={styles.panel} accessibilityLabel="승인 MVP 로컬 상태">
    <View style={styles.summary}>
      <View style={styles.summaryText}>
        <Text style={styles.name} numberOfLines={1}>{props.name}</Text>
        <Text style={styles.badge} numberOfLines={1}>SOURCE_SYNTHETIC · 건강 연결 꺼짐</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="로컬 상태 상세 보기"
        accessibilityState={{ expanded: detailsVisible }}
        hitSlop={8}
        onPress={() => setDetailsVisible(true)}
        style={styles.detailsButton}
      >
        <Text style={styles.detailsButtonText}>상세</Text>
      </Pressable>
    </View>
    <Modal
      animationType="fade"
      onRequestClose={() => setDetailsVisible(false)}
      transparent
      visible={detailsVisible}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>로컬 상태 상세</Text>
          <ScrollView
            accessibilityLabel="로컬 상태 진단 내용"
            contentContainerStyle={styles.details}
            showsVerticalScrollIndicator
          >
            <Text style={styles.badge}>{props.badge}</Text>
            <Text>합성 기록 · 실제 가입, 보호자 확인, 서버 권한이 아닙니다.</Text>
            <Text>{props.migrationNotice}</Text>
            <Text>{props.writerMode === 'active_writer' ? '이 설치에서 로컬 쓰기 가능' : '이 설치는 읽기 전용'}</Text>
            <Text>{props.syncRuntimeNotice}</Text>
            <Text>{props.syncText}</Text>
            <Text>{props.growthText}</Text>
            <Text>{props.widgetText}</Text>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => setDetailsVisible(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: '#fff9edee', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '800', color: '#51392b' },
  badge: { fontSize: 11, fontWeight: '700', color: '#604638' },
  detailsButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#eadfce' },
  detailsButtonText: { color: '#51392b', fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#251c1788' },
  dialog: { maxHeight: '72%', borderRadius: 18, padding: 16, gap: 12, backgroundColor: '#fff9ed' },
  dialogTitle: { fontSize: 20, fontWeight: '800', color: '#51392b' },
  details: { gap: 8, paddingBottom: 4 },
  closeButton: { alignSelf: 'stretch', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#785943' },
  closeButtonText: { color: '#ffffff', fontWeight: '800' },
});

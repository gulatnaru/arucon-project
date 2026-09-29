import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { JournalEntry } from '../application/devLifeService';
import { journalEventText } from './approvedPresentation';

export type JournalPanelProps = {
  entries: readonly JournalEntry[] | null;
  onClose: () => void;
  topInset: number;
  bottomInset: number;
};

export function JournalPanel({ entries, onClose, topInset, bottomInset }: JournalPanelProps) {
  return <Modal animationType="fade" onRequestClose={onClose} transparent visible={entries !== null}>
    <View style={[styles.root, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="생활 기록 닫기"
        testID="journal-backdrop"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <View accessibilityViewIsModal style={styles.sheet} testID="journal-sheet">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>생활 기록</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="생활 기록 닫기"
            testID="journal-close"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <ScrollView accessibilityLabel="생활 기록 목록" contentContainerStyle={styles.content}>
          {entries?.length
            ? [...entries].reverse().map(entry => <Text key={entry.id} style={styles.entry}>{journalEventText(entry.event)}</Text>)
            : <Text style={styles.empty}>아직 기록이 없어요.</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#251c1788' },
  sheet: { maxHeight: '72%', minHeight: 220, borderRadius: 20, padding: 16, gap: 12, backgroundColor: '#fff9ed' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#51392b' },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#785943' },
  closeText: { color: '#fff', fontWeight: '800' },
  content: { gap: 8, paddingBottom: 6 },
  entry: { color: '#51392b', lineHeight: 20 },
  empty: { color: '#715f52' },
});

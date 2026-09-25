import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PetState } from '../domain/model';
import { CharacterFormCatalog } from '../domain/model';

export type LifeRoomAction = 'feed' | 'toggle_auto' | 'sleep_or_wake' | 'clean' | 'touch' | 'journal';

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

/** Compact room controls. Numeric state stays available through the explicit details toggle. */
export function LifeRoomControls({ state, onAction }: {
  state: PetState;
  onAction: (action: LifeRoomAction) => void;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const formName = CharacterFormCatalog[state.formId].displayName;
  const condition = state.hibernating ? '동면 중' : state.sleeping ? '쉬는 중' : state.condition === 'low' ? '기운 없음' : '함께 있는 중';
  return <View style={styles.panel}>
    <View style={styles.headingRow}>
      <Text style={styles.name} numberOfLines={1}>{state.givenName}콘 · {formName} · {condition}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="케어 수치 상세"
        accessibilityState={{ expanded: detailsVisible }}
        hitSlop={8}
        onPress={() => setDetailsVisible(value => !value)}
        style={styles.detailsButton}
      >
        <Text style={styles.detailsButtonText}>{detailsVisible ? '수치 닫기' : '수치'}</Text>
      </Pressable>
    </View>
    {detailsVisible && <Text style={styles.metrics}>먹이 {state.food} · 코인 {state.coin} · 체력 {Math.round(state.stamina)}</Text>}
    <View style={styles.row}>
      <ActionButton label="먹이주기" onPress={() => onAction('feed')} />
      <ActionButton label={state.autoFeedOptIn ? '자동급식 끄기' : '자동급식 켜기'} onPress={() => onAction('toggle_auto')} />
      <ActionButton label={state.sleeping ? '깨우기' : '쉬기'} onPress={() => onAction('sleep_or_wake')} />
      <ActionButton label="청소" onPress={() => onAction('clean')} />
      <ActionButton label="쓰다듬기" onPress={() => onAction('touch')} />
      <ActionButton label="기록" onPress={() => onAction('journal')} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff8edee', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#51392b' },
  detailsButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 10, backgroundColor: '#eadfce' },
  detailsButtonText: { color: '#51392b', fontSize: 12, fontWeight: '700' },
  metrics: { color: '#604638', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  button: { minHeight: 48, justifyContent: 'center', backgroundColor: '#785943', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  buttonText: { color: '#ffffff', fontSize: 12 },
});

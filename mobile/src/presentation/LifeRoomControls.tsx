import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PetState } from '../domain/model';
import { CharacterFormCatalog } from '../domain/model';

export type LifeRoomAction = 'feed' | 'toggle_auto' | 'sleep_or_wake' | 'clean' | 'touch' | 'journal';

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

/** Small care panel for the room. Every action is delegated to DevLifeService by the host. */
export function LifeRoomControls({ state, onAction }: {
  state: PetState;
  onAction: (action: LifeRoomAction) => void;
}) {
  const formName = CharacterFormCatalog[state.formId].displayName;
  const condition = state.hibernating ? '동면 중' : state.sleeping ? '쉬는 중' : state.condition === 'low' ? '기운 없음' : '함께 있는 중';
  return <View style={styles.panel}>
    <Text style={styles.name}>{state.givenName}콘 · {formName}</Text>
    <Text>{condition}</Text>
    <Text>먹이 {state.food} · 코인 {state.coin} · 체력 {Math.round(state.stamina)}</Text>
    <View style={styles.row}>
      <ActionButton label="먹이주기" onPress={() => onAction('feed')} />
      <ActionButton label={state.autoFeedOptIn ? '자동급식 끄기' : '자동급식 켜기'} onPress={() => onAction('toggle_auto')} />
    </View>
    <View style={styles.row}>
      <ActionButton label={state.sleeping ? '깨우기' : '쉬기'} onPress={() => onAction('sleep_or_wake')} />
      <ActionButton label="청소" onPress={() => onAction('clean')} />
      <ActionButton label="쓰다듬기" onPress={() => onAction('touch')} />
      <ActionButton label="기록" onPress={() => onAction('journal')} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff8ed', borderRadius: 18, padding: 14, gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: '#51392b' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { backgroundColor: '#785943', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  buttonText: { color: '#ffffff', fontSize: 13 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reactionDialogueDisplayMode, type ReactionDialogueView } from './reactionPresentation';

export function ReactionOverlay({ view, onChoice, onClose, reduceDialogue = false, onToggleReduceDialogue }: {
  view: ReactionDialogueView | null;
  onChoice: (choiceId: string) => void;
  onClose: () => void;
  reduceDialogue?: boolean;
  onToggleReduceDialogue?: () => void;
}) {
  if (!view) return null;
  if (reactionDialogueDisplayMode(view, reduceDialogue) === 'reduced_line') {
    return <Pressable
      accessibilityRole="switch"
      accessibilityLabel="대사 적게"
      accessibilityState={{ checked: true }}
      onPress={onToggleReduceDialogue}
      style={styles.reduced}
    >
      <Text style={styles.reducedText}>대사 적게 · 켜짐</Text>
    </Pressable>;
  }
  return <View accessibilityLiveRegion="polite" style={styles.bubble} testID="reaction-dialogue">
    <View style={styles.heading}>
      <Text style={styles.text}>{view.text}</Text>
      {!!onToggleReduceDialogue && <Pressable
        accessibilityRole="switch"
        accessibilityLabel="대사 적게"
        accessibilityState={{ checked: reduceDialogue }}
        hitSlop={8}
        onPress={onToggleReduceDialogue}
      >
        <Text style={styles.reduceToggle}>대사 적게</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="대화 닫기" hitSlop={8} onPress={onClose}>
        <Text style={styles.close}>닫기</Text>
      </Pressable>
    </View>
    {!!view.choices.length && <View style={styles.choices}>
      {view.choices.map(choice => <Pressable
        key={choice.id}
        accessibilityRole="button"
        onPress={() => onChoice(choice.id)}
        style={styles.choice}
      >
        <Text style={styles.choiceText}>{choice.label}</Text>
      </Pressable>)}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  bubble: { alignSelf: 'center', width: '92%', borderRadius: 16, padding: 12, gap: 8, backgroundColor: '#fff9edee' },
  reduced: { alignSelf: 'center', minHeight: 38, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff9edcc' },
  reducedText: { color: '#715443', fontSize: 12, fontWeight: '800' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, color: '#51392b', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  close: { color: '#715443', fontWeight: '800' },
  reduceToggle: { color: '#46695b', fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 44, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#785943' },
  choiceText: { color: '#fff', fontWeight: '700' },
});

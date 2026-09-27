import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <ScrollView style={styles.message} contentContainerStyle={styles.messageContent} bounces={false}>
      <Text style={styles.text}>{view.text}</Text>
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
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  bubble: { width: '100%', flexShrink: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, gap: 4, backgroundColor: '#fff9ed' },
  reduced: { alignSelf: 'center', minHeight: 38, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff9edcc' },
  reducedText: { color: '#715443', fontSize: 12, fontWeight: '800' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, minHeight: 44 },
  message: { flexShrink: 1, maxHeight: 240 },
  messageContent: { paddingBottom: 4 },
  text: { color: '#51392b', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  close: { color: '#715443', fontWeight: '800' },
  reduceToggle: { color: '#46695b', fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  choice: { minHeight: 44, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#785943' },
  choiceText: { color: '#fff', fontWeight: '700' },
});

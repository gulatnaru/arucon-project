import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { reactionDialogueDisplayMode, type ReactionDialogueView } from './reactionPresentation';

export function ReactionOverlay({ view, onChoice, onClose, reduceDialogue = false }: {
  view: ReactionDialogueView | null;
  onChoice: (choiceId: string) => void;
  onClose: () => void;
  reduceDialogue?: boolean;
  onToggleReduceDialogue?: () => void;
}) {
  if (!view) return null;
  if (reactionDialogueDisplayMode(view, reduceDialogue) === 'reduced_line') {
    return null;
  }
  return <View accessibilityLiveRegion="polite" style={styles.bubble} testID="reaction-dialogue">
    <Pressable accessibilityRole="button" accessibilityLabel="대화 닫기" onPress={onClose} style={styles.dismiss}>
      <Text style={styles.close}>×</Text>
    </Pressable>
    <ScrollView style={styles.message} contentContainerStyle={styles.messageContent} bounces={false}>
      <Text style={[styles.text, { paddingRight: 30 }]}>{view.text}</Text>
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
  bubble: { width: '100%', minHeight: 46, flexShrink: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff9ed' },
  dismiss: { position: 'absolute', right: 0, top: 0, width: 44, height: 44, zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  reduced: { alignSelf: 'center', minHeight: 38, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff9edcc' },
  reducedText: { color: '#715443', fontSize: 12, fontWeight: '800' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: 36 },
  message: { flexShrink: 1, maxHeight: 240 },
  messageContent: { paddingBottom: 4 },
  text: { color: '#51392b', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  close: { color: '#715443', fontWeight: '800' },
  reduceToggle: { color: '#46695b', fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  choice: { minHeight: 44, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#785943' },
  choiceText: { color: '#fff', fontWeight: '700' },
});

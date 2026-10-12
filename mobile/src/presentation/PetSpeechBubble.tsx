import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BubbleReadingClock, measuredSpeechWidth, speechReadingMs } from './bubbleReading';

export type PetSpeech = { id: number; text: string; onDismiss: () => void; onReadingHoldChange?: (held: boolean) => void;
  onUserInteraction?: () => void;
  fontScale?: number; reducedMotion?: boolean; onMeasure?: (size: { width: number; height: number }) => void };

/** Content-sized pet speech. Presses stay here and cannot reach the floor/pet. */
export function PetSpeechBubble({ speech, maxWidth, maxHeight, onSize }: {
  speech: PetSpeech; maxWidth: number; maxHeight: number; onSize: (size: { width: number; height: number }) => void;
}) {
  const [measured, setMeasured] = useState<{ id: number; width: number; height: number }>();
  const [reader, setReader] = useState(false), opacity = useRef(new Animated.Value(1)).current;
  const clock = useRef<BubbleReadingClock | undefined>(undefined), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(speech); latest.current = speech;
  const long = useRef(false), holding = useRef(new Set<string>());
  const arm = useCallback(() => {
    clearTimeout(timer.current);
    const own = clock.current; if (!own || own.paused) return;
    const id = latest.current.id;
    timer.current = setTimeout(() => {
      if (clock.current !== own || own.paused || latest.current.id !== id) return;
      Animated.timing(opacity, { toValue: 0, duration: latest.current.reducedMotion ? 0 : 160, useNativeDriver: true }).start(({ finished }) => {
        if (finished && clock.current === own && !own.paused && latest.current.id === id) latest.current.onDismiss();
      });
    }, own.remainingMs(Date.now()));
  }, [opacity]);
  const hold = (reason: string) => { holding.current.add(reason); clock.current?.hold(reason, Date.now()); clearTimeout(timer.current);
    opacity.stopAnimation(); opacity.setValue(1); latest.current.onReadingHoldChange?.(true); };
  const release = (reason: string) => { holding.current.delete(reason); clock.current?.release(reason, Date.now());
    latest.current.onReadingHoldChange?.(holding.current.size > 0); arm(); };
  useEffect(() => {
    let alive = true; void AccessibilityInfo.isScreenReaderEnabled().then(x => { if (alive) setReader(x); });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    opacity.stopAnimation(); opacity.setValue(1); long.current = false;
    const own = new BubbleReadingClock(speechReadingMs(speech.text), Date.now()); clock.current = own;
    if (reader) holding.current.add('screen_reader'); else holding.current.delete('screen_reader');
    for (const reason of holding.current) own.hold(reason, Date.now());
    latest.current.onReadingHoldChange?.(own.paused); arm();
    return () => { clearTimeout(timer.current); opacity.stopAnimation(); if (clock.current === own) clock.current = undefined; latest.current.onReadingHoldChange?.(false); };
  }, [speech.id, speech.text, reader, arm, opacity]);
  const width = measured?.id === speech.id ? measured.width : maxWidth;
  const scale = speech.fontScale ?? 1, textStyle = { fontSize: 15 * scale, lineHeight: 21 * scale };
  return <Animated.View style={{ opacity: measured?.id === speech.id ? opacity : 0, width, maxHeight }}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', width: maxWidth - 26, opacity: 0 }}>
      <Text style={[styles.text, textStyle]} onTextLayout={e => {
        const next = { id: speech.id, width: measuredSpeechWidth(e.nativeEvent.lines, maxWidth), height: e.nativeEvent.lines.reduce((n, line) => n + line.height, 0) };
        setMeasured(old => old?.id === next.id && old.width === next.width && Math.abs(old.height - next.height) < .5 ? old : next);
      }}>{speech.text}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={speech.text} accessibilityHint="탭하면 말풍선을 닫습니다. 읽기 중에는 길게 누를 수 있습니다."
      accessibilityActions={[{ name: 'dismiss', label: '말풍선 닫기' }]}
      onAccessibilityAction={e => { if (['dismiss', 'activate', 'escape'].includes(e.nativeEvent.actionName)) { speech.onUserInteraction?.(); speech.onDismiss(); } }}
      onFocus={() => hold('focus')} onBlur={() => release('focus')}
      onPressIn={() => { speech.onUserInteraction?.(); hold('press'); }} onLongPress={() => { long.current = true; }} onPressOut={() => release('press')}
      onPress={() => { if (!long.current) speech.onDismiss(); long.current = false; }}
      onLayout={e => { const size = e.nativeEvent.layout; onSize({ width: size.width, height: size.height }); speech.onMeasure?.({ width: size.width, height: size.height }); }}
      style={[styles.bubble, { width, maxHeight }]}>
      {(measured?.height ?? 0) > maxHeight - 20 ? <ScrollView bounces={false} showsVerticalScrollIndicator style={{ maxHeight: Math.max(22, maxHeight - 20) }}
        onScrollBeginDrag={() => hold('scroll')} onScrollEndDrag={() => release('scroll')}
        onMomentumScrollBegin={() => hold('momentum')} onMomentumScrollEnd={() => release('momentum')}>
          <Text style={[styles.text, textStyle]}>{speech.text}</Text>
        </ScrollView> : <Text style={[styles.text, textStyle]}>{speech.text}</Text>}
    </Pressable>
  </Animated.View>;
}
const styles = StyleSheet.create({ bubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 17, borderWidth: 1,
  borderColor: '#eaded4', backgroundColor: '#fff9ed', shadowColor: '#655750', shadowOpacity: .08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
text: { color: '#514658', fontSize: 15, lineHeight: 21 } });

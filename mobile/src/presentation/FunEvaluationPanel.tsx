import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CharacterCandidateId } from '../scene/characterCandidates';
import { CharacterFormCatalog, type FormId } from '../domain/model';

export type EvaluationCameraAngle = 'front' | 'side' | 'back' | 'three_quarter';
export type EvaluationScenario =
  | 'petting' | 'ball' | 'rest' | 'sleep'
  | 'clean_none' | 'clean_auto' | 'clean_success' | 'growth_before_after';

export type FunEvaluationState = Readonly<{
  personality: 'reserved' | 'expressive';
  candidateId: CharacterCandidateId;
  cameraAngle: EvaluationCameraAngle;
  sleeping: boolean;
  formId?: FormId;
  stretchProgress?: number;
}>;

const CANDIDATES: readonly { id: CharacterCandidateId; label: string }[] = [
  { id: 'original', label: '기존형' },
  { id: 'baby_v3', label: '모찌 v3 초안' },
];
const ANGLES: readonly { id: EvaluationCameraAngle; label: string }[] = [
  { id: 'front', label: '정면' }, { id: 'side', label: '측면' },
  { id: 'back', label: '후면' }, { id: 'three_quarter', label: '3/4' },
];
const SCENARIOS: readonly { id: EvaluationScenario; label: string }[] = [
  { id: 'petting', label: '쓰다듬기' }, { id: 'ball', label: '공놀이' }, { id: 'rest', label: '휴식' },
  { id: 'sleep', label: '수면' }, { id: 'clean_none', label: '청소 없음' },
  { id: 'clean_auto', label: '자동 청소' }, { id: 'clean_success', label: '청소 성공' },
  { id: 'growth_before_after', label: '성장 전/후' },
];

export function FunEvaluationPanel({ state, onState, onScenario, onClose }: {
  state: FunEvaluationState;
  onState: (next: FunEvaluationState) => void;
  onScenario: (scenario: EvaluationScenario) => void;
  onClose: () => void;
}) {
  const choice = (selected: boolean) => [styles.choice, selected && styles.selected];
  return <View accessibilityLabel="합성 반응과 아트 비교" style={styles.panel}>
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>SOURCE_SYNTHETIC · 비교 모드</Text>
        <Text style={styles.scope}>별도 fixture 반응 DB · 게임 저장/보상 변경 없음</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.closeText}>비교 종료</Text></Pressable>
    </View>
    <View style={styles.row}>
      {(['reserved', 'expressive'] as const).map(personality => <Pressable
        key={personality} accessibilityRole="button" accessibilityState={{ selected: state.personality === personality }}
        onPress={() => onState({ ...state, personality })} style={choice(state.personality === personality)}
      ><Text>{personality === 'reserved' ? '시크한 표현' : '솔직한 표현'}</Text></Pressable>)}
      {CANDIDATES.map(candidate => <Pressable
        key={candidate.id} accessibilityRole="button" accessibilityState={{ selected: state.candidateId === candidate.id }}
        onPress={() => onState({ ...state, candidateId: candidate.id })} style={choice(state.candidateId === candidate.id)}
      ><Text>{candidate.label}</Text></Pressable>)}
      {(Object.keys(CharacterFormCatalog) as FormId[]).map(formId => <Pressable key={formId} accessibilityRole="button"
        onPress={() => onState({ ...state, formId })} style={choice((state.formId ?? 'arucon') === formId)}>
        <Text>{CharacterFormCatalog[formId].displayName} 초안</Text>
      </Pressable>)}
      {ANGLES.map(angle => <Pressable
        key={angle.id} accessibilityRole="button" accessibilityState={{ selected: state.cameraAngle === angle.id }}
        onPress={() => onState({ ...state, cameraAngle: angle.id })} style={choice(state.cameraAngle === angle.id)}
      ><Text>{angle.label}</Text></Pressable>)}
    </View>
    <Text style={styles.scope}>기지개 자세 검사 · 일반 자율 행동의 통과 증거와 별도</Text>
    <View style={styles.row}>
      {[0, .25, .5, .75, 1].map(progress => <Pressable key={progress} accessibilityRole="button"
        onPress={() => onState({ ...state, stretchProgress: progress })} style={choice(state.stretchProgress === progress)}>
        <Text>기지개 {progress * 100}%</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => onState({ ...state, stretchProgress: undefined })} style={styles.choice}><Text>자세 검사 해제</Text></Pressable>
    </View>
    <View style={styles.row}>
      {SCENARIOS.map(scenario => <Pressable key={scenario.id} accessibilityRole="button" onPress={() => onScenario(scenario.id)} style={styles.scenario}>
        <Text style={styles.scenarioText}>{scenario.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, padding: 10, gap: 7, backgroundColor: '#e9f1edee' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleWrap: { flex: 1 },
  title: { color: '#274d40', fontWeight: '900' },
  scope: { color: '#46695b', fontSize: 10 },
  close: { minHeight: 40, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 10, backgroundColor: '#46695b' },
  closeText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  choice: { minHeight: 34, justifyContent: 'center', borderRadius: 9, paddingHorizontal: 8, backgroundColor: '#fff9ed' },
  selected: { borderWidth: 2, borderColor: '#46695b' },
  scenario: { minHeight: 38, justifyContent: 'center', borderRadius: 9, paddingHorizontal: 8, backgroundColor: '#785943' },
  scenarioText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

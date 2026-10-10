import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import { AruconRoom } from '../scene/AruconRoom';
import { ApprovedMvpService } from '../application/approvedMvpService';
import { openAruconDatabase } from '../storage/appDatabase';
import { expoSqliteConnection } from '../storage/sqlite';
import type { PetState } from '../domain/model';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../progression/projection';
import { projectPetRest } from '../presentation/petRest';
import { utcFixtureDay } from '../application/devClock';
import { RebootMemoryStore } from './memory';
import { eligibleMemories, hatReaction, REBOOT_ITEM, RESUMABLE_REBOOT_INTENTS, type ResumableIntent, type RebootCommand, type RebootEvent, type RebootSnapshot, type RebootStage } from './contracts';
import { ART_CASES, ART_LABELS, BABY_ART_CHOICES, type BabyArt, type ArtComparison } from './artComparison';
import { BABY_SIZE_CANDIDATES, BabyLines } from './babyLife';
import type { FloorPoint, RoomRuntimeSnapshot } from '../scene/types';
import type { RoomPerformanceCapture, RoomPerformanceSummary } from '../scene/performanceProbe';
import { VISUAL_QUALITY_CHOICES, type RoomRendererProfileId } from '../scene/rendererConfig';
import { RebootSemanticQueue } from './semantic';
import { nativeEmbeddingPort } from './nativeEmbedding';
import { installStorageDiagnostics, storageDiagnosticsSnapshot } from '../storage/nativeStorageDiagnostics';

import { expressPersonality, PERSONALITY_IDS, PERSONALITY_PROFILES, type PersonalityId } from './personality';
const stageName: Record<RebootStage, string> = { baby: '아기', growing: '성장기', evolved: '1차 진화 후' };
type Menu = 'main' | 'pet' | 'objects' | 'settings' | 'render' | null;
type CommandResult = { state?: PetState; memory?: RebootSnapshot; command?: RebootCommand };

export function RebootReviewScreen({ onExit, personalityReview, onPersonality }: { onExit: () => void; personalityReview?: PersonalityId; onPersonality?: (id: PersonalityId) => void }) {
  const PET_ID = personalityReview ? PERSONALITY_PROFILES[personalityReview].petId : 'reboot-01:main';
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<PetState | null>(null), [memory, setMemory] = useState<RebootSnapshot | null>(null);
  const [menu, setMenu] = useState<Menu>(null), [hand, setHand] = useState(false), [placement, setPlacement] = useState(false);
  const [command, setCommand] = useState<RebootCommand>(), [bubble, setBubble] = useState('');
  const [quiet, setQuiet] = useState(false), [reduced, setReduced] = useState(false), [busy, setBusy] = useState(false);
  const [babyReview, setBabyReview] = useState(true), [sizeCandidate, setSizeCandidate] = useState<1.15 | 1.25 | 1.35>(personalityReview ? 1.35 : 1.25);
  const [artCandidate, setArtCandidate] = useState<BabyArt>(personalityReview ? 'quad' : 'v8'), [artComparison, setArtComparison] = useState<ArtComparison>();
  const [renderProfile, setRenderProfile] = useState<RoomRendererProfileId>(personalityReview ? 'quality_250' : 'automatic');
  const [voice] = useState(() => new BabyLines());
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), bubbleToken = useRef(0);
  const [error, setError] = useState(''), [captureToken, setCaptureToken] = useState<string>();
  const [captureDuration, setCaptureDuration] = useState<60_000|180_000>(60_000);
  const [backend, setBackend] = useState<'A' | 'B'>('A'), [modelStatus, setModelStatus] = useState('A · 구조화된 실제 기억');
  const [evidenceStatus, setEvidenceStatus] = useState('');
  const [storageCheckRunning,setStorageCheckRunning]=useState(false), storageCheckActive=useRef(false);
  const backendRef = useRef<'A' | 'B'>('A');
  const service = useRef<ApprovedMvpService | null>(null), memories = useRef<RebootMemoryStore | null>(null);
  const latest = useRef({ pet, memory }), alive = useRef(true), sequence = useRef(0), epoch = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve()), retry = useRef<(() => Promise<CommandResult>) | null>(null);
  const activeIntent = useRef<RebootEvent | null>(null), trace = useRef<object[]>([]);
  const perf = useRef<RoomPerformanceSummary | undefined>(undefined), capture = useRef<RoomPerformanceCapture | undefined>(undefined);
  const runtime = useRef<RoomRuntimeSnapshot | undefined>(undefined);
  const semantic = useRef(new RebootSemanticQueue(null));
  const token = useCallback((kind: string) => `reboot:${PET_ID}:${kind}:${Date.now()}:${++sequence.current}`, [PET_ID]);
  const apply = useCallback((x: CommandResult) => {
    if (!alive.current) return;
    if (x.state) { latest.current.pet = x.state; setPet(x.state); }
    if (x.memory) { latest.current.memory = x.memory; setMemory(x.memory); }
    if (x.command) setCommand(x.command);
  }, []);
  const run = useCallback((task: () => Promise<CommandResult>) => {
    const work = queue.current.then(async () => {
      if (!alive.current) return;
      setBusy(true);
      try { const result = await task(); apply(result); if (retry.current === task) { retry.current = null; setError(''); } }
      catch (cause) { if (!retry.current || retry.current === task) { retry.current = task; setError(`저장을 마치지 못했어요. ${cause instanceof Error ? cause.message : String(cause)}`); } }
      finally { if (alive.current) setBusy(false); }
    });
    queue.current = work.catch(() => undefined); return work;
  }, [apply]);
  const now = useCallback(() => Math.max(Date.now(), latest.current.pet?.lastSimulatedAtMs ?? 0), []);
  const cancel = useCallback(() => { epoch.current++; semantic.current.cancel(); ++bubbleToken.current; clearTimeout(bubbleTimer.current); setHand(false); setCommand(undefined); setBubble(''); }, []);
  useEffect(() => {
    alive.current = true;
    const stopStorageDiagnostics=installStorageDiagnostics();
    const requestEpoch = epoch, modelQueue = semantic.current;
    void run(async () => {
      const db = expoSqliteConnection(await openAruconDatabase('arucon-reboot-review.db'));
      const game = await ApprovedMvpService.initialize(db, { petId: PET_ID, givenName: '아루', personalityProfileId: 'reserved', createdAtMs: Date.now() });
      const store = new RebootMemoryStore(db, PET_ID, personalityReview), snapshot = await store.load();
      service.current = game; memories.current = store;
      return { state: (await game.enterForeground(now())).state, memory: snapshot };
    });
    const subscription = AppState.addEventListener('change', state => {
      if (!service.current) return;
      if (state !== 'active') { cancel(); void run(async () => ({ state: await service.current!.leaveForeground(now()) })); }
      else void run(async () => ({ state: (await service.current!.enterForeground(now())).state }));
    });
    const tick = setInterval(() => {
      if (AppState.currentState === 'active' && service.current) void run(async () => ({ state: await service.current!.advanceForeground(now()) }));
    }, 30_000);
    return () => { alive.current = false; requestEpoch.current++; modelQueue.cancel(); clearTimeout(bubbleTimer.current); subscription.remove(); clearInterval(tick); stopStorageDiagnostics(); };
  }, [cancel, now, run, PET_ID, personalityReview]);

  const onEvent = useCallback((event: RebootEvent) => {
    if (!alive.current) return;
    trace.current.push({ ...event, atMs: Date.now() }); trace.current = trace.current.slice(-256);
    if (event.phase === 'cancel' || event.phase === 'start') { ++bubbleToken.current; clearTimeout(bubbleTimer.current); setBubble(''); }
    if (event.phase === 'start') activeIntent.current = event;
    if (event.phase === 'cancel' || event.phase === 'complete') {
      if (activeIntent.current?.token === event.token) activeIntent.current = null;
    }
    if (event.phase === 'contact' && event.babyBeat) {
      const key = event.kind === 'cushion_changed' && event.babyBeat === 'cushion_knead' ? 'cushion_changed' : event.babyBeat;
      const spoken = voice.select(key, event.token, event.automatic, Date.now(), personalityReview);
      if (spoken) {
        clearTimeout(bubbleTimer.current); const id = ++bubbleToken.current;
        setBubble(spoken.text); trace.current.push({ lineId: spoken.lineId, token: event.token, shown: !quiet, atMs: Date.now() });
        bubbleTimer.current = setTimeout(() => { if (alive.current && bubbleToken.current === id) setBubble(''); }, Math.max(2200, spoken.text.length * 125));
      }
    } else if (event.phase === 'contact' && !event.automatic) {
      const known = latest.current.memory?.events.some(x => x.kind === 'hand');
      setBubble(event.kind === 'hand' ? event.stage === 'baby' ? '조금만 가까이.' : event.stage === 'growing' ? '가만히 있어 봐.' : known ? '그 손, 알아.' : '여기 기대도 돼?'
        : event.kind === 'hat_first' ? '이건 처음 보네.' : event.kind === 'hat_again' ? '이제 잘 맞네.' : event.kind === 'hat_busy' ? '잠깐만 쓰고 갈게.' : '자리가 달라졌네.');
    }
    if (event.phase !== 'complete' || !memories.current) return;
    if (!event.babyMode) setBubble('');
    const kind = event.kind.startsWith('hat') ? 'hat_used' : ['rest', 'cushion_changed'].includes(event.kind) ? 'cushion_used' : event.kind === 'hand' ? 'hand' : personalityReview && event.automatic ? 'personality_scene' : null;
    if (!kind) return;
    const captured = latest.current.memory;
    if (!captured) return;
    void run(async () => ({ memory: await memories.current!.complete({ petId: PET_ID, eventId: event.token, kind,
      itemId: kind === 'hat_used' ? REBOOT_ITEM.hat : kind === 'cushion_used' ? REBOOT_ITEM.cushion : kind==='personality_scene' ? 'review:personality' : 'user:hand',
      atMs: Date.now(), completed: true, stage: event.stage, context: event.kind,
      ...(kind === 'hand' && event.touchRegion ? { touchRegion: event.touchRegion } : {}),
      ...(kind === 'cushion_used' ? { itemRevision: event.itemRevision ?? captured.cushion.revision, position: { x: captured.cushion.x, z: captured.cushion.z } } : {}),
    }, event.sourceRevision, event.randomState) }));
  }, [run, voice, quiet, personalityReview, PET_ID]);

  const wear = () => {
    if (!memories.current || !latest.current.memory || !latest.current.pet || projectPetRest(latest.current.pet).mode !== 'awake') return;
    const before = latest.current.memory, prior = activeIntent.current;
    setMenu(null); setHand(false); setPlacement(false);
    const request = token('hat'), requestEpoch = ++epoch.current; semantic.current.cancel();
    void run(async () => {
      const snapshot = await memories.current!.wear(!before.hatWorn, before.revision);
      if (requestEpoch !== epoch.current || !snapshot.hatWorn) return { memory: snapshot };
      const kind = hatReaction(before, prior?.kind);
      latest.current.memory = snapshot;
      const decision = await semantic.current.decide(snapshot, REBOOT_ITEM.hat, ['hat_first', 'hat_again', 'hat_busy'], kind,
        () => ({ petId: latest.current.memory?.petId ?? '', revision: latest.current.memory?.revision ?? -1,
          awake: !!latest.current.pet && projectPetRest(latest.current.pet).mode === 'awake' }));
      trace.current.push({ decision, request, atMs: Date.now(), requestedBackend: backendRef.current, actualBackend: decision?.backend ?? 'DISCARDED' });
      if (!decision || requestEpoch !== epoch.current) return { memory: snapshot };
      return { memory: snapshot, command: { token: request, kind: decision.intentId, sourceRevision: snapshot.revision,
        ...(prior && (RESUMABLE_REBOOT_INTENTS as readonly string[]).includes(prior.kind) ? { resume: prior.kind as ResumableIntent, resumeTarget: prior.target } : {}) } };
    });
  };
  const moveCushion = (point: FloorPoint) => {
    if (!memories.current || !latest.current.memory) return;
    const request = token('cushion'), requestEpoch = ++epoch.current; setPlacement(false); setHand(false);
    void run(async () => {
      // A completed life event may be queued before this placement. Read its
      // applied revision in the lane, rather than silently dropping user input.
      const before = latest.current.memory;
      if (!before || requestEpoch !== epoch.current) return {};
      const snapshot = await memories.current!.moveCushion(point, before.revision);
      if (requestEpoch !== epoch.current || snapshot.cushion.revision === before.cushion.revision) return { memory: snapshot };
      const old = eligibleMemories(before, REBOOT_ITEM.cushion).at(-1)?.position;
      return { memory: snapshot, command: { token: request, kind: 'cushion_changed', sourceRevision: snapshot.revision,
        itemRevision: snapshot.cushion.revision, target: old } };
    });
  };
  const selectStage = (stage: RebootStage) => {
    cancel(); setMenu(null); setPlacement(false);
    void run(async () => ({ memory: await memories.current!.stage(stage) }));
  };
  const rest = pet ? projectPetRest(pet) : null;
  const restAction = () => {
    if (!service.current || !rest) return;
    const request = token(rest.mode); cancel(); setArtComparison(undefined); setMenu(null);
    void run(async () => ({ state: rest.mode === 'hibernating' ? (await service.current!.returnToForeground(now())).state
      : rest.mode === 'sleeping' ? await service.current!.wake(now(), request) : await service.current!.sleep(now(), request) }));
  };
  const exportEvidence = () => {
    try { new File(Paths.cache, 'arucon-reboot-evidence.json').write(JSON.stringify({ build: 'reboot-04-personality-v4', review: { personalityReview, babyReview, sizeCandidate, renderProfile, artCandidate, artComparison, reduced, finalSize: null, finalRenderProfile: null },
      pet: latest.current.pet, memory: latest.current.memory, trace: trace.current, performance: perf.current, capture: capture.current, runtime: runtime.current,
      storage: storageDiagnosticsSnapshot(),
      ai: { backend: backendRef.current, status: modelStatus, realVectorsUsed: trace.current.some(x => 'decision' in x && (x as { decision?: { backend?: string } }).decision?.backend === 'B_REAL') } }, null, 2)); setEvidenceStatus('검토 기록을 기기 안에 저장했어요.'); }
    catch (cause) { setError(`검토 기록 저장에 실패했어요: ${String(cause)}`); }
  };
  const chooseBackend = async () => {
    semantic.current.cancel();
    if (backendRef.current === 'B') { semantic.current = new RebootSemanticQueue(null); backendRef.current = 'A'; setBackend('A'); setModelStatus('A · 구조화된 실제 기억'); return; }
    const native = nativeEmbeddingPort();
    if (!native) { setModelStatus('B 사용 불가 · native 모듈이 없는 환경이에요. A로 이어갑니다.'); return; }
    const requestEpoch = epoch.current;
    setModelStatus('B의 로컬 모델을 준비 중이에요. 방과 교감은 계속 사용할 수 있어요.');
    try {
      const result = await native.load();
      if (!alive.current || requestEpoch !== epoch.current || AppState.currentState !== 'active') return;
      semantic.current = new RebootSemanticQueue(native.port); backendRef.current = 'B'; setBackend('B');
      setModelStatus(`B · 로컬 검색 준비됨 (${String(result.sdk)}). 실제 사용 결과는 검토 기록에 분리됩니다.`);
    } catch (e) {
      if (!alive.current) return;
      semantic.current = new RebootSemanticQueue(null); backendRef.current = 'A'; setBackend('A');
      setModelStatus(`B 사용 불가 · A로 이어갑니다. ${String(e)}`);
    }
  };
  if (!pet || !memory || !rest) return <View style={styles.loading}><Text>{error || '작은 방을 준비하고 있어요.'}</Text></View>;
  const growth = projectGrowth(pet.totalExpUnits, APPROVED_GROWTH_POLICY);
  const viewStage = babyReview ? 'baby' : memory.previewStage;
  const expressed = memory.personality ? expressPersonality(memory.personality, memory.events, viewStage) : undefined;
  const familiarHand = eligibleMemories(memory, 'user:hand').filter(e => now() - e.atMs < 45 * 60_000).at(-1);
  return <View style={styles.root}>
    <AruconRoom rendererProfileId={renderProfile} rebootView={{ stage: viewStage, hatWorn: memory.hatWorn, revision: memory.revision, babyCharm: babyReview,
      sizeCandidate, artCandidate, artComparison: artComparison ? { ...artComparison, paused: artComparison.paused || menu !== null } : undefined, familiarHandId: familiarHand?.eventId,
      cushion: memory.cushion, handOffered: hand, command,
      personality: memory.personality && expressed ? { foundation: memory.personality, axes: expressed.axes, randomState: memory.randomState!, evidenceIds: expressed.evidenceIds } : undefined }} onRebootEvent={onEvent}
      livingEnabled={false} tableInstalled={false} toiletInstalled={pet.toiletInstalled} cushionVisible ballVisible={false}
      formId={pet.formId} restMode={rest.mode} reducedMotion={reduced} interactionEnabled={menu === null && !artComparison}
      topOcclusion={insets.top + 78} bottomOcclusion={insets.bottom + 70}
      rebootPlacement={placement && !artComparison} onRebootPlacement={moveCushion}
      onInteractionIntent={kind => { if (kind === 'pet' || kind === 'move') { setHand(false); setBubble(''); } }}
      onPetTouch={() => { const id = token('touch'); void run(async () => ({ state: await service.current!.interact(now(), id, 'touch', utcFixtureDay(now()).id) })); }}
      onStatus={setBubble} onFurnitureHit={kind => { if (kind === 'cushion') setCommand({ token: token('rest'), kind: 'rest', sourceRevision: memory.revision, target: memory.cushion, itemRevision: memory.cushion.revision }); }}
      reactionBubbleWidth={babyReview ? 164 : undefined} reactionBubbleHeadClearance={babyReview ? 50 : undefined}
      reactionBubble={!quiet && bubble ? <View style={styles.bubble}><Text style={styles.bubbleText}>{bubble}</Text><Pressable accessibilityLabel="말풍선 닫기" hitSlop={9} onPress={() => { ++bubbleToken.current; clearTimeout(bubbleTimer.current); setBubble(''); }} style={styles.bubbleClose}><Text style={styles.bubbleCloseText}>×</Text></Pressable></View> : undefined}
      onPerformanceSummary={x => { perf.current = x; }} performanceCaptureToken={captureToken} performanceCaptureDurationMs={captureDuration} onPerformanceCapture={x => { capture.current = x; }}
      onRuntimeSnapshot={x => { runtime.current = x; }} />
    <View pointerEvents="box-none" style={[styles.header, { top: insets.top + 8 }]}>
      <View><Text style={styles.name}>{pet.givenName}</Text><Text style={styles.level}>Lv.{growth.level}</Text><View style={styles.track}><View style={[styles.progress, { width: `${Math.max(0, Math.min(100, (growth.atFinalLevel ? 1 : growth.expIntoLevelUnits / Math.max(1, growth.expIntoLevelUnits + (growth.expToNextLevelUnits ?? 0))) * 100))}%` }]} /></View></View>
      <Pressable accessibilityLabel="리부트 메뉴 열기" style={styles.menuButton} onPress={() => { setHand(false); setPlacement(false); setMenu('main'); }}><Text>☰</Text></Pressable>
    </View>
    <View style={[styles.bottom, { bottom: insets.bottom + 10, width: artComparison ? '92%' : undefined }]}>
      <Text style={styles.reviewToolLabel}>REBOOT 교감 비교 도구</Text>
      {artComparison && rest.mode === 'awake' ? <View style={{ flexDirection: 'row', gap: 6, width: '100%' }}><Pressable style={[styles.action, styles.compareAction]} accessibilityLabel="A B C 같은 장면 다시 재생" onPress={() => setArtComparison({ ...artComparison, token: token('art'), paused: false })}><Text>다시 재생</Text></Pressable><Pressable style={[styles.action, styles.compareAction]} accessibilityLabel={artComparison.paused ? '비교 장면 계속' : '비교 장면 멈춤'} onPress={() => setArtComparison({ ...artComparison, paused: !artComparison.paused })}><Text>{artComparison.paused ? '계속' : '멈춤'}</Text></Pressable><Pressable style={[styles.action, styles.compareAction]} accessibilityLabel="A B C 비교 끝내기" onPress={() => { cancel(); setArtComparison(undefined); }}><Text>비교 끝</Text></Pressable></View> : rest.mode !== 'awake' ? <Pressable style={styles.action} onPress={restAction} accessibilityLabel={rest.mode === 'hibernating' ? '다시 함께하기' : '깨우기'}><Text>{rest.label} · {rest.mode === 'hibernating' ? '다시 함께하기' : '깨우기'}</Text></Pressable>
        : placement ? <Pressable style={styles.action} onPress={() => setPlacement(false)} accessibilityLabel="쿠션 이동 취소"><Text>빈 바닥에 놓기 · 취소</Text></Pressable>
          : <Pressable style={styles.action} accessibilityLabel={hand ? '손 거두기' : '손 내밀기'} onPress={() => setHand(x => !x)}><Text>{hand ? '손 거두기' : '손 내밀기'}</Text></Pressable>}
    </View>
    {!!error && <View style={[styles.error, { bottom: insets.bottom + 76 }]}><Text accessibilityRole="alert">{error}</Text><Pressable accessibilityLabel="저장 다시 시도" onPress={() => { if (retry.current) void run(retry.current); }}><Text>다시 저장</Text></Pressable></View>}
    <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }]}><View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.sheetHeading}><Text style={styles.heading}>{menu === 'pet' ? '우리 아이' : menu === 'objects' ? '상점·꾸미기' : menu === 'settings' ? '설정' : menu === 'render' ? '렌더 비교' : '우리 방'}</Text><Pressable accessibilityLabel="리부트 패널 닫기" onPress={() => setMenu(null)} style={styles.menuButton}><Text>닫기</Text></Pressable></View>
        <ScrollView contentContainerStyle={{ gap: 10 }}>
          {menu === 'main' && <>{(['pet', 'objects', 'settings'] as const).map((x, i) => <Pressable key={x} style={styles.row} accessibilityLabel={['우리 아이', '상점·꾸미기', '리부트 설정'][i]} onPress={() => setMenu(x)}><Text>{['우리 아이', '상점·꾸미기', '설정'][i]}</Text></Pressable>)}</>}
          {menu === 'pet' && !personalityReview && babyReview && <>
            <Text>REBOOT-03.1 · 선호한 A의 디자인에 Blender 리깅을 더한 C를 비교해요. 기본은 A이며 최종 채택 전이에요.</Text>
            {BABY_ART_CHOICES.map(({ id, label, accessibility }) => <Pressable key={id} accessibilityLabel={accessibility} style={styles.row} onPress={() => { cancel(); setArtCandidate(id); if (artComparison) setArtComparison({ ...artComparison, token: token('art'), paused: false }); setMenu(null); }}><Text>{label}{artCandidate === id ? ' · 비교 중' : ''}</Text></Pressable>)}
            <Text>아래는 같은 동작의 읽기 전용 비교예요. 모자는 화면에서만 잠시 가리며 경험·보상을 기록하지 않아요.</Text>
            {(['all', 'front', 'side', 'back'] as const).map((angle, i) => <Pressable key={angle} accessibilityLabel={`A B C ${['전체 방향', '정면', '측면', '후면'][i]} 비교`} style={styles.row} onPress={() => { cancel(); setArtComparison({ token: token('art'), angle, scene: angle === 'all' ? 'sequence' : artComparison?.scene ?? 'neutral', paused: false }); setMenu(null); }}><Text>{['전체 방향', '정면', '측면', '후면'][i]} 비교</Text></Pressable>)}
            {ART_CASES.map(scene => <Pressable key={scene} accessibilityLabel={`A B C ${ART_LABELS[scene]} 비교`} style={styles.row} onPress={() => { cancel(); setArtComparison({ token: token('art'), angle: artComparison?.angle ?? 'front', scene, paused: false }); setMenu(null); }}><Text>{ART_LABELS[scene]}</Text></Pressable>)}
<Text>아기 아루의 얼굴·움직임 초안이에요. 세 크기는 같은 방에서 비교하며 최종 선택은 아직 하지 않았어요.</Text>
            {BABY_SIZE_CANDIDATES.map(size => <Pressable key={size} accessibilityLabel={`화면 크기 +${Math.round((size - 1) * 100)}% 비교`} style={styles.row} onPress={() => { cancel(); setSizeCandidate(size); if (artComparison) setArtComparison({ ...artComparison, token: token('art'), paused: false }); setMenu(null); }}><Text>+{Math.round((size - 1) * 100)}%{sizeCandidate === size ? ' · 비교 중' : ''}</Text></Pressable>)}
            <Text>실제로 함께한 경험은 같은 아루에게 남아요. 크기 비교는 이름·성격·EXP를 바꾸지 않아요.</Text>
          </>}
          {menu === 'pet' && !personalityReview && !babyReview && <><Text>같은 아이의 제작 후보 세 모습이에요. 비교는 실제 성장·진화·EXP를 바꾸지 않아요.</Text>
            {(['baby', 'growing', 'evolved'] as const).map(stage => <Pressable key={stage} disabled={busy} accessibilityLabel={`${stageName[stage]} 모습 비교`} style={styles.row} onPress={() => selectStage(stage)}><Text>{stageName[stage]}{memory.previewStage === stage ? ' · 보고 있어요' : ''}</Text></Pressable>)}
            <Text>현재 저장 Lv.{growth.level} · {stageName[memory.previewStage]} 제작 후보</Text>
            <Text>실제로 함께한 기억 {memory.events.length}개 · 다른 아이의 기억은 사용하지 않아요.</Text>
            {memory.events.slice(-3).map(x => <Text key={x.eventId}>{x.kind === 'hat_used' ? '모자를 쓰고 움직여 봤어요.' : x.kind === 'cushion_used' ? '지금 쿠션에서 쉬어 봤어요.' : '내민 손에 다가갔다 돌아왔어요.'}</Text>)}
          </>}
          {menu === 'pet' && personalityReview && <>
            <Text>같은 모습과 생활 조건의 검토 아이들이에요. 일반 펫의 성격을 바꾸지 않아요.</Text>
            {PERSONALITY_IDS.map(id => <Pressable key={id} style={styles.row} accessibilityLabel={`REBOOT-04 ${id} profile`} onPress={() => { cancel(); onPersonality?.(id); }}><Text>{PERSONALITY_PROFILES[id].label}{personalityReview===id?' *':''}</Text></Pressable>)}
            <Text>각 아이의 함께한 경험은 따로 남아요. 다음에 열어도 같은 아이를 만나요.</Text>
          </>}
          {menu === 'objects' && <><Text>별도 검토용 모자와 쿠션이에요. 코인 구매·소유권 이전은 없어요.</Text>
            <Pressable disabled={busy || rest.mode !== 'awake'} style={styles.row} accessibilityLabel={memory.hatWorn ? '검토 모자 벗기' : '검토 모자 쓰기'} onPress={wear}><Text>{memory.hatWorn ? '모자 벗기' : '모자 쓰기'}</Text></Pressable>
            <Pressable disabled={rest.mode !== 'awake'} style={styles.row} accessibilityLabel="쿠션 옮기기" onPress={() => { setMenu(null); setPlacement(true); }}><Text>쿠션 옮기기</Text></Pressable>
          </>}
          {menu === 'render' && <>
            <Text>같은 방·빛·카메라의 검토 설정이에요. 최종 설정은 아직 선택하지 않았어요.</Text>
            {VISUAL_QUALITY_CHOICES.filter(x => !x.samples || (runtime.current?.renderer?.maxSamples ?? 0) >= x.samples).map(x => <Pressable key={x.id}
              style={styles.row} accessibilityLabel={`렌더 ${x.id} 선택`} onPress={() => {
                cancel(); setCaptureToken(undefined); capture.current = undefined; perf.current = undefined; runtime.current = undefined;
                setRenderProfile(x.id); if (artComparison) setArtComparison({ ...artComparison, token: token('art'), paused: false }); setMenu(null);
              }}><Text>{x.label}{renderProfile === x.id ? ' · 비교 중' : ''}</Text></Pressable>)}
            <Pressable style={styles.row} accessibilityLabel="자동 렌더 설정 복원" onPress={() => { cancel(); setCaptureToken(undefined); capture.current = undefined; setRenderProfile('automatic'); setMenu(null); }}><Text>기존 자동 설정으로 돌아가기</Text></Pressable>
          </>}
          {menu === 'settings' && <><Text>체험 모드 — 실제 걸음·수면은 연결하지 않았어요. 일반 방과 저장이 분리돼요.</Text>
            {!personalityReview && <Pressable style={styles.row} accessibilityLabel={babyReview ? '이전 REBOOT-01 세 모습 비교' : 'REBOOT-02 아기 검토로 돌아가기'} onPress={() => { cancel(); setArtComparison(undefined); setBabyReview(x => !x); setMenu(null); }}><Text>{babyReview ? '이전 세 모습 비교' : '아기 검토로 돌아가기'}</Text></Pressable>}
            <Pressable style={styles.row} accessibilityLabel={quiet ? '말풍선 켜기' : '말풍선 가리기'} onPress={() => setQuiet(x => !x)}><Text>{quiet ? '말풍선 켜기' : '말풍선 가리기'}</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel={reduced ? '동작 줄이기 끄기' : '동작 줄이기 켜기'} onPress={() => setReduced(x => !x)}><Text>동작 줄이기 {reduced ? '켜짐' : '꺼짐'}</Text></Pressable>
            {babyReview && <Pressable style={styles.row} accessibilityLabel="렌더 품질 비교" onPress={() => setMenu('render')}><Text>렌더 품질 비교</Text></Pressable>}
            <Pressable disabled={busy} style={styles.row} accessibilityLabel={rest.mode === 'awake' ? '잠자기' : rest.mode === 'sleeping' ? '깨우기' : '다시 함께하기'} onPress={restAction}><Text>{rest.mode === 'awake' ? '잠자기' : rest.mode === 'sleeping' ? '깨우기' : '다시 함께하기'}</Text></Pressable>
            <Text>{modelStatus}</Text>
            {!personalityReview && <Pressable style={styles.row} accessibilityLabel={backend === 'A' ? '로컬 검색 B 준비' : '구조화된 기억 A 사용'} onPress={() => { void chooseBackend(); }}><Text>{backend === 'A' ? '로컬 검색 B 준비 / 비교' : '구조화된 기억 A로 비교'}</Text></Pressable>}
            <Pressable style={styles.row} accessibilityLabel="60초 리부트 성능 측정" onPress={() => { setCaptureDuration(60_000); setCaptureToken(token('performance')); setMenu(null); }}><Text>60초 검토 성능 기록</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel="180초 연속 플레이 성능 측정" onPress={() => { setCaptureDuration(180_000); setCaptureToken(token('performance')); setMenu(null); }}><Text>3분 연속 플레이 기록</Text></Pressable>
            <Pressable disabled={storageCheckRunning} style={styles.row} accessibilityLabel="격리 저장 신뢰성 검사" onPress={() => { if(storageCheckActive.current)return;storageCheckActive.current=true;setStorageCheckRunning(true);setEvidenceStatus('격리 저장 복구 검사 중이에요.');void import('../storage/nativeReliabilityCheck').then(x=>x.checkNativeReliability()).then(x=>{
              new File(Paths.cache,'arucon-storage-reliability.json').write(JSON.stringify(x,null,2));setEvidenceStatus('격리 저장 복구 검사를 마쳤어요. 일반 저장은 유지돼요.');
            }).catch(e=>{setError(`격리 저장 검사 실패: ${String(e)}`);setEvidenceStatus(`격리 저장 검사 실패: ${String(e)}`);}).finally(()=>{storageCheckActive.current=false;setStorageCheckRunning(false);}); }}><Text>격리 저장 복구 검사</Text></Pressable>
            <Pressable disabled={storageCheckRunning} style={styles.row} accessibilityLabel="격리 기존 저장 경합 검사" onPress={() => { if(storageCheckActive.current)return;storageCheckActive.current=true;setStorageCheckRunning(true);setEvidenceStatus('격리 경합 검사 중이에요.');void import('../storage/nativeContentionCheck').then(x=>x.checkNativeContention()).then(x=>{
              new File(Paths.cache,'arucon-storage-contention.json').write(JSON.stringify(x,null,2));setEvidenceStatus('격리 경합 검사를 마쳤어요. 일반 저장은 유지돼요.');
            }).catch(e=>{setError(`격리 경합 검사 실패: ${String(e)}`);setEvidenceStatus(`격리 경합 검사 실패: ${String(e)}`);}).finally(()=>{storageCheckActive.current=false;setStorageCheckRunning(false);}); }}><Text>격리 기존 경합 검사</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel="리부트 검토 기록 저장" onPress={exportEvidence}><Text>검토 기록 저장</Text></Pressable>
            {!!evidenceStatus && <Text accessibilityLiveRegion="polite">{evidenceStatus}</Text>}
            <Pressable disabled={busy} style={styles.row} accessibilityLabel="원래 방으로 돌아가기" onPress={() => { cancel(); onExit(); }}><Text>원래 방으로 돌아가기</Text></Pressable>
          </>}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2ebdc' }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2ebdc' },
  header: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 21, fontWeight: '700', color: '#424d61' }, level: { fontSize: 12, color: '#657287', marginTop: 4 },
  track: { width: 104, height: 4, borderRadius: 3, backgroundColor: '#cdd5d8', marginTop: 7 }, progress: { height: 4, borderRadius: 3, backgroundColor: '#869fba' },
  menuButton: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#fffaf0e8' },
  compareAction: { flex: 1, minWidth: 0, paddingHorizontal: 6 },
  bottom: { position: 'absolute', alignSelf: 'center' }, action: { minHeight: 46, minWidth: 140, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#faf6eff0', paddingHorizontal: 16 },
  reviewToolLabel: { fontSize: 10, color: '#7d776f', textAlign: 'center', marginBottom: 4 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingLeft: 12, paddingRight: 4, borderRadius: 18, borderWidth: 1, borderColor: '#eaded4', backgroundColor: '#fff9ed', shadowColor: '#655750', shadowOpacity: .08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  bubbleText: { flexShrink: 1, color: '#514658', fontSize: 14, lineHeight: 19 }, bubbleClose: { width: 26, minHeight: 30, alignItems: 'center', justifyContent: 'center' }, bubbleCloseText: { color: '#a4999f', fontSize: 16 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#18203566', paddingHorizontal: 16 }, sheet: { maxHeight: '80%', borderRadius: 22, backgroundColor: '#fffaf2', padding: 18, gap: 14 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontWeight: '700', fontSize: 20, color: '#424d61' },
  row: { minHeight: 48, padding: 13, borderRadius: 13, backgroundColor: '#e7ebec', justifyContent: 'center' }, error: { position: 'absolute', left: 20, right: 20, padding: 12, borderRadius: 12, backgroundColor: '#f6dedb' },
});

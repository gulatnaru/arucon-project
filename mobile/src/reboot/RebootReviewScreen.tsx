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
import { eligibleMemories, hatReaction, REBOOT_ITEM, type RebootCommand, type RebootEvent, type RebootSnapshot, type RebootStage } from './contracts';
import type { FloorPoint } from '../scene/types';
import type { RoomPerformanceCapture, RoomPerformanceSummary } from '../scene/performanceProbe';
import { RebootSemanticQueue } from './semantic';
import { nativeEmbeddingPort } from './nativeEmbedding';

const PET_ID = 'reboot-01:main';
const stageName: Record<RebootStage, string> = { baby: '아기', growing: '성장기', evolved: '1차 진화 후' };
type Menu = 'main' | 'pet' | 'objects' | 'settings' | null;
type CommandResult = { state?: PetState; memory?: RebootSnapshot; command?: RebootCommand };

export function RebootReviewScreen({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<PetState | null>(null), [memory, setMemory] = useState<RebootSnapshot | null>(null);
  const [menu, setMenu] = useState<Menu>(null), [hand, setHand] = useState(false), [placement, setPlacement] = useState(false);
  const [command, setCommand] = useState<RebootCommand>(), [bubble, setBubble] = useState('');
  const [quiet, setQuiet] = useState(false), [reduced, setReduced] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [captureToken, setCaptureToken] = useState<string>();
  const [backend, setBackend] = useState<'A' | 'B'>('A'), [modelStatus, setModelStatus] = useState('A · 구조화된 실제 기억');
  const backendRef = useRef<'A' | 'B'>('A');
  const service = useRef<ApprovedMvpService | null>(null), memories = useRef<RebootMemoryStore | null>(null);
  const latest = useRef({ pet, memory }), alive = useRef(true), sequence = useRef(0), epoch = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve()), retry = useRef<(() => Promise<CommandResult>) | null>(null);
  const activeIntent = useRef<RebootEvent | null>(null), trace = useRef<object[]>([]);
  const perf = useRef<RoomPerformanceSummary | undefined>(undefined), capture = useRef<RoomPerformanceCapture | undefined>(undefined);
  const semantic = useRef(new RebootSemanticQueue(null));
  const token = useCallback((kind: string) => `reboot:${PET_ID}:${kind}:${Date.now()}:${++sequence.current}`, []);
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
  const cancel = useCallback(() => { epoch.current++; semantic.current.cancel(); setHand(false); setCommand(undefined); setBubble(''); }, []);
  useEffect(() => {
    alive.current = true;
    const requestEpoch = epoch, modelQueue = semantic.current;
    void run(async () => {
      const db = expoSqliteConnection(await openAruconDatabase('arucon-reboot-review.db'));
      const game = await ApprovedMvpService.initialize(db, { petId: PET_ID, givenName: '아루', personalityProfileId: 'reserved', createdAtMs: Date.now() });
      const store = new RebootMemoryStore(db, PET_ID), snapshot = await store.load();
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
    return () => { alive.current = false; requestEpoch.current++; modelQueue.cancel(); subscription.remove(); clearInterval(tick); };
  }, [cancel, now, run]);

  const onEvent = useCallback((event: RebootEvent) => {
    if (!alive.current) return;
    trace.current.push({ ...event, atMs: Date.now() }); trace.current = trace.current.slice(-160);
    if (event.phase === 'start') activeIntent.current = event;
    if (event.phase === 'cancel' || event.phase === 'complete') {
      if (activeIntent.current?.token === event.token) activeIntent.current = null;
    }
    if (event.phase === 'contact' && !event.automatic) {
      const known = latest.current.memory?.events.some(x => x.kind === 'hand');
      setBubble(event.kind === 'hand' ? event.stage === 'baby' ? '조금만 가까이.' : event.stage === 'growing' ? '가만히 있어 봐.' : known ? '그 손, 알아.' : '여기 기대도 돼?'
        : event.kind === 'hat_first' ? '이건 처음 보네.' : event.kind === 'hat_again' ? '이제 잘 맞네.' : event.kind === 'hat_busy' ? '잠깐만 쓰고 갈게.' : '자리가 달라졌네.');
    }
    if (event.phase !== 'complete' || !memories.current) return;
    setBubble('');
    const kind = event.kind.startsWith('hat') ? 'hat_used' : ['rest', 'cushion_changed'].includes(event.kind) ? 'cushion_used' : event.kind === 'hand' ? 'hand' : null;
    if (!kind) return;
    const captured = latest.current.memory;
    if (!captured) return;
    void run(async () => ({ memory: await memories.current!.complete({ petId: PET_ID, eventId: event.token, kind,
      itemId: kind === 'hat_used' ? REBOOT_ITEM.hat : kind === 'cushion_used' ? REBOOT_ITEM.cushion : 'user:hand',
      atMs: Date.now(), completed: true, stage: event.stage, context: event.kind,
      ...(kind === 'cushion_used' ? { itemRevision: event.itemRevision ?? captured.cushion.revision, position: { x: captured.cushion.x, z: captured.cushion.z } } : {}),
    }, event.sourceRevision) }));
  }, [run]);

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
        ...(prior && ['explore', 'dash', 'stretch'].includes(prior.kind) ? { resume: prior.kind as 'explore' | 'dash' | 'stretch' } : {}) } };
    });
  };
  const moveCushion = (point: FloorPoint) => {
    if (!memories.current || !latest.current.memory) return;
    const before = latest.current.memory, request = token('cushion'), requestEpoch = ++epoch.current; setPlacement(false); setHand(false);
    void run(async () => {
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
    const request = token(rest.mode); cancel(); setMenu(null);
    void run(async () => ({ state: rest.mode === 'hibernating' ? (await service.current!.returnToForeground(now())).state
      : rest.mode === 'sleeping' ? await service.current!.wake(now(), request) : await service.current!.sleep(now(), request) }));
  };
  const exportEvidence = () => {
    try { new File(Paths.cache, 'arucon-reboot-evidence.json').write(JSON.stringify({ build: 'reboot-01-v3',
      pet: latest.current.pet, memory: latest.current.memory, trace: trace.current, performance: perf.current, capture: capture.current,
      ai: { backend: backendRef.current, status: modelStatus, realVectorsUsed: trace.current.some(x => 'decision' in x && (x as { decision?: { backend?: string } }).decision?.backend === 'B_REAL') } }, null, 2)); setBubble('검토 기록을 기기 안에 저장했어요.'); }
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
  return <View style={styles.root}>
    <AruconRoom rebootView={{ stage: memory.previewStage, hatWorn: memory.hatWorn, revision: memory.revision,
      cushion: memory.cushion, handOffered: hand, command }} onRebootEvent={onEvent}
      livingEnabled={false} tableInstalled={false} toiletInstalled={pet.toiletInstalled} cushionVisible ballVisible={false}
      formId={pet.formId} restMode={rest.mode} reducedMotion={reduced} interactionEnabled={menu === null}
      topOcclusion={insets.top + 78} bottomOcclusion={insets.bottom + 70}
      rebootPlacement={placement} onRebootPlacement={moveCushion}
      onInteractionIntent={kind => { if (kind === 'pet' || kind === 'move') { setHand(false); setBubble(''); } }}
      onPetTouch={() => { const id = token('touch'); void run(async () => ({ state: await service.current!.interact(now(), id, 'touch', utcFixtureDay(now()).id) })); }}
      onStatus={setBubble} onFurnitureHit={kind => { if (kind === 'cushion') setCommand({ token: token('rest'), kind: 'rest', sourceRevision: memory.revision, target: memory.cushion, itemRevision: memory.cushion.revision }); }}
      reactionBubble={!quiet && bubble ? <View style={styles.bubble}><Text style={styles.bubbleText}>{bubble}</Text><Pressable accessibilityLabel="말풍선 닫기" onPress={() => setBubble('')}><Text>×</Text></Pressable></View> : undefined}
      onPerformanceSummary={x => { perf.current = x; }} performanceCaptureToken={captureToken} onPerformanceCapture={x => { capture.current = x; }} />
    <View pointerEvents="box-none" style={[styles.header, { top: insets.top + 8 }]}>
      <View><Text style={styles.name}>{pet.givenName}</Text><Text style={styles.level}>Lv.{growth.level} · 검토</Text><View style={styles.track}><View style={[styles.progress, { width: `${Math.max(0, Math.min(100, (growth.atFinalLevel ? 1 : growth.expIntoLevelUnits / Math.max(1, growth.expIntoLevelUnits + (growth.expToNextLevelUnits ?? 0))) * 100))}%` }]} /></View></View>
      <Pressable accessibilityLabel="리부트 메뉴 열기" style={styles.menuButton} onPress={() => { setHand(false); setPlacement(false); setMenu('main'); }}><Text>☰</Text></Pressable>
    </View>
    <View style={[styles.bottom, { bottom: insets.bottom + 10 }]}>
      {rest.mode !== 'awake' ? <Pressable style={styles.action} onPress={restAction} accessibilityLabel={rest.mode === 'hibernating' ? '다시 함께하기' : '깨우기'}><Text>{rest.label} · {rest.mode === 'hibernating' ? '다시 함께하기' : '깨우기'}</Text></Pressable>
        : placement ? <Pressable style={styles.action} onPress={() => setPlacement(false)} accessibilityLabel="쿠션 이동 취소"><Text>빈 바닥에 놓기 · 취소</Text></Pressable>
          : <Pressable style={styles.action} accessibilityLabel={hand ? '손 거두기' : '손 내밀기'} onPress={() => setHand(x => !x)}><Text>{hand ? '손 거두기' : '손 내밀기'}</Text></Pressable>}
    </View>
    {!!error && <View style={[styles.error, { bottom: insets.bottom + 76 }]}><Text accessibilityRole="alert">{error}</Text><Pressable accessibilityLabel="저장 다시 시도" onPress={() => { if (retry.current) void run(retry.current); }}><Text>다시 저장</Text></Pressable></View>}
    <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }]}><View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.sheetHeading}><Text style={styles.heading}>{menu === 'pet' ? '우리 아이' : menu === 'objects' ? '상점·꾸미기' : menu === 'settings' ? '설정' : '우리 방'}</Text><Pressable accessibilityLabel="리부트 패널 닫기" onPress={() => setMenu(null)} style={styles.menuButton}><Text>닫기</Text></Pressable></View>
        <ScrollView contentContainerStyle={{ gap: 10 }}>
          {menu === 'main' && <>{(['pet', 'objects', 'settings'] as const).map((x, i) => <Pressable key={x} style={styles.row} accessibilityLabel={['우리 아이', '상점·꾸미기', '리부트 설정'][i]} onPress={() => setMenu(x)}><Text>{['우리 아이', '상점·꾸미기', '설정'][i]}</Text></Pressable>)}</>}
          {menu === 'pet' && <><Text>같은 아이의 제작 후보 세 모습이에요. 비교는 실제 성장·진화·EXP를 바꾸지 않아요.</Text>
            {(['baby', 'growing', 'evolved'] as const).map(stage => <Pressable key={stage} disabled={busy} accessibilityLabel={`${stageName[stage]} 모습 비교`} style={styles.row} onPress={() => selectStage(stage)}><Text>{stageName[stage]}{memory.previewStage === stage ? ' · 보고 있어요' : ''}</Text></Pressable>)}
            <Text>현재 저장 Lv.{growth.level} · {stageName[memory.previewStage]} 제작 후보</Text>
            <Text>실제로 함께한 기억 {memory.events.length}개 · 다른 아이의 기억은 사용하지 않아요.</Text>
            {memory.events.slice(-3).map(x => <Text key={x.eventId}>{x.kind === 'hat_used' ? '모자를 쓰고 움직여 봤어요.' : x.kind === 'cushion_used' ? '지금 쿠션에서 쉬어 봤어요.' : '내민 손에 다가갔다 돌아왔어요.'}</Text>)}
          </>}
          {menu === 'objects' && <><Text>별도 검토용 모자와 쿠션이에요. 코인 구매·소유권 이전은 없어요.</Text>
            <Pressable disabled={busy || rest.mode !== 'awake'} style={styles.row} accessibilityLabel={memory.hatWorn ? '검토 모자 벗기' : '검토 모자 쓰기'} onPress={wear}><Text>{memory.hatWorn ? '모자 벗기' : '모자 쓰기'}</Text></Pressable>
            <Pressable disabled={rest.mode !== 'awake'} style={styles.row} accessibilityLabel="쿠션 옮기기" onPress={() => { setMenu(null); setPlacement(true); }}><Text>쿠션 옮기기</Text></Pressable>
          </>}
          {menu === 'settings' && <><Text>체험 모드 — 실제 걸음·수면은 연결하지 않았어요. 일반 방과 저장이 분리돼요.</Text>
            <Pressable style={styles.row} accessibilityLabel={quiet ? '말풍선 켜기' : '말풍선 가리기'} onPress={() => setQuiet(x => !x)}><Text>{quiet ? '말풍선 켜기' : '말풍선 가리기'}</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel={reduced ? '동작 줄이기 끄기' : '동작 줄이기 켜기'} onPress={() => setReduced(x => !x)}><Text>동작 줄이기 {reduced ? '켜짐' : '꺼짐'}</Text></Pressable>
            <Pressable disabled={busy} style={styles.row} accessibilityLabel={rest.mode === 'awake' ? '잠자기' : rest.mode === 'sleeping' ? '깨우기' : '다시 함께하기'} onPress={restAction}><Text>{rest.mode === 'awake' ? '잠자기' : rest.mode === 'sleeping' ? '깨우기' : '다시 함께하기'}</Text></Pressable>
            <Text>{modelStatus}</Text>
            <Pressable style={styles.row} accessibilityLabel={backend === 'A' ? '로컬 검색 B 준비' : '구조화된 기억 A 사용'} onPress={() => { void chooseBackend(); }}><Text>{backend === 'A' ? '로컬 검색 B 준비 / 비교' : '구조화된 기억 A로 비교'}</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel="60초 리부트 성능 측정" onPress={() => { setCaptureToken(token('performance')); setMenu(null); }}><Text>60초 검토 성능 기록</Text></Pressable>
            <Pressable style={styles.row} accessibilityLabel="리부트 검토 기록 저장" onPress={exportEvidence}><Text>검토 기록 저장</Text></Pressable>
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
  bottom: { position: 'absolute', alignSelf: 'center' }, action: { minHeight: 46, minWidth: 140, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#faf6eff0', paddingHorizontal: 16 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: '#fff9ed' }, bubbleText: { flexShrink: 1, color: '#424d61', fontSize: 15 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#18203566', paddingHorizontal: 16 }, sheet: { maxHeight: '80%', borderRadius: 22, backgroundColor: '#fffaf2', padding: 18, gap: 14 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontWeight: '700', fontSize: 20, color: '#424d61' },
  row: { minHeight: 48, padding: 13, borderRadius: 13, backgroundColor: '#e7ebec', justifyContent: 'center' }, error: { position: 'absolute', left: 20, right: 20, padding: 12, borderRadius: 12, backgroundColor: '#f6dedb' },
});

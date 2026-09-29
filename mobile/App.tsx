import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, KeyboardAvoidingView, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import { AruconRoom } from './src/scene/AruconRoom';
import { DevOnboardingScreen } from './src/onboarding/DevOnboardingScreen';
import type { DevPetPreview } from './src/onboarding/devOnboarding';
import { ApprovedMvpService, type ApprovedActivityReceipt } from './src/application/approvedMvpService';
import {
  createLocalSyntheticSyncController, SyntheticAuthorityUnavailableError, type LocalSyntheticSyncController,
} from './src/application/syntheticSyncController';
import type { JournalEntry } from './src/application/devLifeService';
import { confirmedMealCue, type MealCue, type MealCuePolicy } from './src/application/mealCue';
import { DevInputRejected, monotonicDevTime, retryStableSyntheticWalk, utcFixtureDay } from './src/application/devClock';
import { APPROVED_GAME_CONFIG } from './src/domain/config';
import { APPROVED_MVP_POLICY } from './src/config/approvedMvpPolicy';
import { DomainActionRejected } from './src/domain/engine';
import { initialPet, type PetState } from './src/domain/model';
import { LocalPetStore, expoSqliteConnection, type SqlConnection } from './src/storage/sqlite';
import { openAruconDatabase, readExperienceProfile, saveExperienceProfile, type RoomProfile } from './src/storage/appDatabase';
import type { SyncStatusViewModel } from './src/sync/status';
import { ReadOnlyWriterError, WriterRegistrationRequiredError } from './src/sync/writeGuard';
import { approvedLocalExpoNativeWidgetBridge } from './src/native/aruconWidgetModule';
import { FailClosedNativeWidgetAdapter } from './src/native/widget';
import { selectFormPresentation } from './src/scene/formPresentation';
import { type LifeRoomAction } from './src/presentation/LifeRoomControls';
import { EXPERIENCE, EXPERIENCE_SCENARIOS, prepareExperience, experiencePetId, parseExperienceProfile, type ExperienceScenario } from './src/living/experience';
import { chooseLifeLine, emptyLifeMemory, rememberLifeCompletion, lifePreference, LIFE_SCENE_NAMES, type LifeMemory } from './src/living/content';
import { LifeMemoryStore } from './src/living/memory';
import type { LifeCommand, LifeEvent, LifeInput, LifeScene } from './src/living/life';
import { committedToiletScene } from './src/living/committedLife';
import { growthExpression } from './src/living/growthExpression';
import { ApprovedFixturePanel, type ApprovedFixtureAction } from './src/presentation/ApprovedFixturePanel';
import { ApprovedStatusPanel } from './src/presentation/ApprovedStatusPanel';
import {
  FunEvaluationPanel,
  type EvaluationScenario,
  type FunEvaluationState,
} from './src/presentation/FunEvaluationPanel';
import {
  approvedSyntheticSleepFixture, drainLocalSyntheticSync, ownedRoomAffordances, syncStatusText, utcTimestampText,
} from './src/presentation/approvedPresentation';
import { JournalPanel } from './src/presentation/JournalPanel';
import { ReactionOverlay } from './src/presentation/ReactionOverlay';
import { cleanAvailability, cleanAvailabilityText, cleanSuccessText } from './src/presentation/cleanPresentation';
import {
  confirmedGrowthReactionCue,
  splitReactionCommands,
  type ReactionDialogueView,
} from './src/presentation/reactionPresentation';
import { ReactionRuntime, type ReactionMemoryWriter } from './src/presentation/reactionRuntime';
import {
  createGrowthComparisonFixture,
  emptyReactionMemory,
  type PresentationCommand,
  type ReactionEvidence,
  type ReactionMemorySnapshot,
  type ReactionTrigger,
} from './src/reactions';
import { APPROVED_GROWTH_POLICY, projectGrowth } from './src/progression/projection';
import { openReactionFixtureMemoryRepository, openReactionMemoryRepository } from './src/storage/reactionMemory';
import type { RoomPerformanceSummary } from './src/scene/performanceProbe';
import type { RoomRendererProfileId } from './src/scene/rendererConfig';

const PET_ID = 'dev-local-pet-1';
const PREVIEW_ACCOUNT_ID = 'dev-preview-account';
const PREVIEW_DEVICE_ID = 'dev-preview-device';
const EVALUATION_PET_ID = 'fun00-fixture-pet';
const EVALUATION_FIXTURE_ID = 'fun00_evaluation';
const LOCAL_WIDGET = new FailClosedNativeWidgetAdapter(approvedLocalExpoNativeWidgetBridge, true);

type AppMealCuePolicy = { mode: MealCue['mode']; atMs?: () => number | null };
type AppTaskResult = PetState | ApprovedActivityReceipt | void;
type AppGrowthCue = Extract<ReactionEvidence, { kind: 'committed_growth' }>;
type RoomReactionCommand = Exclude<PresentationCommand, { type: 'show_dialogue' }>;
type RoomReactionBatch = Readonly<{ token: string; commands: readonly RoomReactionCommand[] }>;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function actionRejectionText(error: DomainActionRejected): string {
  switch (error.code) {
    case 'no_food': return '먹이가 아직 없어요. 합성 활동으로 먹이를 얻을 수 있어요.';
    case 'not_hungry': return '지금은 배가 고프지 않아요.';
    case 'sleeping': return '쉬는 중에는 먹지 않아요.';
    case 'hibernating': return '동면 중이에요. 앱으로 돌아온 뒤 다시 해 주세요.';
    case 'table_required': return '자동급식에는 코인 상점에서 구입한 식탁이 필요해요.';
    case 'auto_feed_disabled': return '자동급식 설정을 확인해 주세요.';
    case 'stale_meal_state': return '상태가 바뀌었어요. 다시 확인해 주세요.';
  }
}

function resultState(result: AppTaskResult): PetState | undefined {
  if (!result) return undefined;
  return 'state' in result ? result.state : result;
}

function growthSummary(view: Awaited<ReturnType<ApprovedMvpService['readGrowthView']>>): string {
  const { projection } = view;
  const form = view.form?.formId ?? view.state.formId;
  const sex = view.sex === 'female' ? '암컷' : view.sex === 'male' ? '수컷' : '성장 중';
  const formPresentation = selectFormPresentation(form);
  const exp = (view.state.totalExpUnits / APPROVED_GROWTH_POLICY.expScale).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const bonus = Math.round((view.state.sleepGrowthMultiplier - 1) * 1000) / 10;
  return `Lv.${projection.level} · ${formPresentation.displayName} 모습 · ${sex}\n쌓인 성장 ${exp} EXP · 수면 보너스 +${bonus}%`;
}

function AppContent({ profile, onProfile }: { profile: RoomProfile; onProfile: (value: RoomProfile) => void }) {
  const experience = profile !== 'original';
  const selected = parseExperienceProfile(profile);
  const scenario = selected?.scenario ?? 'normal';
  const runKey = selected?.runKey;
  const petId = experience ? experiencePetId(scenario, runKey) : PET_ID;
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [phase, setPhase] = useState<'loading' | 'onboarding' | 'room' | 'load_error'>('loading');
  const [pet, setPet] = useState<PetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [memoryWarning, setMemoryWarning] = useState<string | null>(null);
  const [growthWarning, setGrowthWarning] = useState<string | null>(null);
  const [growthNotice, setGrowthNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [fixtureVisible, setFixtureVisible] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mealCue, setMealCue] = useState<MealCue | null>(null);
  const [growthCue, setGrowthCue] = useState<AppGrowthCue | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [topHeight, setTopHeight] = useState(72);
  const [controlsHeight, setControlsHeight] = useState(130);
  const [evaluationHeight, setEvaluationHeight] = useState(280);
  const [runtimeBadge, setRuntimeBadge] = useState('로컬 미리보기 · 건강 연결 꺼짐');
  const [migrationNotice, setMigrationNotice] = useState('로컬 저장 상태 확인 중');
  const [syncStatus, setSyncStatus] = useState<SyncStatusViewModel | null>(null);
  const [syncRuntimeNotice, setSyncRuntimeNotice] = useState('합성 동기화 준비 상태 확인 중');
  const [growthText, setGrowthText] = useState('성장 상태 확인 중');
  const [widgetText, setWidgetText] = useState('위젯 마지막 확인 시각 확인 중');
  const [ownedItems, setOwnedItems] = useState<readonly string[]>([]);
  const [writerMode, setWriterMode] = useState<'active_writer' | 'read_only_fenced'>('active_writer');
  const [rendererProfileId, setRendererProfileId] = useState<RoomRendererProfileId>('automatic');
  const [reactionDialogue, setReactionDialogue] = useState<ReactionDialogueView | null>(null);
  const [reactionPresentation, setReactionPresentation] = useState<RoomReactionBatch | undefined>();
  const [reduceDialogue, setReduceDialogue] = useState(false);
  const [evaluation, setEvaluation] = useState<FunEvaluationState | null>(null);
  const [menu, setMenu] = useState<'menu' | 'play' | 'food' | 'decor' | 'settings' | 'details' | null>(null);
  const [experienceName, setExperienceName] = useState('');
  const [experiencePersonality, setExperiencePersonality] = useState<'reserved' | 'expressive'>('reserved');
  const [lifeCommand, setLifeCommand] = useState<LifeCommand>();
  const [lifeDialogue, setLifeDialogue] = useState<ReactionDialogueView | null>(null);
  const [game, setGame] = useState<'ball' | 'peek' | 'gesture' | null>(null);
  const lifeMemoryRef = useRef<LifeMemory>(emptyLifeMemory(petId));
  const lifeStoreRef = useRef<LifeMemoryStore | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGrowthRef = useRef<string | null>(null);
  const lifeTraceRef = useRef<unknown[]>([]);
  const autoSpeechAfterRef = useRef(0);
  const databaseRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const connectionRef = useRef<SqlConnection | null>(null);
  const serviceRef = useRef<ApprovedMvpService | null>(null);
  const syncControllerRef = useRef<LocalSyntheticSyncController | null>(null);
  const petRef = useRef<PetState | null>(null);
  const retryRef = useRef<(() => Promise<AppTaskResult>) | null>(null);
  const pendingLifecycleRef = useRef<(() => Promise<AppTaskResult>) | null>(null);
  const runTaskRef = useRef<(task: () => Promise<AppTaskResult>) => Promise<void>>(async () => undefined);
  const busyRef = useRef(false);
  const bootingRef = useRef(false);
  const clockRef = useRef(0);
  const sequenceRef = useRef(0);
  const performanceSummaryRef = useRef<RoomPerformanceSummary | null>(null);
  const reactionRuntimeRef = useRef<ReactionRuntime | null>(null);
  const reactionRuntimeGenerationRef = useRef(0);
  const reactionBatchSequenceRef = useRef(0);
  const mealReactionTokenRef = useRef<string | null>(null);
  const growthReactionTokenRef = useRef<string | null>(null);
  const growthMealTokenRef = useRef<string | null>(null);

  const cancelLifeBubble = useCallback(() => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = null;
    setLifeDialogue(null);
  }, []);
  const lifeInput = useCallback((kind: LifeInput, replay = false) => {
    cancelLifeBubble();
    setLifeCommand({ kind, replay, token: `life:${Date.now()}:${++sequenceRef.current}` });
  }, [cancelLifeBubble]);
  const persistLife = useCallback(() => {
    void lifeStoreRef.current?.save(lifeMemoryRef.current).then(() => setMemoryWarning(null)).catch(() => {
      setMemoryWarning('최근 놀이 기억을 저장하지 못했어요. 게임 저장과 교감은 계속할 수 있어요.');
    });
  }, []);
  const showLifeLine = useCallback((scene: LifeScene, automatic: boolean, replay = false) => {
    const state = petRef.current;
    if (!state) return;
    if (reduceDialogue && automatic && scene !== 'offer') return;
    if (automatic && Date.now() < autoSpeechAfterRef.current) return;
    const memory = replay ? { ...lifeMemoryRef.current } : lifeMemoryRef.current;
    const chosen = chooseLifeLine(memory, scene, state.personalityProfileId === 'expressive' ? 'expressive' : 'reserved', Date.now(), automatic, Math.random, undefined,
      state.food <= 0 ? 'no_food' : !state.tableInstalled ? 'no_table' : !state.autoFeedOptIn ? 'manual' : 'ready');
    if (!chosen) return;
    lifeTraceRef.current = [...lifeTraceRef.current, { scene, lineId: chosen.id, eligible: chosen.eligible, excludedRecent: chosen.excludedRecent, automatic, replay, kind: 'shown', atMs: Date.now() }].slice(-64);
    cancelLifeBubble();
    const hasCushion = ownedRoomAffordances(ownedItems).cushionVisible;
    setLifeDialogue({ text: chosen.text, choices: scene === 'offer' ? [{ id: 'roll', label: '굴려 주기' }, { id: hasCushion ? 'rest' : 'company', label: '같이 쉬기' }] : [] });
    bubbleTimerRef.current = setTimeout(cancelLifeBubble, scene === 'offer' ? 18_000 : Math.max(3500, chosen.text.length * 180));
    if (!replay) persistLife();
  }, [cancelLifeBubble, ownedItems, persistLife, reduceDialogue]);
  const onLifeEvent = useCallback((event: LifeEvent) => {
    lifeTraceRef.current = [...lifeTraceRef.current, { ...event, atMs: Date.now() }].slice(-64);
    if (event.phase === 'perform' && event.scene !== 'offer') showLifeLine(event.scene, event.automatic, event.replay);
    if (event.phase === 'waiting') showLifeLine(event.scene, event.automatic, event.replay);
    if (event.phase === 'complete') {
      if (!event.replay) { rememberLifeCompletion(lifeMemoryRef.current, event.scene, Date.now()); persistLife(); }
      if (event.scene === 'meal') setMealCue(current => event.commandToken === `meal:${current?.token}` ? null : current);
      if (!event.replay && event.scene === 'meal' && pendingGrowthRef.current === event.commandToken) { pendingGrowthRef.current = null; lifeInput('growth'); }
    }
    if (event.phase === 'cancel') {
      cancelLifeBubble();
      if (event.scene === 'meal') {
        setMealCue(current => event.commandToken === `meal:${current?.token}` ? null : current);
        if (pendingGrowthRef.current === event.commandToken) pendingGrowthRef.current = null;
      }
    }
  }, [cancelLifeBubble, lifeInput, persistLife, showLifeLine]);
  const openMenu = useCallback((next: typeof menu) => {
    reactionRuntimeRef.current?.cancel('scene_change');
    lifeInput('cancel'); setGame(null); setMenu(next);
  }, [lifeInput]);

  const createReactionRuntime = useCallback((memory: ReactionMemorySnapshot, writer?: ReactionMemoryWriter) => new ReactionRuntime({
      memory,
      writer,
      onCommands: (commands, session) => {
        const batch = splitReactionCommands(commands);
        if (batch.visualCommands.length) {
          setReactionPresentation({
            token: `${session.id}:${++reactionBatchSequenceRef.current}`,
            commands: batch.visualCommands,
          });
        }
        if (batch.dialogue !== undefined) setReactionDialogue(batch.dialogue);
      },
      onSelection: dispatched => {
        if (memory.source !== 'fixture') return;
        const explanation = dispatched.selection.explanation;
        const text = `선택 ${explanation.selectedId} · 후보 ${explanation.eligible.length}/${explanation.considered}` +
          `${explanation.usedRepeatOverride ? ' · 반복 제한 대안 없음' : ''}` +
          `${explanation.usedSafeFallback ? ' · 안전 기본 반응' : ''}`;
        setPreview(current => current?.startsWith('합성 성장 비교') ? `${current}\n${text}` : text);
      },
      onMemoryError: error => {
        setNotice(`반응 기억을 저장하지 못했어요. 게임 진행은 유지됩니다. (${errorText(error)})`);
      },
    }), []);

  const installReactionRuntime = useCallback(async (petId: string) => {
    const generation = ++reactionRuntimeGenerationRef.current;
    reactionRuntimeRef.current?.dispose();
    let writer: Awaited<ReturnType<typeof openReactionMemoryRepository>> | undefined;
    let memory = emptyReactionMemory(petId);
    try {
      writer = await openReactionMemoryRepository();
      memory = await writer.load(petId);
    } catch (error) {
      setNotice(`반응 기억을 열지 못해 이번 화면에서만 이어가요. 게임 저장은 유지됩니다. (${errorText(error)})`);
    }
    if (generation === reactionRuntimeGenerationRef.current) reactionRuntimeRef.current = createReactionRuntime(memory, writer);
  }, [createReactionRuntime]);

  const publish = useCallback((state: PetState) => {
    if (!petRef.current || state.revision >= petRef.current.revision) {
      petRef.current = state;
      clockRef.current = Math.max(clockRef.current, state.lastSimulatedAtMs);
      setPet(state);
    }
  }, []);

  const serviceTime = useCallback(() => monotonicDevTime(Date.now(), clockRef.current, petRef.current?.lastSimulatedAtMs ?? 0), []);
  const actionId = useCallback((kind: string) => `ui:${Date.now()}:${++sequenceRef.current}:${Math.random().toString(36).slice(2)}:${kind}`, []);

  const refreshReadModels = useCallback(async (service: ApprovedMvpService, observedAtMs: number) => {
    const [growth, widget, status, ownership] = await Promise.all([
      service.readGrowthView(),
      service.readWidgetProjection(observedAtMs),
      syncControllerRef.current?.status() ?? Promise.resolve(null),
      service.readOwnedItemKeys(),
    ]);
    setOwnedItems(ownership);
    setGrowthText(growthSummary(growth));
    const widgetPublish = experience ? 'unsupported' : await LOCAL_WIDGET.publish(widget);
    const publishText = widgetPublish === 'requested' ? 'OS 새로고침 요청됨' : widgetPublish === 'deferred' ? 'OS 새로고침 지연됨'
      : widgetPublish === 'unsupported' ? '현재 빌드에서 위젯 모듈 없음' : '위젯 저장/요청 오류';
    setWidgetText(`위젯 마지막 확인 ${utcTimestampText(widget.updatedAtMs)} · ${publishText} · OS 실시간 상태 아님`);
    if (status) {
      setSyncStatus(status);
      setWriterMode(status.writerAccess);
    }
  }, [experience]);

  const runTask = useCallback(async (task: () => Promise<AppTaskResult>, cue?: AppMealCuePolicy, quiet = false, allowLifeProjection = true) => {
    if (busyRef.current) return;
    setNotice('');
    busyRef.current = true;
    if (!quiet) setBusy(true);
    try {
      const beforeState = petRef.current;
      const beforeExp = petRef.current?.totalExpUnits ?? 0;
      const result = await task();
      let state = resultState(result);
      if (state && beforeState && state.petId === beforeState.petId && state.totalExpUnits > beforeExp && serviceRef.current) {
        try {
          state = (await serviceRef.current.resolveEligibleGrowth(Math.random)).state;
          setGrowthWarning(null);
        } catch { setGrowthWarning('식사는 저장됐지만 성장 결과를 확인하지 못했어요. 다시 확인할 수 있어요.'); }
        const before = projectGrowth(beforeExp, APPROVED_GROWTH_POLICY);
        const after = projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY);
        if (before.level !== after.level || beforeState?.formId !== state.formId) {
          const shape = beforeState?.formId !== state.formId ? ` · ${selectFormPresentation(state.formId).displayName}의 새 모습` : '';
          setGrowthNotice(`Lv.${before.level} → Lv.${after.level}${shape}`);
        } else setGrowthNotice(`식사로 +${((state.totalExpUnits - beforeExp) / APPROVED_GROWTH_POLICY.expScale).toLocaleString('ko-KR', { maximumFractionDigits: 6 })} EXP · Lv.${after.level}`);
      }
      if (state) publish(state);
      if (allowLifeProjection && state && beforeState && AppState.currentState === 'active') {
        const toiletToken = committedToiletScene(beforeState, state);
        if (toiletToken) setLifeCommand({ token: toiletToken, kind: 'toilet' });
      }
      if (allowLifeProjection && state && beforeState && state.petId === beforeState.petId && state.totalExpUnits > beforeExp && serviceRef.current) {
        try {
          const entries = await serviceRef.current.readJournal();
          const policy: MealCuePolicy = { mode: cue?.mode ?? 'auto', atMs: cue?.atMs?.() ?? state.lastSimulatedAtMs,
            sinceMs: beforeState?.lastSimulatedAtMs };
          const confirmed = confirmedMealCue(beforeExp, state.totalExpUnits, entries, policy, petId);
          if (confirmed) {
            setMealCue(confirmed);
            const growth = confirmedGrowthReactionCue(
              confirmed.token, state.lastSimulatedAtMs, beforeExp, state.totalExpUnits,
            );
            if (growth) {
              growthMealTokenRef.current = confirmed.token;
              setGrowthCue(growth);
            }
          }
        } catch { /* A visual cue must never turn a committed meal into a failed command. */ }
      }
      if (serviceRef.current && (!quiet || (state && state.totalExpUnits > beforeExp))) await refreshReadModels(serviceRef.current, state?.lastSimulatedAtMs ?? serviceTime());
      retryRef.current = null;
      setFailure(null);
    } catch (error) {
      if (error instanceof DomainActionRejected || error instanceof DevInputRejected ||
          error instanceof ReadOnlyWriterError || error instanceof WriterRegistrationRequiredError ||
          error instanceof SyntheticAuthorityUnavailableError) {
        try {
          const latest = await serviceRef.current?.currentState();
          if (latest) publish(latest);
          retryRef.current = null;
          setFailure(null);
          setNotice(error instanceof DomainActionRejected ? actionRejectionText(error) : error.message);
        } catch (reloadError) {
          retryRef.current = task;
          setFailure(errorText(reloadError));
        }
      } else {
        retryRef.current = task;
        setFailure(errorText(error));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (!retryRef.current && pendingLifecycleRef.current) {
        const next = pendingLifecycleRef.current;
        pendingLifecycleRef.current = null;
        setTimeout(() => { void runTaskRef.current(next); }, 0);
      }
    }
  }, [petId, publish, refreshReadModels, serviceTime]);

  useEffect(() => { runTaskRef.current = task => runTask(task, undefined, false, false); }, [runTask]);

  useEffect(() => {
    if (phase !== 'room') return;
    const timer = setInterval(() => {
      const service = serviceRef.current;
      if (AppState.currentState !== 'active' || !service || busyRef.current || retryRef.current) return;
      const at = serviceTime();
      void runTask(async () => (await service.advanceTo(at)), { mode: 'auto', atMs: () => at }, true);
    }, 30_000);
    return () => clearInterval(timer);
  }, [phase, runTask, serviceTime]);

  const runLifecycle = useCallback((task: () => Promise<AppTaskResult>) => {
    if (busyRef.current) pendingLifecycleRef.current = task;
    else void runTask(task, undefined, false, false);
  }, [runTask]);

  const installApprovedRuntime = useCallback(async (
    connection: SqlConnection, state: PetState, migration: boolean,
  ): Promise<ApprovedMvpService> => {
    if (experience) {
      const service = await prepareExperience(connection, state.givenName, state.personalityProfileId === 'expressive' ? 'expressive' : 'reserved', state.lastSimulatedAtMs, scenario, runKey);
      serviceRef.current = service;
      return service;
    }
    const controller = await createLocalSyntheticSyncController({
      db: connection, state, accountId: PREVIEW_ACCOUNT_ID, deviceId: PREVIEW_DEVICE_ID,
      nowMs: () => monotonicDevTime(Date.now(), clockRef.current, petRef.current?.lastSimulatedAtMs ?? state.lastSimulatedAtMs),
    });
    syncControllerRef.current = controller;
    setSyncRuntimeNotice(controller.runtime.notice);
    const initialStatus = await controller.status();
    setSyncStatus(initialStatus);
    setWriterMode(initialStatus.writerAccess);
    setMigrationNotice(migration
      ? '기존 로컬 저장을 유지하고 합성 writer 등록과 현재 로컬 게임 규칙을 확인했어요.'
      : '새 로컬 저장과 합성 writer 등록을 원자적으로 만들었어요.');
    const service = await ApprovedMvpService.initialize(connection, {
      petId,
      givenName: state.givenName,
      personalityProfileId: state.personalityProfileId,
      createdAtMs: state.lastSimulatedAtMs,
      writeGuard: controller.writeGuard,
      outboxWriter: controller.writer,
    });
    serviceRef.current = service;
    setRuntimeBadge(service.status.badge);
    return service;
  }, [experience, petId, runKey, scenario]);

  const initialize = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    setPhase('loading');
    try {
      if (!databaseRef.current) databaseRef.current = await openAruconDatabase(experience ? EXPERIENCE.database : 'arucon-dev.db');
      if (!connectionRef.current) connectionRef.current = expoSqliteConnection(databaseRef.current);
      const connection = connectionRef.current;
      const store = new LocalPetStore(connection, APPROVED_GAME_CONFIG);
      await store.migrate();
      const existing = await store.loadPet(petId);
      const memoryStore = new LifeMemoryStore(connection, petId);
      try { lifeMemoryRef.current = await memoryStore.load(); lifeStoreRef.current = memoryStore; }
      catch { setMemoryWarning('생활 기억을 읽지 못해 원본을 보존했어요. 이번 교감은 화면에서만 이어집니다.'); }
      if (!existing) {
        setPhase('onboarding');
      } else {
        const service = await installApprovedRuntime(connection, existing, true);
        await installReactionRuntime(existing.petId);
        publish(await service.currentState());
        const now = monotonicDevTime(Date.now(), clockRef.current, existing.lastSimulatedAtMs);
        try {
          await service.beginGameDay(utcFixtureDay(now), now);
          const receipt = await service.returnToForeground(now);
          publish(receipt.state);
          if (receipt.status === 'withheld_partial') setNotice(receipt.notice);
          try { publish((await service.resolveEligibleGrowth(Math.random)).state); }
          catch { setGrowthWarning('저장된 성장 결과를 확인하지 못했어요. 게임 기록은 유지됩니다.'); }
        } catch (error) {
          if (!(error instanceof ReadOnlyWriterError)) throw error;
          setNotice(error.message);
        }
        await refreshReadModels(service, now);
        setPhase('room');
      }
      setFailure(null);
    } catch (error) {
      serviceRef.current = null;
      setFailure(errorText(error));
      setPhase('load_error');
    } finally {
      bootingRef.current = false;
    }
  }, [experience, petId, installApprovedRuntime, installReactionRuntime, publish, refreshReadModels]);

  useEffect(() => {
    const timer = setTimeout(() => { void initialize(); }, 0);
    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => () => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    reactionRuntimeRef.current?.dispose();
    reactionRuntimeRef.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setReducedMotion(value));
    return () => { alive = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      if (next === previous) return;
      const wasActive = previous === 'active';
      previous = next;
      if (next !== 'active') { reactionRuntimeRef.current?.cancel('background'); cancelLifeBubble(); setGame(null); }
      const service = serviceRef.current;
      if (!service) return;
      const eventWallMs = Date.now();
      const eventTime = () => monotonicDevTime(eventWallMs, clockRef.current, petRef.current?.lastSimulatedAtMs ?? 0);
      const task = next === 'active' ? async () => {
        const now = eventTime();
        await service.beginGameDay(utcFixtureDay(now), now);
        return (await service.returnToForeground(now)).state;
      }
        : wasActive ? () => service.leaveForeground(eventTime()) : null;
      if (!task) return;
      if (retryRef.current) pendingLifecycleRef.current = task;
      else runLifecycle(task);
    });
    return () => subscription.remove();
  }, [cancelLifeBubble, runLifecycle]);

  const startDevPet = useCallback((result: Pick<DevPetPreview, 'givenName'>) => {
    const connection = connectionRef.current;
    if (!connection || retryRef.current) return;
    const createdAtMs = serviceTime();
    const state = initialPet(petId, result.givenName, experience ? experiencePersonality : 'reserved', createdAtMs, APPROVED_GAME_CONFIG);
    void runTask(async () => {
      const service = await installApprovedRuntime(connection, state, false);
      await installReactionRuntime(state.petId);
      await service.beginGameDay(utcFixtureDay(createdAtMs), createdAtMs);
      const current = (await service.resolveEligibleGrowth(Math.random)).state;
      setPhase('room');
      setNotice('체험 모드 — 실제 걸음·수면은 연결하지 않았어요.');
      return current;
    });
  }, [experience, experiencePersonality, petId, installApprovedRuntime, installReactionRuntime, runTask, serviceTime]);

  const retry = useCallback(() => {
    if (phase === 'load_error') { void initialize(); return; }
    if (retryRef.current) void runTask(retryRef.current);
  }, [initialize, phase, runTask]);

  const startLiveReaction = useCallback((
    trigger: ReactionTrigger,
    options: Readonly<{
      evidence?: ReactionEvidence;
      touchTarget?: 'head' | 'body' | 'unknown';
      sleeping?: boolean;
      growthStage?: ReturnType<typeof projectGrowth>['stage'];
    }> = {},
  ) => {
    const runtime = reactionRuntimeRef.current;
    const state = petRef.current;
    if (!runtime || !state || (!evaluation && (journal !== null || fixtureVisible))) return;
    const room = ownedRoomAffordances(ownedItems);
    const affordances = evaluation ? ['table' as const, 'toilet' as const, 'ball' as const, 'cushion' as const] : [
      ...(state.tableInstalled ? ['table' as const] : []),
      ...(state.toiletInstalled ? ['toilet' as const] : []),
      ...(room.ballVisible ? ['ball' as const] : []),
      ...(room.cushionVisible ? ['cushion' as const] : []),
    ];
    runtime.start({
      petId: evaluation ? EVALUATION_PET_ID : state.petId,
      displayName: evaluation ? '아루콘' : state.givenName,
      trigger,
      personality: evaluation?.personality ?? (state.personalityProfileId === 'expressive' ? 'expressive' : 'reserved'),
      growthStage: options.growthStage ?? projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY).stage,
      source: evaluation ? 'fixture' : 'live',
      domainState: {
        sleeping: options.sleeping ?? evaluation?.sleeping ?? state.sleeping,
        hibernating: evaluation ? false : state.hibernating,
        condition: state.condition === 'well' ? 'well' : 'needs_care',
        cleanliness: options.evidence?.kind === 'clean_result' && options.evidence.result === 'cleaned'
          ? 'needs_cleanup' : state.poopCount > 0 ? 'needs_cleanup' : 'clean',
      },
      affordances,
      touchTarget: options.touchTarget,
      evidence: options.evidence,
    });
  }, [evaluation, fixtureVisible, journal, ownedItems]);

  useEffect(() => {
    if (!mealCue || mealReactionTokenRef.current === mealCue.token) return;
    if (growthMealTokenRef.current === mealCue.token || growthCue?.eventId === mealCue.token) return;
    mealReactionTokenRef.current = mealCue.token;
    if (!evaluation) return;
    startLiveReaction('meal_committed', {
      evidence: { kind: 'committed_meal', eventId: mealCue.token, committedAtMs: serviceTime(), mode: mealCue.mode },
    });
  }, [evaluation, growthCue, mealCue, serviceTime, startLiveReaction]);

  useEffect(() => {
    if (!growthCue || growthReactionTokenRef.current === growthCue.eventId) return;
    growthReactionTokenRef.current = growthCue.eventId;
    if (!evaluation) { pendingGrowthRef.current = `meal:${growthCue.eventId}`; return; }
    startLiveReaction('growth_committed', { evidence: growthCue, growthStage: growthCue.after.stage });
  }, [evaluation, growthCue, startLiveReaction]);

  const clearReactionPresentation = useCallback(() => {
    setReactionDialogue(null);
    setReactionPresentation({
      token: `clear:${++reactionBatchSequenceRef.current}`,
      commands: [{ type: 'clear_presentation' }],
    });
  }, []);

  const enterEvaluationMode = useCallback(async () => {
    const generation = ++reactionRuntimeGenerationRef.current;
    reactionRuntimeRef.current?.dispose();
    clearReactionPresentation();
    setFixtureVisible(false);
    setPreview(null);
    setEvaluation({ personality: 'reserved', candidateId: 'original', cameraAngle: 'front', sleeping: false });
    let writer: Awaited<ReturnType<typeof openReactionFixtureMemoryRepository>> | undefined;
    let memory = emptyReactionMemory(EVALUATION_PET_ID, 'fixture');
    try {
      writer = await openReactionFixtureMemoryRepository(EVALUATION_FIXTURE_ID);
      memory = await writer.load(EVALUATION_PET_ID);
    } catch (error) {
      setNotice(`합성 비교 기억을 열지 못해 이번 화면에서만 이어가요. (${errorText(error)})`);
    }
    if (generation === reactionRuntimeGenerationRef.current) reactionRuntimeRef.current = createReactionRuntime(memory, writer);
  }, [clearReactionPresentation, createReactionRuntime]);

  const leaveEvaluationMode = useCallback(() => {
    reactionRuntimeRef.current?.dispose();
    reactionRuntimeRef.current = null;
    clearReactionPresentation();
    setEvaluation(null);
    setPreview(null);
    setNotice('');
    const petId = petRef.current?.petId;
    if (petId) void installReactionRuntime(petId);
  }, [clearReactionPresentation, installReactionRuntime]);

  const runEvaluationScenario = useCallback((scenario: EvaluationScenario) => {
    if (!evaluation) return;
    if (scenario !== 'growth_before_after') setPreview(null);
    if (scenario === 'sleep') {
      const sleeping = !evaluation.sleeping;
      setEvaluation({ ...evaluation, sleeping });
      startLiveReaction(sleeping ? 'sleep' : 'wake', { sleeping });
      return;
    }
    if (scenario === 'growth_before_after') {
      const firstBand = APPROVED_GROWTH_POLICY.bands[0];
      const afterExpUnits = firstBand.expPerLevel * APPROVED_GROWTH_POLICY.expScale *
        (firstBand.toLevel - firstBand.fromLevel + 1);
      const fixture = createGrowthComparisonFixture({
        petId: EVALUATION_PET_ID,
        personality: evaluation.personality,
        domainState: { sleeping: false, hibernating: false, condition: 'well', cleanliness: 'clean' },
        affordances: ['ball', 'cushion', 'table', 'toilet'],
      }, { fixtureId: EVALUATION_FIXTURE_ID, beforeExpUnits: afterExpUnits - 1, afterExpUnits });
      const evidence = fixture.context.evidence;
      setPreview(`${fixture.label} · Lv.${evidence?.kind === 'synthetic_growth_fixture' ? evidence.before.level : 1} → Lv.${evidence?.kind === 'synthetic_growth_fixture' ? evidence.after.level : 2}`);
      startLiveReaction('growth_committed', { evidence, growthStage: fixture.context.growthStage });
      return;
    }
    if (scenario.startsWith('clean_')) {
      const result = scenario === 'clean_auto' ? 'auto_toilet' : scenario === 'clean_success' ? 'cleaned' : 'nothing_to_clean';
      startLiveReaction('clean', { evidence: { kind: 'clean_result', result } });
      return;
    }
    if (scenario === 'petting' || scenario === 'ball' || scenario === 'rest') {
      startLiveReaction(scenario, scenario === 'petting' ? { touchTarget: 'head' } : undefined);
    }
  }, [evaluation, startLiveReaction]);

  const doLifeAction = useCallback((action: LifeRoomAction, touchTarget: 'head' | 'body' | 'unknown' = 'unknown') => {
    const service = serviceRef.current;
    const state = petRef.current;
    if (!service || !state || retryRef.current) return;
    if (action === 'journal') {
      lifeInput('cancel'); setGame(null); setMenu(null);
      reactionRuntimeRef.current?.cancel('scene_change');
      void runTask(async () => { setJournal(await service.readJournal()); setPreview(null); });
      return;
    }
    const now = serviceTime();
    const id = actionId(action);
    const gameDayId = utcFixtureDay(now).id;
    const begin = () => service.beginGameDay(utcFixtureDay(now), now);
    switch (action) {
      case 'feed': void runTask(async () => { await begin(); return service.feedDirect(now, id); }, { mode: 'direct' }); break;
      case 'toggle_auto': void runTask(async () => { await begin(); return service.setAutoFeed(now, id, !state.autoFeedOptIn); }, { mode: 'auto', atMs: () => now }); break;
      case 'sleep_or_wake': void runTask(async () => { await begin(); return state.sleeping ? service.wake(now, id) : service.sleep(now, id); }, { mode: 'auto', atMs: () => now }); break;
      case 'clean': {
        const availability = cleanAvailability(state);
        if (availability.kind !== 'cleanable') {
          setFailure(null);
          setNotice(cleanAvailabilityText(availability));
          if (evaluation) startLiveReaction('clean', { evidence: { kind: 'clean_result', result: availability.kind === 'auto_managed' ? 'auto_toilet' : 'nothing_to_clean' } });
          else lifeInput('release');
          return;
        }
        void runTask(async () => {
          await begin();
          const cleaned = await service.clean(now, id);
          setNotice(cleanSuccessText(availability.removed));
          if (evaluation) startLiveReaction('clean', { evidence: { kind: 'clean_result', result: 'cleaned' } });
          else lifeInput('release');
          return cleaned;
        });
        break;
      }
      case 'touch':
        if (evaluation) startLiveReaction('petting', { touchTarget });
        else lifeInput('touch');
        void runTask(async () => { await begin(); return service.interact(now, id, 'touch', gameDayId); }, undefined, true);
        break;
    }
  }, [actionId, evaluation, lifeInput, runTask, serviceTime, startLiveReaction]);

  const doShopPurchase = useCallback((service: ApprovedMvpService, state: PetState, itemId: string) => {
    const quote = service.quoteCoinItem(itemId, state.coin);
    if (quote.status === 'not_found') { setNotice('승인된 상점 품목이 아니에요.'); return; }
    if (quote.status === 'insufficient_coin') { setNotice(`${quote.item.coinPrice}코인이 필요해요. 보유 코인은 유지돼요.`); return; }
    const now = serviceTime();
    const purchaseId = actionId(`coin:${itemId}`);
    void runTask(async () => {
      await service.beginGameDay(utcFixtureDay(now), now);
      const committed = await service.purchaseCoinItem({ purchaseId, itemId, committedAtMs: now });
      setNotice(`${quote.item.coinPrice}코인 품목을 로컬로 구입했어요. 실결제는 사용하지 않았어요.`);
      return committed.currentState;
    });
  }, [actionId, runTask, serviceTime]);

  const doApprovedAction = useCallback((action: ApprovedFixtureAction) => {
    const service = serviceRef.current;
    const state = petRef.current;
    if (!service || !state || retryRef.current) return;
    const now = serviceTime();
    if (action === 'evaluation_mode') {
      void enterEvaluationMode();
      return;
    }
    if (action === 'renderer_legacy_333' || action === 'renderer_low_resolution' || action === 'renderer_automatic') {
      lifeInput('cancel');
      const profile: RoomRendererProfileId = action === 'renderer_legacy_333' ? 'software_legacy_333'
        : action === 'renderer_low_resolution' ? 'software_low_resolution' : 'automatic';
      performanceSummaryRef.current = null;
      setRendererProfileId(profile);
      setFixtureVisible(false);
      setNotice(`렌더 비교 프로필: ${profile} · 게임 시간과 모션 속도는 그대로예요.`);
      return;
    }
    if (action === 'performance_export') {
      const summary = performanceSummaryRef.current;
      if (!summary) {
        setNotice('성능 표본이 아직 없어요. 방을 잠시 움직인 뒤 다시 저장해 주세요.');
        return;
      }
      try {
        const file = new File(Paths.cache, 'arucon-fun01-performance-summary.json');
        file.write(JSON.stringify(summary, null, 2));
        new File(Paths.cache, 'arucon-life-trace.json').write(JSON.stringify({ schemaVersion: 1, events: lifeTraceRef.current }, null, 2));
        setNotice('FUN-01 성능 JSON을 로컬 캐시에 저장했어요. 합성 도구에서 다시 내보낼 수 있어요.');
      } catch (error) {
        setFailure(`성능 JSON 저장 실패: ${errorText(error)}`);
      }
      return;
    }
    if (action === 'synthetic_walk') {
      const prepare = retryStableSyntheticWalk(() => service.currentState(), now);
      let cueAtMs: number | null = null;
      void runTask(async () => {
        await service.beginGameDay(utcFixtureDay(now), now);
        const prepared = await prepare();
        cueAtMs = prepared.atMs;
        const receipt = await service.receiveActivity(prepared.activity, prepared.atMs);
        setNotice(`합성 활동 · ${receipt.notice}`);
        return receipt;
      }, { mode: 'auto', atMs: () => cueAtMs });
      return;
    }
    if (action === 'synthetic_sleep_none' || action === 'synthetic_sleep_70') {
      const fixture = approvedSyntheticSleepFixture(now, action === 'synthetic_sleep_none' ? null : 70);
      void runTask(async () => {
        const applied = await service.applySyntheticSleep(fixture, now);
        setNotice(`합성 수면 · ${applied.score.explanation}`);
        return applied.state;
      });
      return;
    }
    if (action === 'growth_status') {
      void runTask(async () => { setPreview(growthSummary(await service.readGrowthView())); setJournal(null); });
      return;
    }
    if (action === 'resolve_growth') {
      const randomUnit = Math.random();
      void runTask(async () => {
        await service.beginGameDay(utcFixtureDay(now), now);
        const resolved = await service.resolveEligibleGrowth(() => randomUnit);
        setPreview(growthSummary(resolved));
        setJournal(null);
        return resolved.state;
      });
      return;
    }
    if (action.startsWith('shop_')) {
      doShopPurchase(service, state, action.slice('shop_'.length));
      return;
    }
    if (action === 'widget_snapshot') {
      void runTask(async () => {
        const projection = await service.readWidgetProjection(now);
        setPreview(`위젯 6필드 투영 · 마지막 확인 ${utcTimestampText(projection.updatedAtMs)}\nOS 실시간 상태나 보상 명령이 아닙니다.`);
        setJournal(null);
      });
      return;
    }
    if (action === 'sync_status') {
      void runTask(async () => {
        const status = await syncControllerRef.current?.status();
        setPreview(status ? `${syncStatusText(status)}\n합성 동기화 검증 · 실제 서버 권한 아님` : '동기화 상태 판독기 없음');
        setJournal(null);
      });
      return;
    }
    if (action === 'sync_handoff') {
      const controller = syncControllerRef.current;
      if (!controller) {
        setNotice('합성 동기화 검증이 준비되지 않았어요.');
        return;
      }
      const handoffId = actionId('synthetic-handoff');
      void runTask(async () => {
        await drainLocalSyntheticSync(controller);
        const result = await controller.handoff(handoffId, 'dev-preview-target-device');
        setSyncStatus(result.status);
        setWriterMode(result.status.writerAccess);
        setNotice(result.notice);
        return service.currentState();
      });
    }
  }, [actionId, doShopPurchase, enterEvaluationMode, lifeInput, runTask, serviceTime]);

  if (phase === 'loading') return <View style={styles.center}><Text>로컬 방을 여는 중…</Text></View>;
  if (phase === 'load_error') return <View style={styles.center}>
    <Text style={styles.errorTitle}>저장된 방을 열지 못했어요.</Text>
    <Text>{failure}</Text>
    <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retry}><Text>다시 시도</Text></Pressable>
  </View>;
  if (phase === 'onboarding') return <View style={[styles.onboarding, { paddingTop: insets.top + 20 }]}>
    {experience ? <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
      <Text style={styles.fixtureTitle}>작은 친구를 만나 볼까요?</Text>
      <Text>체험 모드 — 실제 걸음·수면은 연결하지 않았어요. 체험용 먹이와 공·쿠션·화장실이 있는 별도 방이에요. 기존 방은 보존됩니다.</Text>
      {(scenario === 'auto_growth' || scenario.startsWith('evolution_') || scenario.startsWith('sleep_')) && <Text>이 경계 체험은 자동급식에 동의한 식탁과 합성 활동으로 얻은 먹이를 준비합니다. 약 20~30초 관찰하면 정상 시간·식사 서비스로 성장합니다. 진화 체험의 7일 이력도 합성이며 일반 방에 넣지 않습니다.</Text>}
      <TextInput accessibilityLabel="체험 펫 이름" placeholder="이름 (비워 두면 아루콘)" maxLength={20} value={experienceName} onChangeText={setExperienceName} style={styles.nameInput} />
      <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => setExperiencePersonality(value => value === 'reserved' ? 'expressive' : 'reserved')}><Text>성격: {experiencePersonality === 'reserved' ? '새침하지만 다정한 아이' : '솔직하게 반기는 아이'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => startDevPet({ givenName: experienceName.trim() || '아루콘' })}><Text>함께 지내기</Text></Pressable>
      {profile === 'growth' && <Text>성장 직전의 별도 체험입니다. 먹이 주기로 실제 섭취·성장 경로를 확인해요.</Text>}
      {profile === 'toilet' && <Text>배설 사건이 가까운 별도 체험입니다. 처음 만든 뒤 약 20~30초 안에 실제 정산 경로를 지나갑니다. 일반 방의 시간은 바꾸지 않아요.</Text>}
      {profile === 'cleanup' && <Text>예전 잔여 배설물 1개가 있는 별도 청소 체험입니다. 화장실의 자동 청결 정책은 유지됩니다.</Text>}
      <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => onProfile('original')}><Text>기존 방으로</Text></Pressable>
    </ScrollView></KeyboardAvoidingView> : <DevOnboardingScreen onPreview={startDevPet} />}
    {busy && <Text>합성 로컬 펫을 만드는 중…</Text>}
    {failure && <View style={styles.errorBox}><Text>{failure}</Text><Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable></View>}
  </View>;
  if (!pet) return <View style={styles.center}><Text>펫 상태를 다시 읽는 중…</Text></View>;

  const roomAffordances = ownedRoomAffordances(ownedItems);

  return <View style={styles.root}>
    <View style={StyleSheet.absoluteFill}>
      <AruconRoom
        key={rendererProfileId}
        formId={evaluation?.formId ?? pet.formId}
        mealCue={mealCue ?? undefined}
        personality={evaluation?.personality ?? (pet.personalityProfileId === 'expressive' ? 'expressive' : 'reserved')}
        sleeping={evaluation?.sleeping ?? (pet.sleeping || pet.hibernating)}
        reducedMotion={reducedMotion}
        tableInstalled={pet.tableInstalled}
        toiletInstalled={pet.toiletInstalled}
        ballVisible={evaluation ? true : roomAffordances.ballVisible}
        cushionVisible={evaluation ? true : roomAffordances.cushionVisible}
        characterCandidateId={evaluation?.candidateId ?? 'baby_v3'}
        comparisonCameraAngle={evaluation?.cameraAngle}
        rendererProfileId={rendererProfileId}
        interactionEnabled={journal === null && !fixtureVisible && menu === null}
        livingEnabled={!evaluation}
        lifeCommand={lifeCommand}
        onLifeEvent={onLifeEvent}
        lifePreference={lifePreference(lifeMemoryRef.current)}
        growthStage={projectGrowth(pet.totalExpUnits, APPROVED_GROWTH_POLICY).stage}
        poopCount={pet.poopCount}
        hungry={pet.hunger >= APPROVED_GAME_CONFIG.proposal.mealHungerThreshold}
        mealAvailability={pet.food <= 0 ? 'no_food' : !pet.tableInstalled ? 'no_table' : !pet.autoFeedOptIn ? 'manual' : 'ready'}
        onCleanup={() => doLifeAction('clean')}
        ballPlayInput={game === 'ball'}
        topOcclusion={insets.top + (evaluation ? 8 : topHeight + 16)}
        bottomOcclusion={insets.bottom + (evaluation ? evaluationHeight : controlsHeight) + 16}
        reactionBubble={(evaluation ? reactionDialogue : lifeDialogue) ? <ReactionOverlay
          view={evaluation ? reactionDialogue : lifeDialogue}
          onChoice={choiceId => {
            autoSpeechAfterRef.current = Date.now() + 25_000;
            if (evaluation) reactionRuntimeRef.current?.choose(choiceId);
            else { setGame(choiceId === 'roll' ? 'ball' : null); lifeInput(choiceId === 'roll' ? 'roll' : choiceId === 'rest' ? 'rest' : 'company'); }
          }}
          onClose={() => { autoSpeechAfterRef.current = Date.now() + 25_000; reactionRuntimeRef.current?.cancel('user'); cancelLifeBubble(); }}
          reduceDialogue={evaluation ? reduceDialogue : false}
          onToggleReduceDialogue={() => setReduceDialogue(value => !value)}
        /> : null}
        reactionPresentation={reactionPresentation}
        onPerformanceSummary={summary => { performanceSummaryRef.current = summary; }}
        onInteractionIntent={intent => { reactionRuntimeRef.current?.cancel('superseded'); cancelLifeBubble(); if (intent !== 'furniture') setGame(null); }}
        onPetTouch={target => evaluation ? startLiveReaction('petting', { touchTarget: target }) : doLifeAction('touch', target)}
        onFurnitureHit={name => {
          if (evaluation) {
            if (name === 'ball') startLiveReaction('ball');
            else if (name === 'cushion') startLiveReaction('rest');
            else setNotice('합성 비교에서는 가구 상태만 표시해요. 게임 저장은 바뀌지 않아요.');
            return;
          }
          if (name === 'table') openMenu('food');
          else if (name === 'cushion') {
            if (roomAffordances.cushionVisible) { setGame(null); lifeInput('rest'); }
            else setNotice('쿠션은 코인 상점에서 소유한 뒤 사용할 수 있어요.');
          }
          else if (name === 'toilet') setNotice('기본 화장실이 청결을 도와줘요. 유지비는 없어요.');
          else if (roomAffordances.ballVisible) { setGame('ball'); lifeInput('ball'); }
          else setNotice('공은 코인 상점에서 소유한 뒤 사용할 수 있어요.');
        }}
        onStatus={setNotice}
      />
    </View>
    {/* Dynamic Type can update native glyphs before Fabric remeasures unchanged text.
        Recreate only the text chrome; the room/controller and saved profile stay mounted. */}
    {!evaluation && <View key={`top:${fontScale}`} onLayout={event => setTopHeight(event.nativeEvent.layout.height)} style={[styles.top, { top: insets.top + 8 }]}>
      <Text style={styles.petName}>{pet.givenName}</Text>
      <Text accessibilityLabel={experience ? '격리 체험 방' : '실제 건강 연결 꺼짐'} style={styles.trialBadge}>체험</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="메뉴 열기"
        accessibilityState={{ expanded: menu !== null }}
        style={styles.fixtureToggle}
        onPress={() => {
          openMenu('menu');
        }}
      >
        <Text style={styles.badgeText}>☰</Text>
      </Pressable>
    </View>}
    {!evaluation && <View key={`bottom:${fontScale}`} onLayout={event => setControlsHeight(event.nativeEvent.layout.height)} style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {memoryWarning && <Text accessibilityRole="alert" style={styles.notice}>{memoryWarning}</Text>}
      {growthWarning && <View style={styles.errorBox}><Text accessibilityRole="alert">{growthWarning}</Text><Pressable accessibilityRole="button" onPress={() => {
        const service = serviceRef.current; if (!service) return;
        void runTask(async () => { const view = await service.resolveEligibleGrowth(Math.random); setGrowthWarning(null); return view.state; });
      }}><Text>성장 결과 다시 확인</Text></Pressable></View>}
      {growthNotice && <Pressable accessibilityRole="button" style={styles.notice} onPress={() => { setGrowthNotice(null); openMenu('details'); }}><Text>새로운 성장 · {growthNotice} · 보기</Text></Pressable>}
      {failure && <View style={styles.errorBox}>
        <Text>저장 중 오류: {failure}</Text>
        <Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable>
      </View>}
      {game && <View style={styles.gameControls}>
        {game === 'ball' && <Text style={styles.gameHint}>바닥을 눌러 공을 굴려 주세요</Text>}
        {game === 'peek' && <><Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => lifeInput('left')}><Text>왼쪽 까꿍</Text></Pressable><Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => lifeInput('right')}><Text>오른쪽 까꿍</Text></Pressable></>}
        {game === 'gesture' && <><Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => lifeInput('high_five')}><Text>하이파이브</Text></Pressable><Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => lifeInput('tilt')}><Text>갸우뚱</Text></Pressable></>}
        <Pressable accessibilityRole="button" accessibilityLabel="놀이 마치기" style={styles.menuItem} onPress={() => { setGame(null); lifeInput('cancel'); }}><Text>그만 놀기</Text></Pressable>
      </View>}
      <View style={styles.mainActions}>{(['play', 'food', 'decor'] as const).map((key, i) => <Pressable key={key} accessibilityRole="button" style={styles.mainAction} onPress={() => openMenu(key)}><Text style={styles.mainActionText}>{['놀기', '먹이', '꾸미기'][i]}</Text></Pressable>)}</View>
    </View>}
    <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
      <View style={[styles.fixtureBackdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View key={`sheet:${fontScale}`} accessibilityViewIsModal style={styles.fixtureSheet}>
          <View style={styles.fixtureHeader}><Text style={[styles.fixtureTitle, { flex: 1 }]}>{menu === 'menu' ? '우리 방' : menu === 'play' ? '함께 놀기' : menu === 'food' ? '식사' : menu === 'decor' ? '방 꾸미기' : menu === 'settings' ? '설정' : '우리 아이'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="패널 닫기" style={styles.menuItem} onPress={() => setMenu(null)}><Text>닫기</Text></Pressable></View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
            {menu === 'menu' && <>
              <Text>체험 모드 — 실제 걸음·수면은 연결하지 않았어요.</Text>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => doLifeAction('journal')}><Text>함께한 기록</Text></Pressable>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => setMenu('details')}><Text>우리 아이</Text></Pressable>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => setMenu('settings')}><Text>설정</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => onProfile(experience ? 'original' : 'normal')}><Text>{experience ? '기존 방으로 돌아가기' : '별도 생활 체험 시작 / 이어 하기'}</Text></Pressable>
            </>}
            {menu === 'play' && <>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); doLifeAction('touch'); }}><Text>쓰다듬기</Text></Pressable>
              {(['ball', 'peek', 'gesture'] as const).map((key, index) => <Pressable key={key} accessibilityRole="button" disabled={key === 'ball' && !roomAffordances.ballVisible} style={styles.menuItem} onPress={() => { setMenu(null); setGame(key); lifeInput(key === 'ball' ? 'offer' : key); }}><Text>{['공 굴려주기', '손가락 까꿍', '자세 따라 하기'][index]}{key === 'ball' && !roomAffordances.ballVisible ? ' · 공이 필요해요' : ''}</Text></Pressable>)}
              {roomAffordances.cushionVisible && <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); lifeInput('rest'); }}><Text>함께 쉬기</Text></Pressable>}
            </>}
            {menu === 'food' && <>
              <Text>{experience ? '체험용 ' : ''}먹이 {pet.food}개 · {pet.sleeping ? '쉬는 중' : '깨어 있어요'}</Text>
              <Pressable accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => { setMenu(null); doLifeAction('feed'); }}><Text>먹이 주기</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => doLifeAction('toggle_auto')}><Text>식탁 자동급식 {pet.autoFeedOptIn ? '켜짐' : '꺼짐'}</Text></Pressable>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); doLifeAction('sleep_or_wake'); }}><Text>{pet.sleeping ? '깨우기' : '잠자기'}</Text></Pressable>
            </>}
            {menu === 'decor' && <><Text>{experience ? '체험용 ' : ''}코인 {pet.coin} · 기본 화장실은 늘 사용할 수 있어요.</Text>
              {(['ball', 'cushion', 'table'] as const).map((id, i) => <Pressable key={id} accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => { if (serviceRef.current) doShopPurchase(serviceRef.current, pet, id); }}><Text>{['공', '쿠션', '식탁'][i]} · {APPROVED_MVP_POLICY.shop.items.find(item => item.id === id)?.coinPrice}코인</Text></Pressable>)}
            </>}
            {menu === 'settings' && <>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: reducedMotion }} style={styles.menuItem} onPress={() => setReducedMotion(value => !value)}><Text>동작 줄이기 {reducedMotion ? '켜짐' : '꺼짐'}</Text></Pressable>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduceDialogue }} style={styles.menuItem} onPress={() => setReduceDialogue(value => !value)}><Text>자동 말걸기 줄이기 {reduceDialogue ? '켜짐' : '꺼짐'}</Text></Pressable>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); setFixtureVisible(true); }}><Text>체험 도구와 빌드 진단</Text></Pressable>
              <Text>실제 건강정보 연결 OFF · 실결제 OFF</Text>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); doLifeAction('clean'); }}><Text>청결 확인 / 남은 것 치우기</Text></Pressable>
              <Text>아래는 일반 방과 분리된 저장이에요. 처음 만들 때만 체험 상태가 준비됩니다.</Text>
              {(Object.keys(EXPERIENCE_SCENARIOS) as ExperienceScenario[]).map(value => <Pressable key={value} accessibilityRole="button" disabled={busy} style={styles.menuItem} onPress={() => onProfile(value === 'auto_growth' || value.startsWith('evolution_') || value.startsWith('sleep_') ? `${value}#${Date.now()}` : value)}><Text>{EXPERIENCE_SCENARIOS[value]}</Text></Pressable>)}
            </>}
            {menu === 'details' && <><Text>{growthText}</Text><Text>{pet.personalityProfileId === 'expressive' ? '솔직하게 마음을 표현하는 아이' : '새침하지만 다정하게 다가오는 아이'}</Text><Text>{growthExpression(projectGrowth(pet.totalExpUnits, APPROVED_GROWTH_POLICY).stage).description}</Text><Text>{growthExpression(projectGrowth(pet.totalExpUnits, APPROVED_GROWTH_POLICY).stage).next}</Text>
              {!!lifeMemoryRef.current.completed.length && <Text>함께한 작은 장면 · 다시 보기는 보상과 기억을 추가하지 않아요.</Text>}
              {[...new Set(lifeMemoryRef.current.completed.map(x => x.scene))].slice(-6).map(scene => <Pressable key={scene} accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenu(null); setNotice('추억 다시 보기 · 보상과 기억은 추가하지 않아요.'); lifeInput(scene, true); }}><Text>{LIFE_SCENE_NAMES[scene]}</Text></Pressable>)}
            </>}
            {!!notice && <Text>{notice}</Text>}{failure && <Text accessibilityRole="alert">저장 오류: {failure}</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
    {evaluation && <View onLayout={event => setEvaluationHeight(event.nativeEvent.layout.height)} style={[styles.evaluation, { bottom: insets.bottom + 8 }]}>
      {preview && <Text style={styles.evaluationPreview}>{preview}</Text>}
      <FunEvaluationPanel
        state={evaluation}
        onState={next => {
          reactionRuntimeRef.current?.cancel('scene_change');
          clearReactionPresentation();
          setEvaluation(next);
        }}
        onScenario={runEvaluationScenario}
        onClose={leaveEvaluationMode}
      />
    </View>}
    <Modal
      animationType="slide"
      onRequestClose={() => setFixtureVisible(false)}
      transparent
      visible={fixtureVisible}
    >
      <View style={[styles.fixtureBackdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View accessibilityViewIsModal style={styles.fixtureSheet}>
          <View style={styles.fixtureHeader}>
            <View style={styles.fixtureHeadingText}>
              <Text accessibilityRole="header" style={styles.fixtureTitle}>합성 도구</Text>
              <Text style={styles.fixtureScope}>SOURCE_SYNTHETIC · LOCAL_ONLY</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="합성 도구 닫기"
              onPress={() => setFixtureVisible(false)}
              style={styles.fixtureClose}
            >
              <Text style={styles.fixtureCloseText}>닫기</Text>
            </Pressable>
          </View>
          <ScrollView
            accessibilityLabel="합성 도구 목록"
            contentContainerStyle={styles.fixtureContent}
            showsVerticalScrollIndicator
          >
            <ApprovedStatusPanel name={pet.givenName} badge={runtimeBadge} migrationNotice={migrationNotice}
              syncText={syncStatus ? syncStatusText(syncStatus) : '로컬 체험'} syncRuntimeNotice={syncRuntimeNotice}
              growthText={growthText} widgetText={widgetText} writerMode={writerMode} />
            {preview && <Text>{preview}</Text>}
            <ApprovedFixturePanel onAction={doApprovedAction} />
          </ScrollView>
        </View>
      </View>
    </Modal>
    <JournalPanel
      entries={journal}
      onClose={() => setJournal(null)}
      topInset={insets.top}
      bottomInset={insets.bottom}
    />
  </View>;
}

export default function App() {
  const [profile, setProfile] = useState<RoomProfile>('original');
  const [ready, setReady] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  useEffect(() => {
    void readExperienceProfile().then(setProfile).catch(() => setProfileError('방 선택을 읽지 못해 기존 방을 열었어요.')).finally(() => setReady(true));
  }, []);
  const changeProfile = useCallback((next: RoomProfile) => {
    void saveExperienceProfile(next).then(() => { setProfileError(null); setProfile(next); })
      .catch(() => setProfileError('방 선택을 저장하지 못했어요. 현재 방은 유지됩니다.'));
  }, []);
  return <SafeAreaProvider>
    <StatusBar barStyle="dark-content" backgroundColor="#f2ebdc" />
    {ready && <AppContent key={profile} profile={profile} onProfile={changeProfile} />}
    {profileError && <View style={styles.errorBox}><Text accessibilityRole="alert">{profileError}</Text></View>}
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2ebdc' },
  nameInput: { minHeight: 48, borderRadius: 14, padding: 12, backgroundColor: '#fff9ed', color: '#51392b' },
  petName: { flex: 1, fontSize: 21, fontWeight: '700', color: '#51392b', paddingTop: 10 },
  trialBadge: { fontSize: 11, color: '#46695b', paddingTop: 16 },
  mainActions: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  mainAction: { flex: 1, maxWidth: 130, minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: '#fff9edea' },
  mainActionText: { fontSize: 16, color: '#604638', fontWeight: '600' },
  menuItem: { minHeight: 46, padding: 12, justifyContent: 'center', borderRadius: 14, backgroundColor: '#eadfce' },
  gameControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6 },
  gameHint: { color: '#604638', backgroundColor: '#fff9ed', borderRadius: 10, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#f2ebdc' },
  onboarding: { flex: 1, backgroundColor: '#f2ebdc' },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  fixtureToggle: { minHeight: 52, justifyContent: 'center', backgroundColor: '#fff9edee', paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#604638' },
  bottom: { position: 'absolute', left: 8, right: 8, gap: 6 },
  evaluation: { position: 'absolute', left: 8, right: 8, gap: 5 },
  evaluationPreview: { alignSelf: 'center', borderRadius: 8, padding: 6, backgroundColor: '#fff9edee', color: '#274d40' },
  notice: { alignSelf: 'center', backgroundColor: '#fff9eddd', padding: 6, borderRadius: 8, color: '#604638' },
  preview: { maxHeight: 110, backgroundColor: '#fff9ed', borderRadius: 12, padding: 10 },
  fixtureBackdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, backgroundColor: '#251c1788' },
  fixtureSheet: { maxHeight: '82%', minHeight: 280, borderRadius: 20, padding: 14, gap: 10, backgroundColor: '#fff9ed' },
  fixtureHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fixtureHeadingText: { flex: 1, gap: 2 },
  fixtureTitle: { fontSize: 20, fontWeight: '800', color: '#51392b' },
  fixtureScope: { fontSize: 11, fontWeight: '700', color: '#46695b' },
  fixtureClose: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#785943' },
  fixtureCloseText: { color: '#ffffff', fontWeight: '800' },
  fixtureContent: { paddingBottom: 8 },
  errorBox: { backgroundColor: '#ffdfd6', padding: 10, borderRadius: 10, gap: 6 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  retryButton: { backgroundColor: '#fff9ed', padding: 10, borderRadius: 10 },
});

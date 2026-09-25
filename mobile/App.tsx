import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
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
import { DomainActionRejected } from './src/domain/engine';
import { initialPet, type PetState } from './src/domain/model';
import { LocalPetStore, expoSqliteConnection, type SqlConnection } from './src/storage/sqlite';
import { openAruconDatabase } from './src/storage/appDatabase';
import type { SyncStatusViewModel } from './src/sync/status';
import { ReadOnlyWriterError, WriterRegistrationRequiredError } from './src/sync/writeGuard';
import { approvedLocalExpoNativeWidgetBridge } from './src/native/aruconWidgetModule';
import { FailClosedNativeWidgetAdapter } from './src/native/widget';
import { formPresentationText, selectFormPresentation } from './src/scene/formPresentation';
import { LifeRoomControls, type LifeRoomAction } from './src/presentation/LifeRoomControls';
import { ApprovedFixturePanel, type ApprovedFixtureAction } from './src/presentation/ApprovedFixturePanel';
import { ApprovedStatusPanel } from './src/presentation/ApprovedStatusPanel';
import {
  approvedSyntheticSleepFixture, drainLocalSyntheticSync, journalEventText, ownedRoomAffordances, syncStatusText, utcTimestampText,
} from './src/presentation/approvedPresentation';

const PET_ID = 'dev-local-pet-1';
const PREVIEW_ACCOUNT_ID = 'dev-preview-account';
const PREVIEW_DEVICE_ID = 'dev-preview-device';
const LOCAL_WIDGET = new FailClosedNativeWidgetAdapter(approvedLocalExpoNativeWidgetBridge, true);

type AppMealCuePolicy = { mode: MealCue['mode']; atMs?: () => number | null };
type AppTaskResult = PetState | ApprovedActivityReceipt | void;

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
  const sex = view.sex ?? '미정';
  const formPresentation = selectFormPresentation(form);
  return `성장 Lv.${projection.level} · 단계 ${projection.stage} · ${formPresentationText(formPresentation)} · 성별 ${sex}`;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'loading' | 'onboarding' | 'room' | 'load_error'>('loading');
  const [pet, setPet] = useState<PetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [fixtureVisible, setFixtureVisible] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mealCue, setMealCue] = useState<MealCue | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [runtimeBadge, setRuntimeBadge] = useState('로컬 미리보기 · 건강 연결 꺼짐');
  const [migrationNotice, setMigrationNotice] = useState('로컬 저장 상태 확인 중');
  const [syncStatus, setSyncStatus] = useState<SyncStatusViewModel | null>(null);
  const [syncRuntimeNotice, setSyncRuntimeNotice] = useState('합성 동기화 준비 상태 확인 중');
  const [growthText, setGrowthText] = useState('성장 상태 확인 중');
  const [widgetText, setWidgetText] = useState('위젯 마지막 확인 시각 확인 중');
  const [ownedItems, setOwnedItems] = useState<readonly string[]>([]);
  const [writerMode, setWriterMode] = useState<'active_writer' | 'read_only_fenced'>('active_writer');
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
    setGrowthText(`${growthSummary(growth)} · 소유 ${ownership.length}개`);
    const widgetPublish = await LOCAL_WIDGET.publish(widget);
    const publishText = widgetPublish === 'requested' ? 'OS 새로고침 요청됨' : widgetPublish === 'deferred' ? 'OS 새로고침 지연됨'
      : widgetPublish === 'unsupported' ? '현재 빌드에서 위젯 모듈 없음' : '위젯 저장/요청 오류';
    setWidgetText(`위젯 마지막 확인 ${utcTimestampText(widget.updatedAtMs)} · ${publishText} · OS 실시간 상태 아님`);
    if (status) {
      setSyncStatus(status);
      setWriterMode(status.writerAccess);
    }
  }, []);

  const runTask = useCallback(async (task: () => Promise<AppTaskResult>, cue?: AppMealCuePolicy) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const beforeExp = petRef.current?.totalExpUnits ?? 0;
      const result = await task();
      const state = resultState(result);
      if (state) publish(state);
      if (state && cue && state.totalExpUnits > beforeExp && serviceRef.current) {
        try {
          const entries = await serviceRef.current.readJournal();
          const policy: MealCuePolicy = { mode: cue.mode, atMs: cue.atMs?.() };
          const confirmed = confirmedMealCue(beforeExp, state.totalExpUnits, entries, policy, PET_ID);
          if (confirmed) setMealCue(confirmed);
        } catch { /* A visual cue must never turn a committed meal into a failed command. */ }
      }
      if (serviceRef.current) await refreshReadModels(serviceRef.current, state?.lastSimulatedAtMs ?? serviceTime());
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
  }, [publish, refreshReadModels, serviceTime]);

  useEffect(() => { runTaskRef.current = runTask; }, [runTask]);

  const runLifecycle = useCallback((task: () => Promise<AppTaskResult>) => {
    if (busyRef.current) pendingLifecycleRef.current = task;
    else void runTask(task);
  }, [runTask]);

  const installApprovedRuntime = useCallback(async (
    connection: SqlConnection, state: PetState, migration: boolean,
  ): Promise<ApprovedMvpService> => {
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
      petId: PET_ID,
      givenName: state.givenName,
      personalityProfileId: state.personalityProfileId,
      createdAtMs: state.lastSimulatedAtMs,
      writeGuard: controller.writeGuard,
      outboxWriter: controller.writer,
    });
    serviceRef.current = service;
    setRuntimeBadge(service.status.badge);
    return service;
  }, []);

  const initialize = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    setPhase('loading');
    try {
      if (!databaseRef.current) databaseRef.current = await openAruconDatabase();
      if (!connectionRef.current) connectionRef.current = expoSqliteConnection(databaseRef.current);
      const connection = connectionRef.current;
      const store = new LocalPetStore(connection, APPROVED_GAME_CONFIG);
      await store.migrate();
      const existing = await store.loadPet(PET_ID);
      if (!existing) {
        setPhase('onboarding');
      } else {
        const service = await installApprovedRuntime(connection, existing, true);
        publish(await service.currentState());
        const now = monotonicDevTime(Date.now(), clockRef.current, existing.lastSimulatedAtMs);
        try {
          await service.beginGameDay(utcFixtureDay(now), now);
          const receipt = await service.returnToForeground(now);
          publish(receipt.state);
          setNotice(receipt.notice);
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
  }, [installApprovedRuntime, publish, refreshReadModels]);

  useEffect(() => {
    const timer = setTimeout(() => { void initialize(); }, 0);
    return () => clearTimeout(timer);
  }, [initialize]);

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
  }, [runLifecycle]);

  const startDevPet = useCallback((result: DevPetPreview) => {
    const connection = connectionRef.current;
    if (!connection || retryRef.current) return;
    const createdAtMs = serviceTime();
    const state = initialPet(PET_ID, result.givenName, 'reserved', createdAtMs, APPROVED_GAME_CONFIG);
    void runTask(async () => {
      const service = await installApprovedRuntime(connection, state, false);
      await service.beginGameDay(utcFixtureDay(createdAtMs), createdAtMs);
      const current = await service.currentState();
      setPhase('room');
      setNotice('SOURCE_SYNTHETIC 로컬 미리보기를 만들었어요. 실제 가입이나 보호자 확인이 아닙니다.');
      return current;
    });
  }, [installApprovedRuntime, runTask, serviceTime]);

  const retry = useCallback(() => {
    if (phase === 'load_error') { void initialize(); return; }
    if (retryRef.current) void runTask(retryRef.current);
  }, [initialize, phase, runTask]);

  const doLifeAction = useCallback((action: LifeRoomAction) => {
    const service = serviceRef.current;
    const state = petRef.current;
    if (!service || !state || retryRef.current) return;
    if (action === 'journal') {
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
      case 'clean': void runTask(async () => { await begin(); return service.clean(now, id); }); break;
      case 'touch': void runTask(async () => { await begin(); return service.interact(now, id, 'touch', gameDayId); }); break;
    }
  }, [actionId, runTask, serviceTime]);

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
  }, [actionId, doShopPurchase, runTask, serviceTime]);

  if (phase === 'loading') return <View style={styles.center}><Text>로컬 방을 여는 중…</Text></View>;
  if (phase === 'load_error') return <View style={styles.center}>
    <Text style={styles.errorTitle}>저장된 방을 열지 못했어요.</Text>
    <Text>{failure}</Text>
    <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retry}><Text>다시 시도</Text></Pressable>
  </View>;
  if (phase === 'onboarding') return <View style={[styles.onboarding, { paddingTop: insets.top + 20 }]}>
    <DevOnboardingScreen onPreview={startDevPet} />
    {busy && <Text>합성 로컬 펫을 만드는 중…</Text>}
    {failure && <View style={styles.errorBox}><Text>{failure}</Text><Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable></View>}
  </View>;
  if (!pet) return <View style={styles.center}><Text>펫 상태를 다시 읽는 중…</Text></View>;

  const roomAffordances = ownedRoomAffordances(ownedItems);

  return <View style={styles.root}>
    <View style={StyleSheet.absoluteFill}>
      <AruconRoom
        formId={pet.formId}
        mealCue={mealCue ?? undefined}
        personality={pet.personalityProfileId === 'expressive' ? 'expressive' : 'reserved'}
        sleeping={pet.sleeping || pet.hibernating}
        reducedMotion={reducedMotion}
        tableInstalled={pet.tableInstalled}
        toiletInstalled={pet.toiletInstalled}
        ballVisible={roomAffordances.ballVisible}
        cushionVisible={roomAffordances.cushionVisible}
        onPetTouch={() => doLifeAction('touch')}
        onFurnitureHit={name => {
          if (name === 'table') setNotice('식탁은 코인 상점 구매 후 자동급식을 설정할 수 있어요.');
          else if (name === 'cushion') {
            if (roomAffordances.cushionVisible) doLifeAction('sleep_or_wake');
            else setNotice('쿠션은 코인 상점에서 소유한 뒤 사용할 수 있어요.');
          }
          else if (name === 'toilet') setNotice('기본 화장실이 청결을 도와줘요. 유지비는 없어요.');
          else setNotice(roomAffordances.ballVisible ? '공과 무료로 놀았어요. 보상은 추가되지 않아요.' : '공은 코인 상점에서 소유한 뒤 사용할 수 있어요.');
        }}
        onStatus={setNotice}
      />
    </View>
    <View style={[styles.top, { top: insets.top + 8 }]}>
      <ApprovedStatusPanel
        name={`${pet.givenName}콘`}
        badge={runtimeBadge}
        migrationNotice={migrationNotice}
        syncText={syncStatus ? syncStatusText(syncStatus) : '동기화 상태 확인 중'}
        syncRuntimeNotice={syncRuntimeNotice}
        growthText={growthText}
        widgetText={widgetText}
        writerMode={writerMode}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="합성 도구 열기"
        accessibilityState={{ expanded: fixtureVisible }}
        style={styles.fixtureToggle}
        onPress={() => setFixtureVisible(true)}
      >
        <Text style={styles.badgeText}>합성 도구</Text>
      </Pressable>
    </View>
    <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {failure && <View style={styles.errorBox}>
        <Text>저장 중 오류: {failure}</Text>
        <Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable>
      </View>}
      {busy && <Text style={styles.notice}>로컬 저장 중…</Text>}
      {journal && <ScrollView style={styles.preview}><Text>생활 기록</Text>{journal.map(entry => <Text key={entry.id}>{journalEventText(entry.event)}</Text>)}</ScrollView>}
      {preview && <ScrollView style={styles.preview}><Text>{preview}</Text></ScrollView>}
      <LifeRoomControls state={pet} onAction={doLifeAction} />
    </View>
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
            <ApprovedFixturePanel onAction={doApprovedAction} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

export default function App() {
  return <SafeAreaProvider>
    <StatusBar barStyle="dark-content" backgroundColor="#f2ebdc" />
    <AppContent />
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2ebdc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#f2ebdc' },
  onboarding: { flex: 1, backgroundColor: '#f2ebdc' },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  fixtureToggle: { minHeight: 52, justifyContent: 'center', backgroundColor: '#fff9edee', paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#604638' },
  bottom: { position: 'absolute', left: 8, right: 8, gap: 6 },
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

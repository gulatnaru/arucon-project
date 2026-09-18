import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { AruconRoom } from './src/scene/AruconRoom';
import { DevOnboardingScreen } from './src/onboarding/DevOnboardingScreen';
import { createDevLifeService, DevLifeService, type JournalEntry } from './src/application/devLifeService';
import { confirmedMealCue, type MealCue, type MealCuePolicy } from './src/application/mealCue';
import { DevInputRejected, monotonicDevTime, retryStableSyntheticWalk } from './src/application/devClock';
import { DEV_GAME_CONFIG } from './src/domain/config';
import { DomainActionRejected } from './src/domain/engine';
import type { DomainEvent, PetState } from './src/domain/model';
import { LocalPetStore, expoSqliteConnection, type SqlConnection } from './src/storage/sqlite';
import { LifeRoomControls, type LifeRoomAction } from './src/presentation/LifeRoomControls';
import { DevFixturePanel, type DevFixtureAction } from './src/presentation/DevFixturePanel';
import { devShopRows } from './src/shop';
import type { DevPetPreview } from './src/onboarding/devOnboarding';

const PET_ID = 'dev-local-pet-1';
const HOUR_MS = 3_600_000;
type AppMealCuePolicy = { mode: MealCue['mode']; atMs?: () => number | null };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function actionRejectionText(error: DomainActionRejected): string {
  switch (error.code) {
    case 'no_food': return '먹이가 아직 없어요. 합성 활동으로 먹이를 얻을 수 있어요.';
    case 'not_hungry': return '지금은 배가 고프지 않아요.';
    case 'sleeping': return '쉬는 중에는 먹지 않아요.';
    case 'hibernating': return '동면 중이에요. 앱으로 돌아온 뒤 다시 해 주세요.';
    case 'table_required': return '자동급식에는 식탁 설치가 필요해요.';
    case 'auto_feed_disabled': return '자동급식 설정을 확인해 주세요.';
    case 'stale_meal_state': return '상태가 바뀌었어요. 다시 확인해 주세요.';
  }
}

function journalText(event: DomainEvent): string {
  switch (event.type) {
    case 'MealConsumed': return `먹이 1개를 먹었어요 (${event.mode === 'auto' ? '자동' : '직접'}).`;
    case 'ActivityRewarded': return `합성 활동 정산: 먹이 +${event.deltaFood}, 코인 +${event.deltaCoin}`;
    case 'InteractionObserved': return '함께 시간을 보냈어요.';
    case 'Cleaned': return `방을 청소했어요 (${event.removed}개).`;
    case 'Hibernated': return '잠시 동면에 들어갔어요.';
    case 'Returned': return '방으로 돌아왔어요.';
    case 'SleepChanged': return event.sleeping ? '쉬기 시작했어요.' : '일어났어요.';
    case 'AutoFeedChanged': return event.enabled ? '자동급식을 켰어요.' : '자동급식을 껐어요.';
    case 'FacilityInstalled': return event.facility === 'table' ? '식탁을 놓았어요.' : '화장실을 놓았어요.';
    case 'ConditionChanged': return event.condition === 'well' ? '기운을 되찾았어요.' : '상태가 바뀌었어요.';
    case 'SleepMultiplierFixtureChanged': return '합성 수면 배율을 설정했어요.';
  }
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'loading' | 'onboarding' | 'room' | 'load_error'>('loading');
  const [pet, setPet] = useState<PetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [devVisible, setDevVisible] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mealCue, setMealCue] = useState<MealCue | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const databaseRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const connectionRef = useRef<SqlConnection | null>(null);
  const serviceRef = useRef<DevLifeService | null>(null);
  const petRef = useRef<PetState | null>(null);
  const retryRef = useRef<(() => Promise<PetState | void>) | null>(null);
  const pendingLifecycleRef = useRef<(() => Promise<PetState | void>) | null>(null);
  const runTaskRef = useRef<(task: () => Promise<PetState | void>) => Promise<void>>(async () => undefined);
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

  const runTask = useCallback(async (task: () => Promise<PetState | void>, cue?: AppMealCuePolicy) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const beforeExp = petRef.current?.totalExpUnits ?? 0;
      const state = await task();
      if (state) publish(state);
      if (state && cue && state.totalExpUnits > beforeExp && serviceRef.current) {
        try {
          const atMs = cue.atMs?.();
          const entries = await serviceRef.current.readJournal();
          const policy: MealCuePolicy = { mode: cue.mode, atMs };
          const confirmed = confirmedMealCue(beforeExp, state.totalExpUnits, entries, policy, PET_ID);
          if (confirmed) setMealCue(confirmed);
        } catch { /* A visual cue must never turn a committed meal into a failed command. */ }
      }
      retryRef.current = null;
      setFailure(null);
    } catch (error) {
      if (error instanceof DomainActionRejected || error instanceof DevInputRejected) {
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
        retryRef.current = task; // Retains the same command ID and time after an uncertain write.
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
  }, [publish]);

  useEffect(() => { runTaskRef.current = runTask; }, [runTask]);

  const runLifecycle = useCallback((task: () => Promise<PetState | void>) => {
    if (busyRef.current) pendingLifecycleRef.current = task;
    else void runTask(task);
  }, [runTask]);

  const initialize = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    setPhase('loading');
    try {
      if (!databaseRef.current) databaseRef.current = await SQLite.openDatabaseAsync('arucon-dev.db');
      if (!connectionRef.current) connectionRef.current = expoSqliteConnection(databaseRef.current);
      const connection = connectionRef.current;
      const store = new LocalPetStore(connection, DEV_GAME_CONFIG);
      await store.migrate();
      // A corrupt or orphaned ledger throws here and must remain a visible load error.
      const existing = await store.loadPet(PET_ID);
      if (!existing) {
        setPhase('onboarding');
      } else {
        const service = new DevLifeService(store, connection, PET_ID);
        serviceRef.current = service;
        publish(existing);
        const now = monotonicDevTime(Date.now(), clockRef.current, existing.lastSimulatedAtMs);
        publish(await service.returnToForeground(now));
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
  }, [publish]);

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
      const task = next === 'active' ? () => service.returnToForeground(eventTime())
        : wasActive ? () => service.leaveForeground(eventTime()) : null;
      if (!task) return;
      if (retryRef.current) pendingLifecycleRef.current = task;
      else runLifecycle(task);
    });
    return () => subscription.remove();
  }, [runLifecycle]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active' || !serviceRef.current || retryRef.current || busyRef.current) return;
      const service = serviceRef.current;
      const now = serviceTime();
      void runTask(() => service.leaveForeground(now));
    }, 30 * 60 * 1_000);
    return () => clearInterval(timer);
  }, [runTask, serviceTime]);

  const startDevPet = useCallback((result: DevPetPreview) => {
    const connection = connectionRef.current;
    if (!connection || retryRef.current) return;
    const createdAtMs = serviceTime();
    void runTask(async () => {
      const service = await createDevLifeService(connection, PET_ID, result.givenName, 'reserved', createdAtMs);
      serviceRef.current = service;
      const state = await service.returnToForeground(createdAtMs);
      setPhase('room');
      return state;
    });
  }, [runTask, serviceTime]);

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
    switch (action) {
      case 'feed': void runTask(() => service.feedDirect(now, id), { mode: 'direct' }); break;
      case 'toggle_auto': void runTask(() => service.setAutoFeed(now, id, !state.autoFeedOptIn), { mode: 'auto', atMs: () => now }); break;
      case 'sleep_or_wake': void runTask(() => state.sleeping ? service.wake(now, id) : service.sleep(now, id), { mode: 'auto', atMs: () => now }); break;
      case 'clean': void runTask(() => service.clean(now, id)); break;
      case 'touch': void runTask(() => service.interact(now, id, 'touch')); break;
    }
  }, [actionId, runTask, serviceTime]);

  const doDevAction = useCallback((action: DevFixtureAction) => {
    const service = serviceRef.current;
    const state = petRef.current;
    if (!service || !state || retryRef.current) return;
    const now = serviceTime();
    const id = actionId(action);
    switch (action) {
      case 'synthetic_walk':
        {
        const prepare = retryStableSyntheticWalk(() => service.currentState(), now);
        let cueAtMs: number | null = null;
        void runTask(async () => {
          const prepared = await prepare();
          cueAtMs = prepared.atMs;
          return service.receiveActivity(prepared.activity, prepared.atMs);
        }, { mode: 'auto', atMs: () => cueAtMs });
        break;
        }
      case 'advance_three_hours': {
        const target = now + 3 * HOUR_MS;
        void runTask(async () => {
          const result = await service.advanceTo(target);
          clockRef.current = Math.max(clockRef.current, target);
          return result;
        });
        break;
      }
      case 'install_table': void runTask(() => service.installFacilityFixture(now, id, 'table')); break;
      case 'install_toilet': void runTask(() => service.installFacilityFixture(now, id, 'toilet')); break;
      case 'sleep_fixture': void runTask(() => service.setSleepMultiplierFixture(now, id, 1.2)); break;
      case 'shop_preview':
        setJournal(null);
        setPreview(devShopRows().map(row => `${row.label}: ${row.priceLabel}`).join('\n'));
        break;
      case 'widget_preview':
        void runTask(async () => {
          const projection = await service.readWidgetProjection(now);
          setJournal(null);
          setPreview(`읽기 전용 위젯 · ${projection.formId} · ${projection.displayState}\n마지막 게임 시각 ${new Date(projection.updatedAtMs).toLocaleString()}`);
        });
        break;
    }
  }, [actionId, runTask, serviceTime]);

  if (phase === 'loading') return <View style={styles.center}><Text>로컬 방을 여는 중…</Text></View>;
  if (phase === 'load_error') return <View style={styles.center}>
    <Text style={styles.errorTitle}>저장된 방을 열지 못했어요.</Text>
    <Text>{failure}</Text>
    <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retry}><Text>다시 시도</Text></Pressable>
  </View>;
  if (phase === 'onboarding') return <View style={[styles.onboarding, { paddingTop: insets.top + 20 }]}>
    <DevOnboardingScreen onPreview={startDevPet} />
    {busy && <Text>로컬 펫을 만드는 중…</Text>}
    {failure && <View style={styles.errorBox}><Text>{failure}</Text><Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable></View>}
  </View>;
  if (!pet) return <View style={styles.center}><Text>펫 상태를 다시 읽는 중…</Text></View>;

  return <View style={styles.root}>
    <View style={StyleSheet.absoluteFill}>
      <AruconRoom
        mealCue={mealCue ?? undefined}
        personality={pet.personalityProfileId === 'expressive' ? 'expressive' : 'reserved'}
        sleeping={pet.sleeping || pet.hibernating}
        reducedMotion={reducedMotion}
        tableInstalled={pet.tableInstalled}
        toiletInstalled={pet.toiletInstalled}
        ballVisible
        onPetTouch={() => doLifeAction('touch')}
        onFurnitureHit={name => {
          if (name === 'table') setNotice('자동급식은 아래 버튼에서 설정할 수 있어요.');
          else if (name === 'cushion') doLifeAction('sleep_or_wake');
          else if (name === 'toilet') setNotice('화장실이 청결을 도와줘요.');
          else setNotice('공을 바라보고 있어요.');
        }}
        onStatus={setNotice}
      />
    </View>
    <View style={[styles.topBadge, { top: insets.top + 8 }]}>
      <Text style={styles.badgeText}>DEV_FIXTURE_ONLY</Text>
      <Pressable accessibilityRole="button" onPress={() => setDevVisible(value => !value)}>
        <Text style={styles.badgeText}>{devVisible ? '개발 패널 닫기' : '개발 패널'}</Text>
      </Pressable>
    </View>
    <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {failure && <View style={styles.errorBox}>
        <Text>저장 중 오류: {failure}</Text>
        <Pressable accessibilityRole="button" onPress={retry}><Text>같은 요청 다시 시도</Text></Pressable>
      </View>}
      {busy && <Text style={styles.notice}>저장 중…</Text>}
      {journal && <ScrollView style={styles.preview}><Text>생활 기록</Text>{journal.map(entry => <Text key={entry.id}>{journalText(entry.event)}</Text>)}</ScrollView>}
      {preview && <ScrollView style={styles.preview}><Text>{preview}</Text></ScrollView>}
      {devVisible && <ScrollView style={styles.devScroll}><DevFixturePanel onAction={doDevAction} /></ScrollView>}
      <LifeRoomControls state={pet} onAction={doLifeAction} />
    </View>
  </View>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2ebdc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#f2ebdc' },
  onboarding: { flex: 1, backgroundColor: '#f2ebdc' },
  topBadge: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff9eddd', padding: 10, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#604638' },
  bottom: { position: 'absolute', left: 8, right: 8, gap: 6 },
  notice: { alignSelf: 'center', backgroundColor: '#fff9eddd', padding: 6, borderRadius: 8, color: '#604638' },
  preview: { maxHeight: 110, backgroundColor: '#fff9ed', borderRadius: 12, padding: 10 },
  devScroll: { maxHeight: 180 },
  errorBox: { backgroundColor: '#ffdfd6', padding: 10, borderRadius: 10, gap: 6 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  retryButton: { backgroundColor: '#fff9ed', padding: 10, borderRadius: 10 },
});

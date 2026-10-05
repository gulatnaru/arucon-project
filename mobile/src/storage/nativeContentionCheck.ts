import { openDatabaseAsync } from 'expo-sqlite';
import { expoSqliteConnection, LocalPetStore } from './sqlite';
import { sqliteAccessTrace } from './sqliteAccess';
import { initialPet } from '../domain/model';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import { LifeMemoryStore } from '../living/memory';
import { emptyLifeMemory, rememberLifeCompletion } from '../living/content';
import { ApprovedMvpService } from '../application/approvedMvpService';
import { approvedSyntheticSleepFixture } from '../presentation/approvedPresentation';

/** Explicit local native QA. Never opens the ordinary or experience databases.
 * First reproduces the former uncoordinated native step/finalize failure, then
 * stresses the real adapter across two handles with atomic economy retries. */
export async function checkNativeContention() {
  const name = `arucon-storage-check-${Date.now()}.db`;
  const db = await openDatabaseAsync(name, { useNewConnection: true });
  const other = await openDatabaseAsync(name, { useNewConnection: true });
  const atMs = Date.now();
  let release!: () => void; let entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const observed: { phase: string; message: string }[] = [];
  let holder: Promise<void> | null = null;
  try {
    await db.execAsync('CREATE TABLE contention_probe (id INTEGER PRIMARY KEY, value INTEGER); INSERT INTO contention_probe VALUES (1,0)');
    holder = db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync('UPDATE contention_probe SET value=value+1 WHERE id=1'); entered(); await gate;
    });
    await Promise.race([ready, holder.then(() => { throw new Error('Contention holder ended before its gate'); })]);
    const statement = await other.prepareAsync('UPDATE contention_probe SET value=value+1 WHERE id=1');
    try { await statement.executeAsync(); }
    catch (error) { observed.push({ phase: 'execute', message: String(error) }); }
    finally {
      try { await statement.finalizeAsync(); }
      catch (error) { observed.push({ phase: 'finalize', message: String(error) }); }
      release(); await holder;
    }
    if (!observed.some(x => x.phase === 'execute' && /locked|BUSY/iu.test(x.message))) throw new Error('Native contention reproduction did not produce its expected execute failure');
    const a = expoSqliteConnection(db), b = expoSqliteConnection(other);
    const store = new LocalPetStore(a, APPROVED_GAME_CONFIG);
    await store.migrate();
    const petId = 'native-save-check';
    await store.createPet({ ...initialPet(petId, '저장 시험', 'reserved', atMs, APPROVED_GAME_CONFIG), food: 2, tableInstalled: true });
    const service = await ApprovedMvpService.initialize(a, { petId, givenName: '저장 시험', personalityProfileId: 'reserved', createdAtMs: atMs });
    const memory = new LifeMemoryStore(b, petId); await memory.load();
    const snapshot = emptyLifeMemory(petId); rememberLifeCompletion(snapshot, 'touch', atMs);
    await b.execAsync('CREATE TABLE presentation_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const command = { type: 'consumeMeal' as const, commandId: 'native-same-request', mealId: 'native-one-meal', mode: 'direct' as const, observedAtMs: atMs };
    const jobs: Promise<unknown>[] = [];
    for (let i = 0; i < 30; i++) {
      jobs.push(store.execute(petId, command), memory.save(snapshot),
        b.runAsync("INSERT INTO presentation_settings VALUES ('experience',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [`check-${i}`]),
        service.interact(atMs, `native-touch:${i}`, 'touch', new Date(atMs).toISOString().slice(0,10)),
        service.advanceForeground(atMs));
    }
    const results = await Promise.allSettled(jobs);
    const failures = results.filter(x => x.status === 'rejected').map(x => String((x as PromiseRejectedResult).reason));
    const direct = (await store.loadPet(petId))!;
    const directMeals = await a.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?', [petId]);
    if (failures.length || direct.food !== 1 || direct.totalExpUnits !== 15_000_000 || directMeals?.count !== 1) throw new Error(`Native coordinated requests failed: ${JSON.stringify({ failures, food: direct.food, exp: direct.totalExpUnits, directMeals })}`);
    await service.setAutoFeed(atMs, 'native-auto-consent', true);
    const autoAt = atMs + 3 * 3_600_000;
    await service.advanceForeground(autoAt);
    await service.sleep(autoAt, 'native-once-sleep');
    const wakeAt = autoAt + 4 * 3_600_000;
    await service.advanceForeground(wakeAt);
    await service.applySyntheticSleep(approvedSyntheticSleepFixture(wakeAt,100), wakeAt);
    const recovered = await service.wake(wakeAt, 'native-once-wake');
    const replay = await service.wake(wakeAt, 'native-once-wake');
    if (JSON.stringify(recovered) !== JSON.stringify(replay)) throw new Error('Native wake retry changed the committed state');
    const state = (await store.loadPet(petId))!;
    const meals = await a.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?', [petId]);
    const integrity = await a.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
    if (state.food !== 0 || state.totalExpUnits !== 30_000_000 || meals?.count !== 2 || integrity?.integrity_check !== 'ok') {
      throw new Error(`Native coordinated save check failed: ${JSON.stringify({ failures, food: state.food, exp: state.totalExpUnits, meals, integrity })}`);
    }
    return { status: 'PASS_NATIVE_SQLITE' as const, name, operations: jobs.length, before: observed,
      after: { failures, sameRequestDirectMeals: directMeals.count, automaticMeals: 1, wakeReplayUnchanged: true,
        food: state.food, totalExpUnits: state.totalExpUnits, meals: meals.count, integrity: integrity.integrity_check },
      trace: sqliteAccessTrace().filter(x => x.file === name) };
  } finally {
    release?.();
    // Even a prepare/holder failure must drain the temporary transaction before
    // closing the two fixture handles. Never close over pending native work.
    if (holder) await holder;
    await other.closeAsync(); await db.closeAsync();
  }
}

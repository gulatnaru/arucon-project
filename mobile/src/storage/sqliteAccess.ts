import type { SQLiteDatabase } from 'expo-sqlite';

/** One lane per native file, including reads and settings. Only an executor
 * owned by the active transaction bypasses it. Connections belong to the app. */
type Lane = { tail: Promise<void>; waiting: number };
const lanes = new Map<string, Lane>();
const anonymous = new WeakMap<SQLiteDatabase, Lane>();
type Phase = 'prepare' | 'execute' | 'read' | 'finalize' | 'transaction';
export type SqlAccessTrace = Readonly<{ id: number; file: string; operation: string;
  phase: Phase; status: 'start' | 'complete' | 'failed' | 'cleanup_failed'; atMs: number; waiting: number; error?: string }>;
let sequence = 0;
const trace: SqlAccessTrace[] = [];
export const sqliteAccessTrace = () => trace.map(entry => ({ ...entry }));
function laneFor(db: SQLiteDatabase): Lane {
  const path = db.databasePath;
  let lane = path ? lanes.get(path) : anonymous.get(db);
  if (!lane) {
    lane = { tail: Promise.resolve(), waiting: 0 };
    if (path) lanes.set(path, lane); else anonymous.set(db, lane);
  }
  return lane;
}
function operation(sql: string) {
  // Bind values, names, snapshots, and health records never enter the trace.
  const verb = sql.trim().match(/^\w+/u)?.[0]?.toUpperCase() ?? 'SQL';
  const table = sql.match(/\b(?:FROM|INTO|UPDATE|TABLE(?: IF NOT EXISTS)?)\s+([a-z_][a-z0-9_]*)/iu)?.[1];
  return `${verb}${table ? ` ${table}` : ''}`;
}
function record(db: SQLiteDatabase, sql: string, phase: Phase, status: SqlAccessTrace['status'], error?: unknown) {
  trace.push({ id: ++sequence, file: db.databasePath?.split('/').pop() ?? 'test', operation: operation(sql),
    phase, status, atMs: Date.now(), waiting: laneFor(db).waiting,
    ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}) });
  if (trace.length > 256) trace.splice(0, trace.length - 256);
}
export function inSqliteLane<T>(db: SQLiteDatabase, work: () => Promise<T>): Promise<T> {
  const lane = laneFor(db); lane.waiting++;
  const result = lane.tail.then(async () => { lane.waiting--; return work(); });
  lane.tail = result.then(() => undefined, () => undefined);
  return result;
}
export class SqlOperationError extends Error {
  readonly cause: unknown;
  cleanupError?: unknown;
  constructor(readonly phase: Phase, readonly operation: string, cause: unknown) {
    super(`${operation} (${phase}): ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'SqlOperationError'; this.cause = cause;
  }
}
/** finalize can return the preceding step error. Keep that first failure and
 * still release each statement once; no Expo internals are patched. */
export async function nativeStatement<T>(db: SQLiteDatabase, sql: string,
  params: readonly (string | number | null)[], mode: 'run' | 'first' | 'all'): Promise<T> {
  let phase: Phase = 'prepare'; record(db, sql, phase, 'start');
  let statement: Awaited<ReturnType<SQLiteDatabase['prepareAsync']>>;
  try { statement = await db.prepareAsync(sql); }
  catch (error) { record(db, sql, phase, 'failed', error); throw new SqlOperationError(phase, operation(sql), error); }
  let value: unknown;
  let primary: SqlOperationError | undefined;
  try {
    phase = 'execute';
    const result = await statement.executeAsync([...params]);
    phase = 'read';
    value = mode === 'first' ? await result.getFirstAsync() : mode === 'all' ? await result.getAllAsync() : result;
  } catch (error) { record(db, sql, phase, 'failed', error); primary = new SqlOperationError(phase, operation(sql), error); }
  try { await statement.finalizeAsync(); }
  catch (error) {
    record(db, sql, 'finalize', primary ? 'cleanup_failed' : 'failed', error);
    if (primary) primary.cleanupError = error; else primary = new SqlOperationError('finalize', operation(sql), error);
  }
  if (primary) throw primary;
  record(db, sql, 'finalize', 'complete'); return value as T;
}
export function traceTransaction(db: SQLiteDatabase, status: SqlAccessTrace['status'], error?: unknown) {
  record(db, 'TRANSACTION', 'transaction', status, error);
}

import type { SqlAccessTrace } from './sqliteAccess';
import { sqliteResourceCode, type StorageEnvironment, type StorageIncident } from './storageIncident';

export const DIAGNOSTIC_FILES = ['arucon-storage-incidents.json', 'arucon-storage-incidents-backup.json'] as const;
export const MAX_DIAGNOSTIC_BYTES = 1_048_576;
type Slot = typeof DIAGNOSTIC_FILES[number];
type Io = { read(file: Slot): string | null; write(file: Slot, text: string): void };
type Checkpoint = { schemaVersion: 1 | 2; generation: number; incidents: StorageIncident[] };
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const integer = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const bounded = (x: unknown, limit: number): x is string => typeof x === 'string' && x.length <= limit;
const flag = (x: unknown): x is boolean | null => x === null || typeof x === 'boolean';

function trace(x: unknown): SqlAccessTrace {
  if (!object(x) || !integer(x.id) || !integer(x.atMs) || !integer(x.waiting) || !integer(x.connectionId)
    || (x.transactionId !== undefined && !integer(x.transactionId))
    || !bounded(x.file, 255) || /[/\\\0]/u.test(x.file)
    || !bounded(x.operation, 128) || !/^[A-Z]+(?: [a-z_][a-z0-9_]*)?$/u.test(x.operation)
    || typeof x.phase !== 'string' || !['prepare','execute','read','finalize','transaction'].includes(x.phase)
    || typeof x.status !== 'string' || !['start','complete','failed','cleanup_failed'].includes(x.status)
    || (x.error !== undefined && !bounded(x.error, 4096))) throw new Error('Invalid diagnostic trace');
  return { id: x.id, atMs: x.atMs, waiting: x.waiting, connectionId: x.connectionId,
    file: x.file, operation: x.operation, phase: x.phase as SqlAccessTrace['phase'], status: x.status as SqlAccessTrace['status'],
    ...(x.transactionId !== undefined ? { transactionId: x.transactionId as number } : {}),
    ...(x.error !== undefined ? { error: x.error as string } : {}) };
}
function environment(x: unknown): StorageEnvironment {
  if (!object(x) || !(x.availableBytes === null || integer(x.availableBytes))
    || !bounded(x.mainUri, 2048) || !x.mainUri.startsWith('file:')
    || !['mainExists','parentExists','journalExists','walExists','tempDirectoryExists'].every(k => flag(x[k]))
    || x.attemptedVfsPath !== 'NOT_EXPOSED_BY_EXPO' || !bounded(x.note, 1024)) throw new Error('Invalid diagnostic environment');
  return { availableBytes: x.availableBytes as number | null, mainUri: x.mainUri,
    mainExists: x.mainExists as boolean | null, parentExists: x.parentExists as boolean | null,
    journalExists: x.journalExists as boolean | null, walExists: x.walExists as boolean | null,
    tempDirectoryExists: x.tempDirectoryExists as boolean | null,
    attemptedVfsPath: 'NOT_EXPOSED_BY_EXPO', note: x.note };
}
function incident(x: unknown): StorageIncident {
  if (!object(x) || !integer(x.code) || ![13,14].includes(x.code & 255)
    || !Array.isArray(x.cleanup) || x.cleanup.length > 4
    || (x.sessionId !== undefined && !bounded(x.sessionId, 128))) throw new Error('Invalid storage incident');
  const first = trace(x.first), cleanup = x.cleanup.map(trace), recovery = x.recovery === undefined ? undefined : trace(x.recovery);
  if (first.status !== 'failed' || sqliteResourceCode(first.error) !== x.code
    || cleanup.some(c => c.status !== 'cleanup_failed' || c.file !== first.file)
    || (recovery && (recovery.operation !== 'TRANSACTION' || recovery.status !== 'complete' || recovery.file !== first.file))) {
    throw new Error('Invalid incident sequence');
  }
  return { sessionId: x.sessionId as string | undefined, code: x.code, first, environment: environment(x.environment), cleanup,
    ...(recovery ? { recovery } : {}) };
}
function decode(text: string): Checkpoint {
  if (text.length > 262_144) throw new Error('Diagnostic checkpoint exceeds limit');
  let x: unknown;
  try { x = JSON.parse(text); } catch { throw new Error('Invalid diagnostic JSON'); }
  if (!object(x) || (x.schemaVersion !== 1 && x.schemaVersion !== 2) || !Array.isArray(x.incidents) || x.incidents.length > 8
    || (x.schemaVersion === 2 && (!integer(x.generation) || x.generation >= Number.MAX_SAFE_INTEGER))) throw new Error('Invalid diagnostic checkpoint');
  return { schemaVersion: x.schemaVersion as 1 | 2, generation: x.schemaVersion === 1 ? 0 : x.generation as number,
    incidents: x.incidents.map(incident) };
}

/** Two bounded cache slots. A failed/truncated write cannot replace the last
 * complete checkpoint. No DB, deletion, connection recovery or atomic-write claim. */
export class StorageDiagnosticArchive {
  private active?: Slot;
  private generation = 0;
  readonly readErrors: string[] = [];
  constructor(private readonly io: Io) {}
  restore(): StorageIncident[] {
    let best: Checkpoint | undefined;
    for (const file of DIAGNOSTIC_FILES) {
      try {
        const text = this.io.read(file); if (text === null) continue;
        const candidate = decode(text);
        if (!best || candidate.generation > best.generation) { best = candidate; this.active = file; }
      } catch (error) { this.readErrors.push(`${file}: ${String(error).slice(0, 512)}`); }
    }
    this.generation = best?.generation ?? 0;
    return best?.incidents ?? [];
  }
  save(snapshot: { incidents: StorageIncident[]; [key: string]: unknown }) {
    const next = this.generation + 1;
    const file = this.active === DIAGNOSTIC_FILES[0] ? DIAGNOSTIC_FILES[1] : DIAGNOSTIC_FILES[0];
    const text = JSON.stringify({ ...snapshot, schemaVersion: 2, generation: next }, null, 2);
    decode(text); // Check size and whitelist before touching the other slot.
    this.io.write(file, text);
    if (this.io.read(file) !== text) throw new Error('Diagnostic checkpoint verification failed');
    this.generation = next; this.active = file;
  }
  state() { return { generation: this.generation, activeFile: this.active ?? null, readErrors: [...this.readErrors] }; }
}

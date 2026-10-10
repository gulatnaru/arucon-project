import type { SqlAccessTrace } from './sqliteAccess';
export function sqliteResourceCode(error: unknown): number | null {
  let value = error; const seen = new Set<unknown>();
  for (let depth = 0; depth < 6 && value && !seen.has(value); depth++) {
    seen.add(value); const message = value instanceof Error ? value.message : typeof value === 'string' ? value : '';
    const code = message.match(/(?:Error code|SQLITE code)\s*:?\s*(\d+)/iu)?.[1];
    if (code && [13,14].includes(Number(code) & 255)) return Number(code);
    if (/SQLITE_CANTOPEN/iu.test(message)) return 14;
    if (/SQLITE_FULL/iu.test(message)) return 13;
    value = typeof value === 'object' && value !== null && 'cause' in value ? value.cause : null;
  }
  return null;
}
export type StorageEnvironment = Readonly<{ availableBytes: number | null; mainUri: string;
  mainExists: boolean | null; parentExists: boolean | null; journalExists: boolean | null; walExists: boolean | null;
  tempDirectoryExists: boolean | null; attemptedVfsPath: 'NOT_EXPOSED_BY_EXPO'; note: string }>;
export type StorageIncident = { first: SqlAccessTrace; code: number; environment: StorageEnvironment;
  cleanup: SqlAccessTrace[]; recovery?: SqlAccessTrace };
/** First failure survives the ordinary256-entry ring. No SQL/parameters/pet snapshots. */
export class StorageIncidentRecorder {
  private incidents: StorageIncident[] = [];
  observe(entry: SqlAccessTrace, environment: () => StorageEnvironment) {
    let changed = false;
    const code = sqliteResourceCode(entry.error);
    if (entry.status === 'failed' && code !== null && !this.incidents.some(x => x.first.file === entry.file && x.code === code && !x.recovery)) {
      this.incidents.push({ first: { ...entry }, code, environment: environment(), cleanup: [] });
      changed = true;
      if (this.incidents.length > 8) this.incidents.shift();
    }
    for (const incident of this.incidents) {
      if (incident.first.file !== entry.file) continue;
      if (entry.status === 'cleanup_failed' && entry.transactionId === incident.first.transactionId && incident.cleanup.length < 4) { incident.cleanup.push({ ...entry }); changed = true; }
      if (!incident.recovery && entry.operation === 'TRANSACTION' && entry.status === 'complete' && entry.id > incident.first.id) { incident.recovery = { ...entry }; changed = true; }
    }
    return changed;
  }
  snapshot() { return this.incidents.map(x => ({ ...x, first: { ...x.first }, environment: { ...x.environment }, cleanup: x.cleanup.map(c => ({ ...c })), ...(x.recovery ? { recovery: { ...x.recovery } } : {}) })); }
}

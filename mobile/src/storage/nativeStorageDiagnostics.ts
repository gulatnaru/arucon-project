import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import { observeSqliteAccess, sqliteAccessTrace } from './sqliteAccess';
import { StorageIncidentRecorder, type StorageEnvironment } from './storageIncident';
const recorder = new StorageIncidentRecorder();
let references = 0, stop: (() => void) | undefined, writingError: string | undefined;
const safely = <T>(read: () => T): T | null => { try { return read(); } catch { return null; } };
export function storageEnvironment(databasePath: string): StorageEnvironment {
  const mainUri = databasePath.startsWith('file:') ? databasePath : 'file://' + databasePath;
  const parent = mainUri.slice(0, mainUri.lastIndexOf('/'));
  const container = Paths.document.uri.replace(/\/Documents\/?$/u, '');
  return { availableBytes: safely(() => Paths.availableDiskSpace), mainUri,
    mainExists: safely(() => new File(mainUri).exists), parentExists: safely(() => new Directory(parent).exists),
    journalExists: safely(() => new File(mainUri + '-journal').exists), walExists: safely(() => new File(mainUri + '-wal').exists),
    tempDirectoryExists: safely(() => new Directory(container, 'tmp').exists), attemptedVfsPath: 'NOT_EXPOSED_BY_EXPO',
    note: 'File states observed at failure; main/derived journal/temp candidates are not a captured VFS xOpen path.' };
}
export function storageDiagnosticsSnapshot() { return { schemaVersion: 1, incidents: recorder.snapshot(), trace: sqliteAccessTrace(), diagnosticWriteError: writingError }; }
function persist() {
  if (!recorder.snapshot().length) return;
  try { new File(Paths.cache, 'arucon-storage-incidents.json').write(JSON.stringify(storageDiagnosticsSnapshot(), null, 2)); writingError = undefined; }
  catch (error) { writingError = String(error).slice(0,512); }
}
/** Passive first-error capture; never retries/closes/recreates a player database. */
export function installStorageDiagnostics() {
  if (++references === 1) {
    const unobserve = observeSqliteAccess((db, entry) => {
      if (recorder.observe(entry, () => storageEnvironment(db.databasePath))) queueMicrotask(persist);
    });
    const subscription = AppState.addEventListener('change', x => { if (x === 'active') persist(); });
    stop = () => { unobserve(); subscription.remove(); };
  }
  return () => { if (--references === 0) { stop?.(); stop = undefined; } };
}

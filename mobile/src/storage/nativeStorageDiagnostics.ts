import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import { observeSqliteAccess, sqliteAccessTrace } from './sqliteAccess';
import { StorageIncidentRecorder, type StorageEnvironment } from './storageIncident';
import { MAX_DIAGNOSTIC_BYTES, StorageDiagnosticArchive } from './storageDiagnosticArchive';
const recorder = new StorageIncidentRecorder();
let references = 0, stop: (() => void) | undefined, writingError: string | undefined;
let loaded = false;
const archive = new StorageDiagnosticArchive({
  read: name => {
    const file = new File(Paths.cache, name); if (!file.exists) return null;
    if (file.size > MAX_DIAGNOSTIC_BYTES) throw new Error('Diagnostic file exceeds read limit');
    return file.textSync();
  },
  write: (name, text) => new File(Paths.cache, name).write(text),
});
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
export function storageDiagnosticsSnapshot() { return { schemaVersion: 2, sessionId: recorder.sessionId,
  incidents: recorder.snapshot(), archive: archive.state(), trace: sqliteAccessTrace(), diagnosticWriteError: writingError }; }
function persist() {
  if (!recorder.snapshot().length) return;
  try { archive.save(storageDiagnosticsSnapshot()); writingError = undefined; }
  catch (error) { writingError = String(error).slice(0,512); }
}
/** Passive first-error capture; never retries/closes/recreates a player database. */
export function installStorageDiagnostics() {
  if (++references === 1) {
    if (!loaded) { recorder.restore(archive.restore()); loaded = true; }
    const unobserve = observeSqliteAccess((db, entry) => {
      if (recorder.observe(entry, () => storageEnvironment(db.databasePath))) queueMicrotask(persist);
    });
    const subscription = AppState.addEventListener('change', x => { if (x === 'active') persist(); });
    stop = () => { unobserve(); subscription.remove(); };
  }
  return () => { if (--references === 0) { stop?.(); stop = undefined; } };
}

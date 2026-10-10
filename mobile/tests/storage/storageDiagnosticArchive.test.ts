import test from 'node:test';
import assert from 'node:assert/strict';
import { DIAGNOSTIC_FILES, StorageDiagnosticArchive } from '../../src/storage/storageDiagnosticArchive';
import { StorageIncidentRecorder, type StorageIncident } from '../../src/storage/storageIncident';
import type { SqlAccessTrace } from '../../src/storage/sqliteAccess';

const first = (id = 1): SqlAccessTrace => ({ id, file: 'player.db', operation: 'UPDATE pet_snapshot',
  phase: 'execute', status: 'failed', atMs: id, waiting: 0, connectionId: 1, transactionId: 2,
  error: 'Error code 14: unable to open database file' });
const sample = (id = 1): StorageIncident => ({ first: first(id), code: 14, cleanup: [],
  environment: { availableBytes: 127 * 1024 * 1024, mainUri: 'file:///test/player.db',
    mainExists: true, parentExists: true, journalExists: false, walExists: false,
    tempDirectoryExists: true, attemptedVfsPath: 'NOT_EXPOSED_BY_EXPO', note: 'observed, not xOpen' } });
function fixture() {
  const files = new Map<string, string>();
  const io = { read: (file: string) => files.get(file) ?? null, write: (file: string, text: string) => { files.set(file, text); } };
  return { files, io, archive: () => new StorageDiagnosticArchive(io) };
}
test('legacy first failure survives restart, recycled IDs and a new failure in the same file', () => {
  const f = fixture(); f.files.set(DIAGNOSTIC_FILES[0], JSON.stringify({ schemaVersion: 1, incidents: [sample(1)] }));
  const a = f.archive(), r = new StorageIncidentRecorder('new-process'); r.restore(a.restore());
  assert.equal(r.snapshot().length, 1);
  assert.equal(r.observe({ ...first(3), operation: 'TRANSACTION', phase: 'transaction', status: 'complete', error: undefined }, () => sample().environment), false);
  assert.equal(r.observe({ ...first(4), phase: 'finalize', status: 'cleanup_failed' }, () => sample().environment), false);
  assert.equal(r.snapshot()[0].recovery, undefined); assert.equal(r.snapshot()[0].cleanup.length, 0);
  r.observe(first(1), () => sample().environment); assert.equal(r.snapshot().length, 2);
  a.save({ incidents: r.snapshot() });
  assert.equal(f.archive().restore().length, 2); assert.deepEqual(f.archive().restore()[0].first, sample().first);
});
test('truncated resource-failure writes leave the last complete checkpoint restorable', () => {
  const f = fixture(), a = f.archive(); a.restore(); a.save({ incidents: [sample(1)] });
  const previous = f.files.get(DIAGNOSTIC_FILES[0]);
  const broken = new StorageDiagnosticArchive({ ...f.io, write: (file, text) => { f.files.set(file, text.slice(0, 40)); throw new Error('disk full'); } });
  broken.restore(); assert.throws(() => broken.save({ incidents: [sample(1), sample(2)] }), /disk full/u);
  assert.equal(f.files.get(DIAGNOSTIC_FILES[0]), previous);
  const reopened = f.archive(); assert.equal(reopened.restore().length, 1); assert.equal(reopened.state().readErrors.length, 1);
  reopened.save({ incidents: [sample(1), sample(2)] }); assert.equal(f.archive().restore().length, 2);
});
test('reported write success is verified; a silent partial write does not advance generation', () => {
  const f = fixture(), a = f.archive(); a.restore(); a.save({ incidents: [sample()] });
  const broken = new StorageDiagnosticArchive({ ...f.io, write: (file, text) => { f.files.set(file, text.slice(0, 40)); } });
  broken.restore(); assert.throws(() => broken.save({ incidents: [sample(), sample(2)] }), /verification failed/u);
  assert.equal(broken.state().generation, 1); assert.equal(f.archive().restore().length, 1);
});
test('highest complete generation wins and corrupted metadata is rejected without trusting raw payloads', () => {
  const f = fixture(), a = f.archive(); a.restore(); a.save({ incidents: [sample(1)] }); a.save({ incidents: [sample(1), sample(2)] });
  assert.equal(f.archive().restore().length, 2);
  f.files.set(DIAGNOSTIC_FILES[0], JSON.stringify({ schemaVersion: '2', generation: 99, incidents: [sample()] }));
  assert.equal(f.archive().restore().length, 2);
  f.files.set(DIAGNOSTIC_FILES[1], JSON.stringify({ schemaVersion: 2, generation: 100, incidents: [{ ...sample(), first: { ...first(), operation: 'UPDATE pet_snapshot SET secret=?' } }] }));
  assert.equal(f.archive().restore().length, 0);
  const r = f.archive(); r.restore(); assert.equal(r.state().readErrors.length, 2);
});
test('corrupted arrays cannot masquerade as phase or status enum strings', () => {
  for (const patch of [{ phase: ['execute'] }, { status: ['failed'] }]) {
    const f = fixture(); f.files.set(DIAGNOSTIC_FILES[0], JSON.stringify({ schemaVersion: 1,
      incidents: [{ ...sample(), first: { ...first(), ...patch } }] }));
    assert.equal(f.archive().restore().length, 0);
  }
});
test('loaded histories are sealed even if session IDs collide; unknown fields and mutation do not enter new state', () => {
  const f = fixture(); f.files.set(DIAGNOSTIC_FILES[0], JSON.stringify({ schemaVersion: 2, generation: 1,
    incidents: [{ ...sample(), sessionId: 'same-id', privatePayload: 'must not retain' }] }));
  const a = f.archive(), r = new StorageIncidentRecorder('same-id'); const loaded = a.restore(); r.restore(loaded);
  r.observe({ ...first(4), operation: 'TRANSACTION', phase: 'transaction', status: 'complete', error: undefined }, () => sample().environment);
  assert.equal(r.snapshot()[0].recovery, undefined); assert.equal('privatePayload' in r.snapshot()[0], false);
  (loaded[0].first as { id: number }).id = 99; assert.equal(r.snapshot()[0].first.id, 1);
});
test('invalid or oversized checkpoints fail before touching the last usable slot; restored histories stay bounded', () => {
  const f = fixture(), a = f.archive(); a.restore(); a.save({ incidents: [sample()] });
  const before = new Map(f.files);
  assert.throws(() => a.save({ incidents: Array.from({ length: 9 }, (_, i) => sample(i + 1)) }));
  assert.throws(() => a.save({ incidents: [sample()], trace: 'x'.repeat(262_144) }));
  assert.deepEqual(f.files, before);
  const r = new StorageIncidentRecorder('later'); r.restore(a.restore());
  for (let i = 1; i < 20; i++) r.observe({ ...first(i), file: `isolated-${i}.db` }, () => sample().environment);
  assert.equal(r.snapshot().length, 8);
});

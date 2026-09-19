// @ts-nocheck -- Node's built-in SQLite is a test adapter; mobile runtime uses Expo SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { initialPet } from '../../src/domain/model';
import {
  CorruptResolutionRecordError,
  freezeStoredResolution,
  ResolutionLedger,
  ResolutionLedgerConflictError,
  resolveOnce,
} from '../../src/progression';
import { CorruptSnapshotError, LocalPetStore } from '../../src/storage/sqlite';

class NodeSqliteAdapter {
  constructor() {
    this.native = new DatabaseSync(':memory:');
    this.tail = Promise.resolve();
    this.failAfterRunContaining = null;
  }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) {
    const result = this.native.prepare(sql).run(...params);
    if (this.failAfterRunContaining && sql.includes(this.failAfterRunContaining)) {
      this.failAfterRunContaining = null;
      throw new Error('injected failure after SQL write');
    }
    return result;
  }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    this.native.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(this);
      this.native.exec('COMMIT');
      return result;
    } catch (error) {
      this.native.exec('ROLLBACK');
      throw error;
    } finally { release(); }
  }
}

const isOutcome = value => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  return typeof value.branch === 'string' && Array.isArray(value.inputs) && value.inputs.every(item => typeof item === 'string');
};

const prepared = (slot, branch, policyId = 'fixture-policy') => freezeStoredResolution(slot, {
  slot,
  policyId,
  policyVersion: '1',
  decision: 'DEC-08',
  resolvedAt: { level: 6, stage: 2 },
  value: { branch, inputs: ['synthetic'] },
}, isOutcome);

const setup = async (...petIds) => {
  const db = new NodeSqliteAdapter();
  const store = new LocalPetStore(db, DEV_GAME_CONFIG);
  await store.migrate();
  for (const petId of petIds) await store.createPet(initialPet(petId, `펫-${petId}`, 'reserved', 0, DEV_GAME_CONFIG));
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 7);
  return { db, ledger: new ResolutionLedger(db, DEV_GAME_CONFIG) };
};

test('prepared resolution is stored, defensively loaded and replayed idempotently', async () => {
  const { db, ledger } = await setup('pet-1');
  const record = prepared('stage-2-appearance', 'fixture-a');
  const first = await ledger.commit({ petId: 'pet-1', resolutionId: 'resolution-1', prepared: record, validateStoredValue: isOutcome });
  assert.equal(first.replayed, false);
  assert.equal(Object.isFrozen(first.record), true);
  assert.equal(Object.isFrozen(first.record.value), true);

  const loaded = await ledger.load('pet-1', 'stage-2-appearance', isOutcome);
  assert.deepEqual(loaded, record);
  assert.notEqual(loaded, record);
  assert.equal(Object.isFrozen(loaded.value.inputs), true);

  const replay = await ledger.commit({
    petId: 'pet-1', resolutionId: 'resolution-1',
    prepared: JSON.parse(JSON.stringify(record)), validateStoredValue: isOutcome,
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.record, record);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger')).count, 1);
});

test('resolution ID and pet-slot conflicts reject different prepared payloads', async () => {
  const { ledger } = await setup('pet-1', 'pet-2');
  const first = prepared('stage-2-appearance', 'fixture-a');
  await ledger.commit({ petId: 'pet-1', resolutionId: 'resolution-1', prepared: first, validateStoredValue: isOutcome });

  await assert.rejects(
    ledger.commit({
      petId: 'pet-1', resolutionId: 'resolution-1',
      prepared: prepared('stage-2-appearance', 'fixture-b'), validateStoredValue: isOutcome,
    }),
    error => error instanceof ResolutionLedgerConflictError && error.code === 'resolution_id_conflict',
  );
  await assert.rejects(
    ledger.commit({
      petId: 'pet-1', resolutionId: 'resolution-2', prepared: first, validateStoredValue: isOutcome,
    }),
    error => error instanceof ResolutionLedgerConflictError && error.code === 'slot_already_resolved',
  );
  await assert.rejects(
    ledger.commit({
      petId: 'pet-2', resolutionId: 'resolution-1',
      prepared: prepared('stage-2-appearance', 'fixture-a'), validateStoredValue: isOutcome,
    }),
    error => error instanceof ResolutionLedgerConflictError && error.code === 'resolution_id_conflict',
  );
});

test('pet and slot scopes are isolated when idempotency IDs are distinct', async () => {
  const { ledger } = await setup('pet-1', 'pet-2');
  await ledger.commit({
    petId: 'pet-1', resolutionId: 'pet-1-appearance',
    prepared: prepared('appearance', 'pet-one'), validateStoredValue: isOutcome,
  });
  await ledger.commit({
    petId: 'pet-2', resolutionId: 'pet-2-appearance',
    prepared: prepared('appearance', 'pet-two'), validateStoredValue: isOutcome,
  });
  await ledger.commit({
    petId: 'pet-1', resolutionId: 'pet-1-sex',
    prepared: prepared('sex', 'separate-slot', 'sex-fixture'), validateStoredValue: isOutcome,
  });

  assert.equal((await ledger.load('pet-1', 'appearance', isOutcome)).value.branch, 'pet-one');
  assert.equal((await ledger.load('pet-2', 'appearance', isOutcome)).value.branch, 'pet-two');
  assert.equal((await ledger.load('pet-1', 'sex', isOutcome)).value.branch, 'separate-slot');
  assert.equal(await ledger.load('pet-2', 'sex', isOutcome), null);
});

test('failure after INSERT rolls back the entire resolution commit', async () => {
  const { db, ledger } = await setup('pet-1');
  db.failAfterRunContaining = 'INSERT INTO dev_resolution_ledger';
  await assert.rejects(ledger.commit({
    petId: 'pet-1', resolutionId: 'resolution-rollback',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  }), /injected failure after SQL write/);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger')).count, 0);

  const retry = await ledger.commit({
    petId: 'pet-1', resolutionId: 'resolution-rollback',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  });
  assert.equal(retry.replayed, false);
});

test('reload reuses the durable record with zero additional RNG or policy calls', async () => {
  const { db, ledger } = await setup('pet-1');
  let randomCalls = 0;
  let policyCalls = 0;
  const policy = {
    status: 'DEV_FIXTURE_ONLY', id: 'fixture-policy', version: '1', decision: 'DEC-08',
    isEligible: () => true,
    resolve: () => { policyCalls++; return { branch: 'fixture-a', inputs: ['synthetic'] }; },
    validateResult: isOutcome,
  };
  const resolved = resolveOnce({
    slot: 'appearance', existing: null, context: { level: 6, stage: 2 }, policy,
    validateStoredValue: isOutcome, random: () => { randomCalls++; return 0.25; },
  });
  assert.equal(resolved.status, 'resolved');
  await ledger.commit({
    petId: 'pet-1', resolutionId: 'durable-resolution',
    prepared: resolved.record, validateStoredValue: isOutcome,
  });

  const afterReload = new ResolutionLedger(db, DEV_GAME_CONFIG);
  const existing = await afterReload.load('pet-1', 'appearance', isOutcome);
  const reused = resolveOnce({
    slot: 'appearance', existing, context: { level: 46, stage: 'final' },
    policy: {
      ...policy,
      version: '2',
      isEligible: () => { throw new Error('policy must not run after reload'); },
      resolve: () => { throw new Error('resolver must not run after reload'); },
    },
    validateStoredValue: isOutcome,
    random: () => { randomCalls++; return 0.75; },
  });
  assert.equal(reused.status, 'resolved');
  assert.equal(reused.randomCalls, 0);
  assert.deepEqual(reused.record, resolved.record);
  assert.equal(randomCalls, 1);
  assert.equal(policyCalls, 1);
});

test('corrupt or unsafe stored JSON fails closed without replacing original bytes', async () => {
  const { db, ledger } = await setup('pet-1');
  await ledger.commit({
    petId: 'pet-1', resolutionId: 'resolution-corrupt',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  });
  const unsafe = '{"decision":"DEC-08","policyId":"fixture-policy","policyVersion":"1","resolvedAt":{"level":6,"stage":2},"slot":"appearance","value":{"__proto__":{"polluted":true}}}';
  await db.runAsync('UPDATE dev_resolution_ledger SET record_json = ? WHERE resolution_id = ?', [unsafe, 'resolution-corrupt']);

  await assert.rejects(
    ledger.load('pet-1', 'appearance', isOutcome),
    error => error instanceof CorruptResolutionRecordError,
  );
  assert.equal((await db.getFirstAsync(
    'SELECT record_json FROM dev_resolution_ledger WHERE resolution_id = ?', ['resolution-corrupt'],
  )).record_json, unsafe);
  assert.equal(({}).polluted, undefined);
});

test('new commits require both pet marker and valid snapshot without creating identity residue', async () => {
  const missing = await setup();
  await assert.rejects(missing.ledger.commit({
    petId: 'never-created', resolutionId: 'orphan-resolution',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  }), /Pet not found/);
  assert.equal((await missing.db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger')).count, 0);
  assert.equal((await missing.db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry')).count, 0);

  const noMarker = await setup('pet-no-marker');
  await noMarker.db.runAsync('DELETE FROM pet_registry WHERE pet_id = ?', ['pet-no-marker']);
  const snapshotBefore = await noMarker.db.getFirstAsync('SELECT state_json FROM pet_snapshot WHERE pet_id = ?', ['pet-no-marker']);
  await assert.rejects(noMarker.ledger.commit({
    petId: 'pet-no-marker', resolutionId: 'no-marker-resolution',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  }), error => error instanceof CorruptSnapshotError);
  assert.deepEqual(await noMarker.db.getFirstAsync('SELECT state_json FROM pet_snapshot WHERE pet_id = ?', ['pet-no-marker']), snapshotBefore);
  assert.equal((await noMarker.db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger')).count, 0);

  const noSnapshot = await setup('pet-no-snapshot');
  await noSnapshot.db.runAsync('DELETE FROM pet_snapshot WHERE pet_id = ?', ['pet-no-snapshot']);
  await assert.rejects(noSnapshot.ledger.commit({
    petId: 'pet-no-snapshot', resolutionId: 'no-snapshot-resolution',
    prepared: prepared('appearance', 'fixture-a'), validateStoredValue: isOutcome,
  }), error => error instanceof CorruptSnapshotError);
  assert.equal((await noSnapshot.db.getFirstAsync('SELECT COUNT(*) AS count FROM pet_registry WHERE pet_id = ?', ['pet-no-snapshot'])).count, 1);
  assert.equal((await noSnapshot.db.getFirstAsync('SELECT COUNT(*) AS count FROM dev_resolution_ledger')).count, 0);
});

test('replay and load fail closed when the current pet snapshot is missing or corrupt', async () => {
  for (const damage of ['missing', 'corrupt']) {
    const petId = `pet-${damage}`;
    const { db, ledger } = await setup(petId);
    const record = prepared('appearance', 'fixture-a');
    await ledger.commit({ petId, resolutionId: `resolution-${damage}`, prepared: record, validateStoredValue: isOutcome });
    const ledgerBefore = await db.getFirstAsync('SELECT * FROM dev_resolution_ledger WHERE pet_id = ?', [petId]);
    if (damage === 'missing') await db.runAsync('DELETE FROM pet_snapshot WHERE pet_id = ?', [petId]);
    else await db.runAsync('UPDATE pet_snapshot SET state_json = ? WHERE pet_id = ?', ['{broken', petId]);

    await assert.rejects(ledger.commit({
      petId, resolutionId: `resolution-${damage}`, prepared: record, validateStoredValue: isOutcome,
    }), error => error instanceof CorruptSnapshotError);
    await assert.rejects(
      ledger.load(petId, 'appearance', isOutcome),
      error => error instanceof CorruptSnapshotError,
    );
    assert.deepEqual(await db.getFirstAsync('SELECT * FROM dev_resolution_ledger WHERE pet_id = ?', [petId]), ledgerBefore);
  }
});

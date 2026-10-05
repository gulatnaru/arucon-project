import test from 'node:test';
import assert from 'node:assert/strict';
import type { SQLiteDatabase } from 'expo-sqlite';
import { expoSqliteConnection } from '../../src/storage/sqlite';
import { nativeStatement, SqlOperationError, sqliteAccessTrace } from '../../src/storage/sqliteAccess';

test('statement execution remains the primary error when finalize repeats SQLITE_BUSY', async () => {
  const executeError = new Error('database is locked');
  const finalizeError = new Error('NativeStatement.finalizeAsync: database is locked');
  let finalized = 0;
  const db = { databasePath: '/isolated/primary.db', prepareAsync: async () => ({
    executeAsync: async () => { throw executeError; },
    finalizeAsync: async () => { finalized++; throw finalizeError; },
  }) } as unknown as SQLiteDatabase;
  await assert.rejects(nativeStatement(db, 'UPDATE pet_snapshot SET revision=?', [1], 'run'), error => {
    assert.ok(error instanceof SqlOperationError);
    assert.equal(error.phase, 'execute'); assert.equal(error.cause, executeError);
    assert.equal(error.cleanupError, finalizeError); return true;
  });
  assert.equal(finalized, 1);
  assert.deepEqual(sqliteAccessTrace().filter(x => x.file === 'primary.db' && x.status.includes('failed')).map(x => x.phase), ['execute', 'finalize']);
});

test('all adapters for the same file serialize game, memory, read and profile writes until finalization', async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const native = (path: string) => ({ databasePath: path,
    execAsync: async (sql: string) => { order.push(sql); },
    prepareAsync: async (sql: string) => ({ executeAsync: async () => ({
      getFirstAsync: async () => null, getAllAsync: async () => [],
    }), finalizeAsync: async () => { order.push(sql); } }),
    withExclusiveTransactionAsync: async (work: (tx: SQLiteDatabase) => Promise<void>) => {
      order.push('begin'); await work(native(path) as unknown as SQLiteDatabase); order.push('commit-close');
    },
  });
  const a = expoSqliteConnection(native('/isolated/shared.db') as unknown as SQLiteDatabase);
  const b = expoSqliteConnection(native('/isolated/shared.db') as unknown as SQLiteDatabase);
  const transaction = a.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync('game'); await gate; await tx.runAsync('ledger');
  });
  await new Promise(resolve => setTimeout(resolve, 1));
  const memory = b.runAsync('memory'); const profile = a.runAsync('profile'); const read = b.getFirstAsync('read');
  const other = expoSqliteConnection(native('/isolated/other.db') as unknown as SQLiteDatabase).runAsync('other-file');
  await other; assert.deepEqual(order, ['begin', 'game', 'other-file']);
  release(); await Promise.all([transaction, memory, profile, read]);
  assert.deepEqual(order, ['begin', 'game', 'other-file', 'ledger', 'commit-close', 'memory', 'profile', 'read']);
});

test('failed transaction does not poison the file lane or hide later save failure', async () => {
  const error = new Error('disk full');
  let fail = true;
  const db = { databasePath: '/isolated/failure.db', execAsync: async () => undefined,
    runAsync: async () => undefined,
    withExclusiveTransactionAsync: async (work: (tx: SQLiteDatabase) => Promise<void>) => {
      if (fail) { fail = false; throw error; } await work(db as unknown as SQLiteDatabase);
    },
  } as unknown as SQLiteDatabase;
  const connection = expoSqliteConnection(db);
  await assert.rejects(connection.withExclusiveTransactionAsync(() => Promise.resolve(1)), e => e === error);
  assert.equal(await connection.withExclusiveTransactionAsync(() => Promise.resolve(2)), 2);
});

test('external write waits for the transaction statement finalize and connection-close acknowledgement', async () => {
  const order: string[] = [];
  let finishFinalize!: () => void;
  let finalizeStarted!: () => void;
  const gate = new Promise<void>(resolve => { finishFinalize = resolve; });
  const started = new Promise<void>(resolve => { finalizeStarted = resolve; });
  const native = () => ({ databasePath: '/isolated/lifetime.db',
    prepareAsync: async (sql: string) => {
      order.push(`prepare:${sql}`);
      return { executeAsync: async () => ({ changes: 1 }), finalizeAsync: async () => {
        if (sql === 'game') { finalizeStarted(); await gate; }
        order.push(`finalize:${sql}`);
      } };
    },
    withExclusiveTransactionAsync: async (work: (tx: SQLiteDatabase) => Promise<void>) => {
      order.push('begin'); await work(native() as unknown as SQLiteDatabase);
      await Promise.resolve(); order.push('commit-close');
    },
  });
  const game = expoSqliteConnection(native() as unknown as SQLiteDatabase);
  const settings = expoSqliteConnection(native() as unknown as SQLiteDatabase);
  const transaction = game.withExclusiveTransactionAsync(tx => tx.runAsync('game'));
  await started;
  const outside = settings.runAsync('settings');
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.deepEqual(order, ['begin', 'prepare:game']);
  finishFinalize(); await Promise.all([transaction, outside]);
  assert.deepEqual(order, ['begin','prepare:game','finalize:game','commit-close','prepare:settings','finalize:settings']);
});

test('a finalize-only failure is reported as cleanup origin and does not prevent a later independent save', async () => {
  const closeError = new Error('finalize IO failure');
  let calls = 0;
  const db = { databasePath: '/isolated/finalize-only.db', prepareAsync: async () => ({
    executeAsync: async () => ({ changes: 1 }),
    finalizeAsync: async () => { if (++calls === 1) throw closeError; },
  }) } as unknown as SQLiteDatabase;
  const connection = expoSqliteConnection(db);
  await assert.rejects(connection.runAsync('UPDATE fixture SET value=1'), error => {
    assert.ok(error instanceof SqlOperationError); assert.equal(error.phase,'finalize');
    assert.equal(error.cause,closeError); assert.equal(error.cleanupError,undefined); return true;
  });
  assert.equal((await connection.runAsync('UPDATE fixture SET value=2') as { changes: number }).changes,1);
  assert.equal(calls,2);
});

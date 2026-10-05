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

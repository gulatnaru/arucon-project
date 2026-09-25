import assert from 'node:assert/strict';
import test from 'node:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { expoSqliteConnection, retrySqliteBusy, type SqlExecutor } from '../../src/storage/sqlite';

test('configuration-change lock contention retries without discarding the operation result', async () => {
  const delays: number[] = [];
  let attempts = 0;
  const result = await retrySqliteBusy(async () => {
    attempts++;
    if (attempts < 3) {
      const native = new Error('database is locked');
      const bridge = new Error('Call to function NativeDatabase.prepareAsync has been rejected');
      bridge.cause = native;
      throw bridge;
    }
    return { revision: 7 };
  }, {
    delaysMs: [10, 20, 40],
    sleep: async delay => { delays.push(delay); },
  });

  assert.deepEqual(result, { revision: 7 });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
});

test('the Expo adapter retries a rolled-back transaction without duplicating its durable mutation', async () => {
  let transactionAttempts = 0;
  let workAttempts = 0;
  const durableMutations: string[] = [];
  const tx = {
    execAsync: async () => undefined,
    runAsync: async () => undefined,
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  } satisfies SqlExecutor;
  const database = {
    execAsync: tx.execAsync,
    runAsync: tx.runAsync,
    getFirstAsync: tx.getFirstAsync,
    getAllAsync: tx.getAllAsync,
    withExclusiveTransactionAsync: async (work: (executor: SqlExecutor) => Promise<void>) => {
      transactionAttempts++;
      const stagedMutations: string[] = [];
      const attempt = {
        ...tx,
        runAsync: async (_sql: string, params: readonly (string | number | null)[] = []) => {
          stagedMutations.push(String(params[0]));
        },
      } satisfies SqlExecutor;
      await work(attempt);
      if (transactionAttempts === 1) throw new Error('database is locked');
      durableMutations.push(...stagedMutations);
    },
  } as unknown as SQLiteDatabase;

  const result = await expoSqliteConnection(database).withExclusiveTransactionAsync(async transaction => {
    workAttempts++;
    await transaction.runAsync('INSERT INTO fixture(value) VALUES (?)', ['one-durable-write']);
    return `attempt-${workAttempts}`;
  });

  assert.equal(result, 'attempt-2');
  assert.equal(transactionAttempts, 2);
  assert.equal(workAttempts, 2);
  assert.deepEqual(durableMutations, ['one-durable-write']);
});

test('non-lock failures remain fail-closed and are not retried', async () => {
  const expected = new Error('Stored pet snapshot is invalid');
  let attempts = 0;
  await assert.rejects(
    retrySqliteBusy(async () => {
      attempts++;
      throw expected;
    }, {
      delaysMs: [10, 20],
      sleep: async () => assert.fail('non-lock error must not sleep'),
    }),
    error => error === expected,
  );
  assert.equal(attempts, 1);
});

test('persistent lock contention is bounded and returns the final error', async () => {
  const observed: Error[] = [];
  await assert.rejects(
    retrySqliteBusy(async () => {
      const error = new Error('SQLITE_BUSY: database is locked');
      observed.push(error);
      throw error;
    }, {
      delaysMs: [1, 2],
      sleep: async () => undefined,
    }),
    error => error === observed[2],
  );
  assert.equal(observed.length, 3);
});

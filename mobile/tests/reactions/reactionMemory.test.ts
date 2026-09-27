// @ts-nocheck -- Node's built-in SQLite is the integration test adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  REACTION_MEMORY_DATABASE, REACTION_MEMORY_LIMIT,
  ReactionMemoryRepository, reactionFixtureDatabaseName,
} from '../../src/storage/reactionMemory';

class NodeSqliteAdapter {
  constructor() { this.native = new DatabaseSync(':memory:'); this.tail = Promise.resolve(); }
  async execAsync(sql) { this.native.exec(sql); }
  async runAsync(sql, params = []) { return this.native.prepare(sql).run(...params); }
  async getFirstAsync(sql, params = []) { return this.native.prepare(sql).get(...params) ?? null; }
  async getAllAsync(sql, params = []) { return this.native.prepare(sql).all(...params); }
  async withExclusiveTransactionAsync(work) {
    const previous = this.tail; let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous; this.native.exec('BEGIN IMMEDIATE');
    try { const result = await work(this); this.native.exec('COMMIT'); return result; }
    catch (error) { this.native.exec('ROLLBACK'); throw error; }
    finally { release(); }
  }
}

const session = (id, source = 'live', shownAtMs = 100) => ({
  id, petId: 'pet-memory', source, reactionId: 'greeting_reserved', family: 'greeting', phase: 'presenting',
  startedAtMs: shownAtMs, deadlineAtMs: shownAtMs + 700, dialogueNodeId: null,
  presentation: { clip: 'tsundere_greet', rate: 1, emotion: 'shy', gaze: 'aside', minVisibleMs: 700 },
});

test('reaction memory persists shown/completed/cancelled phases and bounds each pet history', async () => {
  const db = new NodeSqliteAdapter();
  const store = new ReactionMemoryRepository(db);
  await store.migrate();
  await store.recordShown(session('one', 'live', 100));
  await store.recordCompleted({ kind: 'completed', sessionId: 'one', petId: 'pet-memory', source: 'live', reactionId: 'greeting_reserved', family: 'greeting', atMs: 900 });
  await store.recordShown(session('two', 'live', 1_000));
  await store.recordCancelled({ kind: 'cancelled', sessionId: 'two', petId: 'pet-memory', source: 'live', reactionId: 'greeting_reserved', family: 'greeting', atMs: 1_100, reason: 'scene_change' });
  let loaded = await store.load('pet-memory');
  assert.deepEqual(loaded.records.map(record => record.outcome), ['cancelled', 'completed']);

  for (let index = 0; index < REACTION_MEMORY_LIMIT + 3; index++) await store.recordShown(session(`bounded-${index}`, 'live', 2_000 + index));
  loaded = await store.load('pet-memory');
  assert.equal(loaded.records.length, REACTION_MEMORY_LIMIT);
  assert.equal(loaded.records[0].sessionId, `bounded-${REACTION_MEMORY_LIMIT + 2}`);
  assert.equal(loaded.records.some(record => record.sessionId === 'one'), false);
});

test('fixture and live namespaces are isolated and cross-scope writes fail closed', async () => {
  const db = new NodeSqliteAdapter();
  const live = new ReactionMemoryRepository(db, { kind: 'live' });
  const fixture = new ReactionMemoryRepository(db, { kind: 'fixture', fixtureId: 'growth_compare' });
  await live.migrate();
  await live.recordShown(session('live-one'));
  await fixture.recordShown(session('fixture-one', 'fixture'));
  assert.deepEqual((await live.load('pet-memory')).records.map(record => record.sessionId), ['live-one']);
  assert.deepEqual((await fixture.load('pet-memory')).records.map(record => record.sessionId), ['fixture-one']);
  await assert.rejects(live.recordShown(session('wrong', 'fixture')), /different memory scope/);
  for (const gameTable of ['pet_snapshot', 'command_ledger', 'meal_ledger', 'local_outbox', 'pending_command', 'dev_purchase_ledger']) {
    assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name=?", [gameTable])).count, 0, gameTable);
  }
});

test('known-v1 corrupt memory is quarantined atomically and restart resumes from an empty bounded snapshot', async () => {
  const db = new NodeSqliteAdapter();
  const store = new ReactionMemoryRepository(db);
  await store.migrate();
  await db.runAsync(`INSERT INTO reaction_memory
    (namespace, schema_version, session_id, pet_id, source, reaction_id, family, shown_at_ms, outcome, settled_at_ms)
    VALUES ('live', 1, 'corrupt', 'pet-memory', 'live', 'INVALID ID', 'greeting', 10, 'shown', NULL)`);
  assert.deepEqual((await store.load('pet-memory')).records, []);
  assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS count FROM reaction_memory WHERE session_id='corrupt'")).count, 0);
  const quarantined = await db.getFirstAsync("SELECT raw_row_json FROM reaction_memory_quarantine WHERE namespace='live' AND pet_id='pet-memory'");
  assert.match(quarantined.raw_row_json, /INVALID ID/);

  const restarted = new ReactionMemoryRepository(db);
  await restarted.migrate();
  assert.deepEqual((await restarted.load('pet-memory')).records, []);
  await restarted.recordShown(session('after-recovery'));
  assert.equal((await restarted.load('pet-memory')).records[0].sessionId, 'after-recovery');
});

test('future reaction schema is refused without deleting the database', async () => {
  const db = new NodeSqliteAdapter();
  const store = new ReactionMemoryRepository(db);
  await store.migrate();
  await store.recordShown(session('preserved'));
  await db.execAsync('PRAGMA user_version = 2');
  await assert.rejects(store.migrate(), /Unsupported reaction memory schema 2/);
  await assert.rejects(store.load('pet-memory'), /Unsupported reaction memory schema 2/);
  assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS count FROM reaction_memory WHERE session_id='preserved'")).count, 1);
  assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS count FROM reaction_memory_quarantine")).count, 0);
});

test('memory migration is idempotent and database names stay outside the game database', async () => {
  const db = new NodeSqliteAdapter();
  const store = new ReactionMemoryRepository(db);
  await store.migrate();
  await store.recordShown(session('survives-remigrate'));
  await store.migrate();
  assert.equal((await store.load('pet-memory')).records[0].sessionId, 'survives-remigrate');
  assert.equal(REACTION_MEMORY_DATABASE, 'arucon-reactions.db');
  assert.equal(reactionFixtureDatabaseName('growth_compare'), 'arucon-reactions-fixture-growth_compare.db');
  assert.notEqual(reactionFixtureDatabaseName('growth_compare'), REACTION_MEMORY_DATABASE);
  assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='pet_snapshot'")).count, 0);
});

test('reaction-only quarantine is bounded per pet scope', async () => {
  const db = new NodeSqliteAdapter();
  const store = new ReactionMemoryRepository(db);
  await store.migrate();
  for (let index = 0; index < REACTION_MEMORY_LIMIT + 3; index++) {
    await db.runAsync(`INSERT INTO reaction_memory
      (namespace, schema_version, session_id, pet_id, source, reaction_id, family, shown_at_ms, outcome, settled_at_ms)
      VALUES (?, 1, ?, 'pet-memory', 'live', ?, 'greeting', ?, 'shown', NULL)`,
    ['live', `corrupt-${index}`, `INVALID ID ${index}`, index]);
    assert.deepEqual((await store.load('pet-memory')).records, []);
  }
  const count = await db.getFirstAsync("SELECT COUNT(*) AS count FROM reaction_memory_quarantine WHERE namespace='live' AND pet_id='pet-memory'");
  assert.equal(count.count, REACTION_MEMORY_LIMIT);
  const rows = await db.getAllAsync("SELECT raw_row_json FROM reaction_memory_quarantine WHERE namespace='live' AND pet_id='pet-memory' ORDER BY quarantine_id");
  assert.equal(rows.some(row => row.raw_row_json.includes('INVALID ID 0')), false);
  assert.equal(rows.some(row => row.raw_row_json.includes(`INVALID ID ${REACTION_MEMORY_LIMIT + 2}`)), true);
});

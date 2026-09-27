import type { SQLiteDatabase } from 'expo-sqlite';
import type { ReactionMemoryRecord, ReactionMemorySnapshot, ReactionOutcome, ReactionSession, ReactionSource } from '../reactions/types';
import { assertValidMemoryRecord, assertValidMemorySnapshot } from '../reactions/validation';
import { expoSqliteConnection, type SqlConnection, type SqlExecutor } from './sqlite';

export const REACTION_MEMORY_DATABASE = 'arucon-reactions.db';
export const REACTION_MEMORY_SCHEMA_VERSION = 1;
export const REACTION_MEMORY_LIMIT = 32;

export type ReactionMemoryScope =
  | Readonly<{ kind: 'live' }>
  | Readonly<{ kind: 'fixture'; fixtureId: string }>;

type MemoryRow = {
  schema_version: number;
  session_id: string;
  pet_id: string;
  source: string;
  reaction_id: string;
  family: string;
  shown_at_ms: number;
  outcome: string;
  settled_at_ms: number | null;
};

export class CorruptReactionMemoryError extends Error {
  constructor(cause: unknown) {
    super('Stored reaction memory is invalid; original rows have been preserved');
    this.name = 'CorruptReactionMemoryError';
    this.cause = cause;
  }
}

function scopeIdentity(scope: ReactionMemoryScope): { namespace: string; source: ReactionSource } {
  if (scope.kind === 'live') return { namespace: 'live', source: 'live' };
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/u.test(scope.fixtureId)) throw new Error('Invalid reaction fixture id');
  return { namespace: `fixture:${scope.fixtureId}`, source: 'fixture' };
}

function rowToRecord(row: MemoryRow): ReactionMemoryRecord {
  const record = {
    schemaVersion: row.schema_version,
    sessionId: row.session_id,
    petId: row.pet_id,
    source: row.source,
    reactionId: row.reaction_id,
    family: row.family,
    shownAtMs: row.shown_at_ms,
    outcome: row.outcome,
    settledAtMs: row.settled_at_ms,
  } as ReactionMemoryRecord;
  assertValidMemoryRecord(record);
  return record;
}

async function readRows(tx: SqlExecutor, namespace: string, source: ReactionSource, petId: string): Promise<ReactionMemoryRecord[]> {
  const rows = await tx.getAllAsync<MemoryRow>(`
    SELECT schema_version, session_id, pet_id, source, reaction_id, family,
           shown_at_ms, outcome, settled_at_ms
    FROM reaction_memory
    WHERE namespace = ? AND pet_id = ?
    ORDER BY shown_at_ms DESC, session_id DESC
  `, [namespace, petId]);
  try {
    const records = rows.map(rowToRecord);
    const snapshot: ReactionMemorySnapshot = { schemaVersion: 1, petId, source, records };
    assertValidMemorySnapshot(snapshot);
    return records;
  } catch (error) {
    throw new CorruptReactionMemoryError(error);
  }
}

async function requireCurrentSchema(tx: SqlExecutor): Promise<void> {
  const row = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version !== REACTION_MEMORY_SCHEMA_VERSION) {
    throw new Error(`Unsupported reaction memory schema ${version}; original database preserved`);
  }
}

async function readRowsRecovering(tx: SqlExecutor, namespace: string, source: ReactionSource, petId: string): Promise<ReactionMemoryRecord[]> {
  try {
    return await readRows(tx, namespace, source, petId);
  } catch (error) {
    if (!(error instanceof CorruptReactionMemoryError)) throw error;
    const rawRows = await tx.getAllAsync<MemoryRow>(`
      SELECT schema_version, session_id, pet_id, source, reaction_id, family,
             shown_at_ms, outcome, settled_at_ms
      FROM reaction_memory
      WHERE namespace = ? AND pet_id = ?
      ORDER BY shown_at_ms DESC, session_id DESC
    `, [namespace, petId]);
    for (const row of rawRows) {
      await tx.runAsync(`
        INSERT INTO reaction_memory_quarantine (namespace, pet_id, raw_row_json, reason)
        VALUES (?, ?, ?, 'invalid_v1_memory')
      `, [namespace, petId, JSON.stringify(row)]);
    }
    await tx.runAsync('DELETE FROM reaction_memory WHERE namespace = ? AND pet_id = ?', [namespace, petId]);
    await tx.runAsync(`
      DELETE FROM reaction_memory_quarantine
      WHERE namespace = ? AND pet_id = ? AND quarantine_id NOT IN (
        SELECT quarantine_id FROM reaction_memory_quarantine
        WHERE namespace = ? AND pet_id = ?
        ORDER BY quarantine_id DESC LIMIT ?
      )
    `, [namespace, petId, namespace, petId, REACTION_MEMORY_LIMIT]);
    return [];
  }
}

export class ReactionMemoryRepository {
  private readonly namespace: string;
  private readonly source: ReactionSource;

  constructor(private readonly db: SqlConnection, scope: ReactionMemoryScope = { kind: 'live' }) {
    ({ namespace: this.namespace, source: this.source } = scopeIdentity(scope));
  }

  async migrate(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const version = row?.user_version ?? 0;
      if (version > REACTION_MEMORY_SCHEMA_VERSION) throw new Error(`Unsupported reaction memory schema ${version}; original database preserved`);
      if (version < REACTION_MEMORY_SCHEMA_VERSION) await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS reaction_memory (
          namespace TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version = 1),
          session_id TEXT NOT NULL,
          pet_id TEXT NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('live', 'fixture')),
          reaction_id TEXT NOT NULL,
          family TEXT NOT NULL,
          shown_at_ms INTEGER NOT NULL CHECK (shown_at_ms >= 0),
          outcome TEXT NOT NULL CHECK (outcome IN ('shown', 'completed', 'cancelled')),
          settled_at_ms INTEGER CHECK (settled_at_ms IS NULL OR settled_at_ms >= shown_at_ms),
          PRIMARY KEY (namespace, session_id)
        );
      `);
      await tx.execAsync(`
        CREATE INDEX IF NOT EXISTS reaction_memory_pet_recent
          ON reaction_memory (namespace, pet_id, shown_at_ms DESC);
        CREATE TABLE IF NOT EXISTS reaction_memory_quarantine (
          quarantine_id INTEGER PRIMARY KEY AUTOINCREMENT,
          namespace TEXT NOT NULL,
          pet_id TEXT NOT NULL,
          raw_row_json TEXT NOT NULL,
          reason TEXT NOT NULL CHECK (reason = 'invalid_v1_memory')
        );
        CREATE INDEX IF NOT EXISTS reaction_memory_quarantine_scope
          ON reaction_memory_quarantine (namespace, pet_id, quarantine_id DESC);
        PRAGMA user_version = 1;
      `);
    });
  }

  async load(petId: string): Promise<ReactionMemorySnapshot> {
    if (!petId) throw new Error('Reaction memory petId is required');
    return this.db.withExclusiveTransactionAsync(async tx => {
      await requireCurrentSchema(tx);
      return {
        schemaVersion: 1,
        petId,
        source: this.source,
        records: await readRowsRecovering(tx, this.namespace, this.source, petId),
      };
    });
  }

  async recordShown(session: ReactionSession): Promise<ReactionMemorySnapshot> {
    if (session.source !== this.source) throw new Error('Reaction session cannot be written to a different memory scope');
    const record: ReactionMemoryRecord = {
      schemaVersion: 1,
      sessionId: session.id,
      petId: session.petId,
      source: session.source,
      reactionId: session.reactionId,
      family: session.family,
      shownAtMs: session.startedAtMs,
      outcome: 'shown',
      settledAtMs: null,
    };
    assertValidMemoryRecord(record);
    return this.db.withExclusiveTransactionAsync(async tx => {
      await requireCurrentSchema(tx);
      const current = await readRowsRecovering(tx, this.namespace, this.source, session.petId);
      const existing = current.find(item => item.sessionId === session.id);
      if (existing) {
        if (existing.petId !== record.petId || existing.source !== record.source || existing.reactionId !== record.reactionId ||
            existing.family !== record.family || existing.shownAtMs !== record.shownAtMs) throw new Error('Reaction session id replayed with different data');
      } else {
        await tx.runAsync(`
          INSERT INTO reaction_memory
            (namespace, schema_version, session_id, pet_id, source, reaction_id, family, shown_at_ms, outcome, settled_at_ms)
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'shown', NULL)
        `, [this.namespace, record.sessionId, record.petId, record.source, record.reactionId, record.family, record.shownAtMs]);
        await tx.runAsync(`
          DELETE FROM reaction_memory
          WHERE namespace = ? AND pet_id = ? AND session_id NOT IN (
            SELECT session_id FROM reaction_memory
            WHERE namespace = ? AND pet_id = ?
            ORDER BY shown_at_ms DESC, session_id DESC LIMIT ?
          )
        `, [this.namespace, record.petId, this.namespace, record.petId, REACTION_MEMORY_LIMIT]);
      }
      return { schemaVersion: 1, petId: record.petId, source: this.source, records: await readRowsRecovering(tx, this.namespace, this.source, record.petId) };
    });
  }

  recordCompleted(outcome: Extract<ReactionOutcome, { kind: 'completed' }>): Promise<ReactionMemorySnapshot> {
    return this.recordSettlement(outcome, 'completed');
  }

  recordCancelled(outcome: Extract<ReactionOutcome, { kind: 'cancelled' }>): Promise<ReactionMemorySnapshot> {
    return this.recordSettlement(outcome, 'cancelled');
  }

  private async recordSettlement(outcome: ReactionOutcome, settled: 'completed' | 'cancelled'): Promise<ReactionMemorySnapshot> {
    if (outcome.source !== this.source) throw new Error('Reaction outcome cannot be written to a different memory scope');
    return this.db.withExclusiveTransactionAsync(async tx => {
      await requireCurrentSchema(tx);
      const current = await readRowsRecovering(tx, this.namespace, this.source, outcome.petId);
      const existing = current.find(item => item.sessionId === outcome.sessionId);
      if (!existing) throw new Error('Cannot settle a reaction that was not shown');
      if (existing.reactionId !== outcome.reactionId || existing.family !== outcome.family) throw new Error('Reaction outcome does not match shown session');
      if (existing.outcome !== 'shown') {
        if (existing.outcome === settled && existing.settledAtMs === outcome.atMs) {
          return { schemaVersion: 1, petId: outcome.petId, source: this.source, records: current };
        }
        throw new Error('Reaction session already has a different outcome');
      }
      if (outcome.atMs < existing.shownAtMs) throw new Error('Reaction outcome predates shown phase');
      await tx.runAsync(`
        UPDATE reaction_memory SET outcome = ?, settled_at_ms = ?
        WHERE namespace = ? AND session_id = ?
      `, [settled, outcome.atMs, this.namespace, outcome.sessionId]);
      return { schemaVersion: 1, petId: outcome.petId, source: this.source, records: await readRowsRecovering(tx, this.namespace, this.source, outcome.petId) };
    });
  }
}

const databasePromises = new Map<string, Promise<SQLiteDatabase>>();

async function openNamedDatabase(name: string): Promise<SQLiteDatabase> {
  const existing = databasePromises.get(name);
  if (existing) return existing;
  // Keep the native module behind the app-only boundary. The repository itself
  // is exercised with the same SqlConnection contract in Node integration tests.
  const opening = import('expo-sqlite').then(({ openDatabaseAsync }) => openDatabaseAsync(name)).catch((error: unknown) => {
    databasePromises.delete(name);
    throw error;
  });
  databasePromises.set(name, opening);
  return opening;
}

export async function openReactionMemoryRepository(): Promise<ReactionMemoryRepository> {
  const repository = new ReactionMemoryRepository(expoSqliteConnection(await openNamedDatabase(REACTION_MEMORY_DATABASE)));
  await repository.migrate();
  return repository;
}

export function reactionFixtureDatabaseName(fixtureId: string): string {
  scopeIdentity({ kind: 'fixture', fixtureId });
  return `arucon-reactions-fixture-${fixtureId}.db`;
}

export async function openReactionFixtureMemoryRepository(fixtureId: string): Promise<ReactionMemoryRepository> {
  const repository = new ReactionMemoryRepository(
    expoSqliteConnection(await openNamedDatabase(reactionFixtureDatabaseName(fixtureId))),
    { kind: 'fixture', fixtureId },
  );
  await repository.migrate();
  return repository;
}

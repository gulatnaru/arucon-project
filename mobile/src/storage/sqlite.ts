import { reducePet, validatePetState } from '../domain/engine';
import type { GameConfig } from '../domain/config';
import type { Command, PetState, Transition } from '../domain/model';
import type { SQLiteDatabase } from 'expo-sqlite';

/** Minimal async surface implemented by Expo SQLite and by the Node test adapter. */
export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: readonly (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: readonly (string | number | null)[]): Promise<T[]>;
}

export interface SqlConnection extends SqlExecutor {
  withExclusiveTransactionAsync<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/** Expo's transaction callback returns void; this adapter safely carries the work result out. */
export function expoSqliteConnection(database: SQLiteDatabase): SqlConnection {
  const executor = (db: SQLiteDatabase): SqlExecutor => ({
    execAsync: sql => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, [...params]),
    getFirstAsync: <T>(sql: string, params: readonly (string | number | null)[] = []) => db.getFirstAsync<T>(sql, [...params]),
    getAllAsync: <T>(sql: string, params: readonly (string | number | null)[] = []) => db.getAllAsync<T>(sql, [...params]),
  });
  return {
    ...executor(database),
    async withExclusiveTransactionAsync<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      let result: T | undefined;
      let completed = false;
      await database.withExclusiveTransactionAsync(async tx => {
        result = await work(executor(tx));
        completed = true;
      });
      if (!completed) throw new Error('SQLite transaction did not complete');
      return result as T;
    },
  };
}

export class CorruptSnapshotError extends Error {
  constructor(cause: unknown) {
    super('Stored pet snapshot is invalid; original bytes have been preserved');
    this.name = 'CorruptSnapshotError';
    this.cause = cause;
  }
}

type SnapshotRow = { state_json: string };
type CommandRow = { pet_id: string; command_json: string; result_json: string };
export type StoredTransition = Transition & { replayed: boolean; currentState: PetState };

function parseSnapshot(raw: string, config: GameConfig): PetState {
  try {
    const state = JSON.parse(raw) as PetState;
    validatePetState(state, config);
    return state;
  } catch (error) {
    throw new CorruptSnapshotError(error);
  }
}

/** A missing row is new only if no creation marker or dependent local row survives. */
async function checkedSnapshot(tx: SqlExecutor, petId: string, config: GameConfig): Promise<PetState | null> {
  const row = await tx.getFirstAsync<SnapshotRow>('SELECT state_json FROM pet_snapshot WHERE pet_id = ?', [petId]);
  const marker = await tx.getFirstAsync<{ pet_id: string }>('SELECT pet_id FROM pet_registry WHERE pet_id = ?', [petId]);
  if (row) {
    if (!marker) throw new CorruptSnapshotError('Snapshot exists without creation marker');
    return parseSnapshot(row.state_json, config);
  }
  const residue = await tx.getFirstAsync<{ present: number }>(`
    SELECT (
      EXISTS(SELECT 1 FROM command_ledger WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM meal_ledger WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM pending_command WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM local_outbox WHERE pet_id = ?)
    ) AS present
  `, [petId, petId, petId, petId]);
  if (marker || residue?.present) throw new CorruptSnapshotError('Creation history or dependent rows survive a missing snapshot');
  return null;
}

export class LocalPetStore {
  private readonly db: SqlConnection;
  private readonly config: GameConfig;
  constructor(db: SqlConnection, config: GameConfig) {
    this.db = db;
    this.config = config;
  }

  async migrate(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const version = row?.user_version ?? 0;
      if (version > 2) throw new Error(`Unsupported SQLite schema ${version}; original database preserved`);
      if (version === 2) return;
      if (version === 0) await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS pet_snapshot (
          pet_id TEXT PRIMARY KEY NOT NULL,
          revision INTEGER NOT NULL CHECK (revision >= 0),
          state_json TEXT NOT NULL,
          config_version TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS command_ledger (
          command_id TEXT PRIMARY KEY NOT NULL,
          pet_id TEXT NOT NULL,
          command_json TEXT NOT NULL,
          result_json TEXT NOT NULL,
          config_version TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meal_ledger (
          pet_id TEXT NOT NULL,
          meal_id TEXT NOT NULL,
          command_id TEXT NOT NULL UNIQUE,
          PRIMARY KEY (pet_id, meal_id)
        );
        CREATE TABLE IF NOT EXISTS local_outbox (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          command_id TEXT NOT NULL UNIQUE,
          pet_id TEXT NOT NULL,
          event_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending_command (
          command_id TEXT PRIMARY KEY NOT NULL,
          pet_id TEXT NOT NULL,
          command_json TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0)
        );
      `);
      // v1 was a never-released development schema. Preserve even orphaned v1
      // ledger identities so a missing snapshot cannot be mistaken for a new pet.
      await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS pet_registry (
          pet_id TEXT PRIMARY KEY NOT NULL
        );
        INSERT OR IGNORE INTO pet_registry (pet_id)
          SELECT pet_id FROM pet_snapshot
          UNION SELECT pet_id FROM command_ledger
          UNION SELECT pet_id FROM meal_ledger
          UNION SELECT pet_id FROM pending_command
          UNION SELECT pet_id FROM local_outbox;
        PRAGMA user_version = 2;
      `);
    });
  }

  async createPet(state: PetState): Promise<PetState> {
    validatePetState(state, this.config);
    return this.db.withExclusiveTransactionAsync(async tx => {
      const existing = await checkedSnapshot(tx, state.petId, this.config);
      if (existing) return existing;
      await tx.runAsync('INSERT INTO pet_registry (pet_id) VALUES (?)', [state.petId]);
      await tx.runAsync('INSERT INTO pet_snapshot (pet_id, revision, state_json, config_version) VALUES (?, ?, ?, ?)', [state.petId, state.revision, JSON.stringify(state), this.config.version]);
      return state;
    });
  }

  async loadPet(petId: string): Promise<PetState | null> {
    return this.db.withExclusiveTransactionAsync(tx => checkedSnapshot(tx, petId, this.config));
  }

  /** Stores intent only. Pending policy/reservation remains DEC-25; no economic effect occurs here. */
  async savePending(petId: string, command: Extract<Command, { type: 'consumeMeal' }>): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const state = await checkedSnapshot(tx, petId, this.config);
      if (!state) throw new Error('Pet not found');
      const committed = await tx.getFirstAsync<CommandRow>('SELECT pet_id, command_json, result_json FROM command_ledger WHERE command_id = ?', [command.commandId]);
      if (committed) {
        if (committed.pet_id !== petId || committed.command_json !== JSON.stringify(command)) throw new Error('commandId reused with different payload');
        return;
      }
      const existing = await tx.getFirstAsync<{ pet_id: string; command_json: string }>('SELECT pet_id, command_json FROM pending_command WHERE command_id = ?', [command.commandId]);
      if (existing) {
        if (existing.pet_id !== petId || existing.command_json !== JSON.stringify(command)) throw new Error('commandId reused with different payload');
        return;
      }
      await tx.runAsync('INSERT INTO pending_command (command_id, pet_id, command_json, created_at_ms) VALUES (?, ?, ?, ?)', [command.commandId, petId, JSON.stringify(command), command.observedAtMs]);
    });
  }

  async listPending(petId: string): Promise<Extract<Command, { type: 'consumeMeal' }>[]> {
    return this.db.withExclusiveTransactionAsync(async tx => {
      await checkedSnapshot(tx, petId, this.config);
      const rows = await tx.getAllAsync<{ command_json: string }>('SELECT command_json FROM pending_command WHERE pet_id = ? ORDER BY created_at_ms, command_id', [petId]);
      return rows.map(row => JSON.parse(row.command_json) as Extract<Command, { type: 'consumeMeal' }>);
    });
  }

  async cancelPending(commandId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const pending = await tx.getFirstAsync<{ pet_id: string }>('SELECT pet_id FROM pending_command WHERE command_id = ?', [commandId]);
      if (!pending) return;
      await checkedSnapshot(tx, pending.pet_id, this.config);
      await tx.runAsync('DELETE FROM pending_command WHERE command_id = ?', [commandId]);
    });
  }

  async execute(petId: string, command: Command): Promise<StoredTransition> {
    return this.db.withExclusiveTransactionAsync(async tx => {
      const serialized = JSON.stringify(command);
      const previous = await tx.getFirstAsync<CommandRow>('SELECT pet_id, command_json, result_json FROM command_ledger WHERE command_id = ?', [command.commandId]);
      if (previous) {
        if (previous.pet_id !== petId || previous.command_json !== serialized) throw new Error('commandId reused with different payload');
        const latest = await checkedSnapshot(tx, petId, this.config);
        if (!latest) throw new CorruptSnapshotError('Missing pet snapshot');
        return { ...(JSON.parse(previous.result_json) as Transition), replayed: true, currentState: latest };
      }
      const before = await checkedSnapshot(tx, petId, this.config);
      if (!before) throw new Error('Pet not found');
      if (command.type === 'consumeMeal') {
        const consumed = await tx.getFirstAsync<{ command_id: string }>('SELECT command_id FROM meal_ledger WHERE pet_id = ? AND meal_id = ?', [petId, command.mealId]);
        if (consumed) throw new Error(`mealId already consumed by ${consumed.command_id}`);
      }
      const result = reducePet(before, command, this.config);
      const updated = await tx.runAsync('UPDATE pet_snapshot SET revision = ?, state_json = ?, config_version = ? WHERE pet_id = ? AND revision = ?', [result.state.revision, JSON.stringify(result.state), this.config.version, petId, before.revision]);
      if (updated && typeof updated === 'object' && 'changes' in updated && updated.changes !== 1) throw new Error('Concurrent snapshot update');
      if (command.type === 'consumeMeal') await tx.runAsync('INSERT INTO meal_ledger (pet_id, meal_id, command_id) VALUES (?, ?, ?)', [petId, command.mealId, command.commandId]);
      await tx.runAsync('INSERT INTO command_ledger (command_id, pet_id, command_json, result_json, config_version) VALUES (?, ?, ?, ?, ?)', [command.commandId, petId, serialized, JSON.stringify(result), this.config.version]);
      await tx.runAsync('INSERT INTO local_outbox (command_id, pet_id, event_json) VALUES (?, ?, ?)', [command.commandId, petId, JSON.stringify(result.events)]);
      await tx.runAsync('DELETE FROM pending_command WHERE command_id = ?', [command.commandId]);
      return { ...result, replayed: false, currentState: result.state };
    });
  }
}

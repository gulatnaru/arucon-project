import { reducePet, validatePetState } from '../domain/engine';
import type { GameConfig } from '../domain/config';
import type { Command, PetState, Transition } from '../domain/model';
import type { WriterIdentity } from '../sync/contracts';
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
export async function checkedSnapshot(tx: SqlExecutor, petId: string, config: GameConfig): Promise<PetState | null> {
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
      EXISTS(SELECT 1 FROM local_outbox WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM dev_purchase_ledger WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM dev_item_ownership WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM dev_sleep_benefit_ledger WHERE pet_id = ?) OR
      EXISTS(SELECT 1 FROM dev_resolution_ledger WHERE pet_id = ?)
    ) AS present
  `, [petId, petId, petId, petId, petId, petId, petId, petId]);
  if (marker || residue?.present) throw new CorruptSnapshotError('Creation history or dependent rows survive a missing snapshot');
  return null;
}

export class LocalPetStore {
  private readonly db: SqlConnection;
  private readonly config: GameConfig;
  private readonly outboxWriter: WriterIdentity | null;
  constructor(db: SqlConnection, config: GameConfig, outboxWriter: WriterIdentity | null = null) {
    this.db = db;
    this.config = config;
    if (outboxWriter && (!outboxWriter.deviceId || !Number.isSafeInteger(outboxWriter.deviceEpoch) || outboxWriter.deviceEpoch < 0)) {
      throw new Error('Invalid outbox writer identity');
    }
    this.outboxWriter = outboxWriter;
  }

  async migrate(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const version = row?.user_version ?? 0;
      if (version > 6) throw new Error(`Unsupported SQLite schema ${version}; original database preserved`);
      if (version === 6) return;
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
      await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS dev_purchase_ledger (
          purchase_id TEXT PRIMARY KEY NOT NULL,
          pet_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          ownership_key TEXT NOT NULL,
          coin_cost INTEGER NOT NULL CHECK (coin_cost >= 0),
          catalog_version TEXT NOT NULL,
          committed_at_ms INTEGER NOT NULL CHECK (committed_at_ms >= 0),
          result_state_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS dev_item_ownership (
          pet_id TEXT NOT NULL,
          ownership_key TEXT NOT NULL,
          purchase_id TEXT NOT NULL UNIQUE,
          PRIMARY KEY (pet_id, ownership_key)
        );
        CREATE TABLE IF NOT EXISTS dev_sleep_benefit_ledger (
          command_id TEXT PRIMARY KEY NOT NULL,
          pet_id TEXT NOT NULL,
          game_day_id TEXT NOT NULL,
          policy_version TEXT NOT NULL,
          applied_delta REAL NOT NULL CHECK (applied_delta >= 0),
          applied_at_ms INTEGER NOT NULL CHECK (applied_at_ms >= 0),
          result_state_json TEXT NOT NULL,
          UNIQUE (pet_id, game_day_id)
        );
        CREATE TABLE IF NOT EXISTS dev_resolution_ledger (
          pet_id TEXT NOT NULL,
          slot TEXT NOT NULL,
          resolution_id TEXT NOT NULL UNIQUE,
          decision TEXT NOT NULL CHECK (decision IN ('DEC-03', 'DEC-08')),
          policy_id TEXT NOT NULL,
          policy_version TEXT NOT NULL,
          record_json TEXT NOT NULL,
          PRIMARY KEY (pet_id, slot)
        );
      `);
      // v1 was a never-released development schema. Preserve even orphaned v1/v2
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
          UNION SELECT pet_id FROM local_outbox
          UNION SELECT pet_id FROM dev_purchase_ledger
          UNION SELECT pet_id FROM dev_item_ownership
          UNION SELECT pet_id FROM dev_sleep_benefit_ledger
          UNION SELECT pet_id FROM dev_resolution_ledger;
      `);
      // Additive sync metadata does not delete acknowledged rows: retention and
      // permanent-drop policy remain DEC-17 decisions. Existing v2 rows become pending.
      const columns = new Set((await tx.getAllAsync<{ name: string }>('PRAGMA table_info(local_outbox)')).map(column => column.name));
      if (!columns.has('sync_status')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error'))`);
      if (!columns.has('attempt_count')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0
        CHECK (attempt_count >= 0)`);
      if (!columns.has('last_error_code')) await tx.execAsync('ALTER TABLE local_outbox ADD COLUMN last_error_code TEXT');
      if (!columns.has('ack_sequence')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN ack_sequence INTEGER
        CHECK (ack_sequence IS NULL OR ack_sequence >= 0)`);
      if (!columns.has('acknowledged_at_ms')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN acknowledged_at_ms INTEGER
        CHECK (acknowledged_at_ms IS NULL OR acknowledged_at_ms >= 0)`);
      if (!columns.has('device_id')) await tx.execAsync('ALTER TABLE local_outbox ADD COLUMN device_id TEXT');
      if (!columns.has('device_epoch')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN device_epoch INTEGER
        CHECK (device_epoch IS NULL OR device_epoch >= 0)`);
      if (!columns.has('config_version')) await tx.execAsync('ALTER TABLE local_outbox ADD COLUMN config_version TEXT');
      if (!columns.has('next_attempt_at_ms')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN next_attempt_at_ms INTEGER NOT NULL DEFAULT 0
        CHECK (next_attempt_at_ms >= 0)`);
      if (!columns.has('last_attempt_at_ms')) await tx.execAsync(`ALTER TABLE local_outbox ADD COLUMN last_attempt_at_ms INTEGER
        CHECK (last_attempt_at_ms IS NULL OR last_attempt_at_ms >= 0)`);
      if (!columns.has('retry_policy_version')) await tx.execAsync('ALTER TABLE local_outbox ADD COLUMN retry_policy_version TEXT');
      await tx.execAsync(`
        UPDATE local_outbox
        SET config_version = (
          SELECT command_ledger.config_version FROM command_ledger
          WHERE command_ledger.command_id = local_outbox.command_id
            AND command_ledger.pet_id = local_outbox.pet_id
        )
        WHERE config_version IS NULL;
        PRAGMA user_version = 6;
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
      await tx.runAsync('INSERT INTO local_outbox (command_id, pet_id, event_json, device_id, device_epoch, config_version) VALUES (?, ?, ?, ?, ?, ?)', [
        command.commandId, petId, JSON.stringify(result.events), this.outboxWriter?.deviceId ?? null, this.outboxWriter?.deviceEpoch ?? null,
        this.config.version,
      ]);
      await tx.runAsync('DELETE FROM pending_command WHERE command_id = ?', [command.commandId]);
      return { ...result, replayed: false, currentState: result.state };
    });
  }
}

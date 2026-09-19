import type { GameConfig } from '../domain/config';
import { validatePetState } from '../domain/engine';
import type { ServerConfirmedCheckpoint } from '../sync/contracts';
import { checkedSnapshot, CorruptSnapshotError, type SqlConnection } from './sqlite';
import { recordLocalSyncRegistration, type LocalSyncRegistration } from './syncRegistration';

export type StoredServerCheckpoint = Readonly<{
  authorityEventId: string;
  checkpoint: ServerConfirmedCheckpoint;
  preservedActionIds: readonly string[];
}>;

type CheckpointRow = {
  authority_event_id: string;
  checkpoint_json: string;
  preserved_action_ids_json: string;
};

function requiredId(value: string, name: string): void {
  if (!value || value.trim() !== value || value.length > 200 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
}

function validateCheckpoint(checkpoint: ServerConfirmedCheckpoint, config: GameConfig): void {
  requiredId(checkpoint.petId, 'checkpoint pet ID');
  requiredId(checkpoint.configVersion, 'checkpoint config version');
  if (checkpoint.state.petId !== checkpoint.petId ||
      !Number.isSafeInteger(checkpoint.confirmedAtMs) || checkpoint.confirmedAtMs < 0 ||
      !Number.isSafeInteger(checkpoint.serverRevision) || checkpoint.serverRevision < 0 ||
      checkpoint.confirmedActionIds.some(actionId => {
        try { requiredId(actionId, 'confirmed action ID'); return false; } catch { return true; }
      }) || new Set(checkpoint.confirmedActionIds).size !== checkpoint.confirmedActionIds.length) {
    throw new Error('Invalid server-confirmed checkpoint');
  }
  validatePetState(checkpoint.state, config);
}

function parseRow(row: CheckpointRow, config: GameConfig): StoredServerCheckpoint {
  try {
    const checkpoint = JSON.parse(row.checkpoint_json) as ServerConfirmedCheckpoint;
    const preservedActionIds = JSON.parse(row.preserved_action_ids_json) as unknown;
    validateCheckpoint(checkpoint, config);
    if (!Array.isArray(preservedActionIds) || preservedActionIds.some(value => typeof value !== 'string')) {
      throw new Error('Invalid preserved action IDs');
    }
    return Object.freeze({
      authorityEventId: row.authority_event_id,
      checkpoint,
      preservedActionIds: Object.freeze([...preservedActionIds]),
    });
  } catch (error) {
    throw new CorruptSnapshotError(error);
  }
}

/** Restores one confirmed checkpoint and preserves every unconfirmed local row in the same transaction. */
export class SqliteServerConfirmedRecoveryStore {
  constructor(private readonly db: SqlConnection, private readonly config: GameConfig) {}

  async load(petId: string): Promise<StoredServerCheckpoint | null> {
    requiredId(petId, 'checkpoint pet ID');
    const row = await this.db.getFirstAsync<CheckpointRow>(`
      SELECT authority_event_id, checkpoint_json, preserved_action_ids_json
      FROM local_sync_checkpoint WHERE pet_id = ?
    `, [petId]);
    return row ? parseRow(row, this.config) : null;
  }

  async restore(
    authorityEventId: string,
    checkpoint: ServerConfirmedCheckpoint,
    registration: LocalSyncRegistration | null = null,
  ): Promise<StoredServerCheckpoint> {
    requiredId(authorityEventId, 'recovery authority event ID');
    validateCheckpoint(checkpoint, this.config);
    const serialized = JSON.stringify(checkpoint);
    return this.db.withExclusiveTransactionAsync(async tx => {
      const priorByEvent = await tx.getFirstAsync<CheckpointRow>(`
        SELECT authority_event_id, checkpoint_json, preserved_action_ids_json
        FROM local_sync_checkpoint WHERE authority_event_id = ?
      `, [authorityEventId]);
      if (priorByEvent) {
        const prior = parseRow(priorByEvent, this.config);
        if (prior.checkpoint.petId !== checkpoint.petId || priorByEvent.checkpoint_json !== serialized) {
          throw new Error('Recovery authority event replay mismatch');
        }
        if (registration) await recordLocalSyncRegistration(tx, registration);
        return prior;
      }

      const previousCheckpoint = await tx.getFirstAsync<{
        confirmed_at_ms: number; server_revision: number;
      }>('SELECT confirmed_at_ms, server_revision FROM local_sync_checkpoint WHERE pet_id = ?', [checkpoint.petId]);
      if (previousCheckpoint && (checkpoint.confirmedAtMs < previousCheckpoint.confirmed_at_ms ||
          checkpoint.serverRevision < previousCheckpoint.server_revision)) {
        throw new Error('Server-confirmed checkpoint moved backwards');
      }

      const current = await checkedSnapshot(tx, checkpoint.petId, this.config);
      if (current) {
        await tx.runAsync(
          'UPDATE pet_snapshot SET revision = ?, state_json = ?, config_version = ? WHERE pet_id = ?',
          [checkpoint.state.revision, JSON.stringify(checkpoint.state), checkpoint.configVersion, checkpoint.petId],
        );
      } else {
        await tx.runAsync('INSERT INTO pet_registry (pet_id) VALUES (?)', [checkpoint.petId]);
        await tx.runAsync(
          'INSERT INTO pet_snapshot (pet_id, revision, state_json, config_version) VALUES (?, ?, ?, ?)',
          [checkpoint.petId, checkpoint.state.revision, JSON.stringify(checkpoint.state), checkpoint.configVersion],
        );
      }

      const rows = await tx.getAllAsync<{ command_id: string }>(`
        SELECT command_id FROM local_outbox
        WHERE pet_id = ? AND sync_status IN ('pending', 'error', 'conflict')
        ORDER BY sequence
      `, [checkpoint.petId]);
      const preservedActionIds = rows.map(row => row.command_id);
      await tx.runAsync(`
        UPDATE local_outbox
        SET sync_status = 'conflict', last_error_code = 'server_confirmed_recovery_unmerged', next_attempt_at_ms = 0
        WHERE pet_id = ? AND sync_status IN ('pending', 'error')
      `, [checkpoint.petId]);
      await tx.runAsync(`
        INSERT INTO local_sync_checkpoint
          (pet_id, authority_event_id, confirmed_at_ms, server_revision, config_version, checkpoint_json, preserved_action_ids_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(pet_id) DO UPDATE SET
          authority_event_id = excluded.authority_event_id,
          confirmed_at_ms = excluded.confirmed_at_ms,
          server_revision = excluded.server_revision,
          config_version = excluded.config_version,
          checkpoint_json = excluded.checkpoint_json,
          preserved_action_ids_json = excluded.preserved_action_ids_json
      `, [
        checkpoint.petId, authorityEventId, checkpoint.confirmedAtMs, checkpoint.serverRevision,
        checkpoint.configVersion, serialized, JSON.stringify(preservedActionIds),
      ]);
      if (registration) await recordLocalSyncRegistration(tx, registration);
      return Object.freeze({ authorityEventId, checkpoint, preservedActionIds: Object.freeze(preservedActionIds) });
    });
  }
}

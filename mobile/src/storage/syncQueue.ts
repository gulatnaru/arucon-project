import { isIssuedSyntheticOutboundEnvelope } from '../privacy/outbound';
import type { LocalSyncRecord, SyncAction, SyncOutboundEnvelopeProjector, SyncPayloadEvent, SyncQueue, SyncStatus, SyncSummary } from '../sync/contracts';
import type { SqlConnection } from './sqlite';

type OutboxRow = {
  sequence: number;
  command_id: string;
  pet_id: string;
  event_json: string;
  config_version: string;
  sync_status: SyncStatus;
  attempt_count: number;
  last_error_code: string | null;
  ack_sequence: number | null;
  acknowledged_at_ms: number | null;
  device_id: string | null;
  device_epoch: number | null;
};

function requireWhole(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}`);
}

function requireCode(code: string): void {
  if (!code.trim() || code.length > 160) throw new Error('Invalid sync error code');
}

function parseEvents(raw: string): readonly SyncPayloadEvent[] {
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) throw new Error('Corrupt outbox event payload');
  return value as SyncPayloadEvent[];
}

/** SQLite-backed queue for already-committed local actions. */
export class SqliteSyncQueue implements SyncQueue {
  constructor(private readonly db: SqlConnection, private readonly projector: SyncOutboundEnvelopeProjector) {}

  async listDispatchable(limit: number): Promise<readonly SyncAction[]> {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Invalid sync batch limit');
    const rows = await this.db.getAllAsync<OutboxRow>(`
      SELECT o.sequence, o.command_id, o.pet_id, o.event_json, o.config_version,
             o.sync_status, o.attempt_count, o.last_error_code, o.ack_sequence, o.acknowledged_at_ms,
             o.device_id, o.device_epoch
      FROM local_outbox o
      WHERE o.sync_status IN ('pending', 'error')
      ORDER BY o.sequence
      LIMIT ?
    `, [limit]);
    return rows.map(row => {
      if (!row.device_id || row.device_epoch === null || !Number.isSafeInteger(row.device_epoch) || row.device_epoch < 0) {
        throw new Error('DecisionRequired: outbox writer identity is not configured');
      }
      if (!row.config_version) throw new Error('DecisionRequired: outbox config version is not configured');
      const local: LocalSyncRecord = {
        actionId: row.command_id,
        petId: row.pet_id,
        localSequence: row.sequence,
        writer: { deviceId: row.device_id, deviceEpoch: row.device_epoch },
        configVersion: row.config_version,
        events: parseEvents(row.event_json),
      };
      const envelope = this.projector.project(local);
      if (!isIssuedSyntheticOutboundEnvelope(envelope)) throw new Error('Valid DEV outbound envelope required');
      if (envelope.petId !== local.petId || envelope.deviceId !== local.writer.deviceId) throw new Error('Outbound envelope identity mismatch');
      return {
        actionId: local.actionId,
        petId: local.petId,
        localSequence: local.localSequence,
        writer: local.writer,
        configVersion: local.configVersion,
        envelope,
      };
    });
  }

  async acknowledge(actionId: string, ackSequence: number, confirmedAtMs: number): Promise<void> {
    requireWhole(ackSequence, 'ack sequence');
    requireWhole(confirmedAtMs, 'acknowledgement time');
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<Pick<OutboxRow, 'pet_id' | 'sync_status' | 'ack_sequence' | 'acknowledged_at_ms'>>(
        'SELECT pet_id, sync_status, ack_sequence, acknowledged_at_ms FROM local_outbox WHERE command_id = ?', [actionId],
      );
      if (!row) throw new Error('Unknown outbox action');
      if (row.sync_status === 'synced') {
        if (row.ack_sequence !== ackSequence || row.acknowledged_at_ms !== confirmedAtMs) throw new Error('Conflicting acknowledgement replay');
        return;
      }
      if (row.sync_status === 'conflict') throw new Error('DecisionRequired: conflict row requires DEC-10 resolution');
      const duplicateAck = await tx.getFirstAsync<{ command_id: string }>(
        'SELECT command_id FROM local_outbox WHERE pet_id = ? AND ack_sequence = ? AND command_id <> ?',
        [row.pet_id, ackSequence, actionId],
      );
      if (duplicateAck) throw new Error(`Acknowledgement sequence already belongs to ${duplicateAck.command_id}`);
      await tx.runAsync(`
        UPDATE local_outbox
        SET sync_status = 'synced', attempt_count = attempt_count + 1, last_error_code = NULL,
            ack_sequence = ?, acknowledged_at_ms = ?
        WHERE command_id = ?
      `, [ackSequence, confirmedAtMs, actionId]);
    });
  }

  async recordRetryableError(actionId: string, code: string): Promise<void> {
    requireCode(code);
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<Pick<OutboxRow, 'sync_status'>>(
        'SELECT sync_status FROM local_outbox WHERE command_id = ?', [actionId],
      );
      if (!row) throw new Error('Unknown outbox action');
      if (row.sync_status === 'synced') return;
      if (row.sync_status === 'conflict') throw new Error('DecisionRequired: conflict row requires DEC-10 resolution');
      await tx.runAsync(`
        UPDATE local_outbox
        SET sync_status = 'error', attempt_count = attempt_count + 1, last_error_code = ?
        WHERE command_id = ?
      `, [code, actionId]);
    });
  }

  async recordConflict(actionId: string, code: string): Promise<void> {
    requireCode(code);
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<Pick<OutboxRow, 'sync_status' | 'last_error_code'>>(
        'SELECT sync_status, last_error_code FROM local_outbox WHERE command_id = ?', [actionId],
      );
      if (!row) throw new Error('Unknown outbox action');
      if (row.sync_status === 'synced') return;
      if (row.sync_status === 'conflict') {
        if (row.last_error_code !== code) throw new Error('Conflicting conflict classification');
        return;
      }
      await tx.runAsync(`
        UPDATE local_outbox
        SET sync_status = 'conflict', attempt_count = attempt_count + 1, last_error_code = ?
        WHERE command_id = ?
      `, [code, actionId]);
    });
  }

  async summary(petId: string): Promise<SyncSummary> {
    const rows = await this.db.getAllAsync<Pick<OutboxRow, 'sync_status' | 'ack_sequence' | 'acknowledged_at_ms'>>(
      'SELECT sync_status, ack_sequence, acknowledged_at_ms FROM local_outbox WHERE pet_id = ? ORDER BY sequence', [petId],
    );
    const pendingCount = rows.filter(row => row.sync_status === 'pending').length;
    const errorCount = rows.filter(row => row.sync_status === 'error').length;
    const conflictCount = rows.filter(row => row.sync_status === 'conflict').length;
    const acknowledged = rows.filter(row => row.sync_status === 'synced' && row.ack_sequence !== null && row.acknowledged_at_ms !== null);
    const latest = acknowledged.reduce<(typeof acknowledged)[number] | null>((current, row) =>
      !current || (row.ack_sequence ?? -1) > (current.ack_sequence ?? -1) ? row : current, null);
    const status: SyncStatus = conflictCount > 0 ? 'conflict' : errorCount > 0 ? 'error' : pendingCount > 0 ? 'pending' : 'synced';
    return {
      status, pendingCount, errorCount, conflictCount,
      lastAcknowledgedAtMs: latest?.acknowledged_at_ms ?? null,
      lastAckSequence: latest?.ack_sequence ?? null,
    };
  }
}

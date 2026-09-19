import type { WriterAccess } from '../sync/deviceAuthority';
import type { SqlConnection, SqlExecutor } from './sqlite';

export type LocalSyncRegistration = Readonly<{
  accountId: string;
  petId: string;
  deviceId: string;
  deviceEpoch: number;
  access: WriterAccess;
  authorityEventId: string;
  updatedAtMs: number;
}>;

type RegistrationRow = {
  account_id: string;
  pet_id: string;
  device_id: string;
  device_epoch: number;
  access_mode: WriterAccess;
  authority_event_id: string;
  updated_at_ms: number;
};

function requiredId(value: string, name: string): void {
  if (!value || value.trim() !== value || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`Invalid ${name}`);
}

export function validateLocalSyncRegistration(value: LocalSyncRegistration): void {
  requiredId(value.accountId, 'sync account ID');
  requiredId(value.petId, 'sync pet ID');
  requiredId(value.deviceId, 'sync device ID');
  requiredId(value.authorityEventId, 'authority event ID');
  if (!Number.isSafeInteger(value.deviceEpoch) || value.deviceEpoch < 0 ||
      !Number.isSafeInteger(value.updatedAtMs) || value.updatedAtMs < 0 ||
      !['active_writer', 'read_only_fenced'].includes(value.access)) throw new Error('Invalid sync registration');
}

function fromRow(row: RegistrationRow): LocalSyncRegistration {
  const value = {
    accountId: row.account_id,
    petId: row.pet_id,
    deviceId: row.device_id,
    deviceEpoch: row.device_epoch,
    access: row.access_mode,
    authorityEventId: row.authority_event_id,
    updatedAtMs: row.updated_at_ms,
  };
  validateLocalSyncRegistration(value);
  return value;
}

/** Durable local knowledge only; the synthetic/remote authority remains the fencing source. */
export class SqliteSyncRegistrationStore {
  constructor(private readonly db: SqlConnection) {}

  async load(petId: string): Promise<LocalSyncRegistration | null> {
    requiredId(petId, 'sync pet ID');
    const row = await this.db.getFirstAsync<RegistrationRow>(`
      SELECT account_id, pet_id, device_id, device_epoch, access_mode, authority_event_id, updated_at_ms
      FROM local_sync_registration WHERE pet_id = ?
    `, [petId]);
    return row ? fromRow(row) : null;
  }

  async record(value: LocalSyncRegistration): Promise<void> {
    validateLocalSyncRegistration(value);
    await this.db.withExclusiveTransactionAsync(tx => recordLocalSyncRegistration(tx, value));
  }
}

/** Internal transaction primitive shared with atomic server-confirmed recovery. */
export async function recordLocalSyncRegistration(tx: SqlExecutor, value: LocalSyncRegistration): Promise<void> {
  validateLocalSyncRegistration(value);
  const pet = await tx.getFirstAsync<{ pet_id: string }>('SELECT pet_id FROM pet_registry WHERE pet_id = ?', [value.petId]);
  if (!pet) throw new Error('Sync registration pet not found');
  const row = await tx.getFirstAsync<RegistrationRow>(`
    SELECT account_id, pet_id, device_id, device_epoch, access_mode, authority_event_id, updated_at_ms
    FROM local_sync_registration WHERE pet_id = ?
  `, [value.petId]);
  if (row) {
    const current = fromRow(row);
    if (current.authorityEventId === value.authorityEventId) {
      if (JSON.stringify(current) !== JSON.stringify(value)) throw new Error('Authority event replay mismatch');
      return;
    }
    if (current.accountId !== value.accountId || current.deviceId !== value.deviceId) throw new Error('Sync registration identity changed');
    if (value.deviceEpoch < current.deviceEpoch || value.updatedAtMs < current.updatedAtMs) throw new Error('Stale sync registration');
    if (value.deviceEpoch === current.deviceEpoch && current.access === 'read_only_fenced' && value.access === 'active_writer') {
      throw new Error('Fenced writer cannot reactivate without a newer epoch');
    }
    await tx.runAsync(`
      UPDATE local_sync_registration
      SET device_epoch = ?, access_mode = ?, authority_event_id = ?, updated_at_ms = ?
      WHERE pet_id = ?
    `, [value.deviceEpoch, value.access, value.authorityEventId, value.updatedAtMs, value.petId]);
    return;
  }
  await tx.runAsync(`
    INSERT INTO local_sync_registration
      (account_id, pet_id, device_id, device_epoch, access_mode, authority_event_id, updated_at_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [value.accountId, value.petId, value.deviceId, value.deviceEpoch, value.access, value.authorityEventId, value.updatedAtMs]);
}

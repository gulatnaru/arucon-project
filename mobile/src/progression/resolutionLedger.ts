import type { GameConfig } from '../domain/config';
import { checkedSnapshot, type SqlConnection, type SqlExecutor } from '../storage/sqlite';
import {
  freezeStoredResolution,
  type FrozenResolution,
  type JsonValue,
} from './oneTimeResolution';

export type ResolutionLedgerConflictCode = 'resolution_id_conflict' | 'slot_already_resolved';

export class ResolutionLedgerConflictError extends Error {
  readonly code: ResolutionLedgerConflictCode;
  constructor(code: ResolutionLedgerConflictCode) {
    super(`Resolution ledger conflict: ${code}`);
    this.name = 'ResolutionLedgerConflictError';
    this.code = code;
  }
}

export class CorruptResolutionRecordError extends Error {
  constructor(cause: unknown) {
    super('Stored resolution record is invalid; original bytes have been preserved');
    this.name = 'CorruptResolutionRecordError';
    this.cause = cause;
  }
}

export type StoredResolution<T extends JsonValue> = Readonly<{
  resolutionId: string;
  record: FrozenResolution<T>;
  replayed: boolean;
}>;

type ResolutionRow = {
  pet_id: string;
  slot: string;
  resolution_id: string;
  decision: string;
  policy_id: string;
  policy_version: string;
  record_json: string;
};

function requiredScope(value: string, name: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid resolution ${name}`);
}

function canonicalJson(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalJson);
  const source = value as Readonly<Record<string, JsonValue>>;
  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(source).sort()) result[key] = canonicalJson(source[key]);
  return result;
}

function serializeRecord<T extends JsonValue>(record: FrozenResolution<T>): string {
  return JSON.stringify({
    decision: record.decision,
    policyId: record.policyId,
    policyVersion: record.policyVersion,
    resolvedAt: { level: record.resolvedAt.level, stage: record.resolvedAt.stage },
    slot: record.slot,
    value: canonicalJson(record.value),
  });
}

function parseRow<T extends JsonValue>(
  row: ResolutionRow,
  validateStoredValue: (value: JsonValue) => value is T,
): FrozenResolution<T> {
  try {
    const parsed = JSON.parse(row.record_json) as FrozenResolution<T>;
    const record = freezeStoredResolution(row.slot, parsed, validateStoredValue);
    if (row.decision !== record.decision || row.policy_id !== record.policyId ||
        row.policy_version !== record.policyVersion || serializeRecord(record) !== row.record_json) {
      throw new Error('Resolution row metadata or canonical payload mismatch');
    }
    return record;
  } catch (error) {
    if (error instanceof CorruptResolutionRecordError) throw error;
    throw new CorruptResolutionRecordError(error);
  }
}

async function byResolutionId(tx: SqlExecutor, resolutionId: string): Promise<ResolutionRow | null> {
  return tx.getFirstAsync<ResolutionRow>(`
    SELECT pet_id, slot, resolution_id, decision, policy_id, policy_version, record_json
    FROM dev_resolution_ledger WHERE resolution_id = ?
  `, [resolutionId]);
}

async function byScope(tx: SqlExecutor, petId: string, slot: string): Promise<ResolutionRow | null> {
  return tx.getFirstAsync<ResolutionRow>(`
    SELECT pet_id, slot, resolution_id, decision, policy_id, policy_version, record_json
    FROM dev_resolution_ledger WHERE pet_id = ? AND slot = ?
  `, [petId, slot]);
}

async function requireCurrentPet(tx: SqlExecutor, petId: string, config: GameConfig): Promise<void> {
  const state = await checkedSnapshot(tx, petId, config);
  if (!state) throw new Error('Pet not found');
}

/** Durable storage for caller-prepared outcomes. It never invokes an RNG or resolution policy. */
export class ResolutionLedger {
  constructor(private readonly db: SqlConnection, private readonly config: GameConfig) {}

  async load<T extends JsonValue>(
    petId: string,
    slot: string,
    validateStoredValue: (value: JsonValue) => value is T,
  ): Promise<FrozenResolution<T> | null> {
    requiredScope(petId, 'petId');
    requiredScope(slot, 'slot');
    if (typeof validateStoredValue !== 'function') throw new Error('Missing stored resolution validator');
    return this.db.withExclusiveTransactionAsync(async tx => {
      await requireCurrentPet(tx, petId, this.config);
      const row = await byScope(tx, petId, slot);
      return row ? parseRow(row, validateStoredValue) : null;
    });
  }

  async commit<T extends JsonValue>(input: Readonly<{
    petId: string;
    resolutionId: string;
    prepared: FrozenResolution<T>;
    validateStoredValue: (value: JsonValue) => value is T;
  }>): Promise<StoredResolution<T>> {
    requiredScope(input.petId, 'petId');
    requiredScope(input.resolutionId, 'resolutionId');
    const prepared = freezeStoredResolution(input.prepared.slot, input.prepared, input.validateStoredValue);
    const serialized = serializeRecord(prepared);

    return this.db.withExclusiveTransactionAsync(async tx => {
      await requireCurrentPet(tx, input.petId, this.config);
      const sameId = await byResolutionId(tx, input.resolutionId);
      if (sameId) {
        if (sameId.pet_id !== input.petId || sameId.slot !== prepared.slot || sameId.record_json !== serialized) {
          throw new ResolutionLedgerConflictError('resolution_id_conflict');
        }
        const record = parseRow(sameId, input.validateStoredValue);
        return Object.freeze({ resolutionId: input.resolutionId, record, replayed: true });
      }

      const sameSlot = await byScope(tx, input.petId, prepared.slot);
      if (sameSlot) {
        parseRow(sameSlot, input.validateStoredValue);
        throw new ResolutionLedgerConflictError('slot_already_resolved');
      }

      await tx.runAsync(`
        INSERT INTO dev_resolution_ledger
          (pet_id, slot, resolution_id, decision, policy_id, policy_version, record_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        input.petId, prepared.slot, input.resolutionId, prepared.decision,
        prepared.policyId, prepared.policyVersion, serialized,
      ]);
      return Object.freeze({ resolutionId: input.resolutionId, record: prepared, replayed: false });
    });
  }
}

import type { DomainEvent, PetState } from '../domain/model';
import type { SyntheticOutboundEnvelope } from '../privacy/outbound';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

/** Injected identity only. The active-writer policy remains a DEC-10 decision. */
export type WriterIdentity = Readonly<{
  deviceId: string;
  deviceEpoch: number;
}>;

export type SyncAction = Readonly<{
  actionId: string;
  petId: string;
  localSequence: number;
  writer: WriterIdentity;
  configVersion: string;
  envelope: SyntheticOutboundEnvelope;
}>;

/** DEV-only ledger events remain distinct from approved game domain events. */
export type SyncPayloadEvent = DomainEvent |
  Readonly<{ type: 'DevCoinPurchaseCommitted'; purchaseId: string; itemId: string; ownershipKey: string; coinCost: number }> |
  Readonly<{ type: 'DevSleepRecoveryCommitted'; commandId: string; gameDayId: string; appliedDelta: number }>;

export type LocalSyncRecord = Readonly<{
  actionId: string;
  petId: string;
  localSequence: number;
  writer: WriterIdentity;
  configVersion: string;
  events: readonly SyncPayloadEvent[];
}>;

export interface SyncOutboundEnvelopeProjector {
  project(record: LocalSyncRecord): SyntheticOutboundEnvelope;
}

export type SyncSummary = Readonly<{
  status: SyncStatus;
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  lastAcknowledgedAtMs: number | null;
  lastAckSequence: number | null;
}>;

export type DeliveryResult =
  | Readonly<{ kind: 'ack'; actionId: string; ackSequence: number; confirmedAtMs: number }>
  | Readonly<{ kind: 'retryable_error'; code: string }>
  | Readonly<{ kind: 'conflict'; code: string }>;

export interface SyncQueue {
  listDispatchable(limit: number): Promise<readonly SyncAction[]>;
  acknowledge(actionId: string, ackSequence: number, confirmedAtMs: number): Promise<void>;
  recordRetryableError(actionId: string, code: string): Promise<void>;
  recordConflict(actionId: string, code: string): Promise<void>;
  summary(petId: string): Promise<SyncSummary>;
}

export interface SyncTransport {
  deliver(action: SyncAction): Promise<DeliveryResult>;
}

/** A server checkpoint contains only server-confirmed state and its identity. */
export type ServerConfirmedCheckpoint = Readonly<{
  petId: string;
  state: PetState;
  confirmedActionIds: readonly string[];
  confirmedAtMs: number;
  serverRevision: number;
  configVersion: string;
}>;

export type RecoveryPlan =
  | Readonly<{
      kind: 'ready';
      checkpoint: ServerConfirmedCheckpoint;
      emitRewardEvents: false;
    }>
  | Readonly<{
      kind: 'decision_required';
      decision: 'DEC-10';
      reason: 'unconfirmed_local_actions';
      preservedActionIds: readonly string[];
      checkpoint: ServerConfirmedCheckpoint;
    }>;

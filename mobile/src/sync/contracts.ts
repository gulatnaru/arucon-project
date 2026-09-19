import type { DomainEvent, PetState } from '../domain/model';
import type { SyntheticOutboundEnvelope } from '../privacy/outbound';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

/** Writer identity fenced by the approved single-writer authority contract. */
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
  /** Number of completed delivery attempts persisted before this dispatch. */
  attemptCount: number;
  envelope: SyntheticOutboundEnvelope;
}>;

/** DEV-only ledger events remain distinct from approved game domain events. */
export type SyncPayloadEvent = DomainEvent |
  Readonly<{ type: 'DevCoinPurchaseCommitted'; purchaseId: string; itemId: string; ownershipKey: string; coinCost: number }> |
  Readonly<{
    type: 'ApprovedCoinPurchaseCommitted'; purchaseId: string; itemId: string;
    ownershipKey: string | null; effect: 'medicine_recovery' | 'install_table' | 'grant_ownership'; coinCost: number;
  }> |
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
  project(record: LocalSyncRecord): SyntheticOutboundEnvelope | Promise<SyntheticOutboundEnvelope>;
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
  listDispatchable(limit: number, nowMs: number): Promise<readonly SyncAction[]>;
  nextRunnableAtMs(): Promise<number | null>;
  acknowledge(actionId: string, ackSequence: number, confirmedAtMs: number): Promise<void>;
  recordRetryableError(
    actionId: string,
    code: string,
    attemptedAtMs: number,
    nextAttemptAtMs: number,
    retryPolicyVersion: string,
  ): Promise<void>;
  recordConflict(actionId: string, code: string): Promise<void>;
  unconfirmedActionIds(petId: string): Promise<readonly string[]>;
  preserveRecoveryConflicts(petId: string, actionIds: readonly string[]): Promise<void>;
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
      kind: 'server_confirmed_only';
      reason: 'unconfirmed_local_actions_preserved';
      preservedActionIds: readonly string[];
      checkpoint: ServerConfirmedCheckpoint;
      mergeLocalActions: false;
      emitRewardEvents: false;
    }>;

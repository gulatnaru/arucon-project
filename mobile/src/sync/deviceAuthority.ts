import { isIssuedSyntheticAccessGrant, type SyntheticAccessGrant } from '../auth/syntheticAccess';
import type { ServerConfirmedCheckpoint, SyncSummary, WriterIdentity } from './contracts';

export type WriterAccess = 'active_writer' | 'read_only_fenced';

export type SyntheticWriterReceipt = Readonly<{
  ackSequence: number;
  confirmedAtMs: number;
}>;

export interface SyntheticWriterFence {
  currentWriter(): WriterIdentity;
  accessFor(writer: WriterIdentity): WriterAccess;
  recordServerAcknowledgement(petId: string, writer: WriterIdentity, receipt: SyntheticWriterReceipt): void;
  recordServerCheckpoint(checkpoint: ServerConfirmedCheckpoint, writer: WriterIdentity, receipt: SyntheticWriterReceipt): void;
}

export type WriterTransferResult = Readonly<{
  handoffId: string;
  mode: 'normal_handoff' | 'forced_recovery';
  previousWriter: WriterIdentity;
  activeWriter: WriterIdentity;
  checkpoint: ServerConfirmedCheckpoint | null;
}>;

type StoredTransfer = Readonly<{ fingerprint: string; result: WriterTransferResult }>;
type PreparedMetadata = Readonly<{ fingerprint: string; result: WriterTransferResult; replay: boolean }>;
export type PreparedWriterTransfer = Readonly<{
  kind: 'synthetic_writer_transfer_preparation';
  result: WriterTransferResult;
}>;
const preparedTransfers = new WeakMap<object, PreparedMetadata>();

function requiredId(value: string, name: string): string {
  if (!value || value.trim() !== value || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

function sameWriter(left: WriterIdentity, right: WriterIdentity): boolean {
  return left.deviceId === right.deviceId && left.deviceEpoch === right.deviceEpoch;
}

function validateCheckpoint(checkpoint: ServerConfirmedCheckpoint, petId: string): void {
  if (checkpoint.petId !== petId || checkpoint.state.petId !== petId ||
      !Number.isSafeInteger(checkpoint.confirmedAtMs) || checkpoint.confirmedAtMs < 0 ||
      !Number.isSafeInteger(checkpoint.serverRevision) || checkpoint.serverRevision < 0 ||
      !checkpoint.configVersion || checkpoint.configVersion.trim() !== checkpoint.configVersion ||
      checkpoint.confirmedActionIds.some(actionId => !actionId || actionId.trim() !== actionId) ||
      new Set(checkpoint.confirmedActionIds).size !== checkpoint.confirmedActionIds.length) {
    throw new Error('Invalid server-confirmed checkpoint');
  }
}

/**
 * In-process service fake for the approved one-writer rule. It proves fencing
 * semantics, not production authentication or durable server availability.
 */
export class SyntheticSingleWriterAuthority implements SyntheticWriterFence {
  private activeWriter: WriterIdentity;
  private readonly receiptsByPet = new Map<string, SyntheticWriterReceipt>();
  private readonly transfers = new Map<string, StoredTransfer>();

  constructor(
    private readonly accountId: string,
    private readonly petId: string,
    initialWriter: WriterIdentity,
    private confirmedCheckpoint: ServerConfirmedCheckpoint | null = null,
  ) {
    requiredId(accountId, 'synthetic account ID');
    requiredId(petId, 'synthetic pet ID');
    requiredId(initialWriter.deviceId, 'writer device ID');
    if (!Number.isSafeInteger(initialWriter.deviceEpoch) || initialWriter.deviceEpoch < 0) throw new Error('Invalid writer epoch');
    if (confirmedCheckpoint) validateCheckpoint(confirmedCheckpoint, petId);
    this.activeWriter = Object.freeze({ ...initialWriter });
  }

  currentWriter(): WriterIdentity {
    return this.activeWriter;
  }

  accessFor(writer: WriterIdentity): WriterAccess {
    return sameWriter(writer, this.activeWriter) ? 'active_writer' : 'read_only_fenced';
  }

  recordServerAcknowledgement(petId: string, writer: WriterIdentity, receipt: SyntheticWriterReceipt): void {
    if (!sameWriter(writer, this.activeWriter)) throw new Error('Fenced writer cannot record acknowledgement');
    if (petId !== this.petId || !Number.isSafeInteger(receipt.ackSequence) || receipt.ackSequence < 0 ||
        !Number.isSafeInteger(receipt.confirmedAtMs) || receipt.confirmedAtMs < 0) throw new Error('Invalid server acknowledgement');
    const previous = this.receiptsByPet.get(petId);
    if (previous && (receipt.ackSequence < previous.ackSequence || receipt.confirmedAtMs < previous.confirmedAtMs)) {
      throw new Error('Server acknowledgement moved backwards');
    }
    this.receiptsByPet.set(petId, Object.freeze({ ...receipt }));
  }

  recordServerCheckpoint(
    checkpoint: ServerConfirmedCheckpoint,
    writer: WriterIdentity,
    receipt: SyntheticWriterReceipt,
  ): void {
    validateCheckpoint(checkpoint, this.petId);
    if (!sameWriter(writer, this.activeWriter) || checkpoint.confirmedAtMs !== receipt.confirmedAtMs ||
        checkpoint.serverRevision < (this.confirmedCheckpoint?.serverRevision ?? -1) ||
        checkpoint.state.revision < (this.confirmedCheckpoint?.state.revision ?? -1) ||
        this.confirmedCheckpoint?.confirmedActionIds.some(actionId => !checkpoint.confirmedActionIds.includes(actionId))) {
      throw new Error('Invalid synthetic server checkpoint update');
    }
    this.recordServerAcknowledgement(checkpoint.petId, writer, receipt);
    this.confirmedCheckpoint = Object.freeze({
      ...checkpoint,
      state: Object.freeze({ ...checkpoint.state }),
      confirmedActionIds: Object.freeze([...checkpoint.confirmedActionIds]),
    });
  }

  normalHandoff(input: Readonly<{
    handoffId: string;
    sourceGrant: SyntheticAccessGrant;
    targetGrant: SyntheticAccessGrant;
    sourceSummary: SyncSummary;
  }>): WriterTransferResult {
    return this.commitPreparedTransfer(this.prepareNormalHandoff(input));
  }

  prepareNormalHandoff(input: Readonly<{
    handoffId: string;
    sourceGrant: SyntheticAccessGrant;
    targetGrant: SyntheticAccessGrant;
    sourceSummary: SyncSummary;
  }>): PreparedWriterTransfer {
    const handoffId = requiredId(input.handoffId, 'handoff ID');
    this.requireGrant(input.sourceGrant);
    this.requireGrant(input.targetGrant);
    const receipt = this.receiptsByPet.get(this.petId) ?? null;
    const fingerprint = JSON.stringify({
      mode: 'normal_handoff', accountId: this.accountId, petId: this.petId,
      sourceDeviceId: input.sourceGrant.deviceId, targetDeviceId: input.targetGrant.deviceId, receipt,
    });
    const replay = this.replay(handoffId, fingerprint);
    if (replay) return this.prepare(fingerprint, replay, true);
    if (input.sourceGrant.deviceId !== this.activeWriter.deviceId) throw new Error('Source is not the active writer');
    if (input.targetGrant.deviceId === this.activeWriter.deviceId) throw new Error('Target device must differ from active writer');
    if (input.sourceSummary.pendingCount !== 0 || input.sourceSummary.errorCount !== 0 || input.sourceSummary.conflictCount !== 0 ||
        input.sourceSummary.status !== 'synced' || input.sourceSummary.lastAckSequence !== (receipt?.ackSequence ?? null) ||
        input.sourceSummary.lastAcknowledgedAtMs !== (receipt?.confirmedAtMs ?? null)) {
      throw new Error('Handoff requires confirmed source synchronization');
    }
    return this.prepare(
      fingerprint,
      this.nextTransfer(handoffId, 'normal_handoff', input.targetGrant, this.confirmedCheckpoint),
      false,
    );
  }

  forceRecovery(input: Readonly<{
    handoffId: string;
    targetGrant: SyntheticAccessGrant;
  }>): WriterTransferResult {
    return this.commitPreparedTransfer(this.prepareForceRecovery(input));
  }

  prepareForceRecovery(input: Readonly<{
    handoffId: string;
    targetGrant: SyntheticAccessGrant;
  }>): PreparedWriterTransfer {
    const handoffId = requiredId(input.handoffId, 'handoff ID');
    this.requireGrant(input.targetGrant);
    const fingerprint = JSON.stringify({
      mode: 'forced_recovery', accountId: this.accountId, petId: this.petId,
      targetDeviceId: input.targetGrant.deviceId,
      checkpointRevision: this.confirmedCheckpoint?.serverRevision ?? null,
    });
    const replay = this.replay(handoffId, fingerprint);
    if (replay) return this.prepare(fingerprint, replay, true);
    if (input.targetGrant.deviceId === this.activeWriter.deviceId) throw new Error('Recovery target must differ from active writer');
    if (!this.confirmedCheckpoint) throw new Error('No server-confirmed checkpoint available');
    return this.prepare(
      fingerprint,
      this.nextTransfer(handoffId, 'forced_recovery', input.targetGrant, this.confirmedCheckpoint),
      false,
    );
  }

  commitPreparedTransfer(prepared: PreparedWriterTransfer): WriterTransferResult {
    const metadata = preparedTransfers.get(prepared);
    if (!metadata) throw new Error('Valid synthetic transfer preparation required');
    if (metadata.replay) return metadata.result;
    const existing = this.transfers.get(metadata.result.handoffId);
    if (existing) {
      if (existing.fingerprint !== metadata.fingerprint) throw new Error('Handoff ID reused with different request');
      return existing.result;
    }
    if (!sameWriter(this.activeWriter, metadata.result.previousWriter)) throw new Error('Writer changed before prepared transfer commit');
    this.activeWriter = metadata.result.activeWriter;
    this.transfers.set(metadata.result.handoffId, { fingerprint: metadata.fingerprint, result: metadata.result });
    return metadata.result;
  }

  private requireGrant(grant: SyntheticAccessGrant, expectedDeviceId?: string): void {
    if (!isIssuedSyntheticAccessGrant(grant, 'pet_access')) throw new Error('Valid DEV pet access grant required');
    if (grant.accountId !== this.accountId) throw new Error('Synthetic handoff account mismatch');
    if (grant.petId !== this.petId) throw new Error('Synthetic handoff pet mismatch');
    if (expectedDeviceId && grant.deviceId !== expectedDeviceId) throw new Error('Source is not the active writer');
  }

  private replay(handoffId: string, fingerprint: string): WriterTransferResult | null {
    const stored = this.transfers.get(handoffId);
    if (!stored) return null;
    if (stored.fingerprint !== fingerprint) throw new Error('Handoff ID reused with different request');
    return stored.result;
  }

  private nextTransfer(
    handoffId: string,
    mode: WriterTransferResult['mode'],
    targetGrant: SyntheticAccessGrant,
    checkpoint: ServerConfirmedCheckpoint | null,
  ): WriterTransferResult {
    const previousWriter = this.activeWriter;
    const nextEpoch = previousWriter.deviceEpoch + 1;
    if (!Number.isSafeInteger(nextEpoch)) throw new Error('Writer epoch overflow');
    const activeWriter = Object.freeze({ deviceId: targetGrant.deviceId, deviceEpoch: nextEpoch });
    const result = Object.freeze({ handoffId, mode, previousWriter, activeWriter, checkpoint });
    return result;
  }

  private prepare(fingerprint: string, result: WriterTransferResult, replay: boolean): PreparedWriterTransfer {
    const token = Object.freeze({ kind: 'synthetic_writer_transfer_preparation' as const, result });
    preparedTransfers.set(token, { fingerprint, result, replay });
    return token;
  }
}

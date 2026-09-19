import type { DeliveryResult, ServerConfirmedCheckpoint, SyncAction, SyncTransport, WriterIdentity } from './contracts';
import { isIssuedSyntheticOutboundEnvelope } from '../privacy/outbound';
import type { SyntheticWriterFence } from './deviceAuthority';

type StoredAck = Readonly<{ fingerprint: string; result: Extract<DeliveryResult, { kind: 'ack' }> }>;

type FixedWriterPolicy = Readonly<{ activeWriter: WriterIdentity; writerAuthority?: never }>;
type FencedWriterPolicy = Readonly<{ activeWriter?: never; writerAuthority: SyntheticWriterFence }>;

export type SyntheticServerPolicy = Readonly<{
  supportedConfigVersions: readonly string[];
  sequencePolicy: Readonly<{ kind: 'monotonic'; minimumFirstLocalSequence: number }> | Readonly<{ kind: 'unordered_fixture' }>;
  firstAckSequence?: number;
  firstConfirmedAtMs: number;
  confirmedCheckpointForAction?: (
    action: SyncAction,
    receipt: Readonly<{ ackSequence: number; confirmedAtMs: number }>,
  ) => ServerConfirmedCheckpoint | Promise<ServerConfirmedCheckpoint>;
}> & (FixedWriterPolicy | FencedWriterPolicy);

/** Synthetic-only fault used to model commit followed by response loss. */
export class SyntheticResponseLostError extends Error {
  constructor() {
    super('Synthetic response lost after server commit');
    this.name = 'SyntheticResponseLostError';
  }
}

/**
 * Deterministic fake contract. It does not select production device, retry,
 * retention, or API error policies; every such value is supplied by a test.
 */
export class SyntheticIdempotentServer implements SyncTransport {
  private readonly committed = new Map<string, StoredAck>();
  private readonly loseResponseOnce = new Set<string>();
  private readonly lastLocalSequence = new Map<string, number>();
  private nextAckSequence: number;

  constructor(private readonly policy: SyntheticServerPolicy) {
    const activeWriter = this.activeWriter();
    if (!activeWriter.deviceId || !Number.isSafeInteger(activeWriter.deviceEpoch) || activeWriter.deviceEpoch < 0 ||
        !Number.isSafeInteger(policy.firstConfirmedAtMs) || policy.firstConfirmedAtMs < 0) throw new Error('Invalid synthetic server policy');
    this.nextAckSequence = policy.firstAckSequence ?? 1;
    if (!Number.isSafeInteger(this.nextAckSequence) || this.nextAckSequence < 0) throw new Error('Invalid synthetic ack sequence');
    if (policy.sequencePolicy.kind === 'monotonic' &&
        (!Number.isSafeInteger(policy.sequencePolicy.minimumFirstLocalSequence) || policy.sequencePolicy.minimumFirstLocalSequence < 0)) {
      throw new Error('Invalid synthetic local sequence policy');
    }
  }

  private activeWriter(): WriterIdentity {
    if (this.policy.writerAuthority) return this.policy.writerAuthority.currentWriter();
    if (this.policy.activeWriter) return this.policy.activeWriter;
    throw new Error('Synthetic writer policy missing');
  }

  loseNextResponseAfterCommit(actionId: string): void {
    this.loseResponseOnce.add(actionId);
  }

  committedActionCount(): number {
    return this.committed.size;
  }

  async deliver(action: SyncAction): Promise<DeliveryResult> {
    if (!isIssuedSyntheticOutboundEnvelope(action.envelope)) throw new Error('Valid DEV outbound envelope required');
    if (action.envelope.petId !== action.petId || action.envelope.deviceId !== action.writer.deviceId) {
      throw new Error('Outbound envelope identity mismatch');
    }
    // Local retry bookkeeping must not alter the idempotency payload.
    const fingerprint = JSON.stringify({
      actionId: action.actionId,
      petId: action.petId,
      localSequence: action.localSequence,
      writer: action.writer,
      configVersion: action.configVersion,
      envelope: action.envelope,
    });
    const previous = this.committed.get(action.actionId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) return { kind: 'conflict', code: 'synthetic_action_id_payload_mismatch' };
      return previous.result;
    }
    const activeWriter = this.activeWriter();
    if (action.writer.deviceId !== activeWriter.deviceId || action.writer.deviceEpoch !== activeWriter.deviceEpoch) {
      return { kind: 'conflict', code: 'synthetic_writer_epoch_mismatch' };
    }
    if (!this.policy.supportedConfigVersions.includes(action.configVersion)) {
      return { kind: 'conflict', code: 'synthetic_unsupported_config_version' };
    }
    let acceptedSequenceKey: string | null = null;
    if (this.policy.sequencePolicy.kind === 'monotonic') {
      const sequenceKey = `${action.writer.deviceId}\u0000${action.writer.deviceEpoch}`;
      const previous = this.lastLocalSequence.get(sequenceKey);
      if ((previous === undefined && action.localSequence < this.policy.sequencePolicy.minimumFirstLocalSequence) ||
          (previous !== undefined && action.localSequence <= previous)) {
        return { kind: 'conflict', code: 'synthetic_local_sequence_out_of_order' };
      }
      acceptedSequenceKey = sequenceKey;
    }
    const result = {
      kind: 'ack' as const, actionId: action.actionId, ackSequence: this.nextAckSequence,
      confirmedAtMs: this.policy.firstConfirmedAtMs + this.committed.size,
    };
    const checkpoint = await this.policy.confirmedCheckpointForAction?.(action, result);
    if (checkpoint && !this.policy.writerAuthority) throw new Error('Synthetic checkpoint requires writer authority');
    if (checkpoint) this.policy.writerAuthority?.recordServerCheckpoint(checkpoint, action.writer, result);
    else this.policy.writerAuthority?.recordServerAcknowledgement(action.petId, action.writer, {
      ackSequence: result.ackSequence, confirmedAtMs: result.confirmedAtMs,
    });
    this.committed.set(action.actionId, { fingerprint, result });
    if (acceptedSequenceKey) this.lastLocalSequence.set(acceptedSequenceKey, action.localSequence);
    this.nextAckSequence += 1;
    if (this.loseResponseOnce.delete(action.actionId)) throw new SyntheticResponseLostError();
    return result;
  }
}

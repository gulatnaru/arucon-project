import type { DeliveryResult, SyncAction, SyncTransport, WriterIdentity } from './contracts';
import { isIssuedSyntheticOutboundEnvelope } from '../privacy/outbound';

type StoredAck = Readonly<{ fingerprint: string; result: Extract<DeliveryResult, { kind: 'ack' }> }>;

export type SyntheticServerPolicy = Readonly<{
  activeWriter: WriterIdentity;
  supportedConfigVersions: readonly string[];
  sequencePolicy: Readonly<{ kind: 'strict'; firstLocalSequence: number }> | Readonly<{ kind: 'unordered_fixture' }>;
  firstAckSequence?: number;
  firstConfirmedAtMs: number;
}>;

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
  private readonly nextLocalSequence = new Map<string, number>();
  private nextAckSequence: number;

  constructor(private readonly policy: SyntheticServerPolicy) {
    if (!policy.activeWriter.deviceId || !Number.isSafeInteger(policy.activeWriter.deviceEpoch) || policy.activeWriter.deviceEpoch < 0 ||
        !Number.isSafeInteger(policy.firstConfirmedAtMs) || policy.firstConfirmedAtMs < 0) throw new Error('Invalid synthetic server policy');
    this.nextAckSequence = policy.firstAckSequence ?? 1;
    if (!Number.isSafeInteger(this.nextAckSequence) || this.nextAckSequence < 0) throw new Error('Invalid synthetic ack sequence');
    if (policy.sequencePolicy.kind === 'strict' &&
        (!Number.isSafeInteger(policy.sequencePolicy.firstLocalSequence) || policy.sequencePolicy.firstLocalSequence < 0)) {
      throw new Error('Invalid synthetic local sequence policy');
    }
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
    if (action.writer.deviceId !== this.policy.activeWriter.deviceId || action.writer.deviceEpoch !== this.policy.activeWriter.deviceEpoch) {
      return { kind: 'conflict', code: 'synthetic_writer_epoch_mismatch' };
    }
    if (!this.policy.supportedConfigVersions.includes(action.configVersion)) {
      return { kind: 'conflict', code: 'synthetic_unsupported_config_version' };
    }
    if (this.policy.sequencePolicy.kind === 'strict') {
      const sequenceKey = `${action.writer.deviceId}\u0000${action.writer.deviceEpoch}\u0000${action.petId}`;
      const expected = this.nextLocalSequence.get(sequenceKey) ?? this.policy.sequencePolicy.firstLocalSequence;
      if (action.localSequence !== expected) return { kind: 'conflict', code: 'synthetic_local_sequence_out_of_order' };
      this.nextLocalSequence.set(sequenceKey, expected + 1);
    }
    const result = {
      kind: 'ack' as const, actionId: action.actionId, ackSequence: this.nextAckSequence++,
      confirmedAtMs: this.policy.firstConfirmedAtMs + this.committed.size,
    };
    this.committed.set(action.actionId, { fingerprint, result });
    if (this.loseResponseOnce.delete(action.actionId)) throw new SyntheticResponseLostError();
    return result;
  }
}

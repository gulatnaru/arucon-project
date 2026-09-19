import type { SyntheticAccessGrant } from '../auth/syntheticAccess';
import type { SqliteSyncRegistrationStore } from '../storage/syncRegistration';
import type { SqliteServerConfirmedRecoveryStore } from '../storage/serverRecovery';
import type { SyncCoordinator, FlushResult } from './coordinator';
import type { SyncQueue, WriterIdentity } from './contracts';
import { SyntheticSingleWriterAuthority, type WriterTransferResult } from './deviceAuthority';
import { planServerConfirmedRecovery } from './recovery';
import { buildRecoveryStatusViewModel, buildSyncStatusViewModel, type RecoveryStatusViewModel, type SyncStatusViewModel } from './status';
import { DurableLocalWriteAuthorityGuard } from './writeGuard';

function requiredScopeId(value: string, name: string): string {
  if (!value || value.trim() !== value || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

export type ForcedRecoveryResult = Readonly<{
  transfer: WriterTransferResult;
  status: RecoveryStatusViewModel;
}>;

/** Application-facing API; App.tsx may consume this without owning sync policy. */
export class SyncApplicationService {
  readonly writeGuard: DurableLocalWriteAuthorityGuard;

  constructor(
    private readonly queue: SyncQueue,
    private readonly coordinator: SyncCoordinator,
    private readonly authority: SyntheticSingleWriterAuthority,
    private readonly registrations: SqliteSyncRegistrationStore,
    private readonly local: Readonly<{ accountId: string; petId: string; deviceId: string }>,
    private readonly nowMs: () => number,
    private readonly recoveryStore: SqliteServerConfirmedRecoveryStore | null = null,
  ) {
    requiredScopeId(local.accountId, 'local sync account ID');
    requiredScopeId(local.petId, 'local sync pet ID');
    requiredScopeId(local.deviceId, 'local sync device ID');
    this.writeGuard = new DurableLocalWriteAuthorityGuard(registrations, authority);
  }

  flush(limit: number): Promise<FlushResult> {
    return this.coordinator.flushOnce(limit);
  }

  async status(petId: string, localWriter: WriterIdentity): Promise<SyncStatusViewModel> {
    this.requireLocalPet(petId);
    const registered = await this.registrations.load(petId);
    if (!registered || registered.deviceId !== localWriter.deviceId || registered.deviceEpoch !== localWriter.deviceEpoch) {
      throw new Error('Local sync registration scope mismatch');
    }
    const access = this.authority.accessFor(localWriter);
    await this.recordLocalAuthority(petId, localWriter, access, `authority-observed:${localWriter.deviceEpoch}:${access}`);
    const summary = await this.queue.summary(petId);
    const recovered = await this.recoveryStore?.load(petId);
    return buildSyncStatusViewModel(recovered && (summary.lastAcknowledgedAtMs === null ||
      recovered.checkpoint.confirmedAtMs > summary.lastAcknowledgedAtMs)
      ? { ...summary, lastAcknowledgedAtMs: recovered.checkpoint.confirmedAtMs }
      : summary, access);
  }

  async handoff(input: Readonly<{
    handoffId: string;
    petId: string;
    sourceGrant: SyntheticAccessGrant;
    targetGrant: SyntheticAccessGrant;
  }>): Promise<WriterTransferResult> {
    this.requireLocalPet(input.petId);
    if (input.sourceGrant.deviceId !== this.local.deviceId || input.targetGrant.deviceId === this.local.deviceId) {
      throw new Error('Local handoff scope mismatch');
    }
    const prepared = this.authority.prepareNormalHandoff({
      handoffId: input.handoffId,
      sourceGrant: input.sourceGrant,
      targetGrant: input.targetGrant,
      sourceSummary: await this.queue.summary(input.petId),
    });
    await this.recordLocalAuthority(input.petId, prepared.result.previousWriter, 'read_only_fenced', input.handoffId);
    return this.authority.commitPreparedTransfer(prepared);
  }

  async forceRecover(input: Readonly<{
    handoffId: string;
    petId: string;
    targetGrant: SyntheticAccessGrant;
  }>): Promise<ForcedRecoveryResult> {
    this.requireLocalPet(input.petId);
    if (input.targetGrant.deviceId !== this.local.deviceId) throw new Error('Local recovery scope mismatch');
    const prepared = this.authority.prepareForceRecovery({ handoffId: input.handoffId, targetGrant: input.targetGrant });
    const transfer = prepared.result;
    if (!transfer.checkpoint) throw new Error('Forced recovery checkpoint missing');
    if (!this.recoveryStore) throw new Error('Server-confirmed recovery storage is required');
    const updatedAtMs = this.registrationTime();
    const restored = await this.recoveryStore.restore(input.handoffId, transfer.checkpoint, {
      accountId: this.local.accountId, petId: input.petId, deviceId: transfer.activeWriter.deviceId,
      deviceEpoch: transfer.activeWriter.deviceEpoch, access: 'active_writer',
      authorityEventId: input.handoffId, updatedAtMs,
    });
    const committed = this.authority.commitPreparedTransfer(prepared);
    const plan = planServerConfirmedRecovery(
      transfer.checkpoint,
      restored.preservedActionIds.map(actionId => ({ actionId })),
    );
    return { transfer: committed, status: buildRecoveryStatusViewModel(plan) };
  }

  private async recordLocalAuthority(
    petId: string,
    writer: WriterIdentity,
    access: 'active_writer' | 'read_only_fenced',
    authorityEventId: string,
  ): Promise<void> {
    if (petId !== this.local.petId || writer.deviceId !== this.local.deviceId) {
      throw new Error('Local sync registration scope mismatch');
    }
    const previous = await this.registrations.load(petId);
    if (previous && previous.deviceEpoch === writer.deviceEpoch && previous.access === access &&
        previous.authorityEventId === authorityEventId) return;
    const updatedAtMs = this.registrationTime();
    await this.registrations.record({
      accountId: this.local.accountId,
      petId,
      deviceId: writer.deviceId,
      deviceEpoch: writer.deviceEpoch,
      access,
      authorityEventId,
      updatedAtMs,
    });
  }

  private requireLocalPet(petId: string): void {
    if (petId !== this.local.petId) throw new Error('Local sync registration scope mismatch');
  }

  private registrationTime(): number {
    const updatedAtMs = this.nowMs();
    if (!Number.isSafeInteger(updatedAtMs) || updatedAtMs < 0) throw new Error('Invalid sync registration clock');
    return updatedAtMs;
  }
}

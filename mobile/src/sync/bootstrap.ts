import type { PetState } from '../domain/model';
import { LocalPetStore, type PetSyncRegistration, type SqlConnection } from '../storage/sqlite';
import { SqliteSyncRegistrationStore, type LocalSyncRegistration } from '../storage/syncRegistration';
import type { SqliteServerConfirmedRecoveryStore } from '../storage/serverRecovery';
import type { SyncQueue } from './contracts';
import { buildSyncStatusViewModel, type SyncStatusViewModel } from './status';
import { DurableLocalWriteAuthorityGuard } from './writeGuard';

export type SyntheticSyncBootstrap = Readonly<{
  mode: 'DEV_ONLY';
  registration: LocalSyncRegistration;
  writeGuard: DurableLocalWriteAuthorityGuard;
  runtimeAuthority: 'synthetic_in_process_not_server_recovery';
}>;

/**
 * Initializes or reopens stable local writer metadata without reactivating a
 * registration that is already fenced. The supplied pet state is not replaced.
 */
export async function bootstrapSyntheticLocalWriter(
  db: SqlConnection,
  store: LocalPetStore,
  state: PetState,
  input: PetSyncRegistration,
): Promise<SyntheticSyncBootstrap> {
  const registrations = new SqliteSyncRegistrationStore(db);
  const existing = await registrations.load(state.petId);
  if (!existing) await store.createPetWithSyncRegistration(state, input);
  const registration = await registrations.load(state.petId);
  if (!registration) throw new Error('Synthetic writer registration was not persisted');
  if (registration.accountId !== input.accountId || registration.deviceId !== input.deviceId) {
    throw new Error('Synthetic writer bootstrap scope mismatch');
  }
  return Object.freeze({
    mode: 'DEV_ONLY', registration,
    writeGuard: new DurableLocalWriteAuthorityGuard(registrations),
    runtimeAuthority: 'synthetic_in_process_not_server_recovery',
  });
}

export class DurableSyncStatusReader {
  constructor(
    private readonly queue: SyncQueue,
    private readonly registrations: SqliteSyncRegistrationStore,
    private readonly recoveryStore: SqliteServerConfirmedRecoveryStore | null = null,
  ) {}

  async read(petId: string): Promise<SyncStatusViewModel> {
    const registration = await this.registrations.load(petId);
    if (!registration) throw new Error('Writer registration required for sync status');
    const summary = await this.queue.summary(petId);
    const recovered = await this.recoveryStore?.load(petId);
    return buildSyncStatusViewModel(recovered && (summary.lastAcknowledgedAtMs === null ||
      recovered.checkpoint.confirmedAtMs > summary.lastAcknowledgedAtMs)
      ? { ...summary, lastAcknowledgedAtMs: recovered.checkpoint.confirmedAtMs }
      : summary, registration.access);
  }
}

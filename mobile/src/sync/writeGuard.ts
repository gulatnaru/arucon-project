import type { SqliteSyncRegistrationStore } from '../storage/syncRegistration';
import type { SyntheticWriterFence } from './deviceAuthority';

export interface LocalWriteAuthorityGuard {
  assertCanCommit(petId: string): Promise<void>;
}

export class ReadOnlyWriterError extends Error {
  constructor() {
    super('This device is read-only because writing moved to another device');
    this.name = 'ReadOnlyWriterError';
  }
}

export class WriterRegistrationRequiredError extends Error {
  constructor() {
    super('A durable writer registration is required before synced mutations');
    this.name = 'WriterRegistrationRequiredError';
  }
}

/** Blocks on durable knowledge and, when present, the live synthetic fence. */
export class DurableLocalWriteAuthorityGuard implements LocalWriteAuthorityGuard {
  constructor(
    private readonly registrations: SqliteSyncRegistrationStore,
    private readonly liveFence: SyntheticWriterFence | null = null,
  ) {}

  async assertCanCommit(petId: string): Promise<void> {
    const registration = await this.registrations.load(petId);
    if (!registration) throw new WriterRegistrationRequiredError();
    if (registration.access !== 'active_writer' || this.liveFence?.accessFor({
      deviceId: registration.deviceId, deviceEpoch: registration.deviceEpoch,
    }) === 'read_only_fenced') throw new ReadOnlyWriterError();
  }
}

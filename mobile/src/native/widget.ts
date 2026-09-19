import type { PetProjection, WidgetSnapshotRead, WidgetSnapshotReader } from '../widget';

export type NativeWidgetReloadResult = 'requested' | 'deferred' | 'unsupported' | 'error';

/** The native extension gets an allowlisted snapshot, never a game command or mutable PetState. */
export interface NativeWidgetBridge {
  readSnapshot(): Promise<WidgetSnapshotRead>;
  replaceSnapshot(snapshot: PetProjection): Promise<void>;
  requestTimelineReload(): Promise<NativeWidgetReloadResult>;
}

function allowlistedProjection(value: PetProjection): PetProjection {
  if (!value.petId || !value.formId || !value.personalityProfileId ||
      !Number.isSafeInteger(value.stateRevision) || value.stateRevision < 0 ||
      !Number.isSafeInteger(value.updatedAtMs) || value.updatedAtMs < 0 ||
      !['awake', 'sleeping', 'hibernating', 'needs_care'].includes(value.displayState)) {
    throw new Error('Invalid native widget projection');
  }
  return Object.freeze({
    petId: value.petId,
    stateRevision: value.stateRevision,
    updatedAtMs: value.updatedAtMs,
    formId: value.formId,
    personalityProfileId: value.personalityProfileId,
    displayState: value.displayState,
  });
}

export class FailClosedNativeWidgetAdapter implements WidgetSnapshotReader {
  constructor(private readonly bridge: NativeWidgetBridge, private readonly enabled = false) {}

  async read(): Promise<WidgetSnapshotRead> {
    if (!this.enabled) return { status: 'unsupported' };
    try {
      const read = await this.bridge.readSnapshot();
      if (read.status === 'ready') return { status: 'ready', projection: allowlistedProjection(read.projection) };
      if (read.status === 'error' && read.lastKnownProjection) {
        return { status: 'error', lastKnownProjection: allowlistedProjection(read.lastKnownProjection) };
      }
      return read;
    } catch {
      return { status: 'error' };
    }
  }

  /** A reload request is only a request; it does not assert that the OS rendered the new snapshot. */
  async publish(projection: PetProjection): Promise<NativeWidgetReloadResult> {
    if (!this.enabled) return 'unsupported';
    try {
      await this.bridge.replaceSnapshot(allowlistedProjection(projection));
      return await this.bridge.requestTimelineReload();
    } catch {
      return 'error';
    }
  }
}

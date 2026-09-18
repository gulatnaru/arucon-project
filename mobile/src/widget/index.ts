import type { PetState } from '../domain/model';

export type PetProjection = Readonly<{
  petId: string;
  stateRevision: number;
  updatedAtMs: number;
  formId: string;
  personalityProfileId: string;
  displayState: 'awake' | 'sleeping' | 'hibernating' | 'needs_care';
}>;

/** Allowlist projection: never spread PetState into shared/widget storage. */
export function projectPetForWidget(
  pet: Pick<PetState, 'petId' | 'revision' | 'formId' | 'personalityProfileId' | 'sleeping' | 'hibernating' | 'condition'>,
  updatedAtMs: number,
): PetProjection {
  if (!pet.petId || !pet.personalityProfileId || !Number.isSafeInteger(pet.revision) || pet.revision < 0 ||
      !Number.isSafeInteger(updatedAtMs) || updatedAtMs < 0) throw new Error('Invalid widget projection');
  const displayState = pet.hibernating ? 'hibernating' : pet.sleeping ? 'sleeping' : pet.condition === 'low' ? 'needs_care' : 'awake';
  return Object.freeze({
    petId: pet.petId,
    stateRevision: pet.revision,
    updatedAtMs,
    formId: pet.formId,
    personalityProfileId: pet.personalityProfileId,
    displayState,
  });
}

export type WidgetSnapshotRead =
  | { status: 'ready'; projection: PetProjection }
  | { status: 'missing' }
  | { status: 'unsupported' }
  | { status: 'error'; lastKnownProjection?: PetProjection };

/** Native adapter may read a snapshot; it receives no domain command or writer. */
export interface WidgetSnapshotReader {
  read(): Promise<WidgetSnapshotRead>;
}

export type WidgetView = Readonly<{
  status: 'ready' | 'stale' | 'missing' | 'unsupported' | 'error';
  formId?: string;
  stateText: string;
  lastUpdatedAtMs?: number;
  action: Readonly<{ type: 'open_app' }>;
}>;

/** Stale limit is supplied by the host; DEC-14/31 have not approved a default. */
export function widgetView(read: WidgetSnapshotRead, nowMs: number, maxAgeMs: number): WidgetView {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || !Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0) {
    throw new RangeError('Invalid widget clock or stale limit');
  }
  const action = Object.freeze({ type: 'open_app' as const });
  if (read.status === 'missing' || read.status === 'unsupported') {
    return { status: read.status, stateText: '앱에서 확인', action };
  }
  if (read.status === 'error' && !read.lastKnownProjection) {
    return { status: 'error', stateText: '앱에서 확인', action };
  }
  const projection = read.status === 'ready' ? read.projection : read.lastKnownProjection!;
  if (!Number.isSafeInteger(projection.updatedAtMs) || projection.updatedAtMs < 0 || projection.updatedAtMs > nowMs) {
    return { status: 'error', stateText: '앱에서 확인', action };
  }
  if (read.status === 'error') {
    return { status: 'error', formId: projection.formId, stateText: '마지막 확인 상태 · 앱에서 확인', lastUpdatedAtMs: projection.updatedAtMs, action };
  }
  const stale = nowMs - projection.updatedAtMs > maxAgeMs;
  const stateText = stale ? '마지막 확인 상태 · 앱에서 확인' : DISPLAY_TEXT[projection.displayState];
  return { status: stale ? 'stale' : 'ready', formId: projection.formId, stateText, lastUpdatedAtMs: projection.updatedAtMs, action };
}

const DISPLAY_TEXT: Record<PetProjection['displayState'], string> = {
  awake: '방에서 지내는 중',
  sleeping: '쉬는 중',
  hibernating: '잠시 쉬는 중',
  needs_care: '앱에서 상태 확인',
};

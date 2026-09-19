import type { AruconNativeWidgetModule } from '../../native/arucon-widget';
import type { PetProjection, WidgetSnapshotRead } from '../widget';
import type { NativeWidgetBridge, NativeWidgetReloadResult } from './widget';

const projectionKeys = [
  'displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs',
] as const;
const displayStates = new Set(['awake', 'sleeping', 'hibernating', 'needs_care']);

function decodeProjection(value: unknown): PetProjection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).sort().join('|') !== projectionKeys.join('|')) return null;
  if (typeof candidate.petId !== 'string' || candidate.petId.length === 0 ||
      typeof candidate.formId !== 'string' || candidate.formId.length === 0 ||
      typeof candidate.personalityProfileId !== 'string' || candidate.personalityProfileId.length === 0 ||
      typeof candidate.displayState !== 'string' || !displayStates.has(candidate.displayState) ||
      !Number.isSafeInteger(candidate.stateRevision) || (candidate.stateRevision as number) < 0 ||
      !Number.isSafeInteger(candidate.updatedAtMs) || (candidate.updatedAtMs as number) < 0) return null;
  return Object.freeze({
    petId: candidate.petId,
    stateRevision: candidate.stateRevision as number,
    updatedAtMs: candidate.updatedAtMs as number,
    formId: candidate.formId,
    personalityProfileId: candidate.personalityProfileId,
    displayState: candidate.displayState as PetProjection['displayState'],
  });
}

function encodeProjection(value: PetProjection): string {
  const projection = decodeProjection({
    petId: value.petId,
    stateRevision: value.stateRevision,
    updatedAtMs: value.updatedAtMs,
    formId: value.formId,
    personalityProfileId: value.personalityProfileId,
    displayState: value.displayState,
  });
  if (!projection) throw new Error('Invalid widget projection');
  return JSON.stringify(projection);
}

export type ExpoNativeWidgetBridgeOptions = Readonly<{
  enabled?: boolean;
  nativeModule?: AruconNativeWidgetModule | null;
}>;

/** Build-linked bridge. Storage and OS reload calls remain OFF unless explicitly enabled. */
export class ExpoNativeWidgetBridge implements NativeWidgetBridge {
  private readonly enabled: boolean;
  private readonly nativeModule: AruconNativeWidgetModule | null;

  constructor(options: ExpoNativeWidgetBridgeOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.nativeModule = options.nativeModule ?? null;
  }

  async readSnapshot(): Promise<WidgetSnapshotRead> {
    if (!this.enabled || !this.nativeModule) return { status: 'unsupported' };
    try {
      const raw = await this.nativeModule.readSnapshotJsonAsync();
      if (raw === null) return { status: 'missing' };
      const parsed = decodeProjection(JSON.parse(raw));
      return parsed ? { status: 'ready', projection: parsed } : { status: 'error' };
    } catch {
      return { status: 'error' };
    }
  }

  async replaceSnapshot(snapshot: PetProjection): Promise<void> {
    if (!this.enabled || !this.nativeModule) throw new Error('Native widget bridge is disabled');
    await this.nativeModule.replaceSnapshotJsonAsync(encodeProjection(snapshot));
  }

  async requestTimelineReload(): Promise<NativeWidgetReloadResult> {
    if (!this.enabled || !this.nativeModule) return 'unsupported';
    try {
      const result = await this.nativeModule.requestTimelineReloadAsync();
      return result === 'requested' || result === 'deferred' ? result : 'error';
    } catch {
      return 'error';
    }
  }
}

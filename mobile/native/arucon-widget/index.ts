import { requireOptionalNativeModule } from 'expo';

export type AruconNativeWidgetModule = Readonly<{
  replaceSnapshotJsonAsync(snapshotJson: string): Promise<void>;
  readSnapshotJsonAsync(): Promise<string | null>;
  requestTimelineReloadAsync(): Promise<'requested' | 'deferred'>;
}>;

/** Optional in Expo Go and builds where the local native module is unavailable. */
export default requireOptionalNativeModule<AruconNativeWidgetModule>('AruconWidgetBridge');

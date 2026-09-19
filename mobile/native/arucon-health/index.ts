import { requireOptionalNativeModule } from 'expo';

export type AruconNativeHealthContract = Readonly<{
  contractVersion: 1;
  readMode: 'disabled';
  platform: 'ios' | 'android';
}>;

export type AruconNativeHealthModule = Readonly<{
  getContractAsync(): Promise<AruconNativeHealthContract>;
  inspectAvailabilityAsync(scope: 'activity' | 'sleep'): Promise<{
    status: 'unavailable';
    reason: 'native_read_disabled';
  }>;
  getReadPermissionAsync(scope: 'activity' | 'sleep'): Promise<'not_requested'>;
}>;

/** Optional by design: Expo Go and builds without the local module fail closed. */
export default requireOptionalNativeModule<AruconNativeHealthModule>('AruconHealth');

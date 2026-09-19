import aruconHealthModule from '../../native/arucon-health';
import { ExpoNativeHealthBridge } from './expoHealthBridge';

/**
 * Explicit composition point for a development build. This bridge remains OFF
 * unless a caller intentionally creates a separate enabled instance.
 */
export const defaultExpoNativeHealthBridge = new ExpoNativeHealthBridge({
  enabled: false,
  nativeModule: aruconHealthModule,
});

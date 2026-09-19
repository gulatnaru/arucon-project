import aruconWidgetModule from '../../native/arucon-widget';
import { ExpoNativeWidgetBridge } from './expoWidgetBridge';

/** Target generation is active, while application publishing remains explicitly OFF. */
export const defaultExpoNativeWidgetBridge = new ExpoNativeWidgetBridge({
  enabled: false,
  nativeModule: aruconWidgetModule,
});

/** Approved local widget snapshot path; the native module is optional and health remains unrelated/OFF. */
export const approvedLocalExpoNativeWidgetBridge = new ExpoNativeWidgetBridge({
  enabled: true,
  nativeModule: aruconWidgetModule,
});

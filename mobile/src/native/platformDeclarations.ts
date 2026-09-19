/**
 * Native declarations required by a future HealthKit / Health Connect module.
 * This file is deliberately not wired into app.json: native reads stay OFF until
 * the related product decisions and native implementation are approved.
 */
export const IOS_HEALTHKIT_SCAFFOLD = Object.freeze({
  entitlement: 'com.apple.developer.healthkit',
  readUsageDescriptionKey: 'NSHealthShareUsageDescription',
  readTypes: ['HKQuantityTypeIdentifierStepCount', 'HKCategoryTypeIdentifierSleepAnalysis'] as const,
  writeTypes: [] as const,
  backgroundDeliveryEnabled: false,
});

export const ANDROID_HEALTH_CONNECT_SCAFFOLD = Object.freeze({
  readPermissions: [
    'android.permission.health.READ_STEPS',
    'android.permission.health.READ_SLEEP',
  ] as const,
  writePermissions: [] as const,
  backgroundReadEnabled: false,
  historicalReadEnabled: false,
  stepReadMethod: 'aggregate_COUNT_TOTAL' as const,
});

export const NATIVE_HEALTH_READ_DEFAULTS = Object.freeze({
  activityReadEnabled: false,
  sleepReadEnabled: false,
  scorerVersion: null,
});

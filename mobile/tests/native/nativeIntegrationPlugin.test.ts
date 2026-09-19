// @ts-nocheck -- the config plugin is intentionally CommonJS for Expo CLI loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const plugin = require('../../plugins/withAruconNativeIntegration');
const {
  ANDROID_HEALTH_CONNECT_PACKAGE,
  ANDROID_HEALTH_READ_PERMISSIONS,
  applyAndroidHealthDeclarations,
  applyIosHealthDeclarations,
  createWidgetGenerationPlan,
} = plugin._internal;

function names(entries) {
  return (entries ?? []).map(entry => entry.$?.['android:name']);
}

test('default-OFF config removes health declarations while preserving unrelated entries', () => {
  const ios = applyIosHealthDeclarations(
    { 'com.apple.developer.healthkit': true, unrelated: true },
    { NSHealthShareUsageDescription: 'stale', Unrelated: 'kept' },
    { healthDeclarationsEnabled: false },
  );
  assert.deepEqual(ios.entitlements, { unrelated: true });
  assert.deepEqual(ios.infoPlist, { Unrelated: 'kept', AruconNativeIntegrationContractVersion: 1 });

  const android = applyAndroidHealthDeclarations({ manifest: {
    application: [{ 'meta-data': [{ $: { 'android:name': 'com.example.unrelated', 'android:value': 'kept' } }] }],
    'uses-permission': [
      { $: { 'android:name': 'android.permission.health.READ_STEPS' } },
      { $: { 'android:name': 'android.permission.INTERNET' } },
    ],
    queries: [{ package: [
      { $: { 'android:name': ANDROID_HEALTH_CONNECT_PACKAGE } },
      { $: { 'android:name': 'com.example.unrelated' } },
    ] }],
  } }, { healthDeclarationsEnabled: false });
  assert.deepEqual(names(android.manifest['uses-permission']), ['android.permission.INTERNET']);
  assert.deepEqual(names(android.manifest.queries[0].package), ['com.example.unrelated']);
  assert.deepEqual(names(android.manifest.application[0]['meta-data']), [
    'com.example.unrelated', 'com.arucon.native.CONTRACT_VERSION',
  ]);
});

test('explicit declaration mode emits read-only minimums and requires reviewed iOS copy', () => {
  assert.throws(
    () => applyIosHealthDeclarations({}, {}, { healthDeclarationsEnabled: true }),
    /iosHealthReadUsageDescription is required/,
  );
  const ios = applyIosHealthDeclarations({}, {}, {
    healthDeclarationsEnabled: true,
    iosHealthReadUsageDescription: 'Reviewed synthetic test copy',
  });
  assert.equal(ios.entitlements['com.apple.developer.healthkit'], true);
  assert.equal(ios.infoPlist.NSHealthShareUsageDescription, 'Reviewed synthetic test copy');
  assert.equal('NSHealthUpdateUsageDescription' in ios.infoPlist, false);

  const android = applyAndroidHealthDeclarations({ manifest: { application: [{}] } }, { healthDeclarationsEnabled: true });
  assert.deepEqual(names(android.manifest['uses-permission']), ANDROID_HEALTH_READ_PERMISSIONS);
  assert.deepEqual(names(android.manifest.queries[0].package), [ANDROID_HEALTH_CONNECT_PACKAGE]);
  assert.equal(names(android.manifest['uses-permission']).some(name =>
    /WRITE|BACKGROUND|HISTORY|ACTIVITY_RECOGNITION|RECORD_AUDIO|LOCATION/.test(name)), false);
});

test('widget generation plan fixes DEV-only identifiers, six fields, five states and open_app only', () => {
  assert.deepEqual(createWidgetGenerationPlan(), {
    mode: 'template_only',
    devOnlyIdentifiers: true,
    projectionKeys: ['petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState'],
    displayStates: ['awake', 'sleeping', 'hibernating', 'needs_care'],
    viewStatuses: ['ready', 'stale', 'missing', 'error', 'unsupported'],
    action: { type: 'open_app', url: 'arucondev://open/widget' },
    ios: {
      appGroup: 'group.com.arucon.dev.widget',
      extensionBundleIdentifier: 'com.arucon.dev.widget',
      sourceTemplate: 'native/arucon-widget-template/ios/AruconWidget.swift.template',
    },
    android: {
      providerClass: 'com.arucon.widget.AruconWidgetProvider',
      sharedPreferences: 'arucon.widget.snapshot.v1',
      sourceTemplate: 'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template',
    },
    targetActivation: 'default_off',
  });
});

test('widget target activation fails closed while templates and provisioning are not wired', () => {
  assert.throws(
    () => plugin({}, { widgetTargetsEnabled: true }),
    /TargetActivationBlocked: widget templates are ready but native targets and provisioning are not active/,
  );
});

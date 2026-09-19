// @ts-nocheck -- the config plugin is intentionally CommonJS for Expo CLI loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const plugin = require('../../plugins/withAruconNativeIntegration');
const xcode = require('xcode');
const {
  ANDROID_HEALTH_CONNECT_PACKAGE,
  ANDROID_HEALTH_READ_PERMISSIONS,
  applyAndroidHealthDeclarations,
  applyAndroidWidgetReceiver,
  applyIosHealthDeclarations,
  applyIosWidgetAppGroup,
  addIosWidgetTarget,
  createWidgetGenerationPlan,
  resolveIosWidgetSourceReference,
} = plugin._internal;

function widgetTargets(project) {
  return Object.entries(project.pbxNativeTargetSection()).filter(([key, value]) =>
    !key.endsWith('_comment') && `${value?.name ?? ''}`.replaceAll('"', '') === 'AruconWidget');
}

function widgetTarget(project) {
  const [uuid, pbxNativeTarget] = widgetTargets(project)[0];
  return { uuid, pbxNativeTarget };
}

function projectFixture(relativePath) {
  return xcode.project(fileURLToPath(new URL(relativePath, import.meta.url))).parseSync();
}

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
    mode: 'cng_source_and_target',
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
    targetActivation: 'development_enabled',
  });
});

test('widget generation adds only the development App Group and read-only Android receiver', () => {
  const entitlements = applyIosWidgetAppGroup({
    'com.apple.security.application-groups': ['group.example.unrelated'],
  }, true);
  assert.deepEqual(entitlements['com.apple.security.application-groups'], [
    'group.example.unrelated', 'group.com.arucon.dev.widget',
  ]);
  assert.deepEqual(applyIosWidgetAppGroup(entitlements, false), {
    'com.apple.security.application-groups': ['group.example.unrelated'],
  });

  const base = { manifest: { application: [{ receiver: [{
    $: { 'android:name': 'com.example.UnrelatedReceiver', 'android:exported': 'false' },
  }] }] } };
  const enabled = applyAndroidWidgetReceiver(base, true);
  assert.deepEqual(names(enabled.manifest.application[0].receiver), [
    'com.example.UnrelatedReceiver', 'com.arucon.widget.AruconWidgetProvider',
  ]);
  const receiver = enabled.manifest.application[0].receiver[1];
  assert.equal(receiver.$['android:exported'], 'true');
  assert.equal(receiver['intent-filter'][0].action[0].$['android:name'], 'android.appwidget.action.APPWIDGET_UPDATE');
  assert.equal(receiver['meta-data'][0].$['android:resource'], '@xml/arucon_widget_info');
  assert.deepEqual(names(applyAndroidWidgetReceiver(enabled, false).manifest.application[0].receiver), [
    'com.example.UnrelatedReceiver',
  ]);
});

test('fresh iOS widget target resolves its source once through the group path', () => {
  const project = projectFixture(
    '../../node_modules/react-native-safe-area-context/ios/RNSafeAreaContext.xcodeproj/project.pbxproj',
  );

  addIosWidgetTarget(project);
  const target = widgetTarget(project);
  const resolved = resolveIosWidgetSourceReference(project, target);
  const fileReference = project.pbxFileReferenceSection()[resolved.fileRefUuid];
  assert.equal(resolved.relativePath, 'AruconWidget/AruconWidget.swift');
  assert.equal(fileReference.path, 'AruconWidget.swift');
  assert.equal(fileReference.sourceTree, '"<group>"');

  addIosWidgetTarget(project);
  assert.equal(widgetTargets(project).length, 1);
  assert.deepEqual(resolveIosWidgetSourceReference(project, widgetTarget(project)), resolved);
});

test('existing iOS widget target repairs a duplicated group-relative source path', () => {
  const project = projectFixture('../../ios/app.xcodeproj/project.pbxproj');
  const target = widgetTarget(project);
  const before = resolveIosWidgetSourceReference(project, target);
  const fileReference = project.pbxFileReferenceSection()[before.fileRefUuid];
  fileReference.path = 'AruconWidget/AruconWidget.swift';

  addIosWidgetTarget(project);

  assert.equal(
    resolveIosWidgetSourceReference(project, widgetTarget(project)).relativePath,
    'AruconWidget/AruconWidget.swift',
  );
  assert.equal(fileReference.path, 'AruconWidget.swift');
  assert.equal(fileReference.sourceTree, '"<group>"');
});

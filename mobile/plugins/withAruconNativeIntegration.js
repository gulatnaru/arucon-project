const {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require('@expo/config-plugins');

const IOS_HEALTH_ENTITLEMENT = 'com.apple.developer.healthkit';
const IOS_HEALTH_READ_DESCRIPTION = 'NSHealthShareUsageDescription';
const ANDROID_HEALTH_READ_PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_SLEEP',
];
const ANDROID_HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const IOS_CONTRACT_VERSION_KEY = 'AruconNativeIntegrationContractVersion';
const ANDROID_CONTRACT_VERSION_KEY = 'com.arucon.native.CONTRACT_VERSION';
const WIDGET_TEMPLATE_PLAN = Object.freeze({
  mode: 'template_only',
  devOnlyIdentifiers: true,
  projectionKeys: Object.freeze([
    'petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState',
  ]),
  displayStates: Object.freeze(['awake', 'sleeping', 'hibernating', 'needs_care']),
  viewStatuses: Object.freeze(['ready', 'stale', 'missing', 'error', 'unsupported']),
  action: Object.freeze({ type: 'open_app', url: 'arucondev://open/widget' }),
  ios: Object.freeze({
    appGroup: 'group.com.arucon.dev.widget',
    extensionBundleIdentifier: 'com.arucon.dev.widget',
    sourceTemplate: 'native/arucon-widget-template/ios/AruconWidget.swift.template',
  }),
  android: Object.freeze({
    providerClass: 'com.arucon.widget.AruconWidgetProvider',
    sharedPreferences: 'arucon.widget.snapshot.v1',
    sourceTemplate: 'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template',
  }),
  targetActivation: 'default_off',
});

function createWidgetGenerationPlan() {
  return WIDGET_TEMPLATE_PLAN;
}

function withoutNamedEntries(entries, names) {
  return (entries ?? []).filter(entry => !names.includes(entry?.$?.['android:name']));
}

function applyIosHealthDeclarations(entitlements, infoPlist, options) {
  const nextEntitlements = { ...entitlements };
  const nextInfoPlist = { ...infoPlist };
  nextInfoPlist[IOS_CONTRACT_VERSION_KEY] = 1;
  delete nextEntitlements[IOS_HEALTH_ENTITLEMENT];
  delete nextInfoPlist[IOS_HEALTH_READ_DESCRIPTION];

  if (options.healthDeclarationsEnabled) {
    const description = options.iosHealthReadUsageDescription;
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('iosHealthReadUsageDescription is required when health declarations are enabled');
    }
    nextEntitlements[IOS_HEALTH_ENTITLEMENT] = true;
    nextInfoPlist[IOS_HEALTH_READ_DESCRIPTION] = description.trim();
  }
  return { entitlements: nextEntitlements, infoPlist: nextInfoPlist };
}

function applyAndroidHealthDeclarations(androidManifest, options) {
  const nextManifest = structuredClone(androidManifest);
  const root = nextManifest.manifest;
  const application = root.application?.[0];
  if (!application) throw new Error('Android manifest application node is required');
  application['meta-data'] = withoutNamedEntries(application['meta-data'], [ANDROID_CONTRACT_VERSION_KEY]);
  application['meta-data'].push({
    $: { 'android:name': ANDROID_CONTRACT_VERSION_KEY, 'android:value': '1' },
  });
  root['uses-permission'] = withoutNamedEntries(root['uses-permission'], ANDROID_HEALTH_READ_PERMISSIONS);
  root.queries = (root.queries ?? []).map(query => ({
    ...query,
    package: withoutNamedEntries(query.package, [ANDROID_HEALTH_CONNECT_PACKAGE]),
  }));

  if (options.healthDeclarationsEnabled) {
    root['uses-permission'].push(...ANDROID_HEALTH_READ_PERMISSIONS.map(name => ({ $: { 'android:name': name } })));
    const query = root.queries[0] ?? {};
    query.package = [...(query.package ?? []), { $: { 'android:name': ANDROID_HEALTH_CONNECT_PACKAGE } }];
    if (root.queries.length === 0) root.queries.push(query);
    else root.queries[0] = query;
  }
  return nextManifest;
}

function withAruconNativeIntegration(config, rawOptions = {}) {
  const options = {
    healthDeclarationsEnabled: false,
    widgetTargetsEnabled: false,
    ...rawOptions,
  };
  if (options.widgetTargetsEnabled) {
    throw new Error('TargetActivationBlocked: widget templates are ready but native targets and provisioning are not active');
  }

  config = withEntitlementsPlist(config, current => {
    current.modResults = applyIosHealthDeclarations(current.modResults, {}, options).entitlements;
    return current;
  });
  config = withInfoPlist(config, current => {
    current.modResults = applyIosHealthDeclarations({}, current.modResults, options).infoPlist;
    return current;
  });
  return withAndroidManifest(config, current => {
    current.modResults = applyAndroidHealthDeclarations(current.modResults, options);
    return current;
  });
}

module.exports = withAruconNativeIntegration;
module.exports._internal = {
  ANDROID_HEALTH_CONNECT_PACKAGE,
  ANDROID_CONTRACT_VERSION_KEY,
  ANDROID_HEALTH_READ_PERMISSIONS,
  IOS_HEALTH_ENTITLEMENT,
  IOS_HEALTH_READ_DESCRIPTION,
  IOS_CONTRACT_VERSION_KEY,
  createWidgetGenerationPlan,
  applyAndroidHealthDeclarations,
  applyIosHealthDeclarations,
};

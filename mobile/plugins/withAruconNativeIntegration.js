const {
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
const plist = require('@expo/plist').default;

const IOS_HEALTH_ENTITLEMENT = 'com.apple.developer.healthkit';
const IOS_HEALTH_READ_DESCRIPTION = 'NSHealthShareUsageDescription';
const ANDROID_HEALTH_READ_PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_SLEEP',
];
const ANDROID_HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const IOS_CONTRACT_VERSION_KEY = 'AruconNativeIntegrationContractVersion';
const ANDROID_CONTRACT_VERSION_KEY = 'com.arucon.native.CONTRACT_VERSION';
const IOS_WIDGET_TARGET_NAME = 'AruconWidget';
const IOS_WIDGET_APP_GROUP = 'group.com.arucon.dev.widget';
const IOS_WIDGET_BUNDLE_IDENTIFIER = 'com.arucon.dev.widget';
const ANDROID_WIDGET_PROVIDER = 'com.arucon.widget.AruconWidgetProvider';
const WIDGET_TEMPLATE_PLAN = Object.freeze({
  mode: 'cng_source_and_target',
  devOnlyIdentifiers: true,
  projectionKeys: Object.freeze([
    'petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState',
  ]),
  displayStates: Object.freeze(['awake', 'sleeping', 'hibernating', 'needs_care']),
  viewStatuses: Object.freeze(['ready', 'stale', 'missing', 'error', 'unsupported']),
  action: Object.freeze({ type: 'open_app', url: 'arucondev://open/widget' }),
  ios: Object.freeze({
    appGroup: IOS_WIDGET_APP_GROUP,
    extensionBundleIdentifier: IOS_WIDGET_BUNDLE_IDENTIFIER,
    sourceTemplate: 'native/arucon-widget-template/ios/AruconWidget.swift.template',
  }),
  android: Object.freeze({
    providerClass: ANDROID_WIDGET_PROVIDER,
    sharedPreferences: 'arucon.widget.snapshot.v1',
    sourceTemplate: 'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template',
  }),
  targetActivation: 'development_enabled',
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

function applyIosWidgetAppGroup(entitlements, enabled) {
  const next = { ...entitlements };
  const existing = Array.isArray(next['com.apple.security.application-groups']) ?
    next['com.apple.security.application-groups'] : [];
  const withoutDevelopmentGroup = existing.filter(value => value !== IOS_WIDGET_APP_GROUP);
  if (enabled) withoutDevelopmentGroup.push(IOS_WIDGET_APP_GROUP);
  if (withoutDevelopmentGroup.length > 0) {
    next['com.apple.security.application-groups'] = withoutDevelopmentGroup;
  } else {
    delete next['com.apple.security.application-groups'];
  }
  return next;
}

function applyAndroidWidgetReceiver(androidManifest, enabled) {
  const next = structuredClone(androidManifest);
  const application = next.manifest.application?.[0];
  if (!application) throw new Error('Android manifest application node is required');
  application.receiver = withoutNamedEntries(application.receiver, [ANDROID_WIDGET_PROVIDER]);
  if (enabled) {
    application.receiver.push({
      $: {
        'android:name': ANDROID_WIDGET_PROVIDER,
        'android:exported': 'true',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
      }],
      'meta-data': [{
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/arucon_widget_info',
        },
      }],
    });
  }
  return next;
}

async function copyTemplate(projectRoot, relativeSource, destination) {
  const source = path.join(projectRoot, relativeSource);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

function withAndroidWidgetSources(config, enabled) {
  return withDangerousMod(config, ['android', async current => {
    if (!enabled) return current;
    const root = current.modRequest.projectRoot;
    const platformRoot = current.modRequest.platformProjectRoot;
    await copyTemplate(
      root,
      WIDGET_TEMPLATE_PLAN.android.sourceTemplate,
      path.join(platformRoot, 'app/src/main/java/com/arucon/widget/AruconWidgetProvider.kt'),
    );
    await copyTemplate(
      root,
      'native/arucon-widget-template/android/res/layout/arucon_widget.xml.template',
      path.join(platformRoot, 'app/src/main/res/layout/arucon_widget.xml'),
    );
    await copyTemplate(
      root,
      'native/arucon-widget-template/android/res/xml/arucon_widget_info.xml.template',
      path.join(platformRoot, 'app/src/main/res/xml/arucon_widget_info.xml'),
    );
    return current;
  }]);
}

function widgetInfoPlist() {
  return {
    CFBundleDisplayName: '아루콘',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: 'XPC!',
    CFBundleShortVersionString: '$(MARKETING_VERSION)',
    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
    NSExtension: { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' },
  };
}

function withIosWidgetSources(config, enabled) {
  return withDangerousMod(config, ['ios', async current => {
    if (!enabled) return current;
    const root = current.modRequest.projectRoot;
    const targetRoot = path.join(current.modRequest.platformProjectRoot, IOS_WIDGET_TARGET_NAME);
    await copyTemplate(
      root,
      WIDGET_TEMPLATE_PLAN.ios.sourceTemplate,
      path.join(targetRoot, `${IOS_WIDGET_TARGET_NAME}.swift`),
    );
    await fs.writeFile(
      path.join(targetRoot, `${IOS_WIDGET_TARGET_NAME}-Info.plist`),
      plist.build(widgetInfoPlist()),
      'utf8',
    );
    await fs.writeFile(
      path.join(targetRoot, `${IOS_WIDGET_TARGET_NAME}.entitlements`),
      plist.build({ 'com.apple.security.application-groups': [IOS_WIDGET_APP_GROUP] }),
      'utf8',
    );
    return current;
  }]);
}

function stripQuotes(value) {
  return typeof value === 'string' ? value.replace(/^"|"$/gu, '') : value;
}

function findTarget(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const [uuid, target] of Object.entries(section)) {
    if (!uuid.endsWith('_comment') && stripQuotes(target?.name) === name) return { uuid, target };
  }
  return null;
}

function configureWidgetTargetBuildSettings(project, target) {
  const list = project.hash.project.objects.XCConfigurationList[target.pbxNativeTarget.buildConfigurationList];
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const reference of list.buildConfigurations) {
    const settings = configurations[reference.value].buildSettings;
    settings.APPLICATION_EXTENSION_API_ONLY = 'YES';
    settings.CODE_SIGN_ENTITLEMENTS = `"${IOS_WIDGET_TARGET_NAME}/${IOS_WIDGET_TARGET_NAME}.entitlements"`;
    settings.CURRENT_PROJECT_VERSION = '1';
    settings.GENERATE_INFOPLIST_FILE = 'NO';
    settings.IPHONEOS_DEPLOYMENT_TARGET = '16.4';
    settings.MARKETING_VERSION = '0.1.0';
    settings.SWIFT_VERSION = '5.0';
    settings.TARGETED_DEVICE_FAMILY = '"1,2"';
  }
}

function addIosWidgetTarget(project) {
  if (findTarget(project, IOS_WIDGET_TARGET_NAME)) return project;
  const target = project.addTarget(
    IOS_WIDGET_TARGET_NAME,
    'app_extension',
    IOS_WIDGET_TARGET_NAME,
    IOS_WIDGET_BUNDLE_IDENTIFIER,
  );
  const sourcePath = `${IOS_WIDGET_TARGET_NAME}/${IOS_WIDGET_TARGET_NAME}.swift`;
  project.addBuildPhase([sourcePath], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
  project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  project.addFramework('System/Library/Frameworks/WidgetKit.framework', { target: target.uuid });
  project.addFramework('System/Library/Frameworks/SwiftUI.framework', { target: target.uuid });
  const group = project.addPbxGroup([sourcePath], IOS_WIDGET_TARGET_NAME, IOS_WIDGET_TARGET_NAME);
  project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
  configureWidgetTargetBuildSettings(project, target);
  project.addTargetAttribute('ProvisioningStyle', 'Automatic', target);
  project.addTargetAttribute('SystemCapabilities', {
    'com.apple.ApplicationGroups.iOS': { enabled: 1 },
  }, target);
  project.addTargetAttribute('SystemCapabilities', {
    'com.apple.ApplicationGroups.iOS': { enabled: 1 },
  }, project.getFirstTarget());
  return project;
}

function withIosWidgetTarget(config, enabled) {
  return withXcodeProject(config, current => {
    if (enabled) current.modResults = addIosWidgetTarget(current.modResults);
    return current;
  });
}

function withAruconNativeIntegration(config, rawOptions = {}) {
  const options = {
    healthDeclarationsEnabled: false,
    widgetTargetsEnabled: false,
    ...rawOptions,
  };
  config = withEntitlementsPlist(config, current => {
    const withoutHealth = applyIosHealthDeclarations(current.modResults, {}, options).entitlements;
    current.modResults = applyIosWidgetAppGroup(withoutHealth, options.widgetTargetsEnabled);
    return current;
  });
  config = withInfoPlist(config, current => {
    current.modResults = applyIosHealthDeclarations({}, current.modResults, options).infoPlist;
    return current;
  });
  config = withAndroidManifest(config, current => {
    const withoutHealth = applyAndroidHealthDeclarations(current.modResults, options);
    current.modResults = applyAndroidWidgetReceiver(withoutHealth, options.widgetTargetsEnabled);
    return current;
  });
  config = withAndroidWidgetSources(config, options.widgetTargetsEnabled);
  config = withIosWidgetSources(config, options.widgetTargetsEnabled);
  return withIosWidgetTarget(config, options.widgetTargetsEnabled);
}

module.exports = withAruconNativeIntegration;
module.exports._internal = {
  ANDROID_HEALTH_CONNECT_PACKAGE,
  ANDROID_CONTRACT_VERSION_KEY,
  ANDROID_HEALTH_READ_PERMISSIONS,
  IOS_HEALTH_ENTITLEMENT,
  IOS_HEALTH_READ_DESCRIPTION,
  IOS_CONTRACT_VERSION_KEY,
  IOS_WIDGET_APP_GROUP,
  IOS_WIDGET_BUNDLE_IDENTIFIER,
  ANDROID_WIDGET_PROVIDER,
  addIosWidgetTarget,
  applyAndroidWidgetReceiver,
  applyIosWidgetAppGroup,
  createWidgetGenerationPlan,
  applyAndroidHealthDeclarations,
  applyIosHealthDeclarations,
};

#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const xcode = require('xcode');
const plist = require('@expo/plist').default;
const { resolveIosWidgetSourceReference } =
  require('../plugins/withAruconNativeIntegration')._internal;

const projectRoot = process.cwd();
const args = process.argv.slice(2);
let outputPath = null;
let platform = 'all';
let platformSpecified = false;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--output') {
    if (outputPath !== null) throw new Error('--output may be specified only once');
    outputPath = args[index + 1];
    if (!outputPath || outputPath.startsWith('--')) throw new Error('--output requires a path');
    index += 1;
  } else if (argument === '--platform') {
    if (platformSpecified) throw new Error('--platform may be specified only once');
    platformSpecified = true;
    platform = args[index + 1];
    if (!['all', 'android', 'ios'].includes(platform)) {
      throw new Error('--platform must be one of: all, android, ios');
    }
    index += 1;
  } else {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
const checkIos = platform === 'all' || platform === 'ios';
const checkAndroid = platform === 'all' || platform === 'android';

const files = {
  appConfig: 'app.json',
  iosInfo: 'ios/app/Info.plist',
  iosEntitlements: 'ios/app/app.entitlements',
  iosProject: 'ios/app.xcodeproj/project.pbxproj',
  iosWidgetSource: 'ios/AruconWidget/AruconWidget.swift',
  iosWidgetTemplate: 'native/arucon-widget-template/ios/AruconWidget.swift.template',
  iosWidgetPetAsset: 'ios/AruconWidget/arucon_widget_pet.png',
  widgetPetAssetTemplate: 'native/arucon-widget-template/assets/arucon_widget_pet.png',
  iosWidgetInfo: 'ios/AruconWidget/AruconWidget-Info.plist',
  iosWidgetEntitlements: 'ios/AruconWidget/AruconWidget.entitlements',
  androidManifest: 'android/app/src/main/AndroidManifest.xml',
  androidWidgetSource: 'android/app/src/main/java/com/arucon/widget/AruconWidgetProvider.kt',
  androidWidgetTemplate: 'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template',
  androidWidgetLayout: 'android/app/src/main/res/layout/arucon_widget.xml',
  androidWidgetLayoutTemplate: 'native/arucon-widget-template/android/res/layout/arucon_widget.xml.template',
  androidWidgetBackground: 'android/app/src/main/res/drawable/arucon_widget_background.xml',
  androidWidgetBackgroundTemplate:
    'native/arucon-widget-template/android/res/drawable/arucon_widget_background.xml.template',
  androidWidgetPetAsset: 'android/app/src/main/res/drawable-nodpi/arucon_widget_pet.png',
  androidWidgetInfo: 'android/app/src/main/res/xml/arucon_widget_info.xml',
  androidWidgetInfoTemplate: 'native/arucon-widget-template/android/res/xml/arucon_widget_info.xml.template',
  swiftModule: 'native/arucon-health/ios/AruconHealth/AruconHealthModule.swift',
  kotlinModule: 'native/arucon-health/android/src/main/java/com/arucon/health/AruconHealthModule.kt',
  swiftWidgetModule: 'native/arucon-widget/ios/AruconWidgetBridge/AruconWidgetBridgeModule.swift',
  kotlinWidgetModule: 'native/arucon-widget/android/src/main/java/com/arucon/widgetbridge/AruconWidgetBridgeModule.kt',
};

async function read(relativePath, optional = false) {
  try {
    return await readFile(path.join(projectRoot, relativePath), 'utf8');
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return '';
    throw error;
  }
}

async function readBytes(relativePath) {
  return readFile(path.join(projectRoot, relativePath));
}

function parseXcodeProject(relativePath) {
  return new Promise((resolveProject, reject) => {
    const project = xcode.project(path.join(projectRoot, relativePath));
    project.parse(error => error ? reject(error) : resolveProject(project));
  });
}

function targetBuildSettings(project, targetEntry) {
  if (!targetEntry) return [];
  const configurationLists = project.hash.project.objects.XCConfigurationList ?? {};
  const configurations = project.pbxXCBuildConfigurationSection();
  const configurationList = configurationLists[targetEntry[1].buildConfigurationList];
  return (configurationList?.buildConfigurations ?? [])
    .map(reference => configurations[reference.value]?.buildSettings)
    .filter(Boolean);
}

function targetResourcePaths(project, targetEntry) {
  if (!targetEntry) return [];
  const phases = project.hash.project.objects.PBXResourcesBuildPhase ?? {};
  const buildFiles = project.hash.project.objects.PBXBuildFile ?? {};
  const fileReferences = project.pbxFileReferenceSection();
  const resourcePhaseReference = (targetEntry[1].buildPhases ?? []).find(reference =>
    phases[reference.value]);
  const resourcePhase = resourcePhaseReference && phases[resourcePhaseReference.value];
  return (resourcePhase?.files ?? []).map(reference => {
    const fileRef = buildFiles[reference.value]?.fileRef;
    return unquoted(fileReferences[fileRef]?.path);
  }).filter(Boolean);
}

function unquoted(value) {
  return typeof value === 'string' ? value.replace(/^"|"$/gu, '') : value;
}

const [appConfigText, iosInfo, iosEntitlements, iosProjectText, iosWidgetSource,
  iosWidgetTemplate, iosWidgetPetAsset, widgetPetAssetTemplate, iosWidgetInfo,
  iosWidgetEntitlements, androidManifest, androidWidgetSource, androidWidgetTemplate,
  androidWidgetLayout, androidWidgetLayoutTemplate, androidWidgetBackground,
  androidWidgetBackgroundTemplate, androidWidgetPetAsset, androidWidgetInfo,
  androidWidgetInfoTemplate, swiftModule, kotlinModule, swiftWidgetModule, kotlinWidgetModule,
  parsedXcodeProject] =
  await Promise.all([
    read(files.appConfig),
    checkIos ? read(files.iosInfo) : '',
    checkIos ? read(files.iosEntitlements, true) : '',
    checkIos ? read(files.iosProject) : '',
    checkIos ? read(files.iosWidgetSource) : '',
    checkIos ? read(files.iosWidgetTemplate) : '',
    checkIos ? readBytes(files.iosWidgetPetAsset) : Buffer.alloc(0),
    readBytes(files.widgetPetAssetTemplate),
    checkIos ? read(files.iosWidgetInfo) : '',
    checkIos ? read(files.iosWidgetEntitlements) : '',
    checkAndroid ? read(files.androidManifest) : '',
    checkAndroid ? read(files.androidWidgetSource) : '',
    checkAndroid ? read(files.androidWidgetTemplate) : '',
    checkAndroid ? read(files.androidWidgetLayout) : '',
    checkAndroid ? read(files.androidWidgetLayoutTemplate) : '',
    checkAndroid ? read(files.androidWidgetBackground) : '',
    checkAndroid ? read(files.androidWidgetBackgroundTemplate) : '',
    checkAndroid ? readBytes(files.androidWidgetPetAsset) : Buffer.alloc(0),
    checkAndroid ? read(files.androidWidgetInfo) : '',
    checkAndroid ? read(files.androidWidgetInfoTemplate) : '',
    checkIos ? read(files.swiftModule) : '',
    checkAndroid ? read(files.kotlinModule) : '',
    checkIos ? read(files.swiftWidgetModule) : '',
    checkAndroid ? read(files.kotlinWidgetModule) : '',
    checkIos ? parseXcodeProject(files.iosProject) : null,
  ]);

const appConfig = JSON.parse(appConfigText);
const iosWidgetInfoPlist = checkIos ? plist.parse(iosWidgetInfo) : null;
const pluginEntry = appConfig.expo?.plugins?.find(entry =>
  Array.isArray(entry) && entry[0] === './plugins/withAruconNativeIntegration');
const pluginOptions = pluginEntry?.[1];
const combinedGenerated = `${iosInfo}\n${iosEntitlements}\n${iosWidgetInfo}\n${iosWidgetEntitlements}\n${androidManifest}`;
const combinedModule = `${swiftModule}\n${kotlinModule}\n${swiftWidgetModule}\n${kotlinWidgetModule}`;
const combinedWidgetModule = `${swiftWidgetModule}\n${kotlinWidgetModule}`;
const nativeTargets = checkIos ? parsedXcodeProject.pbxNativeTargetSection() : {};
const widgetTarget = Object.entries(nativeTargets).find(([key, value]) =>
  !key.endsWith('_comment') && `${value?.name ?? ''}`.replaceAll('"', '') === 'AruconWidget');
const widgetSourceReference = widgetTarget ? resolveIosWidgetSourceReference(parsedXcodeProject, {
  uuid: widgetTarget[0],
  pbxNativeTarget: widgetTarget[1],
}) : null;
const widgetBuildSettings = checkIos ? targetBuildSettings(parsedXcodeProject, widgetTarget) : [];
const androidMainActivityTag = checkAndroid
  ? androidManifest.match(/<activity\b(?=[^>]*android:name="[^"]*\.MainActivity")[^>]*>/u)?.[0] ?? ''
  : '';
const androidMainActivityConfigChanges =
  androidMainActivityTag.match(/android:configChanges="([^"]*)"/u)?.[1]?.split('|') ?? [];
const widgetResourcePaths = checkIos ? targetResourcePaths(parsedXcodeProject, widgetTarget) : [];

const checks = {
  pluginRegistered: Boolean(pluginEntry),
  healthDeclarationsDefaultOff: pluginOptions?.healthDeclarationsEnabled === false,
  widgetTargetsDevelopmentEnabled: pluginOptions?.widgetTargetsEnabled === true,
  ...(checkIos ? {
    iosAppExtensionMetadataDeclared: appConfig.expo?.extra?.eas?.build?.experimental?.ios?.appExtensions?.some(extension =>
      extension.targetName === 'AruconWidget' && extension.bundleIdentifier === 'com.arucon.dev.widget'),
    iosPluginMarkerGenerated: iosInfo.includes('AruconNativeIntegrationContractVersion'),
  } : {}),
  ...(checkAndroid ? {
    androidPluginMarkerGenerated: androidManifest.includes('com.arucon.native.CONTRACT_VERSION'),
    androidMainActivityHandlesFontScaleChanges: androidMainActivityConfigChanges.includes('fontScale'),
  } : {}),
  noGeneratedHealthDeclarations: !/NSHealth(?:Share|Update)UsageDescription|com\.apple\.developer\.healthkit|android\.permission\.health\.(?:READ|WRITE)_/.test(combinedGenerated),
  noHealthSdkImports: !/\bimport HealthKit\b|androidx\.health\.connect/.test(combinedModule),
  disabledNativeContract: (!checkIos || swiftModule.includes('"readMode": "disabled"')) &&
    (!checkAndroid || kotlinModule.includes('"readMode" to "disabled"')),
  noPermissionRequestApi: !/request(?:Read)?Permission|requestPermissions/.test(combinedModule),
  ...(checkIos ? {
    iosXcodeProjectParses: Boolean(parsedXcodeProject),
    iosWidgetTargetGenerated: Boolean(widgetTarget),
    iosWidgetSourceReferenceResolvesToGeneratedFile:
      widgetSourceReference?.relativePath === 'AruconWidget/AruconWidget.swift',
    iosWidgetExecutableDeclared:
      iosWidgetInfoPlist.CFBundleExecutable === '$(EXECUTABLE_NAME)',
    iosTargetAttributesHaveNoUndefinedKey: !iosProjectText.includes('\n\t\t\t\t\tundefined = {'),
    iosMainAndWidgetTargetsHaveAppGroupCapability:
      (iosProjectText.match(/com\.apple\.ApplicationGroups\.iOS/gu) ?? []).length === 2,
    iosWidgetBundleAndEntitlementsGenerated: widgetBuildSettings.length > 0 &&
      widgetBuildSettings.every(settings =>
        unquoted(settings.PRODUCT_BUNDLE_IDENTIFIER) === 'com.arucon.dev.widget' &&
        unquoted(settings.CODE_SIGN_ENTITLEMENTS) === 'AruconWidget/AruconWidget.entitlements') &&
      iosEntitlements.includes('group.com.arucon.dev.widget') &&
      iosWidgetEntitlements.includes('group.com.arucon.dev.widget'),
    iosWidgetSourceMatchesTemplate: iosWidgetSource === iosWidgetTemplate,
    iosWidgetPetAssetBundled: widgetResourcePaths.filter(resourcePath =>
      resourcePath === 'arucon_widget_pet.png').length === 1 &&
      iosWidgetPetAsset.equals(widgetPetAssetTemplate),
  } : {}),
  ...(checkAndroid ? {
    androidWidgetReceiverGenerated: androidManifest.includes('com.arucon.widget.AruconWidgetProvider') &&
      androidManifest.includes('android.appwidget.action.APPWIDGET_UPDATE') &&
      androidManifest.includes('@xml/arucon_widget_info'),
    androidWidgetSourcesMatchTemplates: androidWidgetSource === androidWidgetTemplate &&
      androidWidgetLayout === androidWidgetLayoutTemplate &&
      androidWidgetBackground === androidWidgetBackgroundTemplate &&
      androidWidgetPetAsset.equals(widgetPetAssetTemplate) &&
      androidWidgetInfo === androidWidgetInfoTemplate,
  } : {}),
  widgetLastUpdatedTimestampGenerated:
    (!checkIos || iosWidgetSource.includes('entry.projection?.updatedAtMs')) &&
    (!checkAndroid || androidWidgetSource.includes('projection?.updatedAtMs')),
  widgetNoAutomaticCadence: (!checkIos || iosWidgetSource.includes('policy: .never')) &&
    (!checkAndroid || androidWidgetInfo.includes('android:updatePeriodMillis="0"')),
  widgetOpenAppOnly: (!checkIos || iosWidgetSource.includes('.widgetURL(openAppURL)')) &&
    (!checkAndroid || androidWidgetSource.includes('Intent(Intent.ACTION_VIEW, Uri.parse(OPEN_APP_URL)).setPackage')),
  widgetBridgeUsesStrictSixFieldContract:
    (!checkIos || (swiftWidgetModule.includes('Set(dictionary.keys) == projectionKeys') &&
      swiftWidgetModule.includes('9_007_199_254_740_991'))) &&
    (!checkAndroid || (kotlinWidgetModule.includes('require(keys == PROJECTION_KEYS)') &&
      kotlinWidgetModule.includes('9_007_199_254_740_991L'))),
  widgetBridgeContainsNoHealthOrGameCommands:
    !/HealthKit|health\.connect|feed|reward|purchase|claim/iu.test(combinedWidgetModule),
};

const checkedFiles = Object.fromEntries(Object.entries(files).filter(([key]) =>
  key === 'appConfig' ||
  (checkIos && (key.startsWith('ios') || key.startsWith('swift'))) ||
  (checkAndroid && (key.startsWith('android') || key.startsWith('kotlin')))));

const result = {
  schemaVersion: 2,
  scope: 'generated-native-boundary-static-check',
  platform,
  checkedFiles,
  checks,
  passed: Object.values(checks).every(Boolean),
  runtimeVerification: {
    nativeCompilation: 'NOT_RUN',
    nativeModuleInvocation: 'NOT_RUN',
    healthRead: 'NOT_RUN',
    widgetInstall: 'NOT_RUN',
    physicalDevice: 'NOT_RUN',
  },
};

const rendered = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) await writeFile(path.resolve(projectRoot, outputPath), rendered, 'utf8');
process.stdout.write(rendered);
if (!result.passed) process.exitCode = 1;

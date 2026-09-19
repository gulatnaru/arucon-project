#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const xcode = require('xcode');
const { resolveIosWidgetSourceReference } =
  require('../plugins/withAruconNativeIntegration')._internal;

const projectRoot = process.cwd();
const outputArg = process.argv.indexOf('--output');
const outputPath = outputArg >= 0 ? process.argv[outputArg + 1] : null;
if (outputArg >= 0 && !outputPath) throw new Error('--output requires a path');

const files = {
  appConfig: 'app.json',
  iosInfo: 'ios/app/Info.plist',
  iosEntitlements: 'ios/app/app.entitlements',
  iosProject: 'ios/app.xcodeproj/project.pbxproj',
  iosWidgetSource: 'ios/AruconWidget/AruconWidget.swift',
  iosWidgetTemplate: 'native/arucon-widget-template/ios/AruconWidget.swift.template',
  iosWidgetInfo: 'ios/AruconWidget/AruconWidget-Info.plist',
  iosWidgetEntitlements: 'ios/AruconWidget/AruconWidget.entitlements',
  androidManifest: 'android/app/src/main/AndroidManifest.xml',
  androidWidgetSource: 'android/app/src/main/java/com/arucon/widget/AruconWidgetProvider.kt',
  androidWidgetTemplate: 'native/arucon-widget-template/android/src/com/arucon/widget/AruconWidgetProvider.kt.template',
  androidWidgetLayout: 'android/app/src/main/res/layout/arucon_widget.xml',
  androidWidgetLayoutTemplate: 'native/arucon-widget-template/android/res/layout/arucon_widget.xml.template',
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

function parseXcodeProject(relativePath) {
  return new Promise((resolveProject, reject) => {
    const project = xcode.project(path.join(projectRoot, relativePath));
    project.parse(error => error ? reject(error) : resolveProject(project));
  });
}

const [appConfigText, iosInfo, iosEntitlements, iosProjectText, iosWidgetSource,
  iosWidgetTemplate, iosWidgetInfo, iosWidgetEntitlements, androidManifest,
  androidWidgetSource, androidWidgetTemplate, androidWidgetLayout, androidWidgetLayoutTemplate,
  androidWidgetInfo, androidWidgetInfoTemplate, swiftModule, kotlinModule,
  swiftWidgetModule, kotlinWidgetModule, parsedXcodeProject] =
  await Promise.all([
    read(files.appConfig),
    read(files.iosInfo),
    read(files.iosEntitlements, true),
    read(files.iosProject),
    read(files.iosWidgetSource),
    read(files.iosWidgetTemplate),
    read(files.iosWidgetInfo),
    read(files.iosWidgetEntitlements),
    read(files.androidManifest),
    read(files.androidWidgetSource),
    read(files.androidWidgetTemplate),
    read(files.androidWidgetLayout),
    read(files.androidWidgetLayoutTemplate),
    read(files.androidWidgetInfo),
    read(files.androidWidgetInfoTemplate),
    read(files.swiftModule),
    read(files.kotlinModule),
    read(files.swiftWidgetModule),
    read(files.kotlinWidgetModule),
    parseXcodeProject(files.iosProject),
  ]);

const appConfig = JSON.parse(appConfigText);
const pluginEntry = appConfig.expo?.plugins?.find(entry =>
  Array.isArray(entry) && entry[0] === './plugins/withAruconNativeIntegration');
const pluginOptions = pluginEntry?.[1];
const combinedGenerated = `${iosInfo}\n${iosEntitlements}\n${iosWidgetInfo}\n${iosWidgetEntitlements}\n${androidManifest}`;
const combinedModule = `${swiftModule}\n${kotlinModule}\n${swiftWidgetModule}\n${kotlinWidgetModule}`;
const nativeTargets = parsedXcodeProject.pbxNativeTargetSection();
const widgetTarget = Object.entries(nativeTargets).find(([key, value]) =>
  !key.endsWith('_comment') && `${value?.name ?? ''}`.replaceAll('"', '') === 'AruconWidget');
const widgetSourceReference = widgetTarget ? resolveIosWidgetSourceReference(parsedXcodeProject, {
  uuid: widgetTarget[0],
  pbxNativeTarget: widgetTarget[1],
}) : null;

const checks = {
  pluginRegistered: Boolean(pluginEntry),
  healthDeclarationsDefaultOff: pluginOptions?.healthDeclarationsEnabled === false,
  widgetTargetsDevelopmentEnabled: pluginOptions?.widgetTargetsEnabled === true,
  iosAppExtensionMetadataDeclared: appConfig.expo?.extra?.eas?.build?.experimental?.ios?.appExtensions?.some(extension =>
    extension.targetName === 'AruconWidget' && extension.bundleIdentifier === 'com.arucon.dev.widget'),
  iosPluginMarkerGenerated: iosInfo.includes('AruconNativeIntegrationContractVersion'),
  androidPluginMarkerGenerated: androidManifest.includes('com.arucon.native.CONTRACT_VERSION'),
  noGeneratedHealthDeclarations: !/NSHealth(?:Share|Update)UsageDescription|com\.apple\.developer\.healthkit|android\.permission\.health\.(?:READ|WRITE)_/.test(combinedGenerated),
  noHealthSdkImports: !/\bimport HealthKit\b|androidx\.health\.connect/.test(combinedModule),
  disabledNativeContract: swiftModule.includes('"readMode": "disabled"') &&
    kotlinModule.includes('"readMode" to "disabled"'),
  noPermissionRequestApi: !/request(?:Read)?Permission|requestPermissions/.test(combinedModule),
  iosXcodeProjectParses: Boolean(parsedXcodeProject),
  iosWidgetTargetGenerated: Boolean(widgetTarget),
  iosWidgetSourceReferenceResolvesToGeneratedFile:
    widgetSourceReference?.relativePath === 'AruconWidget/AruconWidget.swift',
  iosTargetAttributesHaveNoUndefinedKey: !iosProjectText.includes('\n\t\t\t\t\tundefined = {'),
  iosMainAndWidgetTargetsHaveAppGroupCapability: (iosProjectText.match(/com\.apple\.ApplicationGroups\.iOS/gu) ?? []).length === 2,
  iosWidgetBundleAndEntitlementsGenerated: iosProjectText.includes('PRODUCT_BUNDLE_IDENTIFIER = "com.arucon.dev.widget"') &&
    iosProjectText.includes('CODE_SIGN_ENTITLEMENTS = "AruconWidget/AruconWidget.entitlements"') &&
    iosEntitlements.includes('group.com.arucon.dev.widget') && iosWidgetEntitlements.includes('group.com.arucon.dev.widget'),
  iosWidgetSourceMatchesTemplate: iosWidgetSource === iosWidgetTemplate,
  androidWidgetReceiverGenerated: androidManifest.includes('com.arucon.widget.AruconWidgetProvider') &&
    androidManifest.includes('android.appwidget.action.APPWIDGET_UPDATE') &&
    androidManifest.includes('@xml/arucon_widget_info'),
  androidWidgetSourcesMatchTemplates: androidWidgetSource === androidWidgetTemplate &&
    androidWidgetLayout === androidWidgetLayoutTemplate && androidWidgetInfo === androidWidgetInfoTemplate,
  widgetLastUpdatedTimestampGenerated: iosWidgetSource.includes('entry.projection?.updatedAtMs') &&
    androidWidgetSource.includes('projection?.updatedAtMs'),
  widgetNoAutomaticCadence: iosWidgetSource.includes('policy: .never') &&
    androidWidgetInfo.includes('android:updatePeriodMillis="0"'),
  widgetOpenAppOnly: iosWidgetSource.includes('.widgetURL(openAppURL)') &&
    androidWidgetSource.includes('Intent(Intent.ACTION_VIEW, Uri.parse(OPEN_APP_URL)).setPackage'),
  widgetBridgeUsesStrictSixFieldContract: swiftWidgetModule.includes('Set(dictionary.keys) == projectionKeys') &&
    kotlinWidgetModule.includes('require(keys == PROJECTION_KEYS)') &&
    swiftWidgetModule.includes('9_007_199_254_740_991') &&
    kotlinWidgetModule.includes('9_007_199_254_740_991L'),
  widgetBridgeContainsNoHealthOrGameCommands: !/HealthKit|health\.connect|feed|reward|purchase|claim/iu.test(
    `${swiftWidgetModule}\n${kotlinWidgetModule}`
  ),
};

const result = {
  schemaVersion: 2,
  scope: 'generated-native-boundary-static-check',
  checkedFiles: files,
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

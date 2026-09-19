#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const outputArg = process.argv.indexOf('--output');
const outputPath = outputArg >= 0 ? process.argv[outputArg + 1] : null;
if (outputArg >= 0 && !outputPath) throw new Error('--output requires a path');

const files = {
  appConfig: 'app.json',
  iosInfo: 'ios/app/Info.plist',
  iosEntitlements: 'ios/app/app.entitlements',
  androidManifest: 'android/app/src/main/AndroidManifest.xml',
  swiftModule: 'native/arucon-health/ios/AruconHealth/AruconHealthModule.swift',
  kotlinModule: 'native/arucon-health/android/src/main/java/com/arucon/health/AruconHealthModule.kt',
};

async function read(relativePath, optional = false) {
  try {
    return await readFile(path.join(projectRoot, relativePath), 'utf8');
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return '';
    throw error;
  }
}

const [appConfigText, iosInfo, iosEntitlements, androidManifest, swiftModule, kotlinModule] =
  await Promise.all([
    read(files.appConfig),
    read(files.iosInfo),
    read(files.iosEntitlements, true),
    read(files.androidManifest),
    read(files.swiftModule),
    read(files.kotlinModule),
  ]);

const appConfig = JSON.parse(appConfigText);
const pluginEntry = appConfig.expo?.plugins?.find(entry =>
  Array.isArray(entry) && entry[0] === './plugins/withAruconNativeIntegration');
const pluginOptions = pluginEntry?.[1];
const combinedGenerated = `${iosInfo}\n${iosEntitlements}\n${androidManifest}`;
const combinedModule = `${swiftModule}\n${kotlinModule}`;

const checks = {
  pluginRegistered: Boolean(pluginEntry),
  healthDeclarationsDefaultOff: pluginOptions?.healthDeclarationsEnabled === false,
  widgetTargetsDefaultOff: pluginOptions?.widgetTargetsEnabled === false,
  iosPluginMarkerGenerated: iosInfo.includes('AruconNativeIntegrationContractVersion'),
  androidPluginMarkerGenerated: androidManifest.includes('com.arucon.native.CONTRACT_VERSION'),
  noGeneratedHealthDeclarations: !/NSHealth(?:Share|Update)UsageDescription|com\.apple\.developer\.healthkit|android\.permission\.health\.(?:READ|WRITE)_/.test(combinedGenerated),
  noHealthSdkImports: !/\bimport HealthKit\b|androidx\.health\.connect/.test(combinedModule),
  disabledNativeContract: swiftModule.includes('"readMode": "disabled"') &&
    kotlinModule.includes('"readMode" to "disabled"'),
  noPermissionRequestApi: !/request(?:Read)?Permission|requestPermissions/.test(combinedModule),
};

const result = {
  schemaVersion: 1,
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

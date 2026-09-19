#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const outputFlag = args.indexOf('--output');
if (args.length !== 0 && (outputFlag !== 0 || args.length !== 2 || !args[1])) {
  process.stderr.write('Usage: node scripts/check-native-environment.mjs [--output <workspace-relative-json>]\n');
  process.exit(2);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', timeout: 15_000 });
  if (result.error?.code === 'ENOENT') return { available: false, exitCode: null };
  return {
    available: true,
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function firstLine(result) {
  if (result.exitCode !== 0) return null;
  return `${result.stdout}\n${result.stderr}`.trim().split('\n')[0] || null;
}

function existingAndroidSdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.HOME ? join(process.env.HOME, 'Library/Android/sdk') : null,
  ].filter(Boolean);
  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

function probeXcode() {
  const result = run('xcodebuild', ['-version']);
  const selected = run('xcode-select', ['-p']);
  const swift = run('swiftc', ['--version']);
  const simulatorSdk = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path']);
  const cocoaPods = run('pod', ['--version']);
  return {
    commandLineToolsSelected: selected.exitCode === 0,
    toolAvailable: result.available,
    fullXcodeAvailable: result.available && result.exitCode === 0,
    version: result.exitCode === 0 ? result.stdout.trim().split('\n')[0] || null : null,
    swiftCompilerAvailable: swift.exitCode === 0,
    swiftVersion: firstLine(swift),
    simulatorSdkAvailable: simulatorSdk.exitCode === 0,
    cocoaPodsAvailable: cocoaPods.exitCode === 0,
    cocoaPodsVersion: firstLine(cocoaPods),
    status: result.exitCode === 0 ? 'AVAILABLE' : 'BLOCKED_ENV',
  };
}

function probeAppleSimulators() {
  const result = run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']);
  let availableCount = null;
  if (result.exitCode === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      availableCount = Object.values(parsed.devices ?? {}).flat().filter(device => device?.isAvailable).length;
    } catch {
      availableCount = null;
    }
  }
  return {
    toolAvailable: result.available && result.exitCode === 0,
    availableSimulatorCount: availableCount,
    appLaunchStatus: 'NOT_RUN',
  };
}

function probeAndroidDevices(adbCommand) {
  const result = run(adbCommand, ['devices']);
  const connected = result.exitCode === 0 ? result.stdout.split('\n').slice(1)
    .map(line => line.match(/^(\S+)\tdevice\s*$/u))
    .filter(Boolean)
    .map(match => match[1]) : [];
  return {
    toolAvailable: result.available,
    probeStatus: !result.available ? 'NOT_FOUND' : result.exitCode === 0 ? 'AVAILABLE' : 'ERROR',
    connectedPhysicalDeviceCount: result.exitCode === 0 ? connected.filter(id => !id.startsWith('emulator-')).length : null,
    connectedAndroidEmulatorCount: result.exitCode === 0 ? connected.filter(id => id.startsWith('emulator-')).length : null,
    appLaunchStatus: 'NOT_RUN',
  };
}

function probeAndroidEmulators(emulatorCommand) {
  const result = run(emulatorCommand, ['-list-avds']);
  const configuredCount = result.exitCode === 0 ? result.stdout.split('\n').filter(line => line.trim()).length : null;
  return {
    toolAvailable: result.available,
    configuredEmulatorCount: configuredCount,
    appLaunchStatus: 'NOT_RUN',
  };
}

function probeAndroidSdk() {
  const root = existingAndroidSdkRoot();
  const adbCommand = root && existsSync(join(root, 'platform-tools/adb')) ? join(root, 'platform-tools/adb') : 'adb';
  const emulatorCommand = root && existsSync(join(root, 'emulator/emulator')) ? join(root, 'emulator/emulator') : 'emulator';
  const sdkManagerCandidates = root ? [
    join(root, 'cmdline-tools/latest/bin/sdkmanager'),
    join(root, 'tools/bin/sdkmanager'),
  ] : [];
  const sdkManagerCommand = sdkManagerCandidates.find(existsSync) ?? 'sdkmanager';
  const sdkManager = run(sdkManagerCommand, ['--version']);
  const platforms = root && existsSync(join(root, 'platforms')) ? readdirSync(join(root, 'platforms')).length : 0;
  const buildTools = root && existsSync(join(root, 'build-tools')) ? readdirSync(join(root, 'build-tools')).length : 0;
  return {
    rootAvailable: Boolean(root),
    environmentConfigured: Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT),
    standardPathExists: Boolean(process.env.HOME && existsSync(join(process.env.HOME, 'Library/Android/sdk'))),
    platformPackageCount: platforms,
    buildToolsPackageCount: buildTools,
    sdkManagerAvailable: sdkManager.exitCode === 0,
    status: root && platforms > 0 && buildTools > 0 ? 'AVAILABLE' : 'BLOCKED_ENV',
    adbCommand,
    emulatorCommand,
  };
}

function probeJava() {
  const java = run('java', ['-version']);
  const javac = run('javac', ['-version']);
  return {
    runtimeAvailable: java.exitCode === 0,
    compilerAvailable: javac.exitCode === 0,
    runtimeVersion: firstLine(java),
    compilerVersion: firstLine(javac),
  };
}

const androidSdkProbe = probeAndroidSdk();

const report = {
  schemaVersion: 2,
  scope: 'tool-and-target-inventory-only',
  generatedAt: new Date().toISOString(),
  iosSdk: probeXcode(),
  iosSimulator: probeAppleSimulators(),
  androidSdk: Object.fromEntries(Object.entries(androidSdkProbe).filter(([key]) => !key.endsWith('Command'))),
  java: probeJava(),
  androidPhysicalDevices: probeAndroidDevices(androidSdkProbe.adbCommand),
  androidEmulators: probeAndroidEmulators(androidSdkProbe.emulatorCommand),
  verification: {
    healthRead: 'NOT_RUN',
    widgetExtension: 'NOT_RUN',
    simulatorAppLaunch: 'NOT_RUN',
    physicalDeviceAppLaunch: 'NOT_RUN',
  },
  privacy: {
    deviceIdentifiersIncluded: false,
    simulatorNamesIncluded: false,
    sdkPathsIncluded: false,
    healthDataRead: false,
  },
};

const json = `${JSON.stringify(report, null, 2)}\n`;
if (outputFlag === 0) {
  const target = resolve(process.cwd(), args[1]);
  const cwd = `${resolve(process.cwd())}/`;
  if (!target.startsWith(cwd) || !target.endsWith('.json')) throw new Error('Output must be a workspace-relative JSON path');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, json, { encoding: 'utf8', mode: 0o600 });
} else {
  process.stdout.write(json);
}

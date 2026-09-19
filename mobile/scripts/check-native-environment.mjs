#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

function probeXcode() {
  const result = run('xcodebuild', ['-version']);
  return {
    toolAvailable: result.available,
    fullXcodeAvailable: result.available && result.exitCode === 0,
    version: result.exitCode === 0 ? result.stdout.trim().split('\n')[0] || null : null,
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

function probeAndroidDevices() {
  const result = run('adb', ['devices']);
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

function probeAndroidEmulators() {
  const result = run('emulator', ['-list-avds']);
  const configuredCount = result.exitCode === 0 ? result.stdout.split('\n').filter(line => line.trim()).length : null;
  return {
    toolAvailable: result.available,
    configuredEmulatorCount: configuredCount,
    appLaunchStatus: 'NOT_RUN',
  };
}

const report = {
  schemaVersion: 1,
  scope: 'tool-and-target-inventory-only',
  generatedAt: new Date().toISOString(),
  iosSdk: probeXcode(),
  iosSimulator: probeAppleSimulators(),
  androidSdk: {
    environmentConfigured: Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT),
    configuredPathExists: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ?
      existsSync(resolve(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT)) : false,
    standardPathExists: existsSync(resolve(process.env.HOME ?? '', 'Library/Android/sdk')),
  },
  androidPhysicalDevices: probeAndroidDevices(),
  androidEmulators: probeAndroidEmulators(),
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

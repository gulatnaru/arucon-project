#!/usr/bin/env node
import {
  closeSync, constants, existsSync, fchmodSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, realpathSync, rmSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const IOS_READY = 'READY_PHYSICAL_DEVICE';
const ANDROID_READY = 'READY_PHYSICAL_DEVICE';

export const PHYSICAL_CHECKS = Object.freeze([
  'native_build_install_launch',
  'room_visual_floor_and_pet_legibility',
  'touch_navigation_and_direct_pet_input',
  'motion_normal_and_reduce_motion',
  'foreground_background_force_quit_and_reboot',
  'synthetic_sleep_to_meal_and_transaction_interruption',
  'activity_unavailable_denied_revoked_and_delayed_records',
  'widget_install_render_update_stale_error_and_open_app',
  'widget_resource_neutrality',
  'screen_reader_touch_target_large_text_and_color',
  'portrait_safe_area_and_control_clipping',
  'frame_pacing_cpu_gpu_and_memory',
  'input_to_photon_latency',
  'thermal_battery_and_background_energy',
]);

/**
 * @typedef {{status: 'READ', kernelQemu: string, bootQemu: string, bootHardware: string}
 *   | {status: 'ERROR'}} AndroidPropertyResult
 */

/**
 * @callback AndroidPropertyReader
 * @param {string} serial
 * @returns {AndroidPropertyResult | null}
 */

function run(command, args, timeout = 15_000) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout,
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error?.code === 'ENOENT') return { available: false, exitCode: null, stdout: '', stderr: '' };
  return {
    available: true,
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

function isPhysicalAppleMobile(device) {
  const platform = normalized(device?.hardwareProperties?.platform);
  const deviceType = normalized(device?.hardwareProperties?.deviceType);
  if (platform && ['ios', 'ipados'].includes(platform)) return true;
  return deviceType ? /^(iphone|ipad|ipod)/u.test(deviceType) : false;
}

function isKnownNonMobileAppleDevice(device) {
  const platform = normalized(device?.hardwareProperties?.platform);
  const deviceType = normalized(device?.hardwareProperties?.deviceType);
  return platform === 'macos' || platform === 'tvos' || platform === 'watchos' || platform === 'visionos'
    || Boolean(deviceType && /^(?:mac|apple tv|apple watch|apple vision)/u.test(deviceType));
}

function hasExplicitIosConnection(device) {
  const connection = device?.connectionProperties;
  if (!connection || typeof connection !== 'object') return false;
  const tunnelState = normalized(connection.tunnelState);
  if (connection.isConnected === false || tunnelState === 'disconnected') return false;
  if (connection.isConnected === true) return true;
  if (tunnelState === 'connected') return true;
  return ['usb', 'wired'].includes(normalized(connection.transportType));
}

export function parseIosDeviceCtlPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { schemaStatus: 'UNVERIFIED', devices: [] };
  }
  const devices = payload.result?.devices;
  if (!Array.isArray(devices)) return { schemaStatus: 'UNVERIFIED', devices: [] };

  const summary = {
    schemaStatus: 'VERIFIED',
    physicalDeviceCount: 0,
    readyPhysicalDeviceCount: 0,
    pairedButNotConnectedCount: 0,
    unpairedPhysicalDeviceCount: 0,
    unknownPhysicalStateCount: 0,
    nonMobileOrUnsupportedCount: 0,
    unknownRecordCount: 0,
  };

  for (const device of devices) {
    if (!device || typeof device !== 'object' || Array.isArray(device)) {
      summary.unknownRecordCount += 1;
      continue;
    }
    if (!isPhysicalAppleMobile(device)) {
      if (isKnownNonMobileAppleDevice(device)) summary.nonMobileOrUnsupportedCount += 1;
      else summary.unknownRecordCount += 1;
      continue;
    }
    summary.physicalDeviceCount += 1;
    const pairing = normalized(device.connectionProperties?.pairingState);
    const boot = normalized(device.deviceProperties?.bootState);
    const developerMode = normalized(device.deviceProperties?.developerModeStatus);
    const connected = hasExplicitIosConnection(device);
    const paired = pairing === 'paired';
    const booted = boot === 'booted';
    const developmentEnabled = developerMode === 'enabled';

    if (paired && connected && booted && developmentEnabled) {
      summary.readyPhysicalDeviceCount += 1;
    } else if (paired && !connected) {
      summary.pairedButNotConnectedCount += 1;
    } else if (pairing && !paired) {
      summary.unpairedPhysicalDeviceCount += 1;
    } else {
      summary.unknownPhysicalStateCount += 1;
    }
  }
  if (summary.unknownRecordCount > 0) summary.schemaStatus = 'UNVERIFIED';
  return summary;
}

export function summarizeIosProbe(probe) {
  if (!probe.available) {
    return {
      toolStatus: 'MISSING',
      inventoryStatus: 'TOOL_MISSING',
      physicalDeviceCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  if (probe.exitCode !== 0) {
    return {
      toolStatus: 'AVAILABLE',
      inventoryStatus: 'TOOL_ERROR',
      physicalDeviceCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  const parsed = parseIosDeviceCtlPayload(probe.payload);
  if (parsed.schemaStatus !== 'VERIFIED') {
    return {
      toolStatus: 'AVAILABLE',
      inventoryStatus: 'SCHEMA_UNVERIFIED',
      physicalDeviceCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  return {
    toolStatus: 'AVAILABLE',
    inventoryStatus: parsed.readyPhysicalDeviceCount > 0
      ? IOS_READY
      : parsed.physicalDeviceCount === 0
        ? 'NO_PHYSICAL_DEVICE'
        : 'PHYSICAL_DEVICE_NOT_READY',
    physicalDeviceCount: parsed.physicalDeviceCount,
    readyPhysicalDeviceCount: parsed.readyPhysicalDeviceCount,
    pairedButNotConnectedCount: parsed.pairedButNotConnectedCount,
    unpairedPhysicalDeviceCount: parsed.unpairedPhysicalDeviceCount,
    unknownPhysicalStateCount: parsed.unknownPhysicalStateCount,
    nonMobileOrUnsupportedCount: parsed.nonMobileOrUnsupportedCount,
  };
}

export function parseAdbDevicesOutput(stdout) {
  if (typeof stdout !== 'string') return { schemaStatus: 'UNVERIFIED', targets: [] };
  const lines = stdout.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0 || !/^List of devices attached\b/u.test(lines[0])) {
    return { schemaStatus: 'UNVERIFIED', targets: [] };
  }
  const targets = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^(\S+)\s+(\S+)(?:\s+.*)?$/u);
    if (!match) {
      targets.push({ serial: null, state: 'unknown' });
      continue;
    }
    targets.push({ serial: match[1], state: match[2] });
  }
  return { schemaStatus: 'VERIFIED', targets };
}

/**
 * @param {{schemaStatus: string, targets: Array<{serial: string | null, state: string}>}} parsed
 * @param {AndroidPropertyReader} propertyReader
 */
export function classifyAndroidTargets(parsed, propertyReader) {
  if (parsed.schemaStatus !== 'VERIFIED') return { schemaStatus: 'UNVERIFIED' };
  const summary = {
    schemaStatus: 'VERIFIED',
    targetCount: parsed.targets.length,
    readyPhysicalDeviceCount: 0,
    authorizedEmulatorCount: 0,
    unauthorizedCount: 0,
    offlineCount: 0,
    unknownStateCount: 0,
    classificationErrorCount: 0,
  };
  for (const target of parsed.targets) {
    if (target.state === 'unauthorized') {
      summary.unauthorizedCount += 1;
      continue;
    }
    if (target.state === 'offline') {
      summary.offlineCount += 1;
      continue;
    }
    if (target.state !== 'device' || !target.serial) {
      summary.unknownStateCount += 1;
      continue;
    }
    const properties = propertyReader(target.serial);
    if (!properties || properties.status !== 'READ') {
      summary.classificationErrorCount += 1;
      continue;
    }
    const qemuValues = [properties.kernelQemu, properties.bootQemu].map(normalized);
    const hardware = normalized(properties.bootHardware) ?? '';
    const emulator = qemuValues.some(value => value === '1' || value === 'true')
      || /^(?:ranchu|goldfish|cuttlefish)/u.test(hardware);
    const physicalSignal = qemuValues.some(value => value === '0' || value === 'false')
      || (hardware !== '' && hardware !== 'unknown');
    if (emulator) summary.authorizedEmulatorCount += 1;
    else if (physicalSignal) summary.readyPhysicalDeviceCount += 1;
    else summary.classificationErrorCount += 1;
  }
  return summary;
}

/**
 * @param {{available: boolean, exitCode: number | null, stdout?: string}} probe
 * @param {AndroidPropertyReader} propertyReader
 */
export function summarizeAndroidProbe(probe, propertyReader = () => null) {
  if (!probe.available) {
    return {
      toolStatus: 'MISSING',
      inventoryStatus: 'TOOL_MISSING',
      targetCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  if (probe.exitCode !== 0) {
    return {
      toolStatus: 'AVAILABLE',
      inventoryStatus: 'TOOL_ERROR',
      targetCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  const parsed = parseAdbDevicesOutput(probe.stdout);
  const summary = classifyAndroidTargets(parsed, propertyReader);
  if (summary.schemaStatus !== 'VERIFIED') {
    return {
      toolStatus: 'AVAILABLE',
      inventoryStatus: 'SCHEMA_UNVERIFIED',
      targetCount: null,
      readyPhysicalDeviceCount: null,
    };
  }
  return {
    toolStatus: 'AVAILABLE',
    inventoryStatus: summary.readyPhysicalDeviceCount > 0
      ? ANDROID_READY
      : summary.targetCount === 0
        ? 'NO_TARGET'
        : 'NO_READY_PHYSICAL_DEVICE',
    targetCount: summary.targetCount,
    readyPhysicalDeviceCount: summary.readyPhysicalDeviceCount,
    authorizedEmulatorCount: summary.authorizedEmulatorCount,
    unauthorizedCount: summary.unauthorizedCount,
    offlineCount: summary.offlineCount,
    unknownStateCount: summary.unknownStateCount,
    classificationErrorCount: summary.classificationErrorCount,
  };
}

function readAndroidProperties(adbCommand, serial) {
  const readProperty = property => run(adbCommand, ['-s', serial, 'shell', 'getprop', property], 8_000);
  const kernelQemu = readProperty('ro.kernel.qemu');
  const bootQemu = readProperty('ro.boot.qemu');
  const bootHardware = readProperty('ro.boot.hardware');
  const results = [kernelQemu, bootQemu, bootHardware];
  if (results.some(result => !result.available || result.exitCode !== 0)) return { status: 'ERROR' };
  return {
    status: 'READ',
    kernelQemu: kernelQemu.stdout,
    bootQemu: bootQemu.stdout,
    bootHardware: bootHardware.stdout,
  };
}

function probeIosDevices() {
  const availability = run('xcrun', ['--find', 'devicectl']);
  if (!availability.available || availability.exitCode !== 0) return { available: false, exitCode: null };
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'arucon-physical-readiness-'));
  const jsonPath = join(temporaryDirectory, 'devices.json');
  try {
    const result = run('xcrun', ['devicectl', 'list', 'devices', '--json-output', jsonPath], 20_000);
    if (result.exitCode !== 0 || !existsSync(jsonPath)) {
      return { available: true, exitCode: result.exitCode ?? 1 };
    }
    try {
      return { available: true, exitCode: 0, payload: JSON.parse(readFileSync(jsonPath, 'utf8')) };
    } catch {
      return { available: true, exitCode: 0, payload: null };
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function findAdbCommand() {
  const candidates = [
    process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb') : null,
    process.env.ANDROID_SDK_ROOT ? join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb') : null,
    join(homedir(), 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
  ].filter(Boolean);
  return candidates.find(candidate => existsSync(candidate)) ?? 'adb';
}

function sanitizedVersion(result) {
  if (result.exitCode !== 0) return null;
  const match = `${result.stdout}\n${result.stderr}`.match(/Xcode\s+([\w.-]+)/u);
  return match?.[1] ?? null;
}

function probeXcodeEnvironment() {
  const selected = run('xcode-select', ['-p']);
  const version = run('xcodebuild', ['-version']);
  const xctrace = run('xcrun', ['xctrace', 'list', 'templates']);
  const templates = ['Animation Hitches', 'Time Profiler', 'Power Profiler', 'Game Performance', 'Metal System Trace'];
  return {
    developerDirectorySelected: selected.exitCode === 0,
    xcodebuildAvailable: version.exitCode === 0,
    xcodeVersion: sanitizedVersion(version),
    xctraceAvailable: xctrace.exitCode === 0,
    measurementTemplates: Object.fromEntries(templates.map(template => [template, xctrace.exitCode === 0
      ? xctrace.stdout.includes(template)
      : null])),
  };
}

function probeAppleSigning() {
  const identities = run('security', ['find-identity', '-v', '-p', 'codesigning']);
  const match = identities.exitCode === 0
    ? `${identities.stdout}\n${identities.stderr}`.match(/(\d+)\s+valid identities found/u)
    : null;
  const profileDirectories = [
    join(homedir(), 'Library', 'MobileDevice', 'Provisioning Profiles'),
    join(homedir(), 'Library', 'Developer', 'Xcode', 'UserData', 'Provisioning Profiles'),
  ];
  const existingProfileDirectories = profileDirectories.filter(directory => existsSync(directory));
  const profileCount = existingProfileDirectories.reduce((count, directory) => count
    + readdirSync(directory).filter(entry => /\.(?:mobileprovision|provisionprofile)$/u.test(entry)).length, 0);
  return {
    signingToolAvailable: identities.available,
    validCodeSigningIdentityCount: match ? Number(match[1]) : identities.exitCode === 0 ? null : null,
    provisioningProfileDirectoryPresent: existingProfileDirectories.length > 0,
    provisioningProfileCount: profileCount,
    appGroupEntitlementVerification: 'NOT_RUN',
  };
}

export function createReport({ ios, android, xcode, signing }) {
  const hasReadyDevice = ios.inventoryStatus === IOS_READY || android.inventoryStatus === ANDROID_READY;
  return {
    schemaVersion: 1,
    scope: 'read_only_physical_preflight_and_measurement_preparation',
    overallStatus: hasReadyDevice
      ? 'PHYSICAL_INVENTORY_HAS_READY_TARGET_MEASUREMENTS_NOT_RUN'
      : 'PHYSICAL_VALIDATION_NOT_READY',
    ios,
    android,
    xcode,
    appleSigning: signing,
    sourcePreparation: {
      status: 'PASS_SOURCE',
      physicalCheckCount: PHYSICAL_CHECKS.length,
      physicalChecks: PHYSICAL_CHECKS.map(id => ({ id, result: 'NOT_RUN', measurement: null })),
    },
    privacy: {
      deviceIdentifiersIncluded: false,
      deviceNamesIncluded: false,
      networkAddressesIncluded: false,
      filesystemPathsIncluded: false,
      healthSourceDataIncluded: false,
      rawProbeOutputIncluded: false,
    },
  };
}

function findProjectRoot(cwd) {
  const result = run('git', ['rev-parse', '--show-toplevel']);
  if (result.exitCode !== 0) throw new Error('The current directory must be inside the project Git worktree');
  const root = resolve(result.stdout.trim());
  const cwdRelative = relative(root, resolve(cwd));
  if (cwdRelative.startsWith(`..${sep}`) || cwdRelative === '..' || isAbsolute(cwdRelative)) {
    throw new Error('The current directory must be inside the project Git worktree');
  }
  return root;
}

/**
 * @param {string} projectRoot
 * @param {string} cwd
 * @param {string} suppliedPath
 * @param {(candidate: string) => boolean} ignoreChecker
 */
export function resolveIgnoredOutputPath(projectRoot, cwd, suppliedPath, ignoreChecker) {
  if (!suppliedPath || isAbsolute(suppliedPath) || !suppliedPath.endsWith('.json')) {
    throw new Error('--output must be a relative JSON path inside an ignored project directory');
  }
  const target = resolve(cwd, suppliedPath);
  const targetRelative = relative(projectRoot, target);
  if (!targetRelative || targetRelative.startsWith(`..${sep}`) || targetRelative === '..' || isAbsolute(targetRelative)) {
    throw new Error('--output must stay inside the project worktree');
  }
  let componentPath = projectRoot;
  for (const component of targetRelative.split(sep)) {
    componentPath = join(componentPath, component);
    try {
      if (lstatSync(componentPath).isSymbolicLink()) {
        throw new Error('--output must not contain symbolic links');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
      throw error;
    }
  }
  const realProjectRoot = realpathSync(projectRoot);
  let existingAncestor = target;
  while (!existsSync(existingAncestor)) {
    const parent = dirname(existingAncestor);
    if (parent === existingAncestor) throw new Error('--output parent could not be verified');
    existingAncestor = parent;
  }
  const realAncestor = realpathSync(existingAncestor);
  const realRelative = relative(realProjectRoot, realAncestor);
  if (realRelative.startsWith(`..${sep}`) || realRelative === '..' || isAbsolute(realRelative)) {
    throw new Error('--output must not escape the project through a symbolic link');
  }
  if (!ignoreChecker(targetRelative)) {
    throw new Error('--output must be ignored by the project Git rules');
  }
  return target;
}

/** @param {string} target @param {string} contents */
export function writePrivateJsonFile(target, contents) {
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC
    | (constants.O_NOFOLLOW ?? 0);
  const fileDescriptor = openSync(target, flags, 0o600);
  try {
    fchmodSync(fileDescriptor, 0o600);
    writeFileSync(fileDescriptor, contents, { encoding: 'utf8' });
  } finally {
    closeSync(fileDescriptor);
  }
}

function parseArguments(args) {
  if (args.length === 0) return { output: null };
  if (args.length === 2 && args[0] === '--output' && args[1]) return { output: args[1] };
  throw new Error('Usage: node scripts/check-physical-readiness.mjs [--output <ignored-project-relative.json>]');
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const adbCommand = findAdbCommand();
    const adbProbe = run(adbCommand, ['devices', '-l']);
    const report = createReport({
      ios: summarizeIosProbe(probeIosDevices()),
      android: summarizeAndroidProbe(adbProbe, serial => readAndroidProperties(adbCommand, serial)),
      xcode: probeXcodeEnvironment(),
      signing: probeAppleSigning(),
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.output) {
      const projectRoot = findProjectRoot(process.cwd());
      const target = resolveIgnoredOutputPath(projectRoot, process.cwd(), options.output, candidate => {
        const ignored = run('git', ['check-ignore', '--quiet', '--', candidate]);
        return ignored.exitCode === 0;
      });
      mkdirSync(dirname(target), { recursive: true });
      writePrivateJsonFile(target, json);
    } else {
      process.stdout.write(json);
    }
  } catch (error) {
    const safeMessages = [
      'Usage:', '--output ', 'The current directory must',
    ];
    const message = error instanceof Error && safeMessages.some(prefix => error.message.startsWith(prefix))
      ? error.message
      : 'Physical readiness check failed without writing a report';
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync, mkdtempSync, mkdirSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  PHYSICAL_CHECKS,
  classifyAndroidTargets,
  createReport,
  parseAdbDevicesOutput,
  parseIosDeviceCtlPayload,
  resolveIgnoredOutputPath,
  summarizeAndroidProbe,
  summarizeIosProbe,
  writePrivateJsonFile,
} from '../../scripts/check-physical-readiness.mjs';

test('missing tools stay distinct from an observed empty device inventory', () => {
  assert.deepEqual(summarizeIosProbe({ available: false, exitCode: null }), {
    toolStatus: 'MISSING',
    inventoryStatus: 'TOOL_MISSING',
    physicalDeviceCount: null,
    readyPhysicalDeviceCount: null,
  });
  assert.deepEqual(summarizeAndroidProbe({ available: false, exitCode: null }), {
    toolStatus: 'MISSING',
    inventoryStatus: 'TOOL_MISSING',
    targetCount: null,
    readyPhysicalDeviceCount: null,
  });

  const emptyIos = summarizeIosProbe({
    available: true,
    exitCode: 0,
    payload: { result: { devices: [] } },
  });
  assert.equal(emptyIos.inventoryStatus, 'NO_PHYSICAL_DEVICE');
  assert.equal(emptyIos.physicalDeviceCount, 0);

  const emptyAndroid = summarizeAndroidProbe({
    available: true,
    exitCode: 0,
    stdout: 'List of devices attached\n\n',
  });
  assert.equal(emptyAndroid.inventoryStatus, 'NO_TARGET');
  assert.equal(emptyAndroid.targetCount, 0);
});

test('iOS schema gaps are unverified and pairing alone never establishes readiness', () => {
  assert.equal(parseIosDeviceCtlPayload({ devices: [] }).schemaStatus, 'UNVERIFIED');
  assert.equal(parseIosDeviceCtlPayload({ result: { devices: [{}] } }).schemaStatus, 'UNVERIFIED');
  assert.equal(summarizeIosProbe({
    available: true,
    exitCode: 0,
    payload: { devices: [] },
  }).inventoryStatus, 'SCHEMA_UNVERIFIED');

  const pairedOnly = summarizeIosProbe({
    available: true,
    exitCode: 0,
    payload: {
      result: {
        devices: [{
          identifier: '00008110-SENSITIVE',
          deviceProperties: { name: 'Private Phone', bootState: 'booted', developerModeStatus: 'enabled' },
          hardwareProperties: { platform: 'iOS', deviceType: 'iPhone' },
          connectionProperties: {
            pairingState: 'paired',
            transportType: 'localNetwork',
            tunnelState: 'disconnected',
            potentialHostnames: ['private-phone.local'],
          },
        }],
      },
    },
  });
  assert.equal(pairedOnly.inventoryStatus, 'PHYSICAL_DEVICE_NOT_READY');
  assert.equal(pairedOnly.readyPhysicalDeviceCount, 0);
  assert.equal(pairedOnly.pairedButNotConnectedCount, 1);

  for (const connectionProperties of [
    { pairingState: 'paired', transportType: 'usb', isConnected: false },
    { pairingState: 'paired', transportType: 'wired', tunnelState: 'disconnected' },
  ]) {
    const explicitlyDisconnected = summarizeIosProbe({
      available: true,
      exitCode: 0,
      payload: {
        result: {
          devices: [{
            hardwareProperties: { platform: 'iOS' },
            deviceProperties: { bootState: 'booted', developerModeStatus: 'enabled' },
            connectionProperties,
          }],
        },
      },
    });
    assert.equal(explicitlyDisconnected.inventoryStatus, 'PHYSICAL_DEVICE_NOT_READY');
    assert.equal(explicitlyDisconnected.readyPhysicalDeviceCount, 0);
    assert.equal(explicitlyDisconnected.pairedButNotConnectedCount, 1);
  }

  const connected = summarizeIosProbe({
    available: true,
    exitCode: 0,
    payload: {
      result: {
        devices: [{
          hardwareProperties: { platform: 'iOS' },
          deviceProperties: { bootState: 'booted', developerModeStatus: 'enabled' },
          connectionProperties: { pairingState: 'paired', transportType: 'usb' },
        }],
      },
    },
  });
  assert.equal(connected.inventoryStatus, 'READY_PHYSICAL_DEVICE');
  assert.equal(connected.readyPhysicalDeviceCount, 1);
});

test('adb inventory separates unauthorized, offline, emulator, physical and unknown targets', () => {
  const parsed = parseAdbDevicesOutput([
    'List of devices attached',
    'physical-secret\tdevice product:private model:Private_Phone transport_id:1',
    'emulator-secret\tdevice product:sdk model:Virtual_Device transport_id:2',
    'unauthorized-secret\tunauthorized usb:3-1',
    'offline-secret\toffline transport_id:4',
    'mystery-secret\trecovery transport_id:5',
    '',
  ].join('\n'));
  const classified = classifyAndroidTargets(parsed, (serial: string) => {
    if (serial === 'emulator-secret') {
      return { status: 'READ', kernelQemu: '1', bootQemu: '', bootHardware: 'ranchu' };
    }
    return { status: 'READ', kernelQemu: '', bootQemu: '0', bootHardware: 'private-board-name' };
  });
  assert.deepEqual(classified, {
    schemaStatus: 'VERIFIED',
    targetCount: 5,
    readyPhysicalDeviceCount: 1,
    authorizedEmulatorCount: 1,
    unauthorizedCount: 1,
    offlineCount: 1,
    unknownStateCount: 1,
    classificationErrorCount: 0,
  });

  const summarized = summarizeAndroidProbe({
    available: true,
    exitCode: 0,
    stdout: 'List of devices attached\nemulator-secret\tdevice\n',
  }, () => ({ status: 'READ', kernelQemu: 'true', bootQemu: '', bootHardware: '' }));
  assert.equal(summarized.inventoryStatus, 'NO_READY_PHYSICAL_DEVICE');
  assert.equal(summarized.authorizedEmulatorCount, 1);

  const unknownProperties = summarizeAndroidProbe({
    available: true,
    exitCode: 0,
    stdout: 'List of devices attached\nunknown-secret\tdevice\n',
  }, () => ({ status: 'READ', kernelQemu: '', bootQemu: '', bootHardware: 'unknown' }));
  assert.equal(unknownProperties.inventoryStatus, 'NO_READY_PHYSICAL_DEVICE');
  assert.equal(unknownProperties.readyPhysicalDeviceCount, 0);
  assert.equal(unknownProperties.classificationErrorCount, 1);
});

test('unknown adb format remains unverified instead of reporting zero devices', () => {
  assert.equal(parseAdbDevicesOutput('unexpected output').schemaStatus, 'UNVERIFIED');
  const summary = summarizeAndroidProbe({
    available: true,
    exitCode: 0,
    stdout: 'unexpected output',
  });
  assert.equal(summary.inventoryStatus, 'SCHEMA_UNVERIFIED');
  assert.equal(summary.targetCount, null);
});

test('report redacts raw identity fields and leaves all physical measurements not run', () => {
  const ios = summarizeIosProbe({
    available: true,
    exitCode: 0,
    payload: {
      result: {
        devices: [{
          identifier: 'SECRET-IOS-ID',
          deviceProperties: { name: 'SECRET-NAME', bootState: 'booted', developerModeStatus: 'enabled' },
          hardwareProperties: { platform: 'iOS' },
          connectionProperties: { pairingState: 'paired', isConnected: true, address: '192.0.2.44' },
          rawHealth: { steps: 999 },
        }],
      },
    },
  });
  const report = createReport({
    ios,
    android: summarizeAndroidProbe({
      available: true,
      exitCode: 0,
      stdout: 'List of devices attached\nSECRET-ANDROID-ID\tunauthorized\n',
    }),
    xcode: { developerDirectorySelected: true, xcodeVersion: '26.3' },
    signing: { validCodeSigningIdentityCount: 0, provisioningProfileCount: 0 },
  });
  const serialized = JSON.stringify(report);
  for (const secret of [
    'SECRET-IOS-ID', 'SECRET-ANDROID-ID', 'SECRET-NAME', '192.0.2.44', 'rawHealth', 'private-phone.local',
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assert.equal(report.sourcePreparation.status, 'PASS_SOURCE');
  assert.equal(report.sourcePreparation.physicalCheckCount, 14);
  assert.deepEqual(report.sourcePreparation.physicalChecks.map(check => check.result),
    Array(PHYSICAL_CHECKS.length).fill('NOT_RUN'));
  assert.deepEqual(report.sourcePreparation.physicalChecks.map(check => check.measurement),
    Array(PHYSICAL_CHECKS.length).fill(null));
  assert.equal(serialized.includes('PASS_PHYSICAL_DEVICE'), false);
});

test('explicit output is accepted only for relative ignored JSON paths inside the project', () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arucon-output-guard-'));
  const projectRoot = path.join(fixtureRoot, 'project');
  const cwd = path.join(projectRoot, 'mobile');
  mkdirSync(path.join(cwd, 'evidence'), { recursive: true });
  try {
    const accepted = resolveIgnoredOutputPath(
      projectRoot,
      cwd,
      'evidence/physical/readiness.json',
      (candidate: string) => candidate === 'mobile/evidence/physical/readiness.json',
    );
    assert.equal(accepted, path.join(projectRoot, 'mobile/evidence/physical/readiness.json'));
    mkdirSync(path.dirname(accepted), { recursive: true });
    writeFileSync(accepted, 'old', { mode: 0o644 });
    chmodSync(accepted, 0o644);
    writePrivateJsonFile(accepted, '{"safe":true}\n');
    assert.equal(statSync(accepted).mode & 0o777, 0o600);
    assert.throws(
      () => resolveIgnoredOutputPath(projectRoot, cwd, 'readiness.json', () => false),
      /ignored by the project Git rules/u,
    );
    assert.throws(
      () => resolveIgnoredOutputPath(projectRoot, cwd, '../../outside.json', () => true),
      /inside the project worktree/u,
    );
    assert.throws(
      () => resolveIgnoredOutputPath(projectRoot, cwd, '/tmp/readiness.json', () => true),
      /relative JSON path/u,
    );

    const outside = path.join(fixtureRoot, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, path.join(cwd, 'linked-evidence'));
    assert.throws(
      () => resolveIgnoredOutputPath(projectRoot, cwd, 'linked-evidence/readiness.json', () => true),
      /symbolic link/u,
    );

    symlinkSync(path.join(fixtureRoot, 'missing', 'outside.json'), path.join(cwd, 'dangling-output.json'));
    assert.throws(
      () => resolveIgnoredOutputPath(projectRoot, cwd, 'dangling-output.json', () => true),
      /symbolic link/u,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

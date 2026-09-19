import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FailClosedNativeActivityProvider,
  FailClosedNativeSleepScoreProvider,
  NativeReadTimeoutError,
  type NativeHealthBridge,
  type NativeHealthAvailability,
  type NativeHealthScope,
  type NativeActivityAggregateRead,
  type NativeReadPermission,
  type NativeSleepScoreRead,
} from '../../src/native/health';
import type { GameDayWindow } from '../../src/activity/activityProvider';
import {
  ANDROID_HEALTH_CONNECT_SCAFFOLD,
  IOS_HEALTHKIT_SCAFFOLD,
  NATIVE_HEALTH_READ_DEFAULTS,
} from '../../src/native/platformDeclarations';

const day: GameDayWindow = { id: '2026-09-19', timezone: 'Asia/Seoul', startUtcMs: 1_000, endUtcMs: 10_000 };

class FakeHealthBridge implements NativeHealthBridge {
  calls: string[] = [];
  availability: NativeHealthAvailability = { status: 'available', platform: 'android' };
  permission: NativeReadPermission = 'authorized';
  activity: NativeActivityAggregateRead = {
    status: 'available',
    aggregate: {
      gameDay: day,
      providerId: 'health-connect',
      sourceRevision: 1,
      intervalStartUtcMs: 1_000,
      intervalEndUtcMs: 9_000,
      observedAtMs: 9_100,
      steps: 1_234,
      runningSteps: 0,
    },
  };

  async inspectAvailability(scope: NativeHealthScope) { this.calls.push(`availability:${scope}`); return this.availability; }
  async getReadPermission(scope: NativeHealthScope) { this.calls.push(`permission:${scope}`); return this.permission; }
  async requestReadPermission(scope: NativeHealthScope) { this.calls.push(`request:${scope}`); return this.permission; }
  async readActivityAggregate() { this.calls.push('read:activity'); return this.activity; }
  async readSleepScore(_gameDayId: string, _scorerVersion: string): Promise<NativeSleepScoreRead> {
    this.calls.push('read:sleep');
    return { status: 'valid', score: 70 };
  }
}

test('HS-01: native health reads are OFF by default and never touch the bridge', async () => {
  const bridge = new FakeHealthBridge();
  const activity = await new FailClosedNativeActivityProvider(bridge).read(day);
  const sleep = await new FailClosedNativeSleepScoreProvider(bridge).getScore(day.id);
  assert.equal(activity.status, 'unavailable');
  assert.deepEqual(sleep, { status: 'not_configured' });
  assert.deepEqual(bridge.calls, []);
  assert.deepEqual(NATIVE_HEALTH_READ_DEFAULTS, {
    activityReadEnabled: false, sleepReadEnabled: false, scorerVersion: null,
  });
});

test('FR-2: unsupported, not requested, denied and revoked permissions fail closed', async () => {
  const bridge = new FakeHealthBridge();
  const provider = new FailClosedNativeActivityProvider(bridge, { activityReadEnabled: true });
  bridge.availability = { status: 'unavailable', platform: 'android', reason: 'missing_service' };
  assert.equal((await provider.read(day)).status, 'unavailable');

  bridge.availability = { status: 'available', platform: 'android' };
  bridge.permission = 'not_requested';
  assert.equal((await provider.read(day)).status, 'permission_required');
  bridge.permission = 'denied';
  assert.equal((await provider.read(day)).status, 'denied');

  bridge.permission = 'authorized';
  assert.equal((await provider.read(day)).status, 'available');
  bridge.permission = 'denied';
  assert.equal((await provider.read(day)).status, 'denied', 'permission is checked again after revocation');
  assert.equal(bridge.calls.some(call => call.startsWith('request:')), false, 'reads never trigger a permission prompt');
});

test('FR-2: iOS unknown read authorization preserves an empty result instead of inventing denial or zero', async () => {
  const bridge = new FakeHealthBridge();
  bridge.availability = { status: 'available', platform: 'ios' };
  bridge.permission = 'unknown';
  bridge.activity = { status: 'empty', providerId: 'healthkit' };
  const result = await new FailClosedNativeActivityProvider(bridge, { activityReadEnabled: true }).read(day);
  assert.deepEqual(result, { status: 'empty', providerId: 'healthkit', gameDay: day });
});

test('FR-NF.1: native responses are reduced to aggregate and score allowlists', async () => {
  const bridge = new FakeHealthBridge();
  const aggregateWithRawSamples = {
    gameDay: day, providerId: 'health-connect', sourceRevision: 2,
    intervalStartUtcMs: 1_000, intervalEndUtcMs: 9_000, observedAtMs: 9_100,
    steps: 1_234, runningSteps: 0, rawSamples: [{ sourceId: 'private' }],
  };
  bridge.activity = {
    status: 'available', aggregate: aggregateWithRawSamples,
  } as NativeActivityAggregateRead;
  const activity = await new FailClosedNativeActivityProvider(bridge, { activityReadEnabled: true }).read(day);
  assert.equal(activity.status, 'available');
  if (activity.status !== 'available') assert.fail('activity must be available');
  assert.equal('rawSamples' in activity.aggregate, false);

  bridge.readSleepScore = async () => ({ status: 'valid', score: 70, rawSessions: ['private'] }) as NativeSleepScoreRead;
  const sleep = await new FailClosedNativeSleepScoreProvider(bridge, {
    sleepReadEnabled: true, sleepScorerVersion: 'approved-test-version',
  }).getScore(day.id);
  assert.deepEqual(sleep, { status: 'valid', score: 70 });
});

test('14-1: a delayed native query becomes an explicit error and a restarted adapter rechecks state', async () => {
  const bridge = new FakeHealthBridge();
  const timeout = async () => { throw new NativeReadTimeoutError(); };
  const delayed = new FailClosedNativeActivityProvider(bridge, { activityReadEnabled: true, deadlineRunner: timeout });
  assert.equal((await delayed.read(day)).status, 'error');

  bridge.permission = 'denied';
  const afterRestart = new FailClosedNativeActivityProvider(bridge, { activityReadEnabled: true });
  assert.equal((await afterRestart.read(day)).status, 'denied');
  assert.ok(bridge.calls.includes('permission:activity'));
});

test('DEC-05: sleep bridge stays unconfigured without both an enabled flag and approved scorer version', async () => {
  const bridge = new FakeHealthBridge();
  assert.deepEqual(
    await new FailClosedNativeSleepScoreProvider(bridge, { sleepReadEnabled: true }).getScore(day.id),
    { status: 'not_configured' },
  );
  assert.deepEqual(bridge.calls, []);
});

test('native declaration scaffold requests read-only minimums and no background access', () => {
  assert.equal(IOS_HEALTHKIT_SCAFFOLD.entitlement, 'com.apple.developer.healthkit');
  assert.deepEqual(IOS_HEALTHKIT_SCAFFOLD.writeTypes, []);
  assert.equal(IOS_HEALTHKIT_SCAFFOLD.backgroundDeliveryEnabled, false);
  assert.deepEqual(ANDROID_HEALTH_CONNECT_SCAFFOLD.writePermissions, []);
  assert.equal(ANDROID_HEALTH_CONNECT_SCAFFOLD.backgroundReadEnabled, false);
  assert.equal(ANDROID_HEALTH_CONNECT_SCAFFOLD.historicalReadEnabled, false);
  assert.deepEqual(ANDROID_HEALTH_CONNECT_SCAFFOLD.readPermissions, [
    'android.permission.health.READ_STEPS', 'android.permission.health.READ_SLEEP',
  ]);
});

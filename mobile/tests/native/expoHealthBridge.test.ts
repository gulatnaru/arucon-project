import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  AruconNativeHealthContract,
  AruconNativeHealthModule,
} from '../../native/arucon-health';
import { ExpoNativeHealthBridge } from '../../src/native/expoHealthBridge';

class FakeAruconHealthModule implements AruconNativeHealthModule {
  calls: string[] = [];
  contract: AruconNativeHealthContract = {
    contractVersion: 1,
    readMode: 'disabled',
    platform: 'ios',
  };

  async getContractAsync() {
    this.calls.push('contract');
    return this.contract;
  }

  async inspectAvailabilityAsync(scope: 'activity' | 'sleep') {
    this.calls.push(`availability:${scope}`);
    return { status: 'unavailable' as const, reason: 'native_read_disabled' as const };
  }

  async getReadPermissionAsync(scope: 'activity' | 'sleep') {
    this.calls.push(`permission:${scope}`);
    return 'not_requested' as const;
  }
}

test('native module bridge stays OFF and performs zero native calls by default', async () => {
  const nativeModule = new FakeAruconHealthModule();
  const bridge = new ExpoNativeHealthBridge({ nativeModule });

  assert.equal((await bridge.inspectAvailability('activity')).status, 'unavailable');
  assert.equal(await bridge.getReadPermission('activity'), 'not_requested');
  assert.equal(await bridge.requestReadPermission('activity'), 'not_requested');
  assert.equal((await bridge.readActivityAggregate({
    id: 'synthetic-day', timezone: 'UTC', startUtcMs: 0, endUtcMs: 1,
  })).status, 'error');
  assert.equal((await bridge.readSleepScore('synthetic-day', 'synthetic-scorer')).status, 'error');
  assert.deepEqual(nativeModule.calls, []);
});

test('explicit bridge gate only verifies the disabled native contract and never prompts or reads', async () => {
  const nativeModule = new FakeAruconHealthModule();
  const bridge = new ExpoNativeHealthBridge({ enabled: true, nativeModule });

  assert.deepEqual(await bridge.inspectAvailability('sleep'), {
    status: 'unavailable',
    platform: 'ios',
    reason: 'missing_service',
  });
  assert.equal(await bridge.getReadPermission('sleep'), 'not_requested');
  assert.equal(await bridge.requestReadPermission('sleep'), 'not_requested');
  assert.equal((await bridge.readSleepScore('synthetic-day', 'synthetic-scorer')).status, 'error');
  assert.deepEqual(nativeModule.calls, ['contract']);
});

test('missing, throwing, or invalid native contracts fail closed', async () => {
  const missing = new ExpoNativeHealthBridge({ enabled: true, nativeModule: null });
  assert.equal((await missing.inspectAvailability('activity')).status, 'unavailable');

  const throwing = new FakeAruconHealthModule();
  throwing.getContractAsync = async () => { throw new Error('synthetic native failure'); };
  assert.equal((await new ExpoNativeHealthBridge({ enabled: true, nativeModule: throwing })
    .inspectAvailability('activity')).status, 'unavailable');

  const invalid = new FakeAruconHealthModule();
  invalid.contract = { contractVersion: 1, readMode: 'enabled', platform: 'ios' } as unknown as AruconNativeHealthContract;
  assert.deepEqual(await new ExpoNativeHealthBridge({ enabled: true, nativeModule: invalid })
    .inspectAvailability('activity'), {
    status: 'unavailable', platform: 'android', reason: 'missing_service',
  });
});

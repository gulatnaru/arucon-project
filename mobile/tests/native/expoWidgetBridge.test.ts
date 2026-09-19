import test from 'node:test';
import assert from 'node:assert/strict';
import type { AruconNativeWidgetModule } from '../../native/arucon-widget';
import { ExpoNativeWidgetBridge } from '../../src/native/expoWidgetBridge';
import { FailClosedNativeWidgetAdapter } from '../../src/native/widget';
import type { PetProjection } from '../../src/widget';

const projection: PetProjection = {
  petId: 'synthetic-pet',
  stateRevision: 7,
  updatedAtMs: 1234,
  formId: 'arucon',
  personalityProfileId: 'synthetic-profile',
  displayState: 'awake',
};

class FakeWidgetModule implements AruconNativeWidgetModule {
  calls: string[] = [];
  snapshotJson: string | null = JSON.stringify(projection);
  reloadResult: 'requested' | 'deferred' = 'requested';

  async replaceSnapshotJsonAsync(snapshotJson: string) {
    this.calls.push('replace');
    this.snapshotJson = snapshotJson;
  }

  async readSnapshotJsonAsync() {
    this.calls.push('read');
    return this.snapshotJson;
  }

  async requestTimelineReloadAsync() {
    this.calls.push('reload');
    return this.reloadResult;
  }
}

test('build-linked widget bridge stays OFF with zero native calls by default', async () => {
  const module = new FakeWidgetModule();
  const bridge = new ExpoNativeWidgetBridge({ nativeModule: module });
  assert.deepEqual(await bridge.readSnapshot(), { status: 'unsupported' });
  assert.equal(await bridge.requestTimelineReload(), 'unsupported');
  assert.deepEqual(await new FailClosedNativeWidgetAdapter(bridge).read(), { status: 'unsupported' });
  assert.deepEqual(module.calls, []);
});

test('enabled bridge publishes exactly six fields and requests only an OS reload', async () => {
  const module = new FakeWidgetModule();
  const bridge = new ExpoNativeWidgetBridge({ enabled: true, nativeModule: module });
  const adapter = new FailClosedNativeWidgetAdapter(bridge, true);
  assert.equal(await adapter.publish({ ...projection, coin: 999 } as PetProjection), 'requested');
  assert.deepEqual(module.calls, ['replace', 'reload']);
  assert.deepEqual(Object.keys(JSON.parse(module.snapshotJson!)).sort(), [
    'displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs',
  ]);
  assert.deepEqual(await adapter.read(), { status: 'ready', projection });
});

test('missing, malformed and failed native snapshots remain explicit non-ready states', async () => {
  const module = new FakeWidgetModule();
  const bridge = new ExpoNativeWidgetBridge({ enabled: true, nativeModule: module });
  module.snapshotJson = null;
  assert.deepEqual(await bridge.readSnapshot(), { status: 'missing' });
  module.snapshotJson = JSON.stringify({ ...projection, rawHealth: true });
  assert.deepEqual(await bridge.readSnapshot(), { status: 'error' });
  module.readSnapshotJsonAsync = async () => { throw new Error('synthetic native failure'); };
  assert.deepEqual(await bridge.readSnapshot(), { status: 'error' });
});

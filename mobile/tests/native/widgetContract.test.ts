import test from 'node:test';
import assert from 'node:assert/strict';
import { FailClosedNativeWidgetAdapter, type NativeWidgetBridge } from '../../src/native/widget';
import type { PetProjection, WidgetSnapshotRead } from '../../src/widget';

const projection: PetProjection = {
  petId: 'pet-1', stateRevision: 4, updatedAtMs: 1_000, formId: 'arucon',
  personalityProfileId: 'reserved', displayState: 'awake',
} as const;

class FakeWidgetBridge implements NativeWidgetBridge {
  calls: string[] = [];
  written: unknown;
  readResult: WidgetSnapshotRead = { status: 'ready', projection };
  async readSnapshot() { this.calls.push('read'); return this.readResult; }
  async replaceSnapshot(snapshot: PetProjection) { this.calls.push('replace'); this.written = snapshot; }
  async requestTimelineReload() { this.calls.push('reload'); return 'requested' as const; }
}

test('FR-12: native widget access is OFF by default', async () => {
  const bridge = new FakeWidgetBridge();
  const adapter = new FailClosedNativeWidgetAdapter(bridge);
  assert.deepEqual(await adapter.read(), { status: 'unsupported' });
  assert.equal(await adapter.publish(projection), 'unsupported');
  assert.deepEqual(bridge.calls, []);
});

test('FR-12: publishing strips economic and health fields and only requests an OS reload', async () => {
  const bridge = new FakeWidgetBridge();
  const adapter = new FailClosedNativeWidgetAdapter(bridge, true);
  const unsafeProjection = { ...projection, food: 99, coin: 99, totalExpUnits: 999, rawHealth: ['secret'] };
  assert.equal(await adapter.publish(unsafeProjection), 'requested');
  assert.deepEqual(bridge.calls, ['replace', 'reload']);
  assert.deepEqual(Object.keys(bridge.written as object).sort(), [
    'displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs',
  ]);
});

test('FR-12: read and reload paths expose no game command and do not create resources', async () => {
  const bridge = new FakeWidgetBridge();
  bridge.readResult = {
    status: 'ready',
    projection: { ...projection, food: 99, rawHealth: ['private'] } as PetProjection,
  };
  const adapter = new FailClosedNativeWidgetAdapter(bridge, true);
  const read = await adapter.read();
  assert.deepEqual(read, { status: 'ready', projection });
  assert.deepEqual(bridge.calls, ['read']);
  assert.equal('commandId' in read, false);
  if (read.status !== 'ready') assert.fail('widget must be ready');
  assert.equal('food' in read.projection, false);
  assert.equal('rawHealth' in read.projection, false);
});

test('FR-12: native widget failures remain display errors', async () => {
  const bridge = new FakeWidgetBridge();
  bridge.readSnapshot = async () => { throw new Error('native failure'); };
  bridge.replaceSnapshot = async () => { throw new Error('shared storage failure'); };
  const adapter = new FailClosedNativeWidgetAdapter(bridge, true);
  assert.deepEqual(await adapter.read(), { status: 'error' });
  assert.equal(await adapter.publish(projection), 'error');
});

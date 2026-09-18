import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPet } from '../../src/domain/model';
import { DEV_GAME_CONFIG } from '../../src/domain/config';
import { projectPetForWidget, widgetView, type WidgetSnapshotReader } from '../../src/widget/index';

test('AT-WIDGET-02/AT-HOME-03/06: projection allowlists display fields and emits only open-app action', async () => {
  const pet = initialPet('pet-1', '말루', 'profile-1', 100, DEV_GAME_CONFIG);
  pet.coin = 123;
  pet.food = 12;
  pet.totalExpUnits = 999;
  const original = JSON.stringify(pet);
  const projection = projectPetForWidget(pet, 200);
  assert.deepEqual(Object.keys(projection).sort(), [
    'displayState', 'formId', 'personalityProfileId', 'petId', 'stateRevision', 'updatedAtMs',
  ]);
  assert.equal(JSON.stringify(projection).includes('123'), false);
  const reader: WidgetSnapshotReader = { async read() { return { status: 'ready', projection }; } };
  const view = widgetView(await reader.read(), 250, 100);
  assert.deepEqual(view.action, { type: 'open_app' });
  assert.equal(JSON.stringify(pet), original);
});

test('AT-WIDGET-01/AT-HOME-05: stale, absent and failed reads show checked time or app fallback', () => {
  const projection = projectPetForWidget(initialPet('pet-1', '말루', 'profile-1', 100, DEV_GAME_CONFIG), 200);
  const stale = widgetView({ status: 'ready', projection }, 301, 100);
  assert.equal(stale.status, 'stale');
  assert.equal(stale.lastUpdatedAtMs, 200);
  assert.match(stale.stateText, /마지막 확인/);
  assert.equal(widgetView({ status: 'ready', projection }, 300, 100).status, 'ready');
  assert.equal(widgetView({ status: 'missing' }, 301, 100).stateText, '앱에서 확인');
  assert.equal(widgetView({ status: 'unsupported' }, 301, 100).status, 'unsupported');
  const failed = widgetView({ status: 'error', lastKnownProjection: projection }, 301, 100);
  assert.equal(failed.status, 'error');
  assert.equal(failed.lastUpdatedAtMs, 200);
  assert.match(failed.stateText, /마지막 확인/);
});

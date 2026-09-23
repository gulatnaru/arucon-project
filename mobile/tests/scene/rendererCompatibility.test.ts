import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { roomRenderSurfaceScale, selectRoomRendererConfig } from '../../src/scene/rendererConfig';

const here = dirname(fileURLToPath(import.meta.url));

test('development renderer profile bounds Simulator fragment work without changing release quality', () => {
  const roomView = readFileSync(resolve(here, '../../src/scene/AruconRoom.tsx'), 'utf8');
  const controller = readFileSync(resolve(here, '../../src/scene/RoomController.ts'), 'utf8');

  assert.deepEqual(selectRoomRendererConfig(true), {
    msaaSamples: 0,
    contextAntialias: false,
    maxPixelRatio: 1.65,
    roomMaterial: 'lambert',
  });
  assert.deepEqual(selectRoomRendererConfig(false), {
    msaaSamples: 4,
    contextAntialias: true,
    maxPixelRatio: Number.POSITIVE_INFINITY,
    roomMaterial: 'standard',
  });
  assert.ok(Math.abs(roomRenderSurfaceScale(3, 1.65) - 0.55) < Number.EPSILON);
  assert.equal(roomRenderSurfaceScale(1, 1.65), 1);
  assert.equal(roomRenderSurfaceScale(Number.NaN, 1.65), 1);
  assert.match(roomView, /roomRenderSurfaceScale\(PixelRatio\.get\(\), RENDERER_CONFIG\.maxPixelRatio\)/u);
  assert.match(roomView, /msaaSamples=\{RENDERER_CONFIG\.msaaSamples\}/u);
  assert.match(controller, /new THREE\.MeshLambertMaterial/u);
});

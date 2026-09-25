import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  roomFrameSubmissionIntervalMs,
  roomRenderSurfaceScale,
  selectRoomRendererConfig,
} from '../../src/scene/rendererConfig';

const here = dirname(fileURLToPath(import.meta.url));

test('development and release renderer profiles share the measured bounded fragment budget', () => {
  const roomView = readFileSync(resolve(here, '../../src/scene/AruconRoom.tsx'), 'utf8');
  const controller = readFileSync(resolve(here, '../../src/scene/RoomController.ts'), 'utf8');

  assert.deepEqual(selectRoomRendererConfig(true), {
    msaaSamples: 0,
    contextAntialias: false,
    maxPixelRatio: 1.65,
    roomMaterial: 'lambert',
  });
  assert.deepEqual(selectRoomRendererConfig(false), {
    msaaSamples: 0,
    contextAntialias: false,
    maxPixelRatio: 1.65,
    roomMaterial: 'lambert',
  });
  assert.ok(Math.abs(roomRenderSurfaceScale(3, 1.65) - 0.55) < Number.EPSILON);
  assert.equal(roomRenderSurfaceScale(1, 1.65), 1);
  assert.equal(roomRenderSurfaceScale(Number.NaN, 1.65), 1);
  assert.match(roomView, /roomRenderSurfaceScale\(PixelRatio\.get\(\), RENDERER_CONFIG\.maxPixelRatio\)/u);
  assert.match(roomView, /msaaSamples=\{RENDERER_CONFIG\.msaaSamples\}/u);
  assert.match(roomView, /sizeRef\.current = nextSize;[\s\S]*?setSize\(nextSize\)/u);
  assert.match(roomView, /new RoomController\(gl, currentSize\.width, currentSize\.height/u);
  assert.match(roomView, /controller\.current\?\.resize\(size\.width, size\.height\)/u);
  assert.match(controller, /new THREE\.MeshLambertMaterial/u);
});

test('only the iOS Apple Software Renderer uses the throttled Expo GL submission cadence', () => {
  const softwareRenderer = {
    renderer: 'Apple Software Renderer',
    vendor: 'Apple Inc.',
    version: 'OpenGL ES 3.0 APPLE-23.0.2',
  };
  const physicalRenderer = {
    renderer: 'Apple GPU',
    vendor: 'Apple Inc.',
    version: 'OpenGL ES 3.0 APPLE-23.0.2',
  };
  assert.equal(roomFrameSubmissionIntervalMs('ios', softwareRenderer), 333);
  assert.equal(roomFrameSubmissionIntervalMs('ios', physicalRenderer), 0);
  assert.equal(roomFrameSubmissionIntervalMs('android', softwareRenderer), 0);
  assert.equal(roomFrameSubmissionIntervalMs('ios'), 0);
});

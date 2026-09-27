import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  roomFrameSubmissionIntervalMs,
  roomRenderSurfaceScale,
  resolveRoomRendererProfile,
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
    petMaterial: 'source',
  });
  assert.deepEqual(selectRoomRendererConfig(false), {
    msaaSamples: 0,
    contextAntialias: false,
    maxPixelRatio: 1.65,
    roomMaterial: 'lambert',
    petMaterial: 'source',
  });
  assert.ok(Math.abs(roomRenderSurfaceScale(3, 1.65) - 0.55) < Number.EPSILON);
  assert.equal(roomRenderSurfaceScale(1, 1.65), 1);
  assert.equal(roomRenderSurfaceScale(Number.NaN, 1.65), 1);
  assert.match(roomView, /roomRenderSurfaceScale\(PixelRatio\.get\(\), rendererConfig\.maxPixelRatio\)/u);
  assert.match(roomView, /msaaSamples=\{rendererConfig\.msaaSamples\}/u);
  assert.match(roomView, /sizeRef\.current = nextSize;[\s\S]*?setSize\(nextSize\)/u);
  assert.match(roomView, /new RoomController\(gl, currentSize\.width, currentSize\.height/u);
  assert.match(roomView, /controller\.current\?\.resize\(size\.width, size\.height\)/u);
  assert.match(controller, /new THREE\.MeshLambertMaterial/u);
});

test('software renderer comparison profiles preserve the legacy baseline and expose the measured 33ms candidate', () => {
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
  assert.equal(roomFrameSubmissionIntervalMs('ios', softwareRenderer), 33);
  assert.equal(roomFrameSubmissionIntervalMs('ios', physicalRenderer), 0);
  assert.equal(roomFrameSubmissionIntervalMs('android', softwareRenderer), 0);
  assert.equal(roomFrameSubmissionIntervalMs('ios'), 0);
  assert.deepEqual(resolveRoomRendererProfile('automatic', false, 'ios', softwareRenderer), {
    id: 'software_low_resolution', msaaSamples: 0, contextAntialias: false,
    maxPixelRatio: 0.75, roomMaterial: 'lambert', petMaterial: 'lambert', submissionIntervalMs: 33,
  });
  assert.deepEqual(resolveRoomRendererProfile('software_legacy_333', true, 'ios', softwareRenderer), {
    id: 'software_legacy_333', msaaSamples: 0, contextAntialias: false,
    maxPixelRatio: 1.65, roomMaterial: 'lambert', petMaterial: 'source', submissionIntervalMs: 333,
  });
  assert.deepEqual(resolveRoomRendererProfile('software_low_resolution', true, 'ios', softwareRenderer), {
    id: 'software_low_resolution', msaaSamples: 0, contextAntialias: false,
    maxPixelRatio: 0.75, roomMaterial: 'lambert', petMaterial: 'lambert', submissionIntervalMs: 33,
  });
  assert.equal(resolveRoomRendererProfile('software_low_resolution', true, 'ios', physicalRenderer).submissionIntervalMs, 0);
});

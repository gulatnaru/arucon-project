import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseGlb } from '../../src/scene/gltfRuntime';

const here = dirname(fileURLToPath(import.meta.url));

test('product GLB parses when the React Native navigator has no userAgent', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const reactNativeNavigator = { product: 'ReactNative' };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: reactNativeNavigator });

  try {
    const bytes = await readFile(resolve(here, '../../assets/arucon_tsundere_motion.glb'));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const gltf = await parseGlb(data);

    assert.ok(gltf.scene.children.length > 0);
    assert.equal(gltf.animations.length, 15);
    assert.equal(Object.hasOwn(reactNativeNavigator, 'userAgent'), false);
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { comparisonCameraYaw } from '../../src/scene/presentationBridge';

const here = dirname(fileURLToPath(import.meta.url));

function centerOf(root: THREE.Object3D, name: string): THREE.Vector3 {
  const node = root.getObjectByName(name);
  assert.ok(node, `missing ${name}`);
  return new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
}

test('comparison front follows the authored face geometry toward the positive-Z room camera', async () => {
  const bytes = readFileSync(resolve(here, '../../assets/arucon_tsundere_motion.glb'));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const { scene } = await parseGlb(data);
  scene.updateMatrixWorld(true);
  const body = centerOf(scene, 'Body');
  const face = ['Eye_L', 'Eye_R', 'Mouth']
    .map(name => centerOf(scene, name))
    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
    .multiplyScalar(1 / 3);
  const authoredFaceDirection = face.clone().sub(body).setY(0).normalize();
  const roomCameraDirection = new THREE.Vector3(0, 0, 1);
  assert.ok(authoredFaceDirection.dot(roomCameraDirection) > 0);
  assert.equal(comparisonCameraYaw('front'), 0);
  assert.equal(comparisonCameraYaw('back'), Math.PI);
  assert.ok(authoredFaceDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), comparisonCameraYaw('front')).dot(roomCameraDirection) > 0);
  assert.ok(authoredFaceDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), comparisonCameraYaw('back')).dot(roomCameraDirection) < 0);
});

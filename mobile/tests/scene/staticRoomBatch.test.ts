import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticRoom } from '../../src/scene/staticRoomBatch';

test('static room batching retains triangles, world positions and linear material colors', () => {
  const parent = new THREE.Group(); parent.position.set(3, 1, 2);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: 0xdca28c }));
  box.position.x = 2; parent.add(box);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.4, 12, 8), new THREE.MeshLambertMaterial({ color: 0xaabbcc }));
  const batch = batchStaticRoom([parent, sphere], 'lambert');
  assert.equal(batch.geometry.index!.count, box.geometry.index!.count + sphere.geometry.index!.count);
  const positions = batch.geometry.getAttribute('position');
  const vertex = new THREE.Vector3().fromBufferAttribute(box.geometry.getAttribute('position'), 0).applyMatrix4(box.matrixWorld);
  assert.equal(positions.getX(0), vertex.x); assert.equal(positions.getY(0), vertex.y); assert.equal(positions.getZ(0), vertex.z);
  const colors = batch.geometry.getAttribute('color');
  assert.ok(Math.abs(colors.getX(0) - box.material.color.r) < 1e-6);
  assert.equal(parent.children[0], box, 'batch preparation does not dispose or remove caller objects');
});

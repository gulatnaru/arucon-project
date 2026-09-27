import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { applyPetMaterialProfile } from '../../src/scene/rendererMaterials';

test('software material profile preserves GLB geometry, morph data and visible material properties', () => {
  const geometry = new THREE.BoxGeometry();
  geometry.morphAttributes.position = [geometry.attributes.position.clone()];
  const map = new THREE.Texture();
  const source = new THREE.MeshStandardMaterial({ color: 0xc9b28d, map, transparent: true, opacity: 0.8 });
  let disposed = 0;
  source.addEventListener('dispose', () => { disposed++; });
  const mesh = new THREE.Mesh(geometry, source);
  const root = new THREE.Group(); root.add(mesh);

  applyPetMaterialProfile(root, 'lambert');

  assert.ok(mesh.material instanceof THREE.MeshLambertMaterial);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.geometry.morphAttributes.position.length, 1);
  assert.equal(mesh.material.map, map);
  assert.equal(mesh.material.color.getHex(), 0xc9b28d);
  assert.equal(mesh.material.transparent, true);
  assert.equal(mesh.material.opacity, 0.8);
  assert.equal(disposed, 1);
});

test('source material profile is a no-op for the legacy comparison', () => {
  const source = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), source);
  applyPetMaterialProfile(mesh, 'source');
  assert.equal(mesh.material, source);
});

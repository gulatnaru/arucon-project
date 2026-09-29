import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { prepareCpuMorphs } from '../../src/scene/cpuMorph';
import { createMorphedAnchor } from '../../src/scene/morphedAnchor';

test('the meal anchor follows actual posed mouth vertices for every form after CPU morph conversion', async () => {
  for (const form of ['baby_v3', 'mallu', 'mono', 'piko', 'mongle']) {
    const bytes = readFileSync(resolve(import.meta.dirname, `../../assets/living-characters/${form}.glb`));
    const model = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const mouth = model.scene.getObjectByName('Mouth') as THREE.Mesh;
    const anchor = createMorphedAnchor(mouth);
    const update = prepareCpuMorphs(model.scene);
    model.scene.scale.setScalar(.62 * 1.1);
    model.scene.rotation.set(.13, 1.57, 0);
    model.scene.position.set(.4, .03, 1.2);
    const mixer = new THREE.AnimationMixer(model.scene);
    mixer.clipAction(model.animations.find(clip => clip.name === 'eat')!).play();
    for (let i = 0; i < 8; i++) {
      mixer.update(.27); update(); model.scene.updateMatrixWorld(true);
      const actual = new THREE.Vector3();
      const vertices = mouth.geometry.getAttribute('position');
      for (let j = 0; j < vertices.count; j++) actual.add(new THREE.Vector3().fromBufferAttribute(vertices, j).applyMatrix4(mouth.matrixWorld));
      actual.divideScalar(vertices.count);
      assert.ok(actual.distanceTo(anchor()) < 1e-6, `${form}: morsel must end at the visible, deformed mouth`);
    }
  }
});

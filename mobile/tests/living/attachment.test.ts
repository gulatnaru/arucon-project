import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';

async function model(path: string) {
  const bytes = readFileSync(resolve(import.meta.dirname, '../../assets', path));
  return parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
function points(mesh: THREE.Mesh) {
  const base = mesh.geometry.getAttribute('position');
  return Array.from({ length: base.count }, (_, index) => {
    const point = new THREE.Vector3().fromBufferAttribute(base, index);
    for (let t = 0; t < (mesh.morphTargetInfluences?.length ?? 0); t++) {
      const weight = mesh.morphTargetInfluences![t];
      if (!weight) continue;
      const delta = mesh.geometry.morphAttributes.position[t];
      point.x += delta.getX(index) * weight; point.y += delta.getY(index) * weight; point.z += delta.getZ(index) * weight;
    }
    return point;
  });
}

test('all draft ear roots remain inside the posed body section through idle, eating, walking and petting', async () => {
  const source = await model('arucon_tsundere_motion.glb');
  const roots = Object.fromEntries(['Ear_L', 'Ear_R'].map(name => [name,
    points(source.scene.getObjectByName(name) as THREE.Mesh).flatMap((p, i) => p.y >= 1.7 && Math.abs(p.x) <= .85 ? [i] : [])]));
  for (const id of ['baby_v3', 'mallu', 'mono', 'piko', 'mongle']) {
    const loaded = await model(`living-characters/${id}.glb`);
    const mixer = new THREE.AnimationMixer(loaded.scene);
    for (const clip of ['idle_reserved', 'walk', 'eat', 'pet_reserved', 'pet_expressive']) {
      for (const at of [0, .3, .7, 1.1, 1.5]) {
        mixer.stopAllAction(); const action = mixer.clipAction(loaded.animations.find(x => x.name === clip)!); action.reset().play(); mixer.update(at);
        const body = points(loaded.scene.getObjectByName('Body') as THREE.Mesh);
        for (const name of ['Ear_L', 'Ear_R']) {
          const ear = points(loaded.scene.getObjectByName(name) as THREE.Mesh);
          const root = roots[name].reduce((sum, i) => sum.add(ear[i]), new THREE.Vector3()).divideScalar(roots[name].length);
          const section = body.filter(p => Math.abs(p.y - root.y) < .10);
          assert.ok(section.length, `${id}/${clip}/${at}/${name}: no body at root height`);
          const minX = Math.min(...section.map(p => p.x)), maxX = Math.max(...section.map(p => p.x));
          const minZ = Math.min(...section.map(p => p.z)), maxZ = Math.max(...section.map(p => p.z));
          assert.ok(root.x >= minX && root.x <= maxX && root.z >= minZ && root.z <= maxZ,
            `${id}/${clip}/${at}/${name}: detached root ${root.toArray()} section ${minX},${maxX},${minZ},${maxZ}`);
        }
      }
    }
  }
});

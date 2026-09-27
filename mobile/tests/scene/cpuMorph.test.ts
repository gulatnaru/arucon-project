import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { prepareCpuMorphs } from '../../src/scene/cpuMorph';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGlb } from '../../src/scene/gltfRuntime';

for (const relative of [true, false]) test(`CPU morph matches GPU weighted sum (relative=${relative}) without losing animation bindings`, () => {
  const geometry = new THREE.BufferGeometry();
  const base = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const a = [0, .2, 0, .1, .3, 0, 0, .5, .2];
  const b = [.1, 0, 0, 0, .4, .2, 0, 0, .3];
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(base, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1], 3));
  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(a, 3), new THREE.Float32BufferAttribute(b, 3)];
  geometry.morphAttributes.normal = [new THREE.Float32BufferAttribute(a, 3), new THREE.Float32BufferAttribute(b, 3)];
  geometry.morphTargetsRelative = relative;
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
  const root = new THREE.Group(); root.add(mesh);
  const weights = mesh.morphTargetInfluences!;
  const bake = prepareCpuMorphs(root);
  assert.equal(mesh.morphTargetInfluences, weights);
  assert.deepEqual(geometry.morphAttributes, {});
  for (const [w0, w1] of [[0, 0], [.3, .8], [1, 0], [-.2, .4], [0, 0]]) {
    weights[0] = w0; weights[1] = w1; bake();
    const actual = geometry.getAttribute('position');
    for (let i = 0; i < base.length; i++) {
      const expected = base[i] * (relative ? 1 : 1-w0-w1) + a[i]*w0 + b[i]*w1;
      assert.ok(Math.abs(actual.array[i]-expected)<1e-6);
    }
    const version = (actual as THREE.BufferAttribute).version;
    bake(); assert.equal((actual as THREE.BufferAttribute).version, version, 'unchanged pose must not upload again');
  }
  geometry.dispose(); (mesh.material as THREE.Material).dispose();
});

test('original and both candidate GLBs retain their animated morph equations on software GL', async () => {
  for (const file of ['arucon_tsundere_motion.glb', 'character-candidates/arucon_v2_moderate.glb', 'character-candidates/arucon_v2_plump.glb']) {
    const bytes = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../assets', file));
    const data = new Uint8Array(bytes.length); data.set(bytes);
    const gltf = await parseGlb(data.buffer);
    const references: { mesh: THREE.Mesh; base: Float32Array; targets: THREE.BufferAttribute[] }[] = [];
    gltf.scene.traverse(node => {
      if (node instanceof THREE.Mesh && node.geometry.morphAttributes.position?.length) references.push({mesh:node,
        base:Float32Array.from(node.geometry.getAttribute('position').array), targets:node.geometry.morphAttributes.position as THREE.BufferAttribute[]});
    });
    assert.equal(references.length,14);
    const bake=prepareCpuMorphs(gltf.scene);
    const mixer=new THREE.AnimationMixer(gltf.scene);
    for (const name of ['idle_reserved','walk','pet_reserved','pet_expressive','tsundere_touch','honest_touch']) {
      mixer.stopAllAction(); mixer.clipAction(gltf.animations.find(clip=>clip.name===name)!).play();
      mixer.update(.25); bake();
      for (const {mesh,base,targets} of references) for (let i=0;i<base.length;i+=3) {
        const expected=targets.reduce((v,target,t)=>v+target.array[i]*(mesh.morphTargetInfluences![t]??0),base[i]);
        assert.ok(Math.abs(mesh.geometry.getAttribute('position').array[i]-expected)<2e-6,`${file}/${name}/${mesh.name}/${i}`);
      }
    }
    mixer.stopAllAction();
    gltf.scene.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry.dispose();const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach(m=>m.dispose());}});
  }
});

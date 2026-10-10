import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { BlenderBabyRig } from '../../src/reboot/blenderRig';
import { BabyGaitRig } from '../../src/reboot/babyGait';
test('one common Blender asset actually has four skinned paws, single horn and gait clips, independent of personality',async()=>{
 const b=await readFile(new NodeURL('../../assets/reboot-04/common-quad.glb',import.meta.url));const g=await parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)as ArrayBuffer);
 assert.ok(g.scene.getObjectByName('PearlHorn'));for(const n of ['PawL','PawR','PawBackL','PawBackR'])assert.ok(g.scene.getObjectByName(n)instanceof THREE.Bone,n);
 const bridge=new BlenderBabyRig(g.scene,true),scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.add(g.scene);const gait=new BabyGaitRig(g.scene,scene);assert.equal(gait.gait.feet.length,4);
 for(const name of ['walk','baby_hop','baby_stop','baby_release','sleep'])assert.ok(g.animations.some(a=>a.name===name),name);
 for(let i=0;i<90;i++){gait.apply(root,{position:{x:0,z:i*.01},facing:0,scale:1,dt:.016,moving:true,reduced:false},true);bridge.apply();g.scene.traverse(n=>assert.ok(n.position.toArray().every(Number.isFinite)));}
 g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh){const w=n.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<.01);}});gait.dispose();
});

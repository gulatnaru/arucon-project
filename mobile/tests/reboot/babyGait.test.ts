import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BabyGait, BabyGaitRig, babyGroundHeight } from '../../src/reboot/babyGait';
import { resolveRoomRendererProfile } from '../../src/scene/rendererConfig';

test('support feet stay at their floor coordinates while travel advances; swings alternate and stop settles', () => {
  for (const hz of [30,60,120]) {
    const gait=new BabyGait(); let z=0, plantedChecks=0, last=gait.feet.map(f=>({...f}));
    for(let i=0;i<hz*3;i++) {
      z+=1.3/hz;gait.update({position:{x:0,z},facing:0,scale:.6625,dt:1/hz,moving:true,reduced:false});
      gait.feet.forEach((foot,k)=>{if(i>1&&foot.planted&&last[k].planted){assert.ok(Math.hypot(foot.x-last[k].x,foot.z-last[k].z)<1e-8);plantedChecks++;}assert.ok(foot.y>=0);});
      assert.ok(gait.feet.some(f=>f.planted));last=gait.feet.map(f=>({...f}));
    }
    assert.ok(plantedChecks>hz);
    for(let i=0;i<hz;i++) {
      last=gait.feet.map(f=>({...f}));gait.update({position:{x:0,z},facing:0,scale:.6625,dt:1/hz,moving:false,reduced:false});
      gait.feet.forEach((foot,k)=>{if(foot.planted&&last[k].planted)assert.ok(Math.hypot(foot.x-last[k].x,foot.z-last[k].z)<1e-8,'a supporting foot slid during stop');});
    }
    assert.equal(gait.active,false);assert.ok(gait.feet.every(f=>f.y===0));assert.equal(gait.height,0);
  }
});

test('a hop has anticipation, flight and grounded landing; reduced motion still lands', () => {
  for (const reduced of [false,true]) {
    const g=new BabyGait();const heights:number[]=[],compression:number[]=[];
    for(let i=0;i<=100;i++){g.update({position:{x:0,z:1.8},facing:0,scale:.7155,dt:1/60,moving:false,reduced,hop:i/100});heights.push(g.height);compression.push(g.compression);}
    assert.ok(Math.max(...heights)>.025);assert.equal(heights[100],0);assert.ok(Math.max(...compression)>.015);
    assert.ok(g.feet.every(f=>f.planted&&f.y===0));
  }
});

test('contact height follows the existing raised rug instead of hiding shadows under it',()=>{
  assert.equal(babyGroundHeight(0,1.7),.052);
  assert.ok(babyGroundHeight(2.60,1.7)>.015);
  assert.equal(babyGroundHeight(3.2,1.7),-.02);
});

test('new review GLB has two connected paws, real alternating walk tracks and finite smooth geometry', async()=>{
  const bytes=await readFile(new NodeURL('../../assets/reboot-02/baby-gait.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
  assert.ok(gltf.scene.getObjectByName('Foot_L_Front'));assert.ok(gltf.scene.getObjectByName('Foot_R_Front'));
  assert.equal(gltf.scene.getObjectByName('Foot_L_Back'),undefined);assert.equal(gltf.scene.getObjectByName('Foot_R_Back'),undefined);
  const walk=gltf.animations.find(c=>c.name==='walk')!;assert.ok(walk.tracks.some(t=>t.name.includes('Foot_L_Front')));assert.ok(walk.tracks.some(t=>t.name.includes('Foot_R_Front')));assert.ok(!walk.tracks.some(t=>t.name.endsWith('.scale')));
  gltf.scene.traverse(node=>{if(node instanceof THREE.Mesh){for(const name of ['position','normal'])assert.ok(Array.from(node.geometry.attributes[name].array).every(Number.isFinite));}});
  const orientation=new THREE.Group(),scene=new THREE.Scene();scene.add(orientation);orientation.add(gltf.scene);gltf.scene.scale.setScalar(.6625);
  const rig=new BabyGaitRig(gltf.scene,scene);
  for(let i=0;i<120;i++){orientation.position.set(0,0,i/60);orientation.rotation.set(0,0,0);orientation.scale.setScalar(1);rig.apply(orientation,{position:{x:0,z:i/60},facing:0,scale:.6625,dt:1/60,moving:true,reduced:false},true);}
  rig.dispose();
});

test('high-resolution comparison changes raster size only and leaves automatic quality bounded',()=>{
  const a=resolveRoomRendererProfile('software_balanced',false,'ios'),b=resolveRoomRendererProfile('software_high_resolution',false,'ios');
  assert.equal(a.maxPixelRatio,1.5);assert.equal(b.maxPixelRatio,3);
  for(const key of ['msaaSamples','contextAntialias','petMaterial','roomMaterial','submissionIntervalMs'] as const)assert.equal(a[key],b[key]);
});

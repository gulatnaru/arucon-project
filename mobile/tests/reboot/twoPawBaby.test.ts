import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { BlenderBabyRig } from '../../src/reboot/blenderRig';
import { BabyGait, BabyGaitRig } from '../../src/reboot/babyGait';
import { applyRebootPose } from '../../src/reboot/pose';
import { applyBabyPose } from '../../src/reboot/babyPose';
import { makeHandActingPlan, sampleHandContact, sampleHandRelease } from '../../src/reboot/handActing';
import { PERSONALITY_IDS } from '../../src/reboot/personality';
const file=async(p:string)=>readFile(new NodeURL('../../assets/'+p,import.meta.url));
const load=async(p='reboot-04/baby-two-paws.glb')=>{const b=await file(p);return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer);};

test('baby really has two skinned paws/eight bones and no rear geometry/weights/tracks; originals intact',async()=>{
 const g=await load(),bones:string[]=[];g.scene.traverse(n=>{if(n instanceof THREE.Bone)bones.push(n.name);assert.ok(!/Back|Rear/.test(n.name));});assert.equal(bones.length,8);assert.ok(bones.includes('PawL')&&bones.includes('PawR'));assert.ok(g.scene.getObjectByName('PearlHorn'));
 const rig=new BlenderBabyRig(g.scene,true),scene=new THREE.Scene();scene.add(g.scene);const gait=new BabyGaitRig(g.scene,scene,true);assert.equal(gait.gait.feet.length,2);assert.equal(g.scene.getObjectByName('Foot_R_Back'),undefined);
 for(const c of g.animations)assert.ok(c.tracks.every(t=>!/Back|Rear/.test(t.name)));for(const n of ['walk','baby_stop','baby_hop','baby_release','sleep'])assert.ok(g.animations.some(c=>c.name===n));
 g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh){const w=n.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);}});rig.apply();gait.dispose();
 for(const[p,h]of [['reboot-04/common-quad.glb','ce26ac9cd08eb3a0363542ce21cdb5ccfbbf43d78430ad35324586a62c843bce'],['reboot-02/baby-gait.glb','6ae771875c6da450d3f81b7c76985071568e84c504cd18e50ef15d2adcbedeb1']])assert.equal(createHash('sha256').update(await file(p)).digest('hex'),h);
});
test('baby retains the low A-v8 body surface and two paw topology, not an upright humanoid remodel',async()=>{
 const a=await load('reboot-02/baby-gait.glb'),b=await load(),q=(b.scene.getObjectByName('Body') as THREE.Mesh).geometry.attributes.position;
 const key=(x:number,y:number,z:number)=>[x,y,z].map(v=>Math.round(v*1e5)).join(',');const points=new Set<string>();for(let i=0;i<q.count;i++)points.add(key(q.getX(i),q.getY(i),q.getZ(i)));
 for(const name of ['Body','Sole_L_Front','Sole_R_Front']){const p=(a.scene.getObjectByName(name)as THREE.Mesh).geometry.attributes.position;let same=0;for(let i=0;i<p.count;i++)if(points.has(key(p.getX(i),p.getY(i),p.getZ(i))))same++;assert.ok(same/p.count>.995,name);}
});
test('two supports alternate without simultaneous walking flight; weight transfers before swing and settles',()=>{
 const layout=[{x:-.265,z:.1,phase:0},{x:.265,z:.1,phase:.5}],g=new BabyGait(layout,true);let prior=g.update({position:{x:0,z:0},facing:0,scale:1,dt:.016,moving:true,reduced:false}).feet.map(x=>({...x}));let left=0,right=0;
 for(let i=1;i<120;i++){g.update({position:{x:0,z:i*.012},facing:0,scale:1,dt:.016,moving:true,reduced:false});assert.ok(g.feet.some(f=>f.planted));g.feet.forEach((f,n)=>{if(f.planted&&prior[n].planted){assert.equal(f.x,prior[n].x);assert.equal(f.z,prior[n].z);}});if(!g.feet[1].planted){left++;assert.ok(g.balanceX<.005);}if(!g.feet[0].planted){right++;assert.ok(g.balanceX>-.005);}prior=g.feet.map(x=>({...x}));}
 assert.ok(left&&right);for(let i=0;i<50;i++)g.update({position:{x:0,z:1.428},facing:0,scale:1,dt:.016,moving:false,reduced:false});assert.ok(Math.abs(g.balanceX)<.001&&g.feet.every(f=>f.planted&&f.y===0));
});
test('both paws take off/land together with compression and no ghost rear supports',()=>{
 const g=new BabyGait(undefined,true);let flight=false,compression=false;
 for(let i=0;i<=100;i++){g.update({position:{x:0,z:1.8},facing:0,scale:1,dt:.01,moving:false,reduced:false,hop:i/100});assert.equal(g.feet.length,2);assert.ok(Math.abs(g.feet[0].y-g.feet[1].y)<1e-10);flight ||= g.height>.05;compression ||=g.compression>.04;}
 assert.ok(flight&&compression);g.update({position:{x:0,z:1.8},facing:0,scale:1,dt:.016,moving:false,reduced:false});assert.equal(g.height,0);assert.ok(g.feet.every(f=>f.planted));
});
test('retained three hand profiles use the same two-paw rig, planted support and release sample',async()=>{
 for(const id of PERSONALITY_IDS){const g=await load(),scene=new THREE.Scene(),anchor=new THREE.Group(),orientation=new THREE.Group();scene.add(anchor);anchor.add(orientation);orientation.add(g.scene);g.scene.scale.setScalar(.7155);const bridge=new BlenderBabyRig(g.scene,true),gait=new BabyGaitRig(g.scene,scene,true);const plan=makeHandActingPlan(id,'paw_offer','baby_scout',true,[]);
  const poses=[sampleHandContact(plan,.8),sampleHandContact(plan,8)];const held=poses[1];for(let t=0;t<=plan.recoverySeconds;t+=.08)poses.push(sampleHandRelease(plan,held,t));
  for(const h of poses){const pose={kind:'hand' as const,phase:h.beat==='hand_release'?'recover':'contact',stage:'baby' as const,progress:.5,held:true,personalityId:id,handActing:h,baby:{beat:{id:'lean',seconds:1,expression:h.expression},progress:.5}};
   applyRebootPose(orientation,g.scene,pose,h.seconds,false,false,{x:0,z:0},0,true);applyBabyPose(orientation,g.scene,pose,h.seconds,.016,false,false,true,false,true);gait.apply(orientation,{position:{x:0,z:0},facing:0,scale:.7155,dt:.016,moving:false,reduced:false},true,true,h.pawLift>.01);bridge.apply();g.scene.updateWorldMatrix(true,true);
   const layout=gait.gait.layout[0],control=g.scene.getObjectByName('Foot_L_Front')!,p=new THREE.Vector3(layout.x,.21,layout.z).applyMatrix4(control.matrixWorld);assert.ok(Math.abs(p.x-gait.gait.feet[0].x)<1e-6&&Math.abs(p.z-gait.gait.feet[0].z)<1e-6);assert.equal(g.scene.getObjectByName('PawBackL'),undefined);}
  assert.equal(sampleHandRelease(plan,held,plan.recoverySeconds).supportX,0);gait.dispose();
 }
});

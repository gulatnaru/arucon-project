import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { BlenderBabyRig } from '../../src/reboot/blenderRig';
import { BabyGaitRig } from '../../src/reboot/babyGait';
import { applyBabyPose } from '../../src/reboot/babyPose';
import { applyRebootPose } from '../../src/reboot/pose';
import { prepareCpuMorphs } from '../../src/scene/cpuMorph';
import { disposeSceneObject } from '../../src/scene/lifecycle';
import { ART_CASES, sampleArtComparison } from '../../src/reboot/artComparison';
const load=async()=>{const b=await readFile(new NodeURL('../../assets/reboot-03/blender-baby.glb',import.meta.url));return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer);};
test('Blender export has normalized skin, facial keys and authored clips; v8 bytes remain unchanged',async()=>{
 const a=await readFile(new NodeURL('../../assets/reboot-02/baby-gait.glb',import.meta.url));assert.equal(createHash('sha256').update(a).digest('hex'),'6ae771875c6da450d3f81b7c76985071568e84c504cd18e50ef15d2adcbedeb1');
 const g=await load();let skins=0;g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh){skins++;const w=n.geometry.getAttribute('skinWeight');for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);}});assert.ok(skins>=18);assert.ok(g.scene.getObjectByName('PearlHorn'));assert.equal(g.scene.getObjectByName('Foot_L_Back'),undefined);
 for(const name of ['Eye_L','Eye_R','Lid_-1','Lid_1','Cheek-1','Cheek1','Mouth'])assert.ok(Object.keys((g.scene.getObjectByName(name) as THREE.Mesh).morphTargetDictionary!).length>=3);
 for(const name of ['idle_reserved','walk','baby_hop','pet_reserved','baby_release'])assert.ok(g.animations.find(c=>c.name===name)?.tracks.some(t=>t.name.includes('BodyBone')));
});
test('shared planted endpoints survive Blender bone curves, turning and CPU face morphs',async()=>{
 const g=await load(),root=new THREE.Group(),scene=new THREE.Scene();scene.add(root);root.add(g.scene);g.scene.scale.setScalar(.6625);const b=new BlenderBabyRig(g.scene),gait=new BabyGaitRig(g.scene,scene),mixer=new THREE.AnimationMixer(g.scene),walk=mixer.clipAction(g.animations.find(c=>c.name==='walk')!).play(),morph=prepareCpuMorphs(g.scene),contact=new THREE.Vector3(),expected=new THREE.Vector3();
 for(let i=0;i<240;i++){const p={x:i*.005,z:1.8+i*.004},yaw=Math.PI/4;root.position.set(p.x,0,p.z);root.rotation.set(0,yaw,0);root.scale.setScalar(1);applyRebootPose(root,g.scene,undefined,i/60,true,false,p,yaw,true);applyBabyPose(root,g.scene,undefined,i/60,1/60,true,false,true);gait.apply(root,{position:p,facing:yaw,scale:.6625,dt:1/60,moving:true,reduced:false},true);walk.time=gait.gait.phase%1;mixer.update(0);b.apply();morph();for(const[k,side]of['L','R'].entries()){g.scene.getObjectByName(`Paw${side}`)!.getWorldPosition(contact);expected.set(k?.265:-.265,.21,.10).applyMatrix4(g.scene.getObjectByName(`Foot_${side}_Front`)!.matrixWorld);assert.ok(contact.distanceTo(expected)<1e-6);}g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh){n.skeleton.update();assert.ok(Array.from(n.skeleton.boneMatrices).every(Number.isFinite));}});}gait.dispose();
});
test('controlled A/B samples stay finite and bounded with no memory/economy commands',()=>{for(const angle of['front','side','back']as const)for(const name of ART_CASES)for(let t=0;t<60;t+=.1){const s=sampleArtComparison(name,angle,t);assert.ok(Number.isFinite(s.point.x)&&Number.isFinite(s.point.z));assert.ok(Math.abs(s.point.x)<=.85+1e-8);assert.ok(s.point.z>=.94&&s.point.z<=2.66);assert.ok(s.press>=0&&s.press<=1);}assert.equal(sampleArtComparison('walk','side',2).moving,true);assert.equal(sampleArtComparison('walk','side',4).moving,false);assert.equal(sampleArtComparison('release','front',3).press,0);});

test('replacing the Blender model disposes each shared bone texture once',async()=>{const g=await load(),seen=new Set<THREE.Skeleton>();g.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh)seen.add(n.skeleton);});let disposed=0;for(const sk of seen){sk.computeBoneTexture();sk.boneTexture!.addEventListener('dispose',()=>disposed++);}disposeSceneObject(g.scene);assert.equal(disposed,seen.size);});

test('pearl horn side normals point outwards, preserving a single illuminated horn',async()=>{
 const g=await load(),m=g.scene.getObjectByName('PearlHorn') as THREE.Mesh,p=m.geometry.attributes.position,n=m.geometry.attributes.normal;let checked=0;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>1.66&&y<1.80){const t=(y-1.61)/.23,z=p.getZ(i)-(.12+.035*t*t),x=p.getX(i),radial=Math.hypot(x,z);assert.ok((x*n.getX(i)+z*n.getZ(i))/radial>.2,'horn side faces inward');checked++;}}assert.ok(checked>20);
});
test('the compact comparison removes only idle tail holds and preserves normal walk/landing timing',()=>{assert.deepEqual(sampleArtComparison('sequence','all',18.5),sampleArtComparison('walk','front',2.5));assert.equal(sampleArtComparison('sequence','all',34).angle,'side');assert.equal(sampleArtComparison('sequence','all',66).angle,'back');});

test('B sleep is a real lower posture with closed eyes; awake restores the same rig without sticky morphs',async()=>{
 const g=await load(),b=new BlenderBabyRig(g.scene),mx=new THREE.AnimationMixer(g.scene),body=g.scene.getObjectByName('Body') as THREE.SkinnedMesh,p=new THREE.Vector3();
 const top=()=>{g.scene.updateMatrixWorld(true);let max=0;for(let i=0;i<body.geometry.attributes.position.count;i++){body.getVertexPosition(i,p);max=Math.max(max,p.y);}return max;};
 mx.clipAction(g.animations.find(c=>c.name==='idle_reserved')!).play();mx.update(0);const awake=top();mx.stopAllAction();mx.clipAction(g.animations.find(c=>c.name==='sleep')!).play();mx.update(0);b.apply(true);assert.ok(top()<awake-.15);for(const name of ['Eye_L','Eye_R','Lid_-1','Lid_1']){const eye=g.scene.getObjectByName(name) as THREE.Mesh;assert.equal(eye.morphTargetInfluences![eye.morphTargetDictionary!.Blink],1);}
 mx.stopAllAction();mx.clipAction(g.animations.find(c=>c.name==='idle_reserved')!).play();mx.update(0);for(let i=0;i<60;i++)applyBabyPose(new THREE.Group(),g.scene,undefined,0,1/60,false,false,true);b.apply(false);assert.ok(Math.abs(top()-awake)<1e-5);assert.equal((g.scene.getObjectByName('Eye_L') as THREE.Mesh).morphTargetInfluences![0],0);
});

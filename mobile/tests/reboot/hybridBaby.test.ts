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
import { BABY_ART_CHOICES } from '../../src/reboot/artComparison';
const bytes = async (file:string)=>readFile(new NodeURL('../../assets/'+file,import.meta.url));
const load = async(file='reboot-03-1/hybrid-baby.glb')=>{const b=await bytes(file);return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)as ArrayBuffer);};
const stats=(r:THREE.Object3D)=>{let triangles=0,meshes=0,morphVertices=0,vertices=0;r.traverse(n=>{if(n instanceof THREE.Mesh){meshes++;vertices+=n.geometry.attributes.position.count;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;if(n.morphTargetInfluences?.length)morphVertices+=n.geometry.attributes.position.count;}});return{triangles,meshes,morphVertices,vertices};};

test('A and B bytes remain intact, C is separate, all three selectable with A as first choice',async()=>{
 for(const[f,hash]of[['reboot-02/baby-gait.glb','6ae771875c6da450d3f81b7c76985071568e84c504cd18e50ef15d2adcbedeb1'],['reboot-03/blender-baby.glb','06e03045a5782b583fbb7147181db262f9b32d9402c581a8dd5a96d5dbf799b8']])assert.equal(createHash('sha256').update(await bytes(f)).digest('hex'),hash);
 assert.deepEqual(BABY_ART_CHOICES.map(x=>x.id),['v8','blender','hybrid']);assert.notEqual(createHash('sha256').update(await bytes('reboot-03-1/hybrid-baby.glb')).digest('hex'),createHash('sha256').update(await bytes('reboot-03/blender-baby.glb')).digest('hex'));
});

test('C actually retains A body and large paw surface samples rather than scaling B into shape',async()=>{
 const a=await load('reboot-02/baby-gait.glb'),c=await load(),joined=c.scene.getObjectByName('Body') as THREE.SkinnedMesh,p=joined.geometry.attributes.position;
 const key=(x:number,y:number,z:number)=>[x,y,z].map(v=>Math.round(v*1e5)).join(',');const samples=new Set<string>();for(let i=0;i<p.count;i++)samples.add(key(p.getX(i),p.getY(i),p.getZ(i)));
 for(const name of ['Body','Sole_L_Front','Sole_R_Front']){const m=a.scene.getObjectByName(name) as THREE.Mesh,q=m.geometry.attributes.position;let found=0;for(let i=0;i<q.count;i++)if(samples.has(key(q.getX(i),q.getY(i),q.getZ(i))))found++;assert.ok(found/q.count>.995,`${name}: only ${found}/${q.count} A surface samples retained`);}
 assert.equal(c.scene.getObjectByName('Foot_L_Back'),undefined);assert.ok(c.scene.getObjectByName('PearlHorn'));
 const as=stats(a.scene),bs=stats((await load('reboot-03/blender-baby.glb')).scene),cs=stats(c.scene);
 assert.ok(cs.triangles<=as.triangles*1.02);assert.ok(cs.vertices<bs.vertices*.65);assert.ok(cs.meshes<bs.meshes);assert.ok(cs.morphVertices<bs.morphVertices*.55);
});

test('C normalized weights, actual sparse walk/stop/hop/pet curves and eyelid keys are present',async()=>{
 const c=await load();c.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh){const w=n.geometry.getAttribute('skinWeight');for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);for(const name of ['position','normal'])assert.ok(Array.from(n.geometry.attributes[name].array).every(Number.isFinite));}});
 for(const name of ['walk','baby_hop','baby_stop','pet_reserved','baby_release','sleep'])assert.ok(c.animations.find(a=>a.name===name)?.tracks.some(t=>t.name.includes('BodyBone')));
 assert.ok(c.animations.find(a=>a.name==='idle_reserved')!.tracks.length<8);for(const name of ['Eye_L','Eye_R','Lid_-1','Lid_1'])assert.ok((c.scene.getObjectByName(name)as THREE.Mesh).morphTargetDictionary?.Blink!==undefined);
});

test('C sparse ear controls cannot accumulate; grounded paws stay planted through actual clip curves and deformation',async()=>{
 const c=await load(),scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.add(c.scene);c.scene.scale.setScalar(.7155);const rig=new BlenderBabyRig(c.scene,true),gait=new BabyGaitRig(c.scene,scene),mx=new THREE.AnimationMixer(c.scene),walk=mx.clipAction(c.animations.find(x=>x.name==='walk')!).play(),morph=prepareCpuMorphs(c.scene),target=new THREE.Vector3(),actual=new THREE.Vector3();
 const ear=c.scene.getObjectByName('EarL')!,base=ear.quaternion.clone();
 for(let i=0;i<240;i++){const p={x:i*.004,z:1.8},yaw=Math.PI/2;root.position.set(p.x,0,p.z);root.rotation.set(0,yaw,0);root.scale.setScalar(1);applyRebootPose(root,c.scene,undefined,i/60,true,false,p,yaw,true);applyBabyPose(root,c.scene,undefined,i/60,1/60,true,false,true);gait.apply(root,{position:p,facing:yaw,scale:.7155,dt:1/60,moving:true,reduced:false},true);walk.time=gait.gait.phase%1;mx.update(0);rig.apply();morph();for(const[k,side]of['L','R'].entries()){target.set(k?.265:-.265,.21,.10).applyMatrix4(c.scene.getObjectByName(`Foot_${side}_Front`)!.matrixWorld);c.scene.getObjectByName(`Paw${side}`)!.getWorldPosition(actual);assert.ok(actual.distanceTo(target)<1e-6);}assert.ok(ear.quaternion.angleTo(base)<.2);}
 const ctrl=c.scene.getObjectByName('Ear_L')!;ctrl.rotation.z=.08;for(let i=0;i<3000;i++)rig.apply();assert.ok(Math.abs(ear.quaternion.angleTo(base)-.08)<1e-5);gait.dispose();
});

test('C sleeping/waking preserves readable rest and clears closed eyes on the same rig',async()=>{
 const c=await load(),rig=new BlenderBabyRig(c.scene,true),mx=new THREE.AnimationMixer(c.scene),body=c.scene.getObjectByName('Body')as THREE.SkinnedMesh,p=new THREE.Vector3();const top=()=>{c.scene.updateMatrixWorld(true);let max=0;for(let i=0;i<body.geometry.attributes.position.count;i++){body.getVertexPosition(i,p);max=Math.max(max,p.y);}return max;};mx.clipAction(c.animations.find(x=>x.name==='idle_reserved')!).play();mx.update(0);const awake=top();mx.stopAllAction();mx.clipAction(c.animations.find(x=>x.name==='sleep')!).play();mx.update(0);rig.apply(true);assert.ok(top()<awake-.15);const eye=c.scene.getObjectByName('Eye_L')as THREE.Mesh;assert.equal(eye.morphTargetInfluences![eye.morphTargetDictionary!.Blink],1);mx.stopAllAction();mx.clipAction(c.animations.find(x=>x.name==='idle_reserved')!).play();mx.update(0);for(let i=0;i<60;i++)applyBabyPose(new THREE.Group(),c.scene,undefined,0,1/60,false,false,true);rig.apply(false);assert.equal(eye.morphTargetInfluences![eye.morphTargetDictionary!.Blink],0);assert.ok(Math.abs(top()-awake)<1e-5);
});

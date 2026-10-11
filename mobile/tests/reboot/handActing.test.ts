import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHandActingPlan, sampleHandContact, sampleHandRelease } from '../../src/reboot/handActing';
import { PERSONALITY_IDS, newPersonality, personalityPlan } from '../../src/reboot/personality';
import { RebootDirector, type RebootWorld } from '../../src/reboot/director';
import type { RebootEvent } from '../../src/reboot/contracts';
import { BabyGaitRig } from '../../src/reboot/babyGait';

const physical = ['x','z','yaw','roll','pitch','compression','pawLift','pawReach','wink','faceStrength'] as const;
test('long offered contact contains one brief wink and paw check, then quiet variations rather than a frozen expression/show loop',()=>{
 const p=makeHandActingPlan('playful','paw_offer','baby_scout',true,[]);let winkSeconds=0;const faces=new Set<string>();let latePaws=0;
 for(let t=0;t<45;t+=.01){const x=sampleHandContact(p,t);if(x.wink>.01)winkSeconds+=.01;if(t>4){faces.add(x.expression);latePaws+=x.pawLift;assert.equal(x.wink,0);assert.ok(Math.abs(x.roll)<.02);}assert.ok(physical.every(k=>Number.isFinite(x[k])));}
 assert.ok(winkSeconds>0&&winkSeconds<.25);assert.equal(latePaws,0);assert.deepEqual([...faces].sort(),['content','curious']);assert.ok(sampleHandContact(p,.9).pawReach>.15);
});
test('warm settles cheek/weight toward the hand; poised retains upright turned body and light contact, not a slower warm sample',()=>{
 const warm=sampleHandContact(makeHandActingPlan('warm','side_nuzzle','rest',true,[]),7);
 const poised=sampleHandContact(makeHandActingPlan('poised','side_nuzzle','rest',true,[]),7);
 assert.ok(warm.z>.14&&warm.compression>.035&&Math.abs(warm.roll)>.13);assert.ok(poised.z<.05&&poised.compression<.012&&Math.abs(poised.roll)<.025&&Math.abs(poised.yaw)>.35);
});
test('contact context and existing recent-style selection change the actual motor response without changing identity',()=>{
 const a=sampleHandContact(makeHandActingPlan('poised','startle_then_lean','baby_discover',true,[]),.2);
 const b=sampleHandContact(makeHandActingPlan('poised','lean','rest',true,[]),.2);assert.equal(a.expression,'surprised');assert.notEqual(a.pitch,b.pitch);
 const selected=personalityPlan('warm','hand','head',[])!,next=personalityPlan('warm','hand','head',[selected.touchStyle!],'baby_scout','real-hand')!;assert.notEqual(selected.touchStyle,next.touchStyle);
 assert.notDeepEqual(makeHandActingPlan('warm',selected.touchStyle!,undefined,false,[]),makeHandActingPlan('warm',next.touchStyle!,'baby_scout',true,[selected.touchStyle!]));
});
test('release starts at the exact interrupted gesture/held sample and restores every physical offset with no overshoot',()=>{
 for(const id of PERSONALITY_IDS)for(const t of [.05,.8,2,24]){
  const plan=makeHandActingPlan(id,'paw_offer','baby_scout',true,[]),from=sampleHandContact(plan,t),start=sampleHandRelease(plan,from,0),end=sampleHandRelease(plan,from,plan.recoverySeconds);
  for(const key of physical){assert.equal(start[key],from[key]);assert.ok(Math.abs(end[key])<1e-9);for(let elapsed=0;elapsed<plan.recoverySeconds;elapsed+=.016)assert.ok(Math.abs(sampleHandRelease(plan,from,elapsed)[key])<=Math.abs(from[key])+1e-9);}
 }
});
function actor(id:'playful'|'warm'|'poised'){
 const f=newPersonality(id),events:RebootEvent[]=[],w:RebootWorld={enabled:true,awake:true,moving:false,touching:false,position:{x:0,z:1.8},view:{stage:'baby',babyCharm:true,revision:0,hatWorn:false,handOffered:false,cushion:{x:-1.6,z:.2,revision:0},personality:{foundation:f,axes:f.latent,randomState:f.seed,evidenceIds:[]}}};let now=0;
 const d=new RebootDirector({navigate:p=>{w.position={...p};return true;},stop:()=>{},event:e=>events.push(e)},()=>.5,()=>now);
 const step=(seconds:number)=>{for(let t=0;t<seconds;t+=.05){now+=50;d.update(.05,w);}};return {d,w,events,step};
}
test('same offered hand follows a real prior interest and completes once; mid-cancel cannot restore that old contact',()=>{
 for(const id of PERSONALITY_IDS){const a=actor(id),target={x:.8,z:-2.4};a.w.view={...a.w.view,command:{token:'prior',kind:'baby_discover',target,sourceRevision:0}};a.step(1.5);
  a.w.view={...a.w.view,command:undefined,handOffered:true};a.step(26);assert.equal(a.d.pose?.handActing?.wink,0);const token=a.d.current!.token;
  a.w.view={...a.w.view,handOffered:false};a.step(2.4);assert.equal(a.events.filter(e=>e.token===token&&e.phase==='complete').length,1);assert.ok(a.events.some(e=>e.kind==='baby_discover'&&e.token.includes(':resume:')&&e.target?.z===target.z));
  a.w.view={...a.w.view,handOffered:true};a.step(.6);const cancelled=a.d.current!.token;a.d.cancel();a.w.view={...a.w.view,handOffered:false};a.w.enabled=false;a.step(5);assert.equal(a.events.some(e=>e.token===cancelled&&e.phase==='complete'),false);assert.equal(a.d.pose,undefined);
 }
});
test('supporting feet stay in place as hand weight shifts while the gesturing front paw is free',()=>{
 const scene=new THREE.Scene(),orientation=new THREE.Group(),model=new THREE.Group();scene.add(orientation);orientation.add(model);
 for(const name of ['Foot_L_Front','Foot_R_Front','Foot_L_Back','Foot_R_Back']){const n=new THREE.Group();n.name=name;model.add(n);}const bone=new THREE.Bone();bone.name='PawBackL';model.add(bone);
 const r=new BabyGaitRig(model,scene),input={position:{x:0,z:0},facing:0,scale:1,dt:.016,moving:false,reduced:false};r.apply(orientation,input,true,true,false);
 const location=(name:string,x:number,z:number)=>new THREE.Vector3(x,.21,z).applyMatrix4(model.getObjectByName(name)!.matrixWorld);
 const before=location('Foot_L_Front',-.265,.1);orientation.position.set(.12,0,.16);orientation.rotation.set(.03,.3,-.14);model.getObjectByName('Foot_R_Front')!.position.set(0,.1,.18);r.apply(orientation,input,true,true,true);
 const after=location('Foot_L_Front',-.265,.1);assert.ok(Math.abs(before.x-after.x)<1e-7&&Math.abs(before.z-after.z)<1e-7);assert.equal(model.getObjectByName('Foot_R_Front')!.position.y,.1);r.dispose();
});

test('actual panel input gate cancels offered contact and cannot complete it when the panel closes',()=>{
 for(const id of PERSONALITY_IDS){const a=actor(id);a.w.view={...a.w.view,handOffered:true};a.step(4);assert.equal(a.d.current?.phase,'contact');const token=a.d.current!.token;
  a.w.enabled=false;a.w.view={...a.w.view,handOffered:false};a.step(1);assert.ok(a.events.some(e=>e.token===token&&e.phase==='cancel'));assert.equal(a.d.pose,undefined);
  a.w.enabled=true;a.step(5);assert.equal(a.events.some(e=>e.token===token&&e.phase==='complete'),false);assert.notEqual(a.d.current?.token,token);
 }
});

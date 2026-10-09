import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as THREE from 'three';
import { roomCurveGeometry } from '../../src/scene/roomCurves';
import { VISUAL_QUALITY_CHOICES, resolveRoomRendererProfile, roomRenderSurfaceScale, needsSoftwareCpuMorphs } from '../../src/scene/rendererConfig';
import { createRoomFxaa } from '../../src/scene/roomAa';
import { expoRenderContext } from '../../src/scene/expoRenderContext';
import { parseGlb } from '../../src/scene/gltfRuntime';
import { applyBabyPose } from '../../src/reboot/babyPose';
import { sampleArtComparison } from '../../src/reboot/artComparison';

test('five resolution candidates change fragment budget without changing room material, cadence or automatic defaults', () => {
  const profiles=VISUAL_QUALITY_CHOICES.slice(0,5).map(x=>resolveRoomRendererProfile(x.id,false,'ios'));
  assert.deepEqual(profiles.map(x=>x.maxPixelRatio),[1.5,2,2.25,2.5,3]);
  for(const p of profiles){assert.equal(p.msaaSamples,0);assert.equal(p.roomMaterial,'vertex_lit');assert.equal(p.petMaterial,'vertex_lit');assert.equal(p.submissionIntervalMs,0);assert.equal(roomRenderSurfaceScale(3,p.maxPixelRatio),p.maxPixelRatio/3);}
  assert.equal(resolveRoomRendererProfile('automatic',false,'ios',{renderer:'Apple Software Renderer',vendor:'Apple Inc.',version:'OpenGL ES 3.0 APPLE-test'}).maxPixelRatio,1.5);
});
test('all quality candidates keep the software morph/queue path; hardware never uses the CPU workaround',()=>{
  for(const x of VISUAL_QUALITY_CHOICES){assert.equal(needsSoftwareCpuMorphs(x.id,true),true);assert.equal(needsSoftwareCpuMorphs(x.id,false),false);}
  assert.equal(needsSoftwareCpuMorphs('software_balanced',true),true);assert.equal(needsSoftwareCpuMorphs('software_legacy_333',true),false);
});
test('large room curves reduce contour chord error, retain dimensions/finite smooth normals; tiny props keep their budget', () => {
  for(const role of ['rug','cushion','leaf','facility'] as const){const old=roomCurveGeometry(role,true),n=roomCurveGeometry(role);assert.ok(n.parameters.widthSegments>old.parameters.widthSegments);assert.ok(1-Math.cos(Math.PI/n.parameters.widthSegments)<1-Math.cos(Math.PI/old.parameters.widthSegments));
    n.computeBoundingBox();old.computeBoundingBox();assert.ok(n.boundingBox!.getSize(new THREE.Vector3()).distanceTo(old.boundingBox!.getSize(new THREE.Vector3()))<1e-5);
    const p=n.getAttribute('position'),normal=n.getAttribute('normal');for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(normal,i);assert.ok(Number.isFinite(v.x+v.y+v.z));assert.ok(Math.abs(v.length()-1)<1e-5);}n.dispose();old.dispose();}
  assert.equal(roomCurveGeometry().parameters.widthSegments,24);
});
test('FXAA uses the actual target texel size, one depth target and official edge-aware shader, with owned cleanup',()=>{
  const aa=createRoomFxaa(878,1899);assert.equal(aa.target.width,878);assert.equal(aa.target.height,1899);assert.equal(aa.uniforms.resolution.value.x,1/878);assert.equal(aa.uniforms.resolution.value.y,1/1899);assert.equal(aa.target.samples,0);assert.equal(aa.target.texture.generateMipmaps,false);
  let disposed=0;aa.target.addEventListener('dispose',()=>disposed++);aa.dispose();assert.equal(disposed,1);
});
test('owned Expo iOS postprocess facade maps WebGL BACK to the managed FBO color attachment, leaving all normal/hardware contexts untouched',()=>{
 const calls:number[][]=[];const gl={BACK:1029,COLOR_ATTACHMENT0:36064,id:7,drawBuffers(xs:number[]){assert.equal(this,gl);calls.push(xs);},getId(){assert.equal(this,gl);return this.id;}};
 assert.equal(expoRenderContext(gl,false),gl);const c=expoRenderContext(gl,true);c.drawBuffers([c.BACK]);c.drawBuffers([c.COLOR_ATTACHMENT0]);assert.deepEqual(calls,[[36064],[36064]]);assert.equal(c.getId(),7);assert.equal(c.getId,c.getId);assert.notEqual(c,gl);
});
test('all A/B/C neutral idle returns equal eyes while explicit playful keeps the intended wink',async()=>{
 for(const f of ['reboot-02/baby-gait.glb','reboot-03/blender-baby.glb','reboot-03-1/hybrid-baby.glb']){
  const b=await readFile(new NodeURL('../../assets/'+f,import.meta.url));const {scene:m}=await parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)as ArrayBuffer);
  const root=new THREE.Group();const playful=sampleArtComparison('playful','front',1.5).pose;
  for(let i=0;i<60;i++)applyBabyPose(root,m,playful,0,1/60,false,false,true);
  const l=m.getObjectByName('Eye_L')as THREE.Mesh,r=m.getObjectByName('Eye_R')as THREE.Mesh;
  assert.equal(l.morphTargetInfluences![l.morphTargetDictionary!.Blink],.92);assert.equal(r.morphTargetInfluences![r.morphTargetDictionary!.Blink],0);
  for(let i=0;i<90;i++)applyBabyPose(root,m,undefined,0,1/60,false,false,true);
  for(const eye of [l,r])assert.ok(eye.morphTargetInfluences!.every(w=>Math.abs(w)<1e-7));
  // BufferGeometry.computeBoundingBox includes all morph target extremes; that
  // would measure the intentionally asymmetric Curious/wink, not neutral eyes.
  const a=new THREE.Box3().setFromBufferAttribute(l.geometry.getAttribute('position')as THREE.BufferAttribute),c=new THREE.Box3().setFromBufferAttribute(r.geometry.getAttribute('position')as THREE.BufferAttribute);
  assert.ok(Math.abs(a.max.y-c.max.y)<1e-4,f);assert.ok(Math.abs(a.min.y-c.min.y)<1e-4,f);assert.ok(Math.abs((a.max.x-a.min.x)-(c.max.x-c.min.x))<1e-4,f);
 }
});

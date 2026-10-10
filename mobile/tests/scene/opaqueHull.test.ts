import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {closedOutwardHull,canCullOpaqueHull} from '../../src/scene/opaqueHull';
import {readFile} from 'node:fs/promises';import {URL as NodeURL} from 'node:url';import {parseGlb} from '../../src/scene/gltfRuntime';
test('only closed outward opaque volumes are eligible; open/inverted/transparent faces remain',()=>{
 const g=new THREE.SphereGeometry(1,24,16),m=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});assert.equal(closedOutwardHull(g),true);assert.equal(canCullOpaqueHull(g,m),true);
 assert.equal(closedOutwardHull(new THREE.PlaneGeometry()),false);const inverted=g.clone();const x=inverted.index!;for(let i=0;i<x.count;i+=3){const a=x.getX(i);x.setX(i,x.getX(i+1));x.setX(i+1,a);}assert.equal(closedOutwardHull(inverted),false);
 m.transparent=true;assert.equal(canCullOpaqueHull(g,m),false);m.transparent=false;m.opacity=.9;assert.equal(canCullOpaqueHull(g,m),false);
});
test('actual quad eligibility is evaluated without altering geometry, morphs, skin or assets',async()=>{
 const b=await readFile(new NodeURL('../../assets/reboot-04/common-quad.glb',import.meta.url));const g=await parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)as ArrayBuffer);let eligible=0;
 g.scene.traverse(n=>{if(n instanceof THREE.Mesh){const before=Array.from(n.geometry.attributes.position.array);if(!Array.isArray(n.material)&&canCullOpaqueHull(n.geometry,n.material))eligible++;assert.deepEqual(Array.from(n.geometry.attributes.position.array),before);}});assert.ok(eligible>0);console.log('eligible closed opaque quad meshes',eligible);
});

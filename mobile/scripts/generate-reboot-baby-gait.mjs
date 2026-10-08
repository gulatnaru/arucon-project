#!/usr/bin/env node
// Editable review source, not a Blender sculpt or final approved character.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildRebootCharacter } from './generate-reboot-characters.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/reboot-02');
const source = JSON.parse(await readFile(resolve(dir, 'gait-source.json'), 'utf8'));
const lineage = JSON.parse(await readFile(resolve(dir, '../reboot-characters/source.json'), 'utf8'));
const s = { ...lineage.stages[0], bodyRings: source.bodyRings, radialSegments: source.radialSegments };
const { scene, clips } = buildRebootCharacter(s), root = scene.getObjectByName('AruconRoot');
// Smooth profile and a welded lathe seam remove horizontal normal bands.
const profile = new THREE.SplineCurve([new THREE.Vector2(0, .08),
  ...s.outline.map((r, i) => new THREE.Vector2(r, .16 + s.height * i / (s.outline.length - 1))),
  new THREE.Vector2(0, .16 + s.height + .035)]).getPoints(56);
const body = root.getObjectByName('Body');
body.geometry.dispose(); body.geometry = new THREE.LatheGeometry(profile, source.radialSegments);
body.geometry.scale(s.width, 1, s.depth);
// Two attached lower-body paws, only in this candidate.
for (const name of ['Foot_L_Back','Foot_R_Back','Foot_L_Front','Foot_R_Front']) root.getObjectByName(name)?.removeFromParent();
for (const side of [-1, 1]) {
  const name = side < 0 ? 'L' : 'R', foot = new THREE.Group(); foot.name = `Foot_${name}_Front`;
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  geometry.scale(.185, .21, .235); geometry.translate(side * .265, .21, .10);
  const sole = new THREE.Mesh(geometry, body.material); sole.name = `Sole_${name}_Front`; foot.add(sole); root.add(foot);
}
clips[clips.findIndex(c => c.name === 'walk')] = new THREE.AnimationClip('walk', .64, [
  new THREE.VectorKeyframeTrack('Foot_L_Front.position', [0,.16,.32,.48,.64], [0,0,.20,0,0,-.20,0,.14,-.13,0,.14,.13,0,0,.20]),
  new THREE.VectorKeyframeTrack('Foot_R_Front.position', [0,.16,.32,.48,.64], [0,.14,-.13,0,.14,.13,0,0,.20,0,0,-.20,0,.14,-.13]),
]);
const radiusAt = y => {
  for (let i=1;i<profile.length;i++) if (profile[i].y >= y) {
    const a=profile[i-1],b=profile[i],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y))); return Math.max(.005,a.x+(b.x-a.x)*t);
  }
  return .005;
};
const front = (x,y) => { const r=radiusAt(y); return s.depth*r*Math.sqrt(Math.max(.001,1-(x/(s.width*r))**2)); };
const faceMaterial = new THREE.MeshStandardMaterial({ color: '#3b3546', roughness: .98 });
const skin = new THREE.MeshStandardMaterial({ color: s.bodyColor, roughness: .90 });
const shine = new THREE.MeshStandardMaterial({ color: '#faf6f0', roughness: .98 });
const blush = new THREE.MeshStandardMaterial({ color: '#e8b5c6', roughness: .97 });
const removed = [];
root.traverse(n => { if (/^(Eye_[LR]|EyeSpark[-1]+|Cheek[-1]+|Mouth)$/.test(n.name)) removed.push(n); });
for (const n of removed) n.removeFromParent();
function patch(name, centerX, centerY, rx, ry, material, offset = source.surfaceOffset, transforms = {}) {
  const points = [[0, 0]], seg = 32, rings = 3, indices = [];
  for (let ring = 1; ring <= rings; ring++) for (let j = 0; j < seg; j++) points.push([Math.cos(j / seg * Math.PI * 2) * ring / rings, Math.sin(j / seg * Math.PI * 2) * ring / rings]);
  for (let j = 0; j < seg; j++) indices.push(0, 1 + j, 1 + (j + 1) % seg);
  for (let ring = 1; ring < rings; ring++) for (let j = 0; j < seg; j++) { const a = 1 + (ring - 1) * seg + j, b = 1 + ring * seg + j, a1 = 1 + (ring - 1) * seg + (j + 1) % seg, b1 = 1 + ring * seg + (j + 1) % seg; indices.push(a, b, a1, b, b1, a1); }
  const vertices = transform => Float32Array.from(points.flatMap(([u, v]) => {
    const [x, y] = transform ? transform(u, v) : [centerX + u * rx, centerY + v * ry];
    return [x, y, front(x, y) + offset];
  }));
  const geometry = new THREE.BufferGeometry(); geometry.setIndex(indices); geometry.setAttribute('position', new THREE.BufferAttribute(vertices(), 3)); geometry.computeVertexNormals();
  const morphNames = Object.keys(transforms);
  if (morphNames.length) {
    geometry.morphAttributes.position = morphNames.map(key => new THREE.BufferAttribute(vertices(transforms[key]), 3));
    geometry.morphAttributes.normal = morphNames.map((_, i) => { const target = new THREE.BufferGeometry(); target.setIndex(indices); target.setAttribute('position', geometry.morphAttributes.position[i].clone()); target.computeVertexNormals(); return target.attributes.normal; });
  }
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; root.add(mesh);
  if (morphNames.length) { mesh.updateMorphTargets(); mesh.morphTargetDictionary = Object.fromEntries(morphNames.map((key, i) => [key, i])); }
  return mesh;
}
for (const side of [-1, 1]) {
  const x = side * source.eyeSpacing, y = source.eyeY, w = source.eyeWidth, h = source.eyeHeight;
  patch('Lid_' + side, x, y, w + .008, h + .009, skin, .003);
  patch('Eye_' + (side < 0 ? 'L' : 'R'), x, y, w, h, faceMaterial, .006, {
    Blink: (u, v) => [x + u * w, y + v * .011],
    Surprised: (u, v) => [x + u * w * 1.07, y + v * h * 1.22],
    Happy: (u, v) => [x + u * w, y + .015 + v * .031 + .023 * (1 - u * u)],
    Mischief: (u, v) => [x + u * w, y + v * .048 - side * u * .019],
    Sleepy: (u, v) => [x + u * w, y - .016 + v * .026],
    Curious: (u, v) => [x + u * w, y + v * h * (side < 0 ? 1.18 : .90)],
  });
  patch('EyeSpark' + side, x - side * .019, y + .027, .016, .019, shine, .009);
  patch('Cheek' + side, side * .295, y - .136, .082, .025, blush, .004);
  patch('Brow_' + side, x, y + .147, w * .73, .009, faceMaterial, .006, {
    Lift: (u, v) => [x + u * w * .73, y + .175 + v * .009 - side * u * .011],
    Mischief: (u, v) => [x + u * w * .73, y + .142 + v * .009 + side * u * .024],
  });
}
const my = source.eyeY - .205;
patch('Mouth', 0, my, .062, .019, faceMaterial, .006, {
  Smile: (u, v) => [u * .092, my + v * .029 - .024 * (1 - u * u)],
  Open: (u, v) => [u * .054, my + v * .066],
  Playful: (u, v) => [u * .081 + .014, my + v * .020 + .027 * u],
  Bashful: (u, v) => [u * .047, my + v * .012 + .008 * Math.cos(u * 4)],
});
// Give existing ears/hat local pivots so their small motion stays attached.
for (const side of [-1, 1]) {
  const ear = root.getObjectByName(side < 0 ? 'Ear_L' : 'Ear_R');
  const pivot = new THREE.Vector3(side * .54, 1.27, -.02);
  ear.traverse(n => { if (n instanceof THREE.Mesh) n.geometry.translate(-pivot.x, -pivot.y, -pivot.z); }); ear.position.copy(pivot);
}
const hat = root.getObjectByName('RebootHat'), pivot = new THREE.Vector3(-.28, s.height - .01, -.23);
hat.traverse(n => { if (n instanceof THREE.Mesh) n.geometry.translate(-pivot.x, -pivot.y, -pivot.z); }); hat.position.copy(pivot);
const bytes = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips }));
const manifest = JSON.stringify({ schemaVersion: 1, source: 'gait-source.json + generate-reboot-baby-gait.mjs', originalPreserved: true,
  file: 'baby-gait.glb', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), hornCount: 1, visibleFeet: 2, locomotion: 'travel-driven support and alternating swing/landing',
  face: 'smooth body normals; curved eyes/lids with reduced stand-off; v4 preserved', morphs: ['Blink', 'Surprised', 'Happy', 'Mischief', 'Sleepy', 'Curious', 'Smile', 'Open', 'Playful', 'Bashful'],
  artStatus: 'DRAFT_REVIEW_NOT_FINAL_ART', blender: 'NOT_AVAILABLE', finalSize: null }, null, 2) + '\n';
await mkdir(dir, { recursive: true });
if (process.argv.includes('--check')) { if (!(await readFile(resolve(dir, 'baby-gait.glb'))).equals(bytes) || await readFile(resolve(dir, 'gait-manifest.json'), 'utf8') !== manifest) throw Error('Baby draft regeneration differs'); }
else { await writeFile(resolve(dir, 'baby-gait.glb'), bytes); await writeFile(resolve(dir, 'gait-manifest.json'), manifest); }
console.log(manifest);

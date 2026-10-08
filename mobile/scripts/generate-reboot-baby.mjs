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
const source = JSON.parse(await readFile(resolve(dir, 'source.json'), 'utf8'));
const lineage = JSON.parse(await readFile(resolve(dir, '../reboot-characters/source.json'), 'utf8'));
const s = { ...lineage.stages[0], bodyRings: source.bodyRings, radialSegments: source.radialSegments };
const { scene, clips } = buildRebootCharacter(s), root = scene.getObjectByName('AruconRoot');
const lerpOutline = y => {
  const p = Math.max(0, Math.min(s.outline.length - 1.00001, (y - .16) / s.height * (s.outline.length - 1)));
  const i = Math.floor(p); return s.outline[i] + (s.outline[i + 1] - s.outline[i]) * (p - i);
};
// Ink/lid/cheek surfaces follow the same curved head volume; no eyeball spheres.
const front = (x, y) => { const r = lerpOutline(y); return s.depth * r * Math.sqrt(Math.max(.01, 1 - (x / (s.width * r)) ** 2)); };
const faceMaterial = new THREE.MeshStandardMaterial({ color: '#343040', roughness: .98 });
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
  patch('Lid_' + side, x, y, w + .018, h + .018, skin, .006);
  patch('Eye_' + (side < 0 ? 'L' : 'R'), x, y, w, h, faceMaterial, .012, {
    Blink: (u, v) => [x + u * w, y + v * .011],
    Surprised: (u, v) => [x + u * w * 1.07, y + v * h * 1.22],
    Happy: (u, v) => [x + u * w, y + .015 + v * .031 + .023 * (1 - u * u)],
    Mischief: (u, v) => [x + u * w, y + v * .048 - side * u * .019],
    Sleepy: (u, v) => [x + u * w, y - .016 + v * .026],
    Curious: (u, v) => [x + u * w, y + v * h * (side < 0 ? 1.18 : .90)],
  });
  patch('EyeSpark' + side, x - .023, y + .026, .020, .024, shine, .017);
  patch('Cheek' + side, side * .295, y - .136, .082, .025, blush, .008);
  patch('Brow_' + side, x, y + .147, w * .73, .009, faceMaterial, .008, {
    Lift: (u, v) => [x + u * w * .73, y + .175 + v * .009 - side * u * .011],
    Mischief: (u, v) => [x + u * w * .73, y + .142 + v * .009 + side * u * .024],
  });
}
const my = source.eyeY - .205;
patch('Mouth', 0, my, .062, .019, faceMaterial, .013, {
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
const manifest = JSON.stringify({ schemaVersion: 1, source: 'source.json + generate-reboot-baby.mjs', originalPreserved: true,
  file: 'baby-charm.glb', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), hornCount: 1,
  face: 'curved surface patches + inset lids + attached cheeks/mouth; spherical eyes removed', morphs: ['Blink', 'Surprised', 'Happy', 'Mischief', 'Sleepy', 'Curious', 'Smile', 'Open', 'Playful', 'Bashful'],
  artStatus: 'DRAFT_REVIEW_NOT_FINAL_ART', blender: 'NOT_AVAILABLE', finalSize: null }, null, 2) + '\n';
await mkdir(dir, { recursive: true });
if (process.argv.includes('--check')) { if (!(await readFile(resolve(dir, 'baby-charm.glb'))).equals(bytes) || await readFile(resolve(dir, 'manifest.json'), 'utf8') !== manifest) throw Error('Baby draft regeneration differs'); }
else { await writeFile(resolve(dir, 'baby-charm.glb'), bytes); await writeFile(resolve(dir, 'manifest.json'), manifest); }
console.log(manifest);

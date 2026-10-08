#!/usr/bin/env node
// Editable parametric mesh source. New topology; original GLBs are untouched.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/reboot-characters');
const specs = JSON.parse(await readFile(resolve(directory, 'source.json'), 'utf8'));
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const digest = b => createHash('sha256').update(b).digest('hex');
const interpolate = (a, t) => { const p = Math.min(a.length - 1.00001, Math.max(0, t) * (a.length - 1)); const i = Math.floor(p); return a[i] + (a[i + 1] - a[i]) * (p - i); };
function bodyGeometry(s) {
  const positions = [], index = [], nx = s.radialSegments ?? specs.radialSegments, ny = s.bodyRings ?? specs.bodyRings;
  for (let row = 0; row <= ny; row++) {
    const t = row / ny, radius = interpolate(s.outline, t);
    for (let col = 0; col <= nx; col++) {
      const angle = col / nx * Math.PI * 2;
      positions.push(Math.cos(angle) * radius * s.width, .16 + t * s.height,
        Math.sin(angle) * radius * s.depth - (s.id === 'evolved' ? .055 * Math.sin(t * Math.PI) : 0));
    }
  }
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = y * (nx + 1) + x, b = a + nx + 1;
    index.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index); g.computeVertexNormals(); return g;
}
export function buildRebootCharacter(s) {
  const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'AruconRoot'; scene.add(root);
  const skin = new THREE.MeshStandardMaterial({ color: s.bodyColor, roughness: .87 });
  const eye = new THREE.MeshStandardMaterial({ color: '#282e43', roughness: .95 });
  const accent = new THREE.MeshStandardMaterial({ color: s.accent, roughness: .80 });
  const pearl = new THREE.MeshStandardMaterial({ color: '#dcd9f2', roughness: .64 });
  function mesh(name, geometry, material, parent = root) { const x = new THREE.Mesh(geometry, material); x.name = name; parent.add(x); return x; }
  function oval(name, radius, at, material = skin, parent = root) {
    const g = new THREE.SphereGeometry(1, 18, 12); g.scale(...radius); g.translate(...at); return mesh(name, g, material, parent);
  }
  mesh('Body', bodyGeometry(s), skin);
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.name = side < 0 ? 'Ear_L' : 'Ear_R'; root.add(ear);
    const y = .16 + s.height * .79, base = s.width * interpolate(s.outline, .79) * .93;
    const g = new THREE.SphereGeometry(1, 16, 10); g.scale(.15, s.earLength, .10);
    const angle = side * (s.id === 'evolved' && side > 0 ? .20 : s.earAngle);
    g.rotateZ(angle); g.translate(side * (base + .055), y - s.earLength * .28, -.02);
    mesh('EarShell' + side, g, skin, ear);
    oval('EarTint' + side, [.064, s.earLength * .42, .025], [side * (base + .10), y - s.earLength * .30, .085], accent, ear);
    const e = oval('Eye_' + (side < 0 ? 'L' : 'R'), [s.eyeWidth, s.eyeHeight, .031],
      [side * .21, s.eyeY, s.depth * interpolate(s.outline, (s.eyeY - .16) / s.height) + .012], eye);
    const basePositions = e.geometry.attributes.position.array;
    const blink = Float32Array.from(basePositions);
    for (let i = 0; i < blink.length; i += 3) blink[i + 1] = s.eyeY + (blink[i + 1] - s.eyeY) * .10;
    const wide = Float32Array.from(basePositions);
    for (let i = 0; i < wide.length; i += 3) wide[i + 1] = s.eyeY + (wide[i + 1] - s.eyeY) * 1.55;
    e.geometry.morphAttributes.position = [new THREE.BufferAttribute(blink, 3), new THREE.BufferAttribute(wide, 3)];
    e.updateMorphTargets(); e.morphTargetDictionary = { Blink: 0, Surprised: 1 };
    oval('EyeSpark' + side, [.018, .022, .009], [side * .21 - .013, s.eyeY + .025,
      s.depth * interpolate(s.outline, (s.eyeY - .16) / s.height) + .041], new THREE.MeshStandardMaterial({ color: '#f4f5ff', roughness: .95 }));
    oval('Cheek' + side, [.073, .024, .009], [side * .29, s.eyeY - .12,
      s.depth * interpolate(s.outline, (s.eyeY - .16) / s.height) + .008], new THREE.MeshStandardMaterial({ color: '#e7bfcf', roughness: .95 }));
  }
  const mouthZ = s.depth * interpolate(s.outline, (s.eyeY - .30) / s.height) + .025;
  const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-.067, s.eyeY - .17, mouthZ),
    new THREE.Vector3(0, s.eyeY - .19, mouthZ + .008), new THREE.Vector3(.067, s.eyeY - .17, mouthZ)]);
  const mouth = mesh('Mouth', new THREE.TubeGeometry(smile, 10, .013, 5, false), eye);
  const mouthSmile = Float32Array.from(mouth.geometry.attributes.position.array);
  for (let i = 0; i < mouthSmile.length; i += 3) mouthSmile[i + 1] += .035 * Math.min(1, Math.abs(mouthSmile[i]) / .067);
  mouth.geometry.morphAttributes.position = [new THREE.BufferAttribute(mouthSmile, 3)]; mouth.updateMorphTargets(); mouth.morphTargetDictionary = { Smile: 0 };
  for (const [side, name] of [[-1, 'L'], [1, 'R']]) for (const [z, end] of [[.27, 'Front'], [-.25, 'Back']]) {
    const foot = new THREE.Group(); foot.name = `Foot_${name}_${end}`; root.add(foot);
    oval(`Sole_${name}_${end}`, [.15, .14, .21], [side * .30, .14, z], skin, foot);
  }
  const horn = new THREE.Group(); horn.name = 'Horn'; root.add(horn);
  const hornBase = .16 + s.height - .16;
  const conePoints = [new THREE.Vector2(.091, 0), new THREE.Vector2(.084, .06),
    new THREE.Vector2(.050, s.hornHeight * .60), new THREE.Vector2(.009, s.hornHeight)];
  const cone = new THREE.LatheGeometry(conePoints, 20); cone.translate(0, hornBase, .16); mesh('PearlHorn', cone, pearl, horn);
  const helix = new THREE.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => {
    const t = i / 47, a = t * Math.PI * 4.4, radius = .092 * (1 - t) + .009;
    return new THREE.Vector3(Math.cos(a) * radius, hornBase + t * s.hornHeight, .16 + Math.sin(a) * radius);
  }));
  mesh('HornSpiral', new THREE.TubeGeometry(helix, 60, .012, 5, false), accent, horn);
  const hat = new THREE.Group(); hat.name = 'RebootHat'; root.add(hat);
  oval('HatDome', [.24, .085, .235], [-.28, .16 + s.height - .17, -.23], accent, hat);
  const band = new THREE.TorusGeometry(.19, .025, 7, 24); band.rotateX(Math.PI / 2);
  band.translate(-.28, .16 + s.height - .205, -.23); mesh('HatBand', band, pearl, hat);
  // All accessories inherit the same root deformation. Horn is in front of the hat, with a gap.
  const clips = ['idle_reserved', 'idle_expressive'].map(name => new THREE.AnimationClip(name, 3, [
    new THREE.VectorKeyframeTrack('AruconRoot.scale', [0, 1.5, 3], [1, 1, 1, 1.008, 1.016, 1.008, 1, 1, 1]),
    ...['Eye_L', 'Eye_R'].map(name => new THREE.NumberKeyframeTrack(name + '.morphTargetInfluences[Blink]', [0, 2.6, 2.72, 2.9, 3], [0, 0, 1, 0, 0])),
  ]));
  clips.push(new THREE.AnimationClip('walk', .56, [new THREE.VectorKeyframeTrack('AruconRoot.scale', [0, .14, .28, .42, .56],
    [1, 1, 1, .99, 1.02, 1, 1, 1, 1, 1.02, .99, 1, 1, 1, 1])]));
  clips.push(new THREE.AnimationClip('sleep', 4, [new THREE.VectorKeyframeTrack('AruconRoot.scale', [0, 2, 4], [1.1, .8, 1.1, 1.11, .82, 1.11, 1.1, .8, 1.1]),
    ...['Eye_L', 'Eye_R'].map(name => new THREE.NumberKeyframeTrack(name + '.morphTargetInfluences[Blink]', [0, 4], [1, 1]))]));
  return { scene, clips };
}
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
await mkdir(directory, { recursive: true });
const records = [];
for (const spec of specs.stages) {
  const { scene, clips } = buildRebootCharacter(spec);
  const bytes = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips }));
  const filename = spec.id + '.glb';
  if (process.argv.includes('--check')) {
    if (!(await readFile(resolve(directory, filename))).equals(bytes)) throw Error('Candidate regeneration differs: ' + filename);
  } else await writeFile(resolve(directory, filename), bytes);
  records.push({ stage: spec.id, file: filename, sha256: digest(bytes), bytes: bytes.length,
    runtimeScale: spec.runtimeScale, hornCount: 1, topology: 'new parametric body/face/feet/horn/hat', approval: 'USER_REVIEW_PENDING' });
}
const manifest = JSON.stringify({ schemaVersion: 1, source: 'source.json + generate-reboot-characters.mjs', originalPreserved: true, records }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await readFile(resolve(directory, 'manifest.json'), 'utf8') !== manifest) throw Error('Manifest differs');
} else await writeFile(resolve(directory, 'manifest.json'), manifest);
console.log(JSON.stringify(records));
}

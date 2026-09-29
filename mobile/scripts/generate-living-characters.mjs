#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGlb, generateCandidate, findMeshBounds } from './generate-character-candidates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'assets/arucon_tsundere_motion.glb'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = '6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f';
if (hash(source) !== sourceHash) throw Error('Original art changed; stop instead of overwriting it');
const parsed = parseGlb(source);
const specs = [
  { id: 'baby_v3', body: 'mochi', ear: 'soft', height: .98, depth: .29, breadth: .035 },
  { id: 'mallu', body: 'low', ear: 'folded', height: .82, depth: .23, breadth: .20 },
  { id: 'mono', body: 'pear', ear: 'asymmetric', height: 1.10, depth: .16, breadth: -.02 },
  { id: 'piko', body: 'poised', ear: 'upright', height: .98, depth: .16, breadth: -.04 },
  { id: 'mongle', body: 'lobed', ear: 'round', height: .96, depth: .26, breadth: .10 },
];
function body([x, y, z], s) {
  const t = (y - .105) / 2.005;
  const belly = Math.exp(-Math.pow((t - .42) / .31, 2));
  const outline = s.body === 'lobed' ? 1 + .055 * Math.cos(Math.atan2(z, x) * 5) * belly : 1;
  const width = 1 + s.breadth * belly + (s.body === 'pear' ? .08 * Math.exp(-Math.pow((t - .26) / .2, 2)) : 0);
  return [x * width * outline, .105 + (y - .105) * s.height,
    z * (1 + s.depth * (.55 + .45 * belly)) * outline + (s.body === 'poised' ? .06 * Math.sin(t * Math.PI) : 0)];
}
function transform(name, s) {
  if (name === 'Horn') return ([x, y, z]) => {
    const h = y - 2.035;
    return [x * 1.20, .105 + (2.035 - .105) * s.height + h * .62 / Math.sqrt(1 + Math.max(-.8, h)), z * 1.20 - h * .11];
  };
  if (name.startsWith('Foot_')) return ([x, y, z]) => [x * (1 + s.breadth * .55), y,
    z * (1 + s.depth * .28) + (s.body === 'poised' && name.includes('Front') ? .08 : 0)];
  if (name.startsWith('Ear_')) return ([x, y, z]) => {
    const side = name === 'Ear_L' ? -1 : 1;
    const base = body([side * .70, 1.72, .055], s);
    let dx = x - side * .70, dy = y - 1.72;
    const angle = s.ear === 'upright' ? side * 2.4 : s.ear === 'folded' ? side * .35 : s.ear === 'asymmetric' ? side === -1 ? -.35 : .08 : 0;
    const width = s.ear === 'round' ? 1.08 : s.ear === 'folded' ? 1.1 : .93;
    const length = s.ear === 'round' ? .43 : s.ear === 'upright' ? .66 : s.ear === 'asymmetric' ? side === -1 ? .53 : .98 : s.ear === 'folded' ? .63 : .85;
    dx *= width; dy *= length;
    return [base[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
      base[1] + dx * Math.sin(angle) + dy * Math.cos(angle), base[2] + (z - .055) * (s.ear === 'round' ? 1.5 : 1.15)];
  };
  return p => body(p, s);
}
const output = resolve(root, 'assets/living-characters');
await mkdir(output, { recursive: true });
const entries = [];
for (const spec of specs) {
  const model = generateCandidate(parsed, spec, transform);
  const path = `${spec.id}.glb`;
  if (process.argv.includes('--check')) {
    const existing = await readFile(resolve(output, path));
    if (!existing.equals(model.bytes)) throw Error(`Non-deterministic output: ${path}`);
  } else await writeFile(resolve(output, path), model.bytes);
  entries.push({ ...spec, path, sha256: hash(model.bytes),
    geometry: Object.fromEntries(['Body', 'Horn', 'Ear_L', 'Ear_R', 'Foot_R_Front'].map(name => [name, findMeshBounds(model.json, model.bin, name)])) });
}
const manifest = `${JSON.stringify({ schemaVersion: 1, sourceSha256: sourceHash, originalPreserved: true,
  approval: 'USER_REVIEW_PENDING', runtimeVisual: 'NOT_RUN', description: 'Editable nonlinear silhouette/ear drafts; shared source morph/animation contract.', entries }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(resolve(output, 'manifest.json'), 'utf8') !== manifest) throw Error('Manifest differs');
} else await writeFile(resolve(output, 'manifest.json'), manifest);
console.log(`Living character drafts: ${entries.map(x => x.id).join(', ')}; original ${sourceHash}`);

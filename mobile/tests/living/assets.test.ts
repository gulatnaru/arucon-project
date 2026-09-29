import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseGlb } from '../../src/scene/gltfRuntime';
import * as THREE from 'three';

const root = resolve(import.meta.dirname, '../..');
test('five living draft assets regenerate, preserve original and retain 15 clips / 18 morph bindings', async () => {
  const generated = spawnSync(process.execPath, ['scripts/generate-living-characters.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(generated.status, 0, generated.stderr);
  const original = readFileSync(resolve(root, 'assets/arucon_tsundere_motion.glb'));
  assert.equal(createHash('sha256').update(original).digest('hex'), '6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f');
  const hashes = new Set();
  for (const id of ['baby_v3', 'mallu', 'mono', 'piko', 'mongle']) {
    const bytes = readFileSync(resolve(root, `assets/living-characters/${id}.glb`));
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    const model = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    assert.equal(model.animations.length, 15);
    let count = 0;
    model.scene.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      count++; assert.equal(Object.keys(node.morphTargetDictionary ?? {}).length, 18);
      for (const attr of [node.geometry.getAttribute('position'), node.geometry.getAttribute('normal'), ...node.geometry.morphAttributes.position]) {
        assert.ok(Array.from(attr.array).every(Number.isFinite));
      }
      node.geometry.dispose();
    });
    assert.equal(count, 14);
  }
  assert.equal(hashes.size, 5);
});
test('first forms change local ear silhouettes, including asymmetric mono, not only whole-model scale or color', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'assets/living-characters/manifest.json'), 'utf8'));
  const rows = Object.fromEntries(manifest.entries.map((row: { id: string }) => [row.id, row]));
  const height = (box: { min: number[]; max: number[] }) => box.max[1] - box.min[1];
  assert.ok(Math.abs(height(rows.mono.geometry.Ear_L) - height(rows.mono.geometry.Ear_R)) > .2);
  assert.ok(rows.piko.geometry.Ear_R.max[1] > rows.piko.geometry.Body.max[1]);
  assert.ok(height(rows.mongle.geometry.Ear_R) < height(rows.baby_v3.geometry.Ear_R));
  assert.ok(height(rows.mallu.geometry.Body) < height(rows.mono.geometry.Body));
  assert.equal(manifest.approval, 'USER_REVIEW_PENDING');
});

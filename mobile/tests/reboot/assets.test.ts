import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
const root = new URL('../../assets/', import.meta.url);
const original = '6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f';
type Glb = { nodes: { name?: string; mesh?: number }[]; meshes: { primitives: { targets?: unknown[] }[] }[]; animations: { name: string }[] };
function parsed(name: string): Glb {
  const bytes = readFileSync(new URL('reboot-characters/' + name + '.glb', root));
  const length = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8')) as Glb;
}
test('review assets preserve original and contain exactly one attached horn, hat, full feet and facial morphs', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('arucon_tsundere_motion.glb', root))).digest('hex'), original);
  const hashes = [];
  for (const stage of ['baby', 'growing', 'evolved']) {
    const glb = parsed(stage), names = glb.nodes.map(x => x.name);
    assert.equal(names.filter(x => x === 'Horn').length, 1);
    for (const n of ['Body', 'Mouth', 'Ear_L', 'Ear_R', 'Eye_L', 'Eye_R', 'RebootHat', 'Foot_L_Front', 'Foot_R_Front', 'Foot_L_Back', 'Foot_R_Back']) assert.ok(names.includes(n), n);
    const eye = glb.nodes.find(x => x.name === 'Eye_L')!;
    assert.equal(glb.meshes[eye.mesh!].primitives[0].targets?.length, 2);
    assert.ok(glb.animations.some(x => x.name === 'walk')); assert.ok(glb.animations.some(x => x.name === 'sleep'));
    hashes.push(createHash('sha256').update(readFileSync(new URL('reboot-characters/' + stage + '.glb', root))).digest('hex'));
  }
  assert.equal(new Set(hashes).size, 3);
  const spec = JSON.parse(readFileSync(new URL('reboot-characters/source.json', root), 'utf8'));
  assert.equal(spec.hornCount, 1); assert.equal(spec.approval, 'USER_REVIEW_PENDING');
  assert.equal(new Set(spec.stages.map((x: { outline: number[] }) => JSON.stringify(x.outline))).size, 3);
});

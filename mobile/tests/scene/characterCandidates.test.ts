import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseGlb } from '../../src/scene/gltfRuntime';

interface GltfAccessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
}

interface GltfPrimitive {
  attributes: { POSITION: number; NORMAL: number };
  indices: number;
  targets?: { POSITION: number; NORMAL: number }[];
}

interface GltfJson {
  asset: { extras?: { aruconCharacterCandidate?: { id: string; sourceSha256: string } } };
  accessors: GltfAccessor[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
  nodes: { name: string; mesh?: number }[];
  meshes: { extras?: { targetNames?: string[] }; primitives: GltfPrimitive[] }[];
  animations: { name: string }[];
}

interface ParsedGlb {
  bytes: Buffer;
  json: GltfJson;
  bin: Buffer;
}

interface CandidateManifest {
  source: { sha256: string; preserved: boolean };
  defaultId: string;
  approvalState: string;
  candidates: { id: string; path: string; sha256: string }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '../..');
const originalPath = resolve(mobileRoot, 'assets/arucon_tsundere_motion.glb');
const candidateDirectory = resolve(mobileRoot, 'assets/character-candidates');
const manifest = JSON.parse(
  readFileSync(resolve(candidateDirectory, 'manifest.json'), 'utf8'),
) as CandidateManifest;

function parseGlbFile(path: string): ParsedGlb {
  const bytes = readFileSync(path);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  let offset = 12;
  let json: GltfJson | undefined;
  let bin: Buffer | undefined;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trimEnd()) as GltfJson;
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  assert.ok(json);
  assert.ok(bin);
  return { bytes, json, bin };
}

const original = parseGlbFile(originalPath);
const candidates = Object.fromEntries(
  manifest.candidates.map((entry) => [entry.id, parseGlbFile(resolve(candidateDirectory, entry.path))]),
) as Record<'moderate' | 'plump', ParsedGlb>;

function componentLayout(componentType: number) {
  if (componentType === 5126) return { bytes: 4, read: (bin: Buffer, offset: number) => bin.readFloatLE(offset) };
  if (componentType === 5125) return { bytes: 4, read: (bin: Buffer, offset: number) => bin.readUInt32LE(offset) };
  if (componentType === 5123) return { bytes: 2, read: (bin: Buffer, offset: number) => bin.readUInt16LE(offset) };
  if (componentType === 5121) return { bytes: 1, read: (bin: Buffer, offset: number) => bin.readUInt8(offset) };
  throw new Error(`Unsupported component type ${componentType}`);
}

function readAccessor(model: ParsedGlb, accessorIndex: number): number[][] {
  const accessor = model.json.accessors[accessorIndex];
  const view = model.json.bufferViews[accessor.bufferView];
  const components = accessor.type === 'SCALAR' ? 1 : accessor.type === 'VEC3' ? 3 : 0;
  assert.ok(components > 0);
  const layout = componentLayout(accessor.componentType);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? components * layout.bytes;
  return Array.from({ length: accessor.count }, (_, index) =>
    Array.from({ length: components }, (__, component) =>
      layout.read(model.bin, start + index * stride + component * layout.bytes)),
  );
}

function meshPrimitive(model: ParsedGlb, name: string) {
  const node = model.json.nodes.find((candidate) => candidate.name === name);
  assert.ok(node?.mesh !== undefined, `Missing mesh node ${name}`);
  return model.json.meshes[node.mesh].primitives[0];
}

function positions(model: ParsedGlb, name: string) {
  return readAccessor(model, meshPrimitive(model, name).attributes.POSITION);
}

function bounds(values: number[][]) {
  return {
    min: [0, 1, 2].map((axis) => Math.min(...values.map((value) => value[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...values.map((value) => value[axis]))),
  };
}

function allPositions(model: ParsedGlb) {
  return model.json.nodes.flatMap((node) =>
    node.mesh === undefined
      ? []
      : model.json.meshes[node.mesh].primitives.flatMap((primitive) =>
        readAccessor(model, primitive.attributes.POSITION)),
  );
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function triangleOrientation(model: ParsedGlb) {
  let forward = 0;
  let backward = 0;
  for (const mesh of model.json.meshes) {
    for (const primitive of mesh.primitives) {
      const vertices = readAccessor(model, primitive.attributes.POSITION);
      const normals = readAccessor(model, primitive.attributes.NORMAL);
      const indices = readAccessor(model, primitive.indices).flat();
      for (let offset = 0; offset < indices.length; offset += 3) {
        const [a, b, c] = indices.slice(offset, offset + 3).map((index) => vertices[index]);
        const edge1 = b.map((value, axis) => value - a[axis]);
        const edge2 = c.map((value, axis) => value - a[axis]);
        const cross = [
          edge1[1] * edge2[2] - edge1[2] * edge2[1],
          edge1[2] * edge2[0] - edge1[0] * edge2[2],
          edge1[0] * edge2[1] - edge1[1] * edge2[0],
        ];
        if (Math.hypot(...cross) < 1e-9) continue;
        const normal = [0, 1, 2].map((axis) =>
          normals[indices[offset]][axis] + normals[indices[offset + 1]][axis] + normals[indices[offset + 2]][axis]);
        const dot = cross.reduce((sum, value, axis) => sum + value * normal[axis], 0);
        if (dot > 0) forward += 1;
        else backward += 1;
      }
    }
  }
  return { forward, backward };
}

test('candidate catalog keeps the original default and uses Expo static asset requires', () => {
  const source = readFileSync(resolve(mobileRoot, 'src/scene/characterCandidates.ts'), 'utf8');
  assert.equal(manifest.defaultId, 'original');
  assert.equal(manifest.approvalState, 'USER_REVIEW_PENDING');
  assert.match(source, /CharacterCandidateId = 'original' \| 'moderate' \| 'plump'/u);
  assert.match(source, /DEFAULT_CHARACTER_CANDIDATE_ID: CharacterCandidateId = 'original'/u);
  assert.match(source, /require\('\.\.\/\.\.\/assets\/arucon_tsundere_motion\.glb'\)/u);
  assert.match(source, /require\('\.\.\/\.\.\/assets\/character-candidates\/arucon_v2_moderate\.glb'\)/u);
  assert.match(source, /require\('\.\.\/\.\.\/assets\/character-candidates\/arucon_v2_plump\.glb'\)/u);
  assert.equal((source.match(/isDefault: true/gu) ?? []).length, 1);
});

test('generation is deterministic and the original source hash remains locked', () => {
  assert.equal(manifest.source.preserved, true);
  assert.equal(sha256(original.bytes), manifest.source.sha256);
  for (const entry of manifest.candidates) assert.equal(sha256(candidates[entry.id as 'moderate' | 'plump'].bytes), entry.sha256);
  const result = spawnSync(process.execPath, ['scripts/generate-character-candidates.mjs', '--check'], {
    cwd: mobileRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('both candidates parse through the runtime loader with the original animation and morph contracts', async () => {
  const originalAnimationNames = original.json.animations.map((animation) => animation.name);
  const originalTargets = original.json.meshes.map((mesh) => mesh.extras?.targetNames);
  for (const [id, candidate] of Object.entries(candidates)) {
    const data = candidate.bytes.buffer.slice(
      candidate.bytes.byteOffset,
      candidate.bytes.byteOffset + candidate.bytes.byteLength,
    ) as ArrayBuffer;
    const runtime = await parseGlb(data);
    assert.equal(runtime.animations.length, 15);
    assert.deepEqual(candidate.json.animations.map((animation) => animation.name), originalAnimationNames);
    assert.deepEqual(candidate.json.meshes.map((mesh) => mesh.extras?.targetNames), originalTargets);
    assert.equal(candidate.json.asset.extras?.aruconCharacterCandidate?.id, id);
    assert.equal(candidate.json.asset.extras?.aruconCharacterCandidate?.sourceSha256, manifest.source.sha256);
  }
});

test('volume grows through front and back depth while the room-facing footprint stays small', () => {
  const originalBody = bounds(positions(original, 'Body'));
  const moderateBody = bounds(positions(candidates.moderate, 'Body'));
  const plumpBody = bounds(positions(candidates.plump, 'Body'));
  assert.ok(moderateBody.max[2] > originalBody.max[2]);
  assert.ok(-moderateBody.min[2] > -originalBody.min[2]);
  assert.ok(plumpBody.max[2] > moderateBody.max[2]);
  assert.ok(-plumpBody.min[2] > -moderateBody.min[2]);

  const originalFootprint = bounds(allPositions(original));
  for (const candidate of Object.values(candidates)) {
    const footprint = bounds(allPositions(candidate));
    const originalWidth = originalFootprint.max[0] - originalFootprint.min[0];
    const width = footprint.max[0] - footprint.min[0];
    assert.ok(width / originalWidth <= 1.04);
    assert.ok(footprint.max[1] - footprint.min[1] <= originalFootprint.max[1] - originalFootprint.min[1]);
  }
});

test('shorter rounded horns, forward face placement, and grounded feet progress by candidate', () => {
  const models = [original, candidates.moderate, candidates.plump];
  const hornBounds = models.map((model) => bounds(positions(model, 'Horn')));
  const hornHeights = hornBounds.map((value) => value.max[1] - value.min[1]);
  const hornWidths = hornBounds.map((value) => value.max[0] - value.min[0]);
  assert.ok(hornHeights[0] > hornHeights[1] && hornHeights[1] > hornHeights[2]);
  assert.ok(hornWidths[0] < hornWidths[1] && hornWidths[1] < hornWidths[2]);

  for (const face of ['Eye_L', 'Eye_R', 'Mouth']) {
    const faceDepth = models.map((model) => positions(model, face).reduce((sum, point) => sum + point[2], 0) / positions(model, face).length);
    assert.ok(faceDepth[0] < faceDepth[1] && faceDepth[1] < faceDepth[2]);
  }
  for (const model of models) {
    for (const foot of ['Foot_L_Front', 'Foot_L_Back', 'Foot_R_Front', 'Foot_R_Back']) {
      assert.equal(bounds(positions(model, foot)).min[1], 0);
    }
  }
});

test('candidate base and morph geometry stays finite and triangle winding stays outward', () => {
  for (const candidate of Object.values(candidates)) {
    candidate.json.meshes.forEach((mesh, meshIndex) => {
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        const sourcePrimitive = original.json.meshes[meshIndex].primitives[primitiveIndex];
        assert.deepEqual(readAccessor(candidate, primitive.indices), readAccessor(original, sourcePrimitive.indices));
        assert.equal(primitive.targets?.length, sourcePrimitive.targets?.length);
        assert.equal(primitive.targets?.length, 18);
        const accessors = [
          primitive.attributes.POSITION,
          primitive.attributes.NORMAL,
          ...(primitive.targets ?? []).flatMap((target) => [target.POSITION, target.NORMAL]),
        ];
        for (const accessor of accessors) {
          for (const vector of readAccessor(candidate, accessor)) {
            assert.ok(vector.every(Number.isFinite));
          }
        }
        for (const target of primitive.targets ?? []) {
          const basePositions = readAccessor(candidate, primitive.attributes.POSITION);
          const baseNormals = readAccessor(candidate, primitive.attributes.NORMAL);
          const positionDeltas = readAccessor(candidate, target.POSITION);
          const normalDeltas = readAccessor(candidate, target.NORMAL);
          assert.equal(positionDeltas.length, basePositions.length);
          assert.equal(normalDeltas.length, baseNormals.length);
          normalDeltas.forEach((delta, index) => {
            const morphedNormal = delta.map((value, axis) => value + baseNormals[index][axis]);
            assert.ok(Math.hypot(...morphedNormal) > 0.5);
          });
        }
      });
    });
    const orientation = triangleOrientation(candidate);
    assert.ok(orientation.forward > 20_000);
    assert.equal(orientation.backward, 0);
  }
});

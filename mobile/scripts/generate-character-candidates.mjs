#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATOR_VERSION = 1;
const SOURCE_SHA256 = '6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f';
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const GLB_MAGIC = 0x46546c67;
const FLOAT = 5126;
const VEC3 = 'VEC3';
const EPSILON = 1e-4;

const scriptPath = fileURLToPath(import.meta.url);
const mobileRoot = resolve(dirname(scriptPath), '..');
const sourcePath = resolve(mobileRoot, 'assets/arucon_tsundere_motion.glb');
const outputDirectory = resolve(mobileRoot, 'assets/character-candidates');

const candidateSpecs = [
  {
    id: 'moderate',
    label: '볼륨을 조금 늘린 후보',
    depthGain: 0.11,
    sideGain: 0.016,
    heightCompression: 0.01,
    hornLengthScale: 0.88,
    hornRadiusScale: 1.07,
    hornTilt: 0.035,
  },
  {
    id: 'plump',
    label: '더 도톰한 후보',
    depthGain: 0.23,
    sideGain: 0.034,
    heightCompression: 0.022,
    hornLengthScale: 0.78,
    hornRadiusScale: 1.13,
    hornTilt: 0.055,
  },
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parseGlb(bytes) {
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error('Source is not a GLB');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Only glTF 2.0 is supported');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB length header is invalid');

  let offset = 12;
  let json;
  let bin;
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === JSON_CHUNK) json = JSON.parse(chunk.toString('utf8').trimEnd());
    if (chunkType === BIN_CHUNK) bin = Buffer.from(chunk);
    offset += 8 + chunkLength;
  }
  if (!json || !bin) throw new Error('GLB must have JSON and BIN chunks');
  return { json, bin };
}

function encodeGlb(json, bin) {
  const rawJson = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPadding = (4 - (rawJson.length % 4)) % 4;
  const jsonChunk = Buffer.concat([rawJson, Buffer.alloc(jsonPadding, 0x20)]);
  const binPadding = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPadding)]);
  const result = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  result.writeUInt32LE(GLB_MAGIC, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonChunk.length, 12);
  result.writeUInt32LE(JSON_CHUNK, 16);
  jsonChunk.copy(result, 20);
  const binHeader = 20 + jsonChunk.length;
  result.writeUInt32LE(binChunk.length, binHeader);
  result.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  binChunk.copy(result, binHeader + 8);
  return result;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function accessorLayout(json, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  if (accessor.componentType !== FLOAT || accessor.type !== VEC3 || accessor.sparse) {
    throw new Error(`Accessor ${accessorIndex} must be a dense FLOAT VEC3`);
  }
  const view = json.bufferViews[accessor.bufferView];
  return {
    accessor,
    start: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
    stride: view.byteStride ?? 12,
  };
}

function readVec3Accessor(json, bin, accessorIndex) {
  const { accessor, start, stride } = accessorLayout(json, accessorIndex);
  return Array.from({ length: accessor.count }, (_, index) => {
    const offset = start + index * stride;
    return [bin.readFloatLE(offset), bin.readFloatLE(offset + 4), bin.readFloatLE(offset + 8)];
  });
}

function writeVec3Accessor(json, bin, accessorIndex, values) {
  const { accessor, start, stride } = accessorLayout(json, accessorIndex);
  if (accessor.count !== values.length) throw new Error(`Accessor ${accessorIndex} count changed`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  values.forEach((value, index) => {
    if (value.length !== 3 || !value.every(Number.isFinite)) {
      throw new Error(`Accessor ${accessorIndex} has a non-finite vector`);
    }
    const offset = start + index * stride;
    for (let axis = 0; axis < 3; axis += 1) {
      bin.writeFloatLE(value[axis], offset + axis * 4);
      min[axis] = Math.min(min[axis], value[axis]);
      max[axis] = Math.max(max[axis], value[axis]);
    }
  });
  accessor.min = min;
  accessor.max = max;
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(value) {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!Number.isFinite(length) || length < 1e-10) throw new Error('Normal has zero length');
  return value.map((component) => component / length);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function bodyTransform(point, spec) {
  const [x, y, z] = point;
  const bottom = 0.105;
  const top = 2.11;
  const t = clamp((y - bottom) / (top - bottom), 0, 1);
  const round = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.8);
  const belly = Math.exp(-Math.pow((t - 0.38) / 0.24, 2));
  const back = Math.exp(-Math.pow((t - 0.48) / 0.3, 2));
  const frontBlend = 0.5 + 0.5 * Math.tanh(z / 0.18);
  const frontProfile = 0.48 + 0.34 * round + 0.18 * belly;
  const backProfile = 0.5 + 0.3 * round + 0.2 * back;
  const depthProfile = backProfile + (frontProfile - backProfile) * frontBlend;
  const transformedY = bottom + (y - bottom) * (1 - spec.heightCompression);
  return [
    x * (1 + spec.sideGain * round),
    transformedY,
    z * (1 + spec.depthGain * depthProfile),
  ];
}

function footTransform(point, spec, name) {
  const front = name.endsWith('Front');
  const zDirection = front ? 1 : -1;
  return [
    point[0] * (1 + spec.sideGain * 0.35),
    point[1],
    point[2] * (1 + spec.depthGain * 0.36) + zDirection * spec.depthGain * 0.035,
  ];
}

function hornTransform(point, spec) {
  const baseY = 2.035;
  const compressedBaseY = 0.105 + (baseY - 0.105) * (1 - spec.heightCompression);
  const height = point[1] - baseY;
  return [
    point[0] * spec.hornRadiusScale,
    compressedBaseY + height * spec.hornLengthScale,
    point[2] * spec.hornRadiusScale + height * spec.hornTilt,
  ];
}

function transformForMesh(name, spec) {
  if (name === 'Horn') return (point) => hornTransform(point, spec);
  if (name.startsWith('Foot_')) return (point) => footTransform(point, spec, name);
  return (point) => bodyTransform(point, spec);
}

function determinant3(matrix) {
  return (
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
  );
}

function inverseTranspose3(matrix) {
  const determinant = determinant3(matrix);
  if (!Number.isFinite(determinant) || determinant <= 1e-8) {
    throw new Error(`Transform is not orientation preserving (${determinant})`);
  }
  const inverse = [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) / determinant,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) / determinant,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) / determinant,
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) / determinant,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) / determinant,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) / determinant,
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) / determinant,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) / determinant,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) / determinant,
    ],
  ];
  return [
    [inverse[0][0], inverse[1][0], inverse[2][0]],
    [inverse[0][1], inverse[1][1], inverse[2][1]],
    [inverse[0][2], inverse[1][2], inverse[2][2]],
  ];
}

function transformNormal(point, normal, transform) {
  const columns = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const before = [...point];
    const after = [...point];
    before[axis] -= EPSILON;
    after[axis] += EPSILON;
    const low = transform(before);
    const high = transform(after);
    columns.push(high.map((value, index) => (value - low[index]) / (2 * EPSILON)));
  }
  const jacobian = [
    [columns[0][0], columns[1][0], columns[2][0]],
    [columns[0][1], columns[1][1], columns[2][1]],
    [columns[0][2], columns[1][2], columns[2][2]],
  ];
  const normalMatrix = inverseTranspose3(jacobian);
  return normalize(normalMatrix.map((row) => row[0] * normal[0] + row[1] * normal[1] + row[2] * normal[2]));
}

function vectorBounds(values) {
  return {
    min: [0, 1, 2].map((axis) => Math.min(...values.map((value) => value[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...values.map((value) => value[axis]))),
  };
}

function deformMesh(json, sourceBin, outputBin, mesh, nodeName, spec, transformFactory, attachmentFactory) {
  const transform = transformFactory(nodeName, spec);
  const attachment = attachmentFactory?.(nodeName, spec);
  for (const primitive of mesh.primitives) {
    const sourcePositions = readVec3Accessor(json, sourceBin, primitive.attributes.POSITION);
    const sourceNormals = readVec3Accessor(json, sourceBin, primitive.attributes.NORMAL);
    const roots = sourcePositions.flatMap((point, index) => point[1] >= 1.70 && Math.abs(point[0]) <= .85 ? [index] : []);
    const rootOffset = (source, shaped) => {
      if (!attachment) return [0, 0, 0];
      if (!roots.length) throw new Error(`Missing attachment vertices: ${nodeName}`);
      const offset = [0, 0, 0];
      for (const index of roots) {
        const expected = attachment(source[index]);
        for (let axis = 0; axis < 3; axis++) offset[axis] += (expected[axis] - shaped[index][axis]) / roots.length;
      }
      return offset;
    };
    const shapedPositions = sourcePositions.map(transform);
    const baseOffset = rootOffset(sourcePositions, shapedPositions);
    const outputPositions = attachment ? shapedPositions.map(point => add(point, baseOffset)) : shapedPositions;
    const outputNormals = sourceNormals.map((normal, index) => transformNormal(sourcePositions[index], normal, transform));
    writeVec3Accessor(json, outputBin, primitive.attributes.POSITION, outputPositions);
    writeVec3Accessor(json, outputBin, primitive.attributes.NORMAL, outputNormals);

    for (const target of primitive.targets ?? []) {
      const sourcePositionDeltas = readVec3Accessor(json, sourceBin, target.POSITION);
      const sourceNormalDeltas = readVec3Accessor(json, sourceBin, target.NORMAL);
      const outputPositionDeltas = [];
      const outputNormalDeltas = [];
      const morphedPositions = sourcePositions.map((point, index) => add(point, sourcePositionDeltas[index]));
      const shapedMorphed = morphedPositions.map(transform);
      const targetOffset = rootOffset(morphedPositions, shapedMorphed);
      for (let index = 0; index < sourcePositions.length; index += 1) {
        const sourceMorphedPosition = add(sourcePositions[index], sourcePositionDeltas[index]);
        const sourceMorphedNormal = normalize(add(sourceNormals[index], sourceNormalDeltas[index]));
        const outputMorphedPosition = attachment ? add(shapedMorphed[index], targetOffset) : shapedMorphed[index];
        const outputMorphedNormal = transformNormal(sourceMorphedPosition, sourceMorphedNormal, transform);
        outputPositionDeltas.push(subtract(outputMorphedPosition, outputPositions[index]));
        outputNormalDeltas.push(subtract(outputMorphedNormal, outputNormals[index]));
      }
      writeVec3Accessor(json, outputBin, target.POSITION, outputPositionDeltas);
      writeVec3Accessor(json, outputBin, target.NORMAL, outputNormalDeltas);
    }
  }
}

export function generateCandidate(parsed, spec, transformFactory = transformForMesh, attachmentFactory) {
  const json = cloneJson(parsed.json);
  const bin = Buffer.from(parsed.bin);
  json.nodes.forEach((node) => {
    if (node.mesh === undefined) return;
    deformMesh(json, parsed.bin, bin, json.meshes[node.mesh], node.name, spec, transformFactory, attachmentFactory);
  });
  json.asset.extras = {
    ...(json.asset.extras ?? {}),
    aruconCharacterCandidate: {
      id: spec.id,
      generatorVersion: GENERATOR_VERSION,
      sourceSha256: SOURCE_SHA256,
      parameters: Object.fromEntries(
        Object.entries(spec).filter(([key]) => !['id', 'label'].includes(key)),
      ),
    },
  };
  return { bytes: encodeGlb(json, bin), json, bin };
}

export function findMeshBounds(json, bin, nodeName) {
  const node = json.nodes.find((candidate) => candidate.name === nodeName);
  if (!node || node.mesh === undefined) throw new Error(`Missing node ${nodeName}`);
  const positions = json.meshes[node.mesh].primitives.flatMap((primitive) =>
    readVec3Accessor(json, bin, primitive.attributes.POSITION),
  );
  return vectorBounds(positions);
}

function summarizeGeometry(json, bin) {
  return Object.fromEntries(
    ['Body', 'Horn', 'Eye_L', 'Eye_R', 'Mouth', 'Foot_L_Front', 'Foot_L_Back', 'Foot_R_Front', 'Foot_R_Back'].map(
      (name) => [name, findMeshBounds(json, bin, name)],
    ),
  );
}

async function buildOutputs() {
  const sourceBytes = await readFile(sourcePath);
  const actualSourceHash = sha256(sourceBytes);
  if (actualSourceHash !== SOURCE_SHA256) {
    throw new Error(`Original GLB changed: expected ${SOURCE_SHA256}, received ${actualSourceHash}`);
  }
  const parsed = parseGlb(sourceBytes);
  const generated = candidateSpecs.map((spec) => ({ spec, ...generateCandidate(parsed, spec) }));
  const scriptHash = sha256(await readFile(scriptPath));
  const manifest = {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    generatorSha256: scriptHash,
    source: {
      path: '../arucon_tsundere_motion.glb',
      sha256: SOURCE_SHA256,
      preserved: true,
      geometry: summarizeGeometry(parsed.json, parsed.bin),
    },
    defaultId: 'original',
    approvalState: 'USER_REVIEW_PENDING',
    candidates: generated.map(({ spec, bytes, json, bin }) => ({
      id: spec.id,
      label: spec.label,
      path: `arucon_v2_${spec.id}.glb`,
      sha256: sha256(bytes),
      parameters: Object.fromEntries(Object.entries(spec).filter(([key]) => !['id', 'label'].includes(key))),
      geometry: summarizeGeometry(json, bin),
    })),
  };
  return {
    files: [
      ...generated.map(({ spec, bytes }) => ({ path: resolve(outputDirectory, `arucon_v2_${spec.id}.glb`), bytes })),
      { path: resolve(outputDirectory, 'manifest.json'), bytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) },
    ],
    manifest,
  };
}

async function checkOutputs(files) {
  let matches = true;
  for (const file of files) {
    let existing;
    try {
      existing = await readFile(file.path);
    } catch {
      existing = Buffer.alloc(0);
    }
    if (!existing.equals(file.bytes)) {
      console.error(`Generated output differs: ${file.path}`);
      matches = false;
    }
  }
  if (!matches) process.exitCode = 1;
}

async function main() {
  const { files, manifest } = await buildOutputs();
  if (process.argv.includes('--check')) {
    await checkOutputs(files);
    if (!process.exitCode) console.log('Character candidate outputs are deterministic and current.');
    return;
  }
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(files.map((file) => writeFile(file.path, file.bytes)));
  console.log(
    `Generated ${manifest.candidates.map((candidate) => `${candidate.id}:${candidate.sha256}`).join(' ')}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) await main();

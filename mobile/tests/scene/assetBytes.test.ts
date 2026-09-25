import assert from 'node:assert/strict';
import test from 'node:test';
import { readAssetBytes, type AssetFilePort } from '../../src/scene/assetBytes';

class FakeFile implements AssetFilePort<FakeFile> {
  copies = 0;
  deletes = 0;

  constructor(
    readonly uri: string,
    public exists: boolean,
    public size: number,
    private value: Uint8Array<ArrayBuffer>,
    private failure?: Error,
  ) {}

  async bytes() {
    if (this.failure) throw this.failure;
    return this.value;
  }

  copy(destination: FakeFile) {
    this.copies += 1;
    destination.exists = true;
    destination.size = this.size;
    destination.value = this.value;
    destination.failure = undefined;
  }

  delete() {
    this.deletes += 1;
    this.exists = false;
  }
}

const bundleUri = 'file:///app/app.app/';
const bytes = new Uint8Array([1, 2, 3]);

function options(source: FakeFile, cached: FakeFile, overrides: Partial<{
  platform: string;
  hash: string | null;
  uniqueSuffix: string;
}> = {}) {
  const names: string[] = [];
  return {
    names,
    value: {
      platform: overrides.platform ?? 'ios',
      bundleUri,
      source,
      hash: overrides.hash === undefined ? 'asset/hash' : overrides.hash,
      type: 'glb',
      createCacheFile: (name: string) => { names.push(name); return cached; },
      uniqueSuffix: () => overrides.uniqueSuffix ?? 'unique',
    },
  };
}

test('asset bytes use the direct path when it is readable', async () => {
  const source = new FakeFile(`${bundleUri}asset.glb`, true, 3, bytes);
  const cached = new FakeFile('file:///cache/asset.glb', false, 0, new Uint8Array());
  const input = options(source, cached);
  assert.equal(await readAssetBytes(input.value), bytes);
  assert.deepEqual(input.names, []);
  assert.equal(source.copies, 0);
});

test('read-only iOS bundle assets copy to cache and reuse a matching hash entry', async () => {
  const permissionError = new Error('write permission');
  const source = new FakeFile(`${bundleUri}asset.glb`, true, 3, bytes, permissionError);
  const cached = new FakeFile('file:///cache/asset.glb', false, 0, new Uint8Array());
  const input = options(source, cached);
  assert.deepEqual(await readAssetBytes(input.value), bytes);
  assert.deepEqual(input.names, ['arucon-glb-asset_hash.glb']);
  assert.equal(source.copies, 1);
  assert.deepEqual(await readAssetBytes(input.value), bytes);
  assert.equal(source.copies, 1);
  assert.equal(cached.deletes, 0);
});

test('a wrong-sized hashed cache entry is replaced before reading', async () => {
  const source = new FakeFile(`${bundleUri}asset.glb`, true, 3, bytes, new Error('permission'));
  const cached = new FakeFile('file:///cache/asset.glb', true, 2, new Uint8Array([9, 9]));
  const input = options(source, cached);
  assert.deepEqual(await readAssetBytes(input.value), bytes);
  assert.equal(cached.deletes, 1);
  assert.equal(source.copies, 1);
});

test('hashless bundle copies use a unique cache entry and delete it after reading', async () => {
  const source = new FakeFile(`${bundleUri}asset.glb`, true, 3, bytes, new Error('permission'));
  const cached = new FakeFile('file:///cache/asset.glb', false, 0, new Uint8Array());
  const input = options(source, cached, { hash: null, uniqueSuffix: 'one-off' });
  assert.deepEqual(await readAssetBytes(input.value), bytes);
  assert.deepEqual(input.names, ['arucon-glb-uncached-one-off.glb']);
  assert.equal(cached.deletes, 1);
  assert.equal(cached.exists, false);
});

test('Android and non-bundle failures preserve the original error', async () => {
  const androidError = new Error('android read failed');
  const androidSource = new FakeFile(`${bundleUri}asset.glb`, true, 3, bytes, androidError);
  const cached = new FakeFile('file:///cache/asset.glb', false, 0, new Uint8Array());
  await assert.rejects(readAssetBytes(options(androidSource, cached, { platform: 'android' }).value), error =>
    error === androidError);

  const externalError = new Error('external read failed');
  const externalSource = new FakeFile('file:///documents/asset.glb', true, 3, bytes, externalError);
  await assert.rejects(readAssetBytes(options(externalSource, cached).value), error =>
    error === externalError);
  assert.equal(androidSource.copies, 0);
  assert.equal(externalSource.copies, 0);
});

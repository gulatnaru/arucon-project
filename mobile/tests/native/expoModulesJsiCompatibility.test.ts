// @ts-nocheck -- the lifecycle compatibility script is plain ESM JavaScript.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  RUNTIME_SCHEDULER_HEADER,
  applyExpoModulesJsiCompatibilityPatch,
  patchRuntimeSchedulerHeader,
} from '../../scripts/patch-expo-modules-jsi.mjs';

const brokenHeader = `
class RuntimeScheduler {
public:
  SWIFT_RETURNS_RETAINED RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept
      : nativeScheduler(scheduler), scheduleFn(fn) {}
  SWIFT_RETURNS_RETAINED RuntimeScheduler() {}
} SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler);
`;

async function packageFixture(version = '57.1.0', header = brokenHeader) {
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), 'arucon-expo-modules-jsi-'));
  const headerPath = path.join(packageRoot, RUNTIME_SCHEDULER_HEADER);
  await mkdir(path.dirname(headerPath), { recursive: true });
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ version }), 'utf8');
  await writeFile(headerPath, header, 'utf8');
  return { packageRoot, headerPath };
}

test('ExpoModulesJSI patch removes only invalid constructor ownership annotations', () => {
  const result = patchRuntimeSchedulerHeader(brokenHeader);
  assert.equal(result.status, 'patched');
  assert.equal(result.source.includes('SWIFT_RETURNS_RETAINED'), false);
  assert.equal(
    result.source.includes('} SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler);'),
    true,
  );
});

test('ExpoModulesJSI lifecycle patch is idempotent', async () => {
  const fixture = await packageFixture();
  assert.equal((await applyExpoModulesJsiCompatibilityPatch(fixture.packageRoot)).status, 'patched');
  assert.equal((await applyExpoModulesJsiCompatibilityPatch(fixture.packageRoot)).status, 'already-patched');
  assert.equal((await readFile(fixture.headerPath, 'utf8')).includes('SWIFT_RETURNS_RETAINED'), false);
});

test('ExpoModulesJSI lifecycle patch rejects unknown versions and source content', async () => {
  const wrongVersion = await packageFixture('57.1.1');
  await assert.rejects(
    applyExpoModulesJsiCompatibilityPatch(wrongVersion.packageRoot),
    /Unsupported expo-modules-jsi version 57\.1\.1/,
  );

  const changedSource = await packageFixture('57.1.0', 'class RuntimeScheduler {};\n');
  await assert.rejects(
    applyExpoModulesJsiCompatibilityPatch(changedSource.packageRoot),
    /Unsupported RuntimeScheduler\.h content/,
  );
});

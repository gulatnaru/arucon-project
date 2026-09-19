#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_EXPO_MODULES_JSI_VERSION = '57.1.0';
export const RUNTIME_SCHEDULER_HEADER =
  'apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h';

const INVALID_CONSTRUCTORS = [
  'SWIFT_RETURNS_RETAINED RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept',
  'SWIFT_RETURNS_RETAINED RuntimeScheduler() {}',
];
const CORRECTED_CONSTRUCTORS = [
  'RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept',
  'RuntimeScheduler() {}',
];
const SHARED_REFERENCE_DECLARATION =
  '} SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler);';

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

export function patchRuntimeSchedulerHeader(source) {
  const invalidCounts = INVALID_CONSTRUCTORS.map(value => countOccurrences(source, value));
  const correctedCounts = CORRECTED_CONSTRUCTORS.map(value => countOccurrences(source, value));
  const preservesSharedOwnership = countOccurrences(source, SHARED_REFERENCE_DECLARATION) === 1;

  if (invalidCounts.every(count => count === 0) &&
      correctedCounts.every(count => count === 1) && preservesSharedOwnership) {
    return { source, status: 'already-patched' };
  }

  if (!invalidCounts.every(count => count === 1) ||
      !correctedCounts.every(count => count === 1) || !preservesSharedOwnership) {
    throw new Error(
      'Unsupported RuntimeScheduler.h content; refusing to apply the ExpoModulesJSI compatibility patch',
    );
  }

  return {
    source: INVALID_CONSTRUCTORS.reduce(
      (next, invalid, index) => next.replace(invalid, CORRECTED_CONSTRUCTORS[index]),
      source,
    ),
    status: 'patched',
  };
}

export async function applyExpoModulesJsiCompatibilityPatch(packageRoot) {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (packageJson.version !== SUPPORTED_EXPO_MODULES_JSI_VERSION) {
    throw new Error(
      `Unsupported expo-modules-jsi version ${packageJson.version ?? '<missing>'}; ` +
      `expected ${SUPPORTED_EXPO_MODULES_JSI_VERSION}`,
    );
  }

  const headerPath = path.join(packageRoot, RUNTIME_SCHEDULER_HEADER);
  const current = await readFile(headerPath, 'utf8');
  const result = patchRuntimeSchedulerHeader(current);
  if (result.status === 'patched') await writeFile(headerPath, result.source, 'utf8');
  return { ...result, headerPath };
}

async function main() {
  const packageRoot = path.join(process.cwd(), 'node_modules/expo-modules-jsi');
  const result = await applyExpoModulesJsiCompatibilityPatch(packageRoot);
  process.stdout.write(`expo-modules-jsi ${SUPPORTED_EXPO_MODULES_JSI_VERSION}: ${result.status}\n`);
}

// Remove this exact-content compatibility patch after Expo publishes an SDK 57-compatible
// expo-modules-jsi version that omits the invalid constructor attributes (Expo issue #49214).
// The correction is verified with Xcode 26.3 / Swift 6.2.4; other compiler combinations remain
// unverified. Different package versions or unexpected source content are rejected by the guards.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}

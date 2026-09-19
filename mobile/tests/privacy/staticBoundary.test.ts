// @ts-nocheck -- static source-boundary audit uses Node filesystem APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

test('AT-PRIVACY-04: privacy/auth/notification boundaries contain no transport, environment-secret or logging APIs', () => {
  const roots = ['src/privacy', 'src/auth', 'src/notifications'];
  const forbidden = [
    [/\bfetch\s*\(/u, 'fetch'], [/\bXMLHttpRequest\b/u, 'XMLHttpRequest'], [/\bWebSocket\b/u, 'WebSocket'],
    [/\bprocess\.env\b/u, 'process.env'], [/\bconsole\.(?:log|info|warn|error|debug)\b/u, 'console'],
    [/\bAsyncStorage\b/u, 'unreviewed storage'],
  ];
  for (const file of roots.flatMap(sourceFiles)) {
    const source = readFileSync(file, 'utf8');
    for (const [pattern, label] of forbidden) assert.equal(pattern.test(source), false, `${file}: ${label}`);
  }
});

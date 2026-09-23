import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const templateRoot = path.join(mobileRoot, 'native/arucon-widget-template');
const widgetBridgePodspec = path.join(mobileRoot, 'native/arucon-widget/ios/AruconWidgetBridge.podspec');

async function source(relativePath: string) {
  return readFile(path.join(templateRoot, relativePath), 'utf8');
}

const projectionKeys = [
  'petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState',
] as const;
const displayStates = new Set(['awake', 'sleeping', 'hibernating', 'needs_care']);

function validProjectionFixture(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).sort().join('|') !== [...projectionKeys].sort().join('|')) return false;
  if (typeof candidate.petId !== 'string' || candidate.petId.length === 0 ||
      typeof candidate.formId !== 'string' || candidate.formId.length === 0 ||
      typeof candidate.personalityProfileId !== 'string' || candidate.personalityProfileId.length === 0 ||
      typeof candidate.displayState !== 'string' || !displayStates.has(candidate.displayState)) return false;
  return Number.isSafeInteger(candidate.stateRevision) && (candidate.stateRevision as number) >= 0 &&
    Number.isSafeInteger(candidate.updatedAtMs) && (candidate.updatedAtMs as number) >= 0;
}

test('widget templates use the exact six-field projection and approved display/status enums', async () => {
  const contract = JSON.parse(await source('contract.json'));
  assert.deepEqual(contract.projectionKeys, [
    'petId', 'stateRevision', 'updatedAtMs', 'formId', 'personalityProfileId', 'displayState',
  ]);
  assert.deepEqual(contract.displayStates, ['awake', 'sleeping', 'hibernating', 'needs_care']);
  assert.deepEqual(contract.viewStatuses, ['ready', 'stale', 'missing', 'error', 'unsupported']);
  assert.deepEqual(contract.action, { type: 'open_app', url: 'arucondev://open/widget' });
  assert.equal(contract.devOnlyIdentifiers, true);
  assert.equal(contract.activation, 'development_enabled');

  const [swift, kotlin] = await Promise.all([
    source('ios/AruconWidget.swift.template'),
    source('android/src/com/arucon/widget/AruconWidgetProvider.kt.template'),
  ]);
  for (const key of contract.projectionKeys) {
    assert.ok(swift.includes(`"${key}"`), `Swift strict decoder must name ${key}`);
    assert.ok(kotlin.includes(`"${key}"`), `Kotlin strict decoder must name ${key}`);
  }
  assert.match(swift, /Set\(dictionary\.keys\) == allowedKeys/);
  assert.match(kotlin, /require\(keys == allowedKeys\)/);
  assert.doesNotMatch(`${swift}\n${kotlin}`, /\b(?:coin|food|totalExpUnits|rawSamples|healthRecords)\b/);
});

test('widget malformed fixtures reject coercion, fractional and unsafe values in both source contracts', async () => {
  const fixtures = JSON.parse(await source('malformed-fixtures.json')) as {
    name: string;
    valid: boolean;
    snapshot: unknown;
  }[];
  for (const fixture of fixtures) {
    assert.equal(validProjectionFixture(fixture.snapshot), fixture.valid, fixture.name);
  }

  const [swift, kotlin] = await Promise.all([
    source('ios/AruconWidget.swift.template'),
    source('android/src/com/arucon/widget/AruconWidgetProvider.kt.template'),
  ]);
  assert.match(swift, /CFGetTypeID\(number\) != CFBooleanGetTypeID\(\)/);
  assert.match(swift, /integerTypeEncodings\.contains/);
  assert.match(swift, /maximumSafeInteger: Int64 = 9_007_199_254_740_991/);
  assert.match(kotlin, /raw is Byte \|\| raw is Short \|\| raw is Int \|\| raw is Long/);
  assert.match(kotlin, /value in 0\.\.MAXIMUM_SAFE_INTEGER/);
  assert.match(kotlin, /raw is String && raw\.isNotEmpty\(\)/);
  assert.doesNotMatch(kotlin, /json\.getString|json\.getLong/);
});

test('widget templates are read-only, resource-neutral and expose open_app only', async () => {
  const [swift, kotlin, androidInfo] = await Promise.all([
    source('ios/AruconWidget.swift.template'),
    source('android/src/com/arucon/widget/AruconWidgetProvider.kt.template'),
    source('android/res/xml/arucon_widget_info.xml.template'),
  ]);
  assert.match(swift, /UserDefaults\(suiteName: developmentAppGroup\)/);
  assert.match(swift, /case error/);
  assert.match(swift, /\.widgetURL\(openAppURL\)/);
  assert.match(swift, /policy: \.never/);
  assert.match(swift, /entry\.projection\?\.updatedAtMs/);
  assert.match(kotlin, /getSharedPreferences\(SNAPSHOT_PREFERENCES, Context\.MODE_PRIVATE\)/);
  assert.match(kotlin, /data object Error : SnapshotRead/);
  assert.match(kotlin, /Intent\(Intent\.ACTION_VIEW, Uri\.parse\(OPEN_APP_URL\)\)\.setPackage/);
  assert.match(kotlin, /projection\?\.updatedAtMs/);
  assert.match(androidInfo, /android:updatePeriodMillis="0"/);

  const combined = `${swift}\n${kotlin}`;
  assert.doesNotMatch(combined, /URLSession|HttpClient|WorkManager|AlarmManager|requestPermissions|startService/);
  assert.doesNotMatch(combined, /setOnClickPendingIntent\([^\n]*(?:feed|shop|reward|claim)/i);
});

test('widget templates use DEV identifiers while provisioning and OS execution remain external', async () => {
  const contract = JSON.parse(await source('contract.json'));
  assert.equal(contract.ios.appGroup, 'group.com.arucon.dev.widget');
  assert.equal(contract.ios.extensionBundleIdentifier, 'com.arucon.dev.widget');
  assert.equal(contract.android.providerClass, 'com.arucon.widget.AruconWidgetProvider');
  assert.equal(contract.activation, 'development_enabled');
});

test('iOS widget bridge supports the host deployment floor so Expo registers the module', async () => {
  const podspec = await readFile(widgetBridgePodspec, 'utf8');
  assert.match(podspec, /s\.platforms\s*=\s*\{ :ios => '15\.1' \}/);
});

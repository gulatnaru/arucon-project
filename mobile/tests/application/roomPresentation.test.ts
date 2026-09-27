import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanAvailability, cleanAvailabilityText, cleanSuccessText } from '../../src/presentation/cleanPresentation';

const here = dirname(fileURLToPath(import.meta.url));

test('clean presentation distinguishes no target, automatic toilet and real success without a command', () => {
  const noTarget = cleanAvailability({ poopCount: 0, toiletInstalled: false });
  const automatic = cleanAvailability({ poopCount: 0, toiletInstalled: true });
  const cleanable = cleanAvailability({ poopCount: 2, toiletInstalled: false });
  assert.deepEqual(noTarget, { kind: 'no_target' });
  if (noTarget.kind !== 'cleanable') assert.match(cleanAvailabilityText(noTarget), /청소할 것이 없/);
  assert.deepEqual(automatic, { kind: 'auto_managed' });
  if (automatic.kind !== 'cleanable') assert.match(cleanAvailabilityText(automatic), /자동으로 처리/);
  assert.deepEqual(cleanable, { kind: 'cleanable', removed: 2 });
  assert.equal(cleanSuccessText(2), '2개를 깨끗이 치웠어요.');
});

test('journal is an explicit modal with close, backdrop dismissal and Android back handling', () => {
  const panel = readFileSync(resolve(here, '../../src/presentation/JournalPanel.tsx'), 'utf8');
  const app = readFileSync(resolve(here, '../../App.tsx'), 'utf8');
  assert.match(panel, /<Modal[\s\S]*?onRequestClose=\{onClose\}/u);
  assert.match(panel, /testID="journal-backdrop"[\s\S]*?onPress=\{onClose\}/u);
  assert.match(panel, /testID="journal-close"[\s\S]*?onPress=\{onClose\}/u);
  assert.match(app, /interactionEnabled=\{journal === null && !fixtureVisible\}/u);
  assert.doesNotMatch(app, /journal && <ScrollView/u);
});

test('synthetic evaluation stays explicit, isolated and wires reversible art comparison props', () => {
  const app = readFileSync(resolve(here, '../../App.tsx'), 'utf8');
  const fixturePanel = readFileSync(resolve(here, '../../src/presentation/ApprovedFixturePanel.tsx'), 'utf8');
  assert.match(fixturePanel, /SOURCE_SYNTHETIC · 반응\/아트 비교/u);
  assert.match(app, /openReactionFixtureMemoryRepository\(EVALUATION_FIXTURE_ID\)/u);
  assert.match(app, /emptyReactionMemory\(EVALUATION_PET_ID, 'fixture'\)/u);
  assert.match(app, /characterCandidateId=\{evaluation\?\.candidateId \?\? 'original'\}/u);
  assert.match(app, /comparisonCameraAngle=\{evaluation\?\.cameraAngle\}/u);
  assert.doesNotMatch(app, /comparisonCameraAngle=\{evaluation\?\.cameraAngle\s*\?\?/u);
  assert.match(app, /onInteractionIntent=\{\(\) => reactionRuntimeRef\.current\?\.cancel\('superseded'\)\}/u);
  assert.match(app, /\{!evaluation && <View[\s\S]*?<LifeRoomControls/u);
});

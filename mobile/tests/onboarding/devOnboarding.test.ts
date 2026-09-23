import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDevPetPreview, createDevOnboardingDraft, normalizeDevGivenName,
  reviewSyntheticAge, revokeSyntheticGuardianConsent, setSyntheticAge,
} from '../../src/onboarding/devOnboarding';

test('DEV preview keeps givenName, fixed suffix, and shared form separate', () => {
  const draft = setSyntheticAge({ ...createDevOnboardingDraft(), givenNameInput: ' 구름 ' }, '2012-09-19', '2026-09-19');
  const preview = buildDevPetPreview(draft);
  assert.equal(preview.givenName, '구름');
  assert.equal(preview.displayName, '구름콘');
  assert.equal(preview.speciesFamily, 'arucon');
  assert.equal(preview.formId, 'arucon');
  assert.equal(preview.sex, null);
  assert.equal(preview.kind, 'DEV_FIXTURE_ONLY');
  assert.equal(preview.operationalSignUpEnabled, false);
  assert.equal(normalizeDevGivenName('구름콘'), '구름콘'); // Do not strip an entered suffix.
});

test('proposed name bounds are applied only to the DEV preview', () => {
  for (const name of ['', '   ', '\u0001', '가'.repeat(13)]) assert.throws(() => normalizeDevGivenName(name));
  assert.equal(normalizeDevGivenName('👩‍👩‍👦'), '👩‍👩‍👦');
  assert.equal(normalizeDevGivenName('가'.repeat(12)).length, 12);
});

test('grapheme validation works without Intl.Segmenter as on Hermes', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
  Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });
  try {
    assert.equal(normalizeDevGivenName(' 구름 '), '구름');
    assert.equal(normalizeDevGivenName('👨‍👩‍👧‍👦'.repeat(12)), '👨‍👩‍👧‍👦'.repeat(12));
    assert.throws(() => normalizeDevGivenName('👨‍👩‍👧‍👦'.repeat(13)), /1–12 graphemes/);

    const draft = setSyntheticAge({ ...createDevOnboardingDraft(), givenNameInput: 'Sim test' }, '2000-01-01', '2026-09-19');
    assert.equal(buildDevPetPreview(draft).displayName, 'Sim test콘');
  } finally {
    if (descriptor) Object.defineProperty(Intl, 'Segmenter', descriptor);
    else Reflect.deleteProperty(Intl, 'Segmenter');
  }
});

test('synthetic age boundary and guardian state cannot become verified', () => {
  assert.equal(reviewSyntheticAge('2012-09-20', '2026-09-19'), 'test_under_14');
  assert.equal(reviewSyntheticAge('2012-09-19', '2026-09-19'), 'test_14_or_over');
  const under = setSyntheticAge(createDevOnboardingDraft(), '2012-09-20', '2026-09-19');
  assert.equal(under.guardianConsent, 'pending');
  const revoked = revokeSyntheticGuardianConsent(under);
  assert.equal(revoked.guardianConsent, 'revoked');
  assert.equal(buildDevPetPreview({ ...revoked, givenNameInput: '구름' }).operationalSignUpEnabled, false);
  assert.equal(setSyntheticAge(revoked, '2012-09-19', '2026-09-19').guardianConsent, 'not_assessed');
});

test('invalid test dates and unreviewed age never produce a preview', () => {
  assert.throws(() => reviewSyntheticAge('2012-02-30', '2026-09-19'));
  assert.throws(() => reviewSyntheticAge('2027-01-01', '2026-09-19'));
  assert.throws(() => buildDevPetPreview({ ...createDevOnboardingDraft(), givenNameInput: '구름' }));
});

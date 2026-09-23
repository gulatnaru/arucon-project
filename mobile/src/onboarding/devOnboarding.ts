import { countGraphemes } from 'unicode-segmenter/grapheme';

/** Local synthetic preview only. DEC-11 and DEC-15 do not authorize real signup. */
export type DevAgeRoute = 'unreviewed' | 'test_under_14' | 'test_14_or_over';
export type DevGuardianConsent = 'not_assessed' | 'pending' | 'revoked';

export type DevOnboardingDraft = {
  kind: 'DEV_FIXTURE_ONLY';
  givenNameInput: string;
  testBirthDateInput: string;
  ageRoute: DevAgeRoute;
  guardianConsent: DevGuardianConsent;
};

export type DevPetPreview = {
  kind: 'DEV_FIXTURE_ONLY';
  speciesFamily: 'arucon';
  formId: 'arucon';
  sex: null;
  givenName: string;
  displayName: string;
  ageRoute: Exclude<DevAgeRoute, 'unreviewed'>;
  guardianConsent: DevGuardianConsent;
  operationalSignUpEnabled: false;
};

export function createDevOnboardingDraft(): DevOnboardingDraft {
  return { kind: 'DEV_FIXTURE_ONLY', givenNameInput: '', testBirthDateInput: '', ageRoute: 'unreviewed', guardianConsent: 'not_assessed' };
}

/** DEC-15 proposed 1–12 grapheme rule, restricted to a DEV fixture. */
export function normalizeDevGivenName(input: string): string {
  const value = input.normalize('NFC').trim();
  if (!value || /\p{Cc}/u.test(value)) throw new Error('Invalid given name');
  const length = countGraphemes(value);
  if (length < 1 || length > 12) throw new Error('Given name must have 1–12 graphemes');
  return value;
}

function parseIsoDate(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const at = Date.UTC(year, month - 1, day);
  const parsed = new Date(at);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day ? at : undefined;
}

/** A test branch using the SRS's proposed 14-year threshold, never a legal verification. */
export function reviewSyntheticAge(testBirthDate: string, testToday: string): DevAgeRoute {
  const birth = parseIsoDate(testBirthDate);
  const today = parseIsoDate(testToday);
  if (birth === undefined || today === undefined || birth > today) throw new Error('Invalid synthetic date');
  const birthDate = new Date(birth);
  const todayDate = new Date(today);
  let years = todayDate.getUTCFullYear() - birthDate.getUTCFullYear();
  if (todayDate.getUTCMonth() < birthDate.getUTCMonth() ||
      (todayDate.getUTCMonth() === birthDate.getUTCMonth() && todayDate.getUTCDate() < birthDate.getUTCDate())) years -= 1;
  return years < 14 ? 'test_under_14' : 'test_14_or_over';
}

export function setSyntheticAge(draft: DevOnboardingDraft, testBirthDate: string, testToday: string): DevOnboardingDraft {
  const ageRoute = reviewSyntheticAge(testBirthDate, testToday);
  return { ...draft, testBirthDateInput: testBirthDate, ageRoute, guardianConsent: ageRoute === 'test_under_14' ? 'pending' : 'not_assessed' };
}

export function revokeSyntheticGuardianConsent(draft: DevOnboardingDraft): DevOnboardingDraft {
  if (draft.ageRoute !== 'test_under_14') return draft;
  return { ...draft, guardianConsent: 'revoked' };
}

export function buildDevPetPreview(draft: DevOnboardingDraft): DevPetPreview {
  if (draft.kind !== 'DEV_FIXTURE_ONLY' || draft.ageRoute === 'unreviewed') throw new Error('Synthetic age review required');
  const givenName = normalizeDevGivenName(draft.givenNameInput);
  return {
    kind: 'DEV_FIXTURE_ONLY', speciesFamily: 'arucon', formId: 'arucon', sex: null,
    givenName, displayName: `${givenName}콘`, ageRoute: draft.ageRoute,
    guardianConsent: draft.guardianConsent, operationalSignUpEnabled: false,
  };
}

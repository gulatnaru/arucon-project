import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';
import type { FormId } from '../domain/model';
import type { InjectedResolutionPolicy, JsonValue } from './oneTimeResolution';

export type CareProfile = Readonly<{
  observedDays: number;
  activeDays: number;
  restfulRoutineDays: number;
  interactionDays: number;
}>;

export type ApprovedSexValue = Readonly<{ sex: 'female' | 'male' }>;
export type ApprovedFormValue = Readonly<{
  formId: Exclude<FormId, 'arucon'>;
  ruleId: 'active_dominant' | 'rest_dominant' | 'interaction_dominant' | 'balanced';
  explanation: string;
}>;

export const APPROVED_SEX_SLOT = 'stage-2-sex';
export const APPROVED_FORM_SLOT = 'stage-3-form';

export function validateCareProfile(profile: CareProfile): void {
  if (!profile || !Number.isSafeInteger(profile.observedDays) || profile.observedDays < 0) throw new Error('Invalid observed care days');
  for (const value of [profile.activeDays, profile.restfulRoutineDays, profile.interactionDays]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > profile.observedDays) throw new Error('Invalid care day count');
  }
}

/** Explainable care mapping. Personality is intentionally absent from the input. */
export function selectApprovedForm(profile: CareProfile): ApprovedFormValue {
  validateCareProfile(profile);
  if (profile.observedDays === 0) throw new Error('Care observations are required');
  const threshold = APPROVED_MVP_POLICY.growth.care.dominantShare;
  const share = (days: number) => profile.observedDays === 0 ? 0 : days / profile.observedDays;
  const active = share(profile.activeDays);
  const rest = share(profile.restfulRoutineDays);
  const interaction = share(profile.interactionDays);

  if (active >= threshold && active > rest && active > interaction) {
    return Object.freeze({ formId: 'piko', ruleId: 'active_dominant', explanation: '활동한 날의 비율이 가장 높아 피코가 되었어요.' });
  }
  if (rest >= threshold && rest > active && rest > interaction) {
    return Object.freeze({ formId: 'mongle', ruleId: 'rest_dominant', explanation: '편안한 생활 리듬의 날이 가장 많아 몽글이 되었어요.' });
  }
  if (interaction >= threshold && interaction > active && interaction > rest) {
    return Object.freeze({ formId: 'mallu', ruleId: 'interaction_dominant', explanation: '함께 교감한 날의 비율이 가장 높아 말루가 되었어요.' });
  }
  return Object.freeze({ formId: 'mono', ruleId: 'balanced', explanation: '여러 돌봄 방식이 고르게 이어져 모노가 되었어요.' });
}

export function isApprovedSexValue(value: JsonValue): value is ApprovedSexValue {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  const record = value as Readonly<Record<string, JsonValue>>;
  return Object.keys(record).length === 1 && (record.sex === 'female' || record.sex === 'male');
}

export function isApprovedFormValue(value: JsonValue): value is ApprovedFormValue {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  const record = value as Readonly<Record<string, JsonValue>>;
  return Object.keys(record).length === 3 && ['mallu', 'mono', 'piko', 'mongle'].includes(String(record.formId)) &&
    ['active_dominant', 'rest_dominant', 'interaction_dominant', 'balanced'].includes(String(record.ruleId)) &&
    typeof record.explanation === 'string' && record.explanation.length > 0;
}

export const APPROVED_SEX_POLICY: InjectedResolutionPolicy<ApprovedSexValue> = Object.freeze({
  status: 'APPROVED', id: 'approved-stage-2-sex', version: `${APPROVED_MVP_POLICY.version}:sex`, decision: 'DEC-03',
  isEligible: context => context.level >= APPROVED_MVP_POLICY.growth.sexResolutionLevel,
  resolve: sample => Object.freeze({
    sex: sample < APPROVED_MVP_POLICY.growth.femaleSampleUpperExclusive ? 'female' as const : 'male' as const,
  }),
  validateResult: isApprovedSexValue,
});

export function approvedFormPolicy(profile: CareProfile): InjectedResolutionPolicy<ApprovedFormValue> {
  validateCareProfile(profile);
  return Object.freeze({
    status: 'APPROVED' as const, id: 'approved-stage-3-care-form',
    version: `${APPROVED_MVP_POLICY.version}:form`, decision: 'DEC-08' as const,
    isEligible: context => context.level >= APPROVED_MVP_POLICY.growth.firstEvolutionLevel &&
      profile.observedDays >= APPROVED_MVP_POLICY.growth.care.minimumObservedDays,
    resolve: () => selectApprovedForm(profile),
    validateResult: isApprovedFormValue,
  });
}

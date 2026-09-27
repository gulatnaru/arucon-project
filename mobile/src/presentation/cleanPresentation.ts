import type { PetState } from '../domain/model';

export type CleanAvailability =
  | { kind: 'cleanable'; removed: number }
  | { kind: 'auto_managed' }
  | { kind: 'no_target' };

export function cleanAvailability(state: Pick<PetState, 'poopCount' | 'toiletInstalled'>): CleanAvailability {
  if (state.poopCount > 0) return { kind: 'cleanable', removed: state.poopCount };
  if (state.toiletInstalled) return { kind: 'auto_managed' };
  return { kind: 'no_target' };
}

export function cleanAvailabilityText(availability: Exclude<CleanAvailability, { kind: 'cleanable' }>): string {
  return availability.kind === 'auto_managed'
    ? '기본 화장실이 이미 자동으로 처리해서 청소할 것이 없어요.'
    : '지금은 청소할 것이 없어요.';
}

export function cleanSuccessText(removed: number): string {
  return `${removed}개를 깨끗이 치웠어요.`;
}

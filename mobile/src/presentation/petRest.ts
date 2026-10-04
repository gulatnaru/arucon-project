import type { PetState } from '../domain/model';

export type PetRestMode = 'awake' | 'sleeping' | 'hibernating';

/** Domain rest only. Drowsy/cushion poses are decorative and remain interactive. */
export function projectPetRest(pet: Pick<PetState, 'sleeping' | 'hibernating'>) {
  if (pet.hibernating) return {
    mode: 'hibernating' as const, resting: true, label: '동면 중이에요',
    action: 'return' as const, actionLabel: '다시 함께하기',
    hint: '앱에서 다시 함께하면 동면 전 상태를 이어가요. 일반 수면 중이었다면 그 뒤에 깨울 수 있어요.',
  };
  if (pet.sleeping) return {
    mode: 'sleeping' as const, resting: true, label: '잠들어 있어요',
    action: 'wake' as const, actionLabel: '깨우기', hint: '깨우면 다시 이동하고 교감할 수 있어요.',
  };
  return { mode: 'awake' as const, resting: false, label: '깨어 있어요',
    action: 'sleep' as const, actionLabel: '잠자기', hint: null };
}

export type CharacterCandidateId = 'original' | 'moderate' | 'plump' | 'baby_v3';

export type CharacterCandidateApprovalState = 'CURRENT_ORIGINAL' | 'USER_REVIEW_PENDING';

export interface CharacterCandidateDefinition {
  readonly id: CharacterCandidateId;
  readonly label: string;
  readonly asset: number;
  readonly isDefault: boolean;
  readonly approvalState: CharacterCandidateApprovalState;
}

export const DEFAULT_CHARACTER_CANDIDATE_ID: CharacterCandidateId = 'original';

/* Static literal requires let Metro bundle every reversible GLB candidate. */
/* eslint-disable @typescript-eslint/no-require-imports */
export const CHARACTER_CANDIDATES: Readonly<Record<CharacterCandidateId, CharacterCandidateDefinition>> = {
  baby_v3: {
    id: 'baby_v3', label: '생활 개편 모찌 후보', asset: require('../../assets/living-characters/baby_v3.glb') as number,
    isDefault: false, approvalState: 'USER_REVIEW_PENDING',
  },
  original: {
    id: 'original',
    label: '기존형',
    asset: require('../../assets/arucon_tsundere_motion.glb') as number,
    isDefault: true,
    approvalState: 'CURRENT_ORIGINAL',
  },
  moderate: {
    id: 'moderate',
    label: '볼륨을 조금 늘린 후보',
    asset: require('../../assets/character-candidates/arucon_v2_moderate.glb') as number,
    isDefault: false,
    approvalState: 'USER_REVIEW_PENDING',
  },
  plump: {
    id: 'plump',
    label: '더 도톰한 후보',
    asset: require('../../assets/character-candidates/arucon_v2_plump.glb') as number,
    isDefault: false,
    approvalState: 'USER_REVIEW_PENDING',
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

export function getCharacterCandidate(id: CharacterCandidateId): CharacterCandidateDefinition {
  return CHARACTER_CANDIDATES[id];
}

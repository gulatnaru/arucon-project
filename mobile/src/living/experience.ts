import { ApprovedMvpService } from '../application/approvedMvpService';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import { initialPet } from '../domain/model';
import { LocalPetStore, type SqlConnection } from '../storage/sqlite';
import { APPROVED_GROWTH_POLICY } from '../progression/projection';

export const EXPERIENCE = Object.freeze({ database: 'arucon-life-experience.db', petId: 'life-experience-v1', food: 40, coin: 400 });
export type ExperienceScenario = 'normal' | 'expressive' | 'growth' | 'toilet' | 'cleanup';
export const experiencePetId = (scenario: ExperienceScenario) => scenario === 'normal' ? EXPERIENCE.petId : `${EXPERIENCE.petId}:${scenario}`;
/** Separate opt-in experience DB only. Existing snapshots are never topped up. */
export async function prepareExperience(db: SqlConnection, givenName: string, personality: 'reserved' | 'expressive', atMs: number, scenario: ExperienceScenario = 'normal') {
  const petId = experiencePetId(scenario);
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  if (!await store.loadPet(petId)) {
    const state = initialPet(petId, givenName.trim() || '아루콘', scenario === 'expressive' ? 'expressive' : personality, atMs, APPROVED_GAME_CONFIG);
    const band = APPROVED_GROWTH_POLICY.bands[0];
    await store.createPet({ ...state, food: EXPERIENCE.food, coin: EXPERIENCE.coin,
      ...(scenario === 'toilet' ? { poopElapsedMs: Math.max(0, APPROVED_GAME_CONFIG.proposal.poopIntervalMs - 20_000) } : {}),
      ...(scenario === 'cleanup' ? { poopCount: 1 } : {}),
      ...(scenario === 'growth' ? { totalExpUnits: band.expPerLevel * APPROVED_GROWTH_POLICY.expScale * (band.toLevel - band.fromLevel + 1) - 1 } : {}),
    });
  }
  const state = (await store.loadPet(petId))!;
  const service = await ApprovedMvpService.initialize(db, { petId: state.petId, givenName: state.givenName,
    personalityProfileId: state.personalityProfileId, createdAtMs: state.lastSimulatedAtMs });
  const owned = await service.readOwnedItemKeys();
  for (const [itemId, key] of [['ball', 'toy:ball'], ['cushion', 'furniture:cushion'], ['table', 'facility:table']]) {
    if (owned.includes(key)) continue;
    await service.purchaseCoinItem({ purchaseId: `life-starter-v1:${petId}:${itemId}`, itemId, committedAtMs: state.lastSimulatedAtMs });
  }
  return service;
}

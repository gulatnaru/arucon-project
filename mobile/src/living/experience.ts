import { ApprovedMvpService } from '../application/approvedMvpService';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import { initialPet } from '../domain/model';
import { LocalPetStore, type SqlConnection } from '../storage/sqlite';
import { APPROVED_GROWTH_POLICY } from '../progression/projection';
import { utcFixtureDay, nextSyntheticWalk } from '../application/devClock';
import { approvedSyntheticSleepFixture } from '../presentation/approvedPresentation';

export const EXPERIENCE = Object.freeze({ database: 'arucon-life-experience.db', petId: 'life-experience-v1', food: 40, coin: 400 });
export const EXPERIENCE_SCENARIOS = {
  normal: '기본 생활 체험', expressive: '솔직한 성격 체험',
  auto_growth: '자동 식사·성장 새 체험',
  evolution_piko: '활동 이력·진화 새 체험', evolution_mongle: '수면 이력·진화 새 체험',
  evolution_mallu: '교감 이력·진화 새 체험', evolution_mono: '균형 이력·진화 새 체험',
  sleep_plain: '수면 무기록·식사 새 체험', sleep_bonus: '수면 보너스·식사 새 체험',
  mature_reserved: '성장한 새침한 아이 비교', mature_expressive: '성장한 솔직한 아이 비교',
  growth: '직접 식사·성장 직전 체험', toilet: '화장실 생활 체험', cleanup: '잔여 청소 체험',
} as const;
export type ExperienceScenario = keyof typeof EXPERIENCE_SCENARIOS;
export function parseExperienceProfile(value: string): { scenario: ExperienceScenario; runKey?: string } | null {
  const [scenario, runKey, extra] = value.split('#');
  if (!Object.hasOwn(EXPERIENCE_SCENARIOS, scenario) || extra !== undefined || (runKey !== undefined && !/^\d{1,16}$/u.test(runKey))) return null;
  return { scenario: scenario as ExperienceScenario, ...(runKey !== undefined ? { runKey } : {}) };
}
export const experiencePetId = (scenario: ExperienceScenario, runKey?: string) =>
  (scenario === 'normal' ? EXPERIENCE.petId : `${EXPERIENCE.petId}:${scenario}`) + (runKey ? `:${runKey}` : '');

async function prepareCareHistory(store: LocalPetStore, petId: string, scenario: ExperienceScenario, originMs: number) {
  // Explicit synthetic history in this isolated pet only; autonomous animation never calls interact.
  for (let i = 8; i >= 2; i--) {
    const day = utcFixtureDay(originMs - i * 86_400_000);
    const route = scenario === 'evolution_piko' ? 'activity' : scenario === 'evolution_mongle' ? 'rest'
      : scenario === 'evolution_mallu' ? 'interaction' : i >= 6 ? 'activity' : i >= 3 ? 'rest' : 'interaction';
    const commandId = `life01-synthetic-history:${petId}:${day.id}:${route}`;
    if (route === 'activity') await store.execute(petId, { type: 'activity', commandId, gameDay: day,
      providerId: 'life-history-synthetic', selectedProviderId: 'life-history-synthetic', connectedAtMs: day.startUtcMs,
      sourceRevision: 1, interval: { startUtcMs: day.startUtcMs, endUtcMs: day.endUtcMs }, observedAtMs: day.endUtcMs, steps: 500, runningSteps: 0 });
    else if (route === 'rest') await store.execute(petId, { type: 'setSleepGrowthMultiplier', commandId,
      gameDay: utcFixtureDay(day.endUtcMs), recordDayId: day.id, policyVersion: APPROVED_GAME_CONFIG.version, multiplier: 1.25, confirmation: 'valid_score' });
    else await store.execute(petId, { type: 'interact', commandId, kind: 'observe', gameDayId: day.id });
  }
}
/** Separate opt-in experience DB only. Existing snapshots are never topped up. */
export async function prepareExperience(db: SqlConnection, givenName: string, personality: 'reserved' | 'expressive', atMs: number, scenario: ExperienceScenario = 'normal', runKey?: string) {
  if (!parseExperienceProfile(`${scenario}${runKey ? `#${runKey}` : ''}`)) throw new Error('Invalid experience scope');
  const petId = experiencePetId(scenario, runKey);
  const automatic = scenario === 'auto_growth' || scenario.startsWith('evolution_') || scenario.startsWith('sleep_');
  const evolution = scenario.startsWith('evolution_');
  const store = new LocalPetStore(db, APPROVED_GAME_CONFIG);
  await store.migrate();
  if (!await store.loadPet(petId)) {
    const state = initialPet(petId, givenName.trim() || '아루콘', scenario === 'expressive' || scenario === 'mature_expressive' ? 'expressive' : personality, atMs, APPROVED_GAME_CONFIG);
    const band = APPROVED_GROWTH_POLICY.bands[0];
    const firstBoundary = band.expPerLevel * APPROVED_GROWTH_POLICY.expScale * (band.toLevel - band.fromLevel + 1);
    const evolutionBoundary = APPROVED_GROWTH_POLICY.bands.slice(0, 2).reduce((sum, b) => sum + (b.toLevel - b.fromLevel + 1) * b.expPerLevel * APPROVED_GROWTH_POLICY.expScale, 0);
    await store.createPet({ ...state, food: automatic ? 0 : EXPERIENCE.food, coin: EXPERIENCE.coin,
      ...(automatic ? { hunger: APPROVED_GAME_CONFIG.proposal.mealHungerThreshold - APPROVED_GAME_CONFIG.proposal.hungerPerAwakeHour * 20 / 3600 } : {}),
      ...(scenario === 'toilet' ? { poopElapsedMs: Math.max(0, APPROVED_GAME_CONFIG.proposal.poopIntervalMs - 20_000) } : {}),
      ...(scenario === 'cleanup' ? { poopCount: 1 } : {}),
      ...(scenario === 'growth' || scenario === 'auto_growth' ? { totalExpUnits: firstBoundary - 1 } : {}),
      ...(scenario.startsWith('mature_') ? { totalExpUnits: firstBoundary } : {}),
      ...(evolution ? { totalExpUnits: evolutionBoundary - 1 } : {}),
    });
  }
  const state = (await store.loadPet(petId))!;
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('CREATE TABLE IF NOT EXISTS experience_setup (pet_id TEXT PRIMARY KEY, started_at_ms INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0)');
    await tx.runAsync('INSERT OR IGNORE INTO experience_setup (pet_id, started_at_ms) VALUES (?, ?)', [petId, state.lastSimulatedAtMs]);
  });
  const setup = (await db.getFirstAsync<{ started_at_ms: number; completed: number }>('SELECT started_at_ms, completed FROM experience_setup WHERE pet_id = ?', [petId]))!;
  const service = await ApprovedMvpService.initialize(db, { petId: state.petId, givenName: state.givenName,
    personalityProfileId: state.personalityProfileId, createdAtMs: state.lastSimulatedAtMs });
  const owned = await service.readOwnedItemKeys();
  for (const [itemId, key] of [['ball', 'toy:ball'], ['cushion', 'furniture:cushion'], ['table', 'facility:table']]) {
    if (owned.includes(key)) continue;
    await service.purchaseCoinItem({ purchaseId: `life-starter-v1:${petId}:${itemId}`, itemId, committedAtMs: state.lastSimulatedAtMs });
  }
  if (!setup.completed) {
    const origin = setup.started_at_ms;
    if (evolution) await prepareCareHistory(store, petId, scenario, origin);
    if (automatic) {
      await service.beginGameDay(utcFixtureDay(origin), origin);
      if (scenario === 'sleep_bonus') await service.applySyntheticSleep(approvedSyntheticSleepFixture(origin, 100), origin);
      const current = await service.currentState();
      if (!current.activityByDay[utcFixtureDay(origin).id]) {
        const supply = await nextSyntheticWalk(current, origin);
        await service.receiveActivity(supply.activity, supply.atMs);
      }
      await service.setAutoFeed(origin, `life01-auto-consent:${petId}`, true);
    }
    await db.withExclusiveTransactionAsync(tx => tx.runAsync('UPDATE experience_setup SET completed = 1 WHERE pet_id = ?', [petId]));
  }
  return service;
}

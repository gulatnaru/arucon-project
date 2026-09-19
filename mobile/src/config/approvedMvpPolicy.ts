import { MVP_BALANCE_REGISTRY } from './balanceRegistry';

const SOURCE = MVP_BALANCE_REGISTRY.source;

/**
 * Reversible local game policy from user approval after baseline 34ab069.
 * Baselines describe game rewards only; they are not health recommendations.
 */
export const APPROVED_MVP_POLICY = Object.freeze({
  schemaVersion: 1 as const,
  version: 'approved-mvp-34ab069-v1',
  status: 'APPROVED' as const,
  approval: '34ab069',
  healthSource: 'SYNTHETIC_LOCAL_ONLY' as const,
  domain: Object.freeze({
    source: Object.freeze({
      stepsPerFood: SOURCE.activity.stepsPerFood,
      coinPer100Steps: SOURCE.activity.coinPer100Steps,
      runningMultiplier: SOURCE.activity.runningMultiplier,
      foodCap: SOURCE.activity.foodCap,
      expPerFood: SOURCE.growth.expPerFood,
      staminaMax: SOURCE.stamina.max,
      staminaDrainPerAwakeHour: SOURCE.stamina.drainPerAwakeHour,
      staminaDrainPerFood: SOURCE.stamina.drainPerFood,
      lowStaminaThreshold: SOURCE.stamina.lowThreshold,
      lowStaminaMultiplier: SOURCE.stamina.lowGrowthMultiplier,
      sickPoopThreshold: SOURCE.hygiene.sickPoopThreshold,
      sickTriggerHours: SOURCE.hygiene.sickTriggerHours,
      sickGrowthMultiplier: SOURCE.hygiene.sickGrowthMultiplier,
      naturalRecoveryHours: SOURCE.hygiene.naturalRecoveryHours,
      moodCleanMultiplier: SOURCE.hygiene.moodCleanMultiplier,
      moodSomePoopMultiplier: SOURCE.hygiene.moodSomePoopMultiplier,
      moodDirtyMultiplier: SOURCE.hygiene.moodDirtyMultiplier,
      moodSomePoopAt: SOURCE.hygiene.moodSomePoopAt,
      moodDirtyAt: SOURCE.hygiene.moodDirtyAt,
    }),
    rules: Object.freeze({
      ...MVP_BALANCE_REGISTRY.devFixture.domain,
    }),
    initialFacilities: Object.freeze({ toiletInstalled: true, tableInstalled: false }),
    sleepGrowthMultiplier: Object.freeze({ minimum: 1, maximum: 1.25 }),
  }),
  sleep: Object.freeze({
    gameDayTimezone: 'UTC' as const,
    gameDayDurationMs: 24 * 60 * 60 * 1_000,
    noDataMultiplier: 1,
    maximumBonusMultiplier: 1.25,
    recoveryTargetAtScoreZero: SOURCE.stamina.recoveryAtMinSleepMultiplier,
    recoveryTargetAtScoreHundred: SOURCE.stamina.recoveryAtMaxSleepMultiplier,
    noDataRecoveryTarget: SOURCE.stamina.recoveryAtMinSleepMultiplier,
    petSleepMinimumMs: 4 * 60 * 60 * 1_000,
    scoreMinimum: 0,
    scoreMaximum: 100,
    curve: Object.freeze([
      Object.freeze({ score: 0, multiplier: 1 }),
      Object.freeze({ score: 100, multiplier: 1.25 }),
    ]),
  }),
  growth: Object.freeze({
    initialLevel: 1,
    finalLevel: SOURCE.growth.finalLevel,
    expScale: MVP_BALANCE_REGISTRY.devFixture.domain.expScale,
    bands: Object.freeze(SOURCE.growth.stages.map((band, index) => Object.freeze({
      stage: index + 1,
      fromLevel: band.fromLevel,
      toLevel: band.toLevel,
      expPerLevel: band.expPerLevel,
    }))),
    sexResolutionLevel: 6,
    firstEvolutionLevel: 16,
    femaleSampleUpperExclusive: 0.5,
    care: Object.freeze({ minimumObservedDays: 7, dominantShare: 0.6 }),
  }),
  shop: Object.freeze({
    catalogVersion: 'approved-coin-catalog-34ab069-v1',
    items: Object.freeze([
      Object.freeze({ id: 'medicine', kind: 'medicine' as const, coinPrice: SOURCE.shop.medicinePriceCoin, ownershipKey: null }),
      Object.freeze({ id: 'table', kind: 'table' as const, coinPrice: 60, ownershipKey: 'facility:table' }),
      Object.freeze({ id: 'ball', kind: 'toy' as const, coinPrice: 30, ownershipKey: 'toy:ball' }),
      Object.freeze({ id: 'cushion', kind: 'furniture' as const, coinPrice: 40, ownershipKey: 'furniture:cushion' }),
    ]),
    cashCosmetic: Object.freeze({ status: 'disabled' as const }),
  }),
});

export type ApprovedMvpPolicy = typeof APPROVED_MVP_POLICY;

export function validateApprovedMvpPolicy(policy: ApprovedMvpPolicy): void {
  if (policy.schemaVersion !== 1 || policy.status !== 'APPROVED' || !policy.version ||
      policy.approval !== '34ab069' || policy.healthSource !== 'SYNTHETIC_LOCAL_ONLY') {
    throw new Error('Invalid approved MVP policy identity');
  }
  if (!policy.domain.initialFacilities.toiletInstalled || policy.domain.initialFacilities.tableInstalled ||
      policy.domain.sleepGrowthMultiplier.minimum !== 1 ||
      policy.domain.sleepGrowthMultiplier.maximum < policy.domain.sleepGrowthMultiplier.minimum) {
    throw new Error('Invalid approved domain policy');
  }
  if (policy.sleep.noDataMultiplier !== 1 || policy.sleep.curve[0]?.score !== 0 ||
      policy.sleep.curve.at(-1)?.score !== 100 || policy.sleep.curve.some(point =>
        point.multiplier < 1 || point.multiplier > policy.sleep.maximumBonusMultiplier) ||
      policy.sleep.gameDayTimezone !== 'UTC' || policy.sleep.gameDayDurationMs !== 86_400_000 ||
      policy.sleep.noDataRecoveryTarget !== policy.sleep.recoveryTargetAtScoreZero ||
      policy.sleep.recoveryTargetAtScoreHundred < policy.sleep.recoveryTargetAtScoreZero) {
    throw new Error('Invalid approved sleep policy');
  }
  const ids = new Set<string>();
  if (policy.growth.sexResolutionLevel !== 6 || policy.growth.firstEvolutionLevel !== 16 ||
      policy.growth.sexResolutionLevel >= policy.growth.firstEvolutionLevel ||
      policy.growth.care.minimumObservedDays < 1 || policy.growth.care.dominantShare <= 0.5 ||
      policy.growth.care.dominantShare > 1) throw new Error('Invalid approved growth policy');
  for (const item of policy.shop.items) {
    if (!item.id || ids.has(item.id) || !Number.isSafeInteger(item.coinPrice) || item.coinPrice <= 0 ||
        (item.kind !== 'medicine' && !item.ownershipKey) || (item.kind === 'medicine' && item.ownershipKey !== null)) {
      throw new Error('Invalid approved coin catalog');
    }
    ids.add(item.id);
  }
}

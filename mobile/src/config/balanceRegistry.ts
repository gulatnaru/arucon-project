export type BalanceDecision = Readonly<{
  status: 'DECISION_REQUIRED';
  decisions: readonly string[];
  value: null;
}>;

export class BalanceDecisionRequired extends Error {
  readonly decisions: readonly string[];
  constructor(decisions: readonly string[]) {
    super(`DecisionRequired: ${decisions.join('/')}`);
    this.name = 'DecisionRequired';
    this.decisions = decisions;
  }
}

const decision = (...decisions: string[]): BalanceDecision => Object.freeze({
  status: 'DECISION_REQUIRED' as const,
  decisions: Object.freeze(decisions),
  value: null,
});

const sourceSleepCurve = Object.freeze([
  Object.freeze({ score: 0, multiplier: 0.7 }),
  Object.freeze({ score: 40, multiplier: 0.7 }),
  Object.freeze({ score: 70, multiplier: 1 }),
  Object.freeze({ score: 85, multiplier: 1.2 }),
  Object.freeze({ score: 100, multiplier: 1.5 }),
]);

/**
 * CONFIG-01: the only numeric registry for MVP game balance.
 * `source` preserves SRS section 9 values. `devFixture` is never an operational default.
 */
export const MVP_BALANCE_REGISTRY = Object.freeze({
  schemaVersion: 1 as const,
  version: 'mvp-balance-registry-v1',
  status: 'DEV_FIXTURE_ONLY' as const,
  provenance: Object.freeze({
    source: 'arucon-SRS v1.8 section 9',
    decisions: 'decisions.md v1.8',
  }),
  source: Object.freeze({
    activity: Object.freeze({ stepsPerFood: 500, coinPer100Steps: 1, runningMultiplier: 1.5, dailyStepTarget: 8_000, foodCap: 20 }),
    growth: Object.freeze({
      expPerFood: 15,
      stages: Object.freeze([
        Object.freeze({ fromLevel: 1, toLevel: 5, expPerLevel: 150 }),
        Object.freeze({ fromLevel: 6, toLevel: 15, expPerLevel: 300 }),
        Object.freeze({ fromLevel: 16, toLevel: 30, expPerLevel: 600 }),
        Object.freeze({ fromLevel: 31, toLevel: 45, expPerLevel: 1_000 }),
      ]),
      finalLevel: 46,
    }),
    sleep: Object.freeze({ noDataMultiplier: 1, curve: sourceSleepCurve }),
    stamina: Object.freeze({
      max: 100, drainPerAwakeHour: 5, drainPerFood: 1, drainPerPlayReference: 3, drainPerFreeInteraction: 0,
      recoveryAtMinSleepMultiplier: 65, recoveryAtMaxSleepMultiplier: 100,
      lowThreshold: 20, lowGrowthMultiplier: 0.5,
    }),
    hygiene: Object.freeze({
      poopIntervalHours: 6, moodCleanMultiplier: 1, moodSomePoopMultiplier: 0.9, moodDirtyMultiplier: 0.75,
      moodSomePoopAt: 2, moodDirtyAt: 4, sickPoopThreshold: 4, sickTriggerHours: 24,
      sickGrowthMultiplier: 0.5, naturalRecoveryHours: 12,
    }),
    shop: Object.freeze({ medicinePriceCoin: 50 }),
  }),
  devFixture: Object.freeze({
    decisions: Object.freeze(['DEC-02', 'DEC-03', 'DEC-04', 'DEC-06', 'DEC-07', 'DEC-09', 'DEC-24', 'DEC-25']),
    domain: Object.freeze({
      expScale: 1_000_000, foodUnitsPerItem: 1_000, coinUnitsPerCoin: 200,
      poopIntervalMs: 6 * 60 * 60 * 1_000, foodsPerPoop: 8, hibernateAfterMs: 24 * 60 * 60 * 1_000,
      hungerMax: 100, initialHunger: 50, mealHungerThreshold: 50,
      hungerPerAwakeHour: 4, hungerReductionPerMeal: 10,
    }),
    shop: Object.freeze({ toiletPriceCoin: 80, tablePriceCoin: 60 }),
  }),
  unresolved: Object.freeze({
    hungerOperational: decision('DEC-24'),
    sleepScorer: decision('DEC-05'),
    sleepBenefitApplication: decision('DEC-05'),
    activePlayStaminaApplicability: decision('DEC-24'),
    toiletOperationalPrice: decision('DEC-09', 'DEC-24'),
    tableOperationalPrice: decision('DEC-09', 'DEC-24'),
    furnitureCatalogAndPrice: decision('DEC-09', 'DEC-24'),
    staminaItemAmountAndPrice: decision('DEC-09'),
    cashCosmeticCatalog: decision('DEC-09'),
  }),
});

export type MvpBalanceRegistry = typeof MVP_BALANCE_REGISTRY;

export function requireBalanceDecision<T>(entry: BalanceDecision | Readonly<{ status: 'APPROVED'; value: T }>): T {
  if (entry.status === 'DECISION_REQUIRED') throw new BalanceDecisionRequired(entry.decisions);
  return entry.value;
}

export function validateBalanceRegistry(registry: MvpBalanceRegistry): void {
  if (registry.schemaVersion !== 1 || registry.status !== 'DEV_FIXTURE_ONLY' || !registry.version || !registry.provenance.source) {
    throw new Error('Invalid balance registry identity');
  }
  const { activity, growth, sleep, stamina, hygiene, shop } = registry.source;
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  if (!positive(activity.stepsPerFood) || !positive(activity.coinPer100Steps) || activity.runningMultiplier < 1 ||
      !positive(activity.dailyStepTarget) || !positive(activity.foodCap) || !positive(growth.expPerFood) || growth.finalLevel !== 46 ||
      sleep.curve.length < 2 || sleep.curve[0].score !== 0 || sleep.curve.at(-1)?.score !== 100 ||
      !positive(stamina.max) || stamina.drainPerFreeInteraction !== 0 || !positive(hygiene.poopIntervalHours) ||
      !positive(hygiene.sickTriggerHours) || !positive(hygiene.naturalRecoveryHours) || shop.medicinePriceCoin !== 50) {
    throw new Error('Invalid source balance registry');
  }
  for (let index = 0; index < sleep.curve.length; index++) {
    const point = sleep.curve[index];
    const previous = sleep.curve[index - 1];
    if (!positive(point.multiplier) || (previous && (point.score <= previous.score || point.multiplier < previous.multiplier))) {
      throw new Error('Invalid registry sleep curve');
    }
  }
  for (const entry of Object.values(registry.unresolved)) {
    if (entry.status !== 'DECISION_REQUIRED' || entry.value !== null || entry.decisions.length === 0) throw new Error('Invalid unresolved balance entry');
  }
}

import { BalanceDecisionRequired, MVP_BALANCE_REGISTRY } from '../config/balanceRegistry';

const SOURCE = MVP_BALANCE_REGISTRY.source;
const DEV = MVP_BALANCE_REGISTRY.devFixture.domain;

/** Compatibility projection. Numeric ownership lives in CONFIG-01's versioned registry. */
export const SOURCE_BALANCE = Object.freeze({
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
});

export type SourceBalance = { readonly [K in keyof typeof SOURCE_BALANCE]: number };

export type GameConfig = {
  status: 'DEV_FIXTURE_ONLY';
  version: string;
  source: SourceBalance;
  /** All values below depend on PROPOSED/OPEN DEC-02/03/04/06/07/24/25. */
  proposal: {
    expScale: number;
    foodUnitsPerItem: number;
    coinUnitsPerCoin: number;
    poopIntervalMs: number;
    foodsPerPoop: number;
    hibernateAfterMs: number;
    hungerMax: number;
    initialHunger: number;
    mealHungerThreshold: number;
    hungerPerAwakeHour: number;
    hungerReductionPerMeal: number;
  };
};

export const DEV_GAME_CONFIG: GameConfig = {
  status: 'DEV_FIXTURE_ONLY',
  version: MVP_BALANCE_REGISTRY.version,
  source: SOURCE_BALANCE,
  proposal: {
    ...DEV,
  },
};

export class DecisionRequired extends BalanceDecisionRequired {
  readonly decision: string;
  constructor(decision: string) {
    super([decision]);
    this.name = 'DecisionRequired';
    this.decision = decision;
  }
}

export function requireDevFixture(config: GameConfig): void {
  if (config?.status !== 'DEV_FIXTURE_ONLY') throw new DecisionRequired('DEC-02/03/04/06/07/24/25');
  const source = config.source;
  const proposal = config.proposal;
  const integer = (value: number, min: number, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
  const finite = (value: number, min: number, max = Number.MAX_VALUE) => Number.isFinite(value) && value >= min && value <= max;
  if (!config.version || !source || !proposal ||
      !integer(source.stepsPerFood, 1) || !integer(source.coinPer100Steps, 1) ||
      !finite(source.runningMultiplier, 1) || !integer(2 * source.runningMultiplier, 2) ||
      !integer(source.foodCap, 1) || !finite(source.expPerFood, Number.EPSILON) ||
      !finite(source.staminaMax, Number.EPSILON) ||
      !finite(source.staminaDrainPerAwakeHour, 0) || !finite(source.staminaDrainPerFood, 0) ||
      !finite(source.lowStaminaThreshold, 0, source.staminaMax) ||
      !finite(source.lowStaminaMultiplier, Number.EPSILON, 1) ||
      !integer(source.sickPoopThreshold, 1) || !finite(source.sickTriggerHours, Number.EPSILON) ||
      !integer(source.sickTriggerHours * 3_600_000, 1) ||
      !finite(source.sickGrowthMultiplier, Number.EPSILON, 1) ||
      !finite(source.naturalRecoveryHours, Number.EPSILON) ||
      !integer(source.naturalRecoveryHours * 3_600_000, 1) ||
      !finite(source.moodCleanMultiplier, Number.EPSILON, 1) ||
      !finite(source.moodSomePoopMultiplier, Number.EPSILON, source.moodCleanMultiplier) ||
      !finite(source.moodDirtyMultiplier, Number.EPSILON, source.moodSomePoopMultiplier) ||
      !integer(source.moodSomePoopAt, 1) || !integer(source.moodDirtyAt, source.moodSomePoopAt) ||
      !integer(proposal.expScale, 1) || !integer(source.expPerFood * proposal.expScale, 1) ||
      !integer(proposal.foodUnitsPerItem, 1) || proposal.foodUnitsPerItem !== 2 * source.stepsPerFood ||
      !integer(proposal.coinUnitsPerCoin, 1) || proposal.coinUnitsPerCoin !== 200 / source.coinPer100Steps ||
      !integer(proposal.poopIntervalMs, 1) || !integer(proposal.foodsPerPoop, 1) ||
      !integer(proposal.hibernateAfterMs, 1) || !finite(proposal.hungerMax, Number.EPSILON) ||
      !finite(proposal.initialHunger, 0, proposal.hungerMax) ||
      !finite(proposal.mealHungerThreshold, 0, proposal.hungerMax) ||
      !finite(proposal.hungerPerAwakeHour, 0) ||
      !finite(proposal.hungerReductionPerMeal, Number.EPSILON, proposal.hungerMax)) throw new Error('Invalid game fixture');
}

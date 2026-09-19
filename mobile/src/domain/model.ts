import { DecisionRequired, requireGameConfig } from './config';
import type { GameConfig } from './config';

export const CharacterFormCatalog = Object.freeze({
  arucon: { displayName: '아루콘' },
  mallu: { displayName: '말루' },
  mono: { displayName: '모노' },
  piko: { displayName: '피코' },
  mongle: { displayName: '몽글' },
});

export type FormId = keyof typeof CharacterFormCatalog;
export type Condition = 'well' | 'low' | 'recovering';
export type GameDayWindow = { id: string; timezone: string; startUtcMs: number; endUtcMs: number };
export type ActivityCursor = {
  gameDay: GameDayWindow;
  selectedProviderId: string;
  providerId: string;
  connectedAtMs: number;
  sourceRevision: number;
  interval: { startUtcMs: number; endUtcMs: number };
  steps: number;
  runningSteps: number;
  processedWeightedUnits: number;
};

export type PetState = {
  schemaVersion: 1;
  petId: string;
  speciesFamily: 'arucon';
  givenName: string;
  formId: FormId;
  personalityProfileId: string;
  revision: number;
  food: number;
  coin: number;
  totalExpUnits: number;
  stamina: number;
  hunger: number;
  poopCount: number;
  poopElapsedMs: number;
  foodsSincePoop: number;
  dirtyElapsedMs: number;
  recoveryElapsedMs: number;
  condition: Condition;
  tableInstalled: boolean;
  toiletInstalled: boolean;
  autoFeedOptIn: boolean;
  sleepGrowthMultiplier: number;
  sleeping: boolean;
  hibernating: boolean;
  lastSimulatedAtMs: number;
  lastForegroundAtMs: number;
  carryFoodUnits: number;
  carryCoinUnits: number;
  activityByDay: Record<string, ActivityCursor>;
};

export type Command =
  | { type: 'activity'; commandId: string; gameDay: GameDayWindow; selectedProviderId: string; providerId: string; connectedAtMs: number; sourceRevision: number; interval: { startUtcMs: number; endUtcMs: number }; observedAtMs: number; steps: number; runningSteps: number }
  | { type: 'consumeMeal'; commandId: string; mealId: string; mode: 'direct' | 'auto'; observedAtMs: number }
  | { type: 'interact'; commandId: string; kind: 'touch' | 'greet' | 'observe'; gameDayId?: string }
  | { type: 'clean'; commandId: string }
  | { type: 'sleep'; commandId: string }
  | { type: 'wake'; commandId: string }
  | { type: 'setAutoFeed'; commandId: string; enabled: boolean }
  | { type: 'installFacilityFixture'; commandId: string; facility: 'table' | 'toilet' }
  | { type: 'setSleepMultiplierFixture'; commandId: string; multiplier: number }
  | { type: 'applyApprovedPolicyUpgrade'; commandId: string; policyVersion: string }
  | { type: 'setSleepGrowthMultiplier'; commandId: string; gameDay: GameDayWindow; recordDayId: string | null; policyVersion: string; multiplier: number; confirmation: 'neutral_reset' | 'valid_score' }
  | { type: 'applyEvolutionForm'; commandId: string; policyVersion: string; formId: Exclude<FormId, 'arucon'> }
  | { type: 'advance'; commandId: string; toMs: number }
  | { type: 'foregroundExit'; commandId: string; toMs: number }
  | { type: 'foregroundReturn'; commandId: string; toMs: number };

export type DomainEvent =
  | { type: 'ActivityRewarded'; deltaFood: number; deltaCoin: number; suppressedFood: number; gameDayId: string }
  | { type: 'MealConsumed'; mealId: string; mode: 'direct' | 'auto'; expUnits: number }
  | { type: 'InteractionObserved'; kind: 'touch' | 'greet' | 'observe'; gameDayId?: string }
  | { type: 'Cleaned'; removed: number }
  | { type: 'SleepChanged'; sleeping: boolean }
  | { type: 'AutoFeedChanged'; enabled: boolean }
  | { type: 'FacilityInstalled'; facility: 'table' | 'toilet' }
  | { type: 'SleepMultiplierFixtureChanged'; multiplier: number }
  | { type: 'ApprovedPolicyUpgraded'; policyVersion: string; toiletInstalled: boolean; sleepMultiplierRaised: boolean }
  | { type: 'SleepGrowthMultiplierChanged'; gameDayId: string; recordDayId: string | null; policyVersion: string; multiplier: number; confirmation: 'neutral_reset' | 'valid_score' }
  | { type: 'EvolutionFormApplied'; policyVersion: string; formId: Exclude<FormId, 'arucon'> }
  | { type: 'ConditionChanged'; condition: Condition }
  | { type: 'Hibernated' }
  | { type: 'Returned' };

export type Transition = { state: PetState; events: DomainEvent[] };

export function initialPet(petId: string, givenName: string, personalityProfileId: string, atMs: number, config: GameConfig): PetState {
  requireGameConfig(config);
  if (!petId || !givenName.trim() || !personalityProfileId || !Number.isSafeInteger(atMs) || atMs < 0) throw new Error('Invalid initial pet');
  return {
    schemaVersion: 1, petId, speciesFamily: 'arucon', givenName, formId: 'arucon', personalityProfileId,
    revision: 0, food: 0, coin: 0, totalExpUnits: 0, stamina: config.source.staminaMax, hunger: config.proposal.initialHunger,
    poopCount: 0, poopElapsedMs: 0, foodsSincePoop: 0, dirtyElapsedMs: 0, recoveryElapsedMs: 0, condition: 'well',
    tableInstalled: config.initialFacilities.tableInstalled, toiletInstalled: config.initialFacilities.toiletInstalled,
    autoFeedOptIn: false, sleepGrowthMultiplier: 1, sleeping: false, hibernating: false,
    lastSimulatedAtMs: atMs, lastForegroundAtMs: atMs, carryFoodUnits: 0, carryCoinUnits: 0, activityByDay: {},
  };
}

export function resolveAppearance(): never {
  throw new DecisionRequired('DEC-08 appearance branch policy');
}

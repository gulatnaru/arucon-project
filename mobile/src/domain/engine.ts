import { requireDevFixture } from './config';
import type { GameConfig } from './config';
import type { Command, Condition, DomainEvent, GameDayWindow, PetState, Transition } from './model';

const HOUR_MS = 3_600_000;

export type DomainActionReason = 'no_food' | 'not_hungry' | 'sleeping' | 'hibernating' |
  'table_required' | 'auto_feed_disabled' | 'stale_meal_state';

/** Expected action refusal. UI may show a notice and allow the next action. */
export class DomainActionRejected extends Error {
  readonly code: DomainActionReason;
  constructor(code: DomainActionReason) {
    super(`Domain action rejected: ${code}`);
    this.name = 'DomainActionRejected';
    this.code = code;
  }
}

function wholeNonnegative(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}`);
}

function clone(state: PetState): PetState {
  return { ...state, activityByDay: { ...state.activityByDay } };
}

function moodMultiplier(poop: number, config: GameConfig): number {
  return poop >= config.source.moodDirtyAt ? config.source.moodDirtyMultiplier
    : poop >= config.source.moodSomePoopAt ? config.source.moodSomePoopMultiplier : config.source.moodCleanMultiplier;
}

function evolveCondition(state: PetState, config: GameConfig, events: DomainEvent[]): void {
  const dirtyLimit = config.source.sickTriggerHours * HOUR_MS;
  const recoveryLimit = config.source.naturalRecoveryHours * HOUR_MS;
  if (state.condition === 'well' && state.poopCount >= config.source.sickPoopThreshold && state.dirtyElapsedMs >= dirtyLimit) {
    state.condition = 'low';
    state.recoveryElapsedMs = 0;
    events.push({ type: 'ConditionChanged', condition: 'low' });
  }
  if (state.condition === 'recovering' && state.poopCount >= config.source.sickPoopThreshold) {
    state.condition = 'low';
    state.recoveryElapsedMs = 0;
    events.push({ type: 'ConditionChanged', condition: 'low' });
  }
  if (state.condition === 'recovering' && state.recoveryElapsedMs >= recoveryLimit) {
    state.condition = 'well';
    state.recoveryElapsedMs = 0;
    state.dirtyElapsedMs = 0;
    events.push({ type: 'ConditionChanged', condition: 'well' });
  }
}

/** Advances only elapsed game time. No system clock, OS, or activity input is read. */
function advance(state: PetState, toMs: number, config: GameConfig, events: DomainEvent[]): void {
  wholeNonnegative(toMs, 'time');
  if (toMs < state.lastSimulatedAtMs) throw new Error('Clock moved backward');
  if (state.hibernating) { state.lastSimulatedAtMs = toMs; return; }
  const hibernateAt = state.lastForegroundAtMs + config.proposal.hibernateAfterMs;
  const activeEnd = Math.min(toMs, hibernateAt);
  let cursor = state.lastSimulatedAtMs;
  while (cursor < activeEnd) {
    // A timer exactly at the hibernation edge waits for the next positive active interval.
    if (state.poopElapsedMs >= config.proposal.poopIntervalMs) {
      state.poopElapsedMs = 0;
      if (!state.toiletInstalled) state.poopCount++;
    }
    evolveCondition(state, config, events);
    const poopIn = config.proposal.poopIntervalMs - state.poopElapsedMs;
    const dirtyIn = state.condition === 'well' && state.poopCount >= config.source.sickPoopThreshold
      ? config.source.sickTriggerHours * HOUR_MS - state.dirtyElapsedMs : Infinity;
    const recoveryIn = state.condition === 'recovering'
      ? config.source.naturalRecoveryHours * HOUR_MS - state.recoveryElapsedMs : Infinity;
    const delta = Math.min(activeEnd - cursor, poopIn, dirtyIn, recoveryIn);
    if (delta <= 0) throw new Error('Invalid timer state');
    const wasDirty = state.poopCount >= config.source.sickPoopThreshold;
    state.poopElapsedMs += delta;
    if (wasDirty && state.condition === 'well') state.dirtyElapsedMs += delta;
    if (state.condition === 'recovering') state.recoveryElapsedMs += delta;
    if (!state.sleeping) {
      state.stamina = Math.max(0, state.stamina - config.source.staminaDrainPerAwakeHour * delta / HOUR_MS);
      state.hunger = Math.min(config.proposal.hungerMax, state.hunger + config.proposal.hungerPerAwakeHour * delta / HOUR_MS);
    }
    cursor += delta;
    const hibernateWins = cursor === hibernateAt;
    if (!hibernateWins) {
      if (state.poopElapsedMs >= config.proposal.poopIntervalMs) {
        state.poopElapsedMs = 0;
        if (!state.toiletInstalled) state.poopCount++;
      }
      evolveCondition(state, config, events);
    }
  }
  if (toMs >= hibernateAt) {
    state.hibernating = true;
    events.push({ type: 'Hibernated' });
  }
  state.lastSimulatedAtMs = toMs;
}

function validDay(day: GameDayWindow): boolean {
  return !!day && typeof day.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.id) &&
    typeof day.timezone === 'string' && day.timezone.trim().length > 0 &&
    Number.isSafeInteger(day.startUtcMs) && day.startUtcMs >= 0 &&
    Number.isSafeInteger(day.endUtcMs) && day.endUtcMs > day.startUtcMs;
}

function sameDay(a: GameDayWindow, b: GameDayWindow): boolean {
  return a.id === b.id && a.timezone === b.timezone && a.startUtcMs === b.startUtcMs && a.endUtcMs === b.endUtcMs;
}

function validActivityMetadata(value: Extract<Command, { type: 'activity' }>): void {
  if (!validDay(value.gameDay) || typeof value.providerId !== 'string' || !value.providerId.trim() ||
      typeof value.selectedProviderId !== 'string' || value.providerId !== value.selectedProviderId || !value.interval) throw new Error('Invalid activity source or day');
  for (const [name, number] of [
    ['connectedAtMs', value.connectedAtMs], ['sourceRevision', value.sourceRevision],
    ['intervalStartUtcMs', value.interval.startUtcMs], ['intervalEndUtcMs', value.interval.endUtcMs],
    ['observedAtMs', value.observedAtMs],
  ] as const) wholeNonnegative(number, name);
  if (value.interval.startUtcMs < value.gameDay.startUtcMs || value.interval.endUtcMs > value.gameDay.endUtcMs ||
      value.interval.endUtcMs <= value.interval.startUtcMs || value.interval.startUtcMs < value.connectedAtMs ||
      value.observedAtMs < value.interval.endUtcMs) throw new Error('Activity outside eligible interval');
}

function applyActivity(state: PetState, command: Extract<Command, { type: 'activity' }>, config: GameConfig, events: DomainEvent[]): void {
  wholeNonnegative(command.steps, 'steps');
  wholeNonnegative(command.runningSteps, 'runningSteps');
  validActivityMetadata(command);
  if (command.runningSteps > command.steps) throw new Error('Invalid activity aggregate');
  const weightedUnits = 2 * command.steps + (2 * config.source.runningMultiplier - 2) * command.runningSteps;
  wholeNonnegative(weightedUnits, 'weighted steps');
  const cursor = state.activityByDay[command.gameDay.id];
  if (cursor) {
    if (!sameDay(cursor.gameDay, command.gameDay) || cursor.selectedProviderId !== command.selectedProviderId ||
        cursor.providerId !== command.providerId || cursor.connectedAtMs !== command.connectedAtMs) throw new Error('Activity source selection changed');
    if (command.sourceRevision < cursor.sourceRevision) throw new Error('Stale activity revision');
    if (command.sourceRevision === cursor.sourceRevision &&
        (cursor.steps !== command.steps || cursor.runningSteps !== command.runningSteps ||
         cursor.interval.startUtcMs !== command.interval.startUtcMs || cursor.interval.endUtcMs !== command.interval.endUtcMs)) throw new Error('Conflicting activity revision');
  }
  const before = cursor?.processedWeightedUnits ?? 0;
  const fresh = Math.max(0, weightedUnits - before);
  state.activityByDay[command.gameDay.id] = {
    gameDay: { ...command.gameDay }, selectedProviderId: command.selectedProviderId, providerId: command.providerId,
    connectedAtMs: command.connectedAtMs, sourceRevision: command.sourceRevision, interval: { ...command.interval },
    steps: command.steps, runningSteps: command.runningSteps, processedWeightedUnits: Math.max(before, weightedUnits),
  };
  const foodUnits = state.carryFoodUnits + fresh;
  const coinUnits = state.carryCoinUnits + fresh;
  const potentialFood = Math.floor(foodUnits / config.proposal.foodUnitsPerItem);
  const deltaFood = Math.min(potentialFood, Math.max(0, config.source.foodCap - state.food));
  const deltaCoin = Math.floor(coinUnits / config.proposal.coinUnitsPerCoin);
  state.carryFoodUnits = foodUnits % config.proposal.foodUnitsPerItem;
  state.carryCoinUnits = coinUnits % config.proposal.coinUnitsPerCoin;
  state.food += deltaFood;
  state.coin += deltaCoin;
  events.push({ type: 'ActivityRewarded', deltaFood, deltaCoin, suppressedFood: potentialFood - deltaFood, gameDayId: command.gameDay.id });
}

/** Both modes deliberately share all food, hunger, stamina and EXP logic. */
function consumeMeal(state: PetState, command: Extract<Command, { type: 'consumeMeal' }>, config: GameConfig, events: DomainEvent[]): void {
  if (!command.mealId) throw new Error('Missing mealId');
  wholeNonnegative(command.observedAtMs, 'meal time');
  if (command.observedAtMs !== state.lastSimulatedAtMs) throw new DomainActionRejected('stale_meal_state');
  if (state.hibernating) throw new DomainActionRejected('hibernating');
  if (state.sleeping) throw new DomainActionRejected('sleeping');
  if (state.food < 1) throw new DomainActionRejected('no_food');
  if (state.hunger < config.proposal.mealHungerThreshold) throw new DomainActionRejected('not_hungry');
  if (command.mode === 'auto' && !state.tableInstalled) throw new DomainActionRejected('table_required');
  if (command.mode === 'auto' && !state.autoFeedOptIn) throw new DomainActionRejected('auto_feed_disabled');
  const exp = config.source.expPerFood * state.sleepGrowthMultiplier * moodMultiplier(state.poopCount, config)
    * (state.condition === 'well' ? 1 : config.source.sickGrowthMultiplier)
    * (state.stamina < config.source.lowStaminaThreshold ? config.source.lowStaminaMultiplier : 1);
  const expUnits = Math.floor(exp * config.proposal.expScale + 0.5);
  state.food--;
  state.totalExpUnits += expUnits;
  state.stamina = Math.max(0, state.stamina - config.source.staminaDrainPerFood);
  state.hunger = Math.max(0, state.hunger - config.proposal.hungerReductionPerMeal);
  state.foodsSincePoop++;
  if (state.foodsSincePoop >= config.proposal.foodsPerPoop) {
    state.foodsSincePoop = 0;
    if (!state.toiletInstalled) state.poopCount++;
    evolveCondition(state, config, events);
  }
  events.push({ type: 'MealConsumed', mealId: command.mealId, mode: command.mode, expUnits });
}

export function reducePet(input: PetState, command: Command, config: GameConfig): Transition {
  requireDevFixture(config);
  validatePetState(input, config);
  if (!command.commandId) throw new Error('Missing commandId');
  const state = clone(input);
  const events: DomainEvent[] = [];
  switch (command.type) {
    case 'activity': applyActivity(state, command, config, events); break;
    case 'consumeMeal': consumeMeal(state, command, config, events); break;
    case 'interact': events.push({ type: 'InteractionObserved', kind: command.kind }); break;
    case 'clean': {
      const removed = state.poopCount;
      state.poopCount = 0;
      state.dirtyElapsedMs = 0;
      if (state.condition === 'low') {
        state.condition = 'recovering';
        state.recoveryElapsedMs = 0;
        events.push({ type: 'ConditionChanged', condition: 'recovering' });
      }
      events.push({ type: 'Cleaned', removed });
      break;
    }
    case 'sleep':
      if (state.hibernating) throw new DomainActionRejected('hibernating');
      state.sleeping = true;
      events.push({ type: 'SleepChanged', sleeping: true });
      break;
    case 'wake':
      if (state.hibernating) throw new DomainActionRejected('hibernating');
      state.sleeping = false;
      events.push({ type: 'SleepChanged', sleeping: false });
      break;
    case 'setAutoFeed':
      state.autoFeedOptIn = command.enabled;
      events.push({ type: 'AutoFeedChanged', enabled: command.enabled });
      break;
    case 'installFacilityFixture':
      if (command.facility === 'table') state.tableInstalled = true;
      else {
        state.toiletInstalled = true;
        state.poopCount = 0;
        state.dirtyElapsedMs = 0;
        if (state.condition === 'low') {
          state.condition = 'recovering';
          state.recoveryElapsedMs = 0;
          events.push({ type: 'ConditionChanged', condition: 'recovering' });
        }
      }
      events.push({ type: 'FacilityInstalled', facility: command.facility });
      break;
    case 'setSleepMultiplierFixture':
      if (!Number.isFinite(command.multiplier) || command.multiplier <= 0) throw new Error('Invalid fixture multiplier');
      state.sleepGrowthMultiplier = command.multiplier;
      events.push({ type: 'SleepMultiplierFixtureChanged', multiplier: command.multiplier });
      break;
    case 'advance': advance(state, command.toMs, config, events); break;
    case 'foregroundExit': {
      wholeNonnegative(command.toMs, 'time');
      if (command.toMs < state.lastSimulatedAtMs) throw new Error('Clock moved backward');
      if (state.hibernating) throw new DomainActionRejected('hibernating');
      // The caller confirms uninterrupted foreground use through toMs, so this
      // interval must not trigger the background-only hibernation deadline.
      state.lastForegroundAtMs = command.toMs;
      advance(state, command.toMs, config, events);
      break;
    }
    case 'foregroundReturn': {
      advance(state, command.toMs, config, events);
      state.hibernating = false;
      state.lastForegroundAtMs = command.toMs;
      events.push({ type: 'Returned' });
      break;
    }
  }
  state.revision++;
  validatePetState(state, config);
  return { state, events };
}

/** Reject damaged snapshots before any transaction can replace their bytes. */
export function validatePetState(value: PetState, config: GameConfig): void {
  requireDevFixture(config);
  if (!value || value.schemaVersion !== 1 || !value.petId || value.speciesFamily !== 'arucon' || !value.givenName || !value.personalityProfileId || !['arucon', 'mallu', 'mono', 'piko', 'mongle'].includes(value.formId)) throw new Error('Corrupt pet identity');
  for (const key of ['revision', 'food', 'coin', 'totalExpUnits', 'poopCount', 'poopElapsedMs', 'foodsSincePoop', 'dirtyElapsedMs', 'recoveryElapsedMs', 'lastSimulatedAtMs', 'lastForegroundAtMs', 'carryFoodUnits', 'carryCoinUnits'] as const) wholeNonnegative(value[key], key);
  if (!Number.isFinite(value.stamina) || value.stamina < 0 || value.stamina > config.source.staminaMax || !Number.isFinite(value.hunger) || value.hunger < 0 || value.hunger > config.proposal.hungerMax) throw new Error('Corrupt pet meters');
  if (!Number.isFinite(value.sleepGrowthMultiplier) || value.sleepGrowthMultiplier <= 0 || !['well', 'low', 'recovering'].includes(value.condition as Condition)) throw new Error('Corrupt pet condition');
  if (typeof value.tableInstalled !== 'boolean' || typeof value.toiletInstalled !== 'boolean' || typeof value.autoFeedOptIn !== 'boolean' || typeof value.sleeping !== 'boolean' || typeof value.hibernating !== 'boolean') throw new Error('Corrupt pet flags');
  if (value.lastForegroundAtMs > value.lastSimulatedAtMs || value.poopElapsedMs > config.proposal.poopIntervalMs || value.foodsSincePoop >= config.proposal.foodsPerPoop || value.carryFoodUnits >= config.proposal.foodUnitsPerItem || value.carryCoinUnits >= config.proposal.coinUnitsPerCoin) throw new Error('Corrupt pet timer or carry');
  if (!value.activityByDay || typeof value.activityByDay !== 'object' || Array.isArray(value.activityByDay)) throw new Error('Corrupt activity cursor');
  for (const [dayId, cursor] of Object.entries(value.activityByDay)) {
    if (!validDay(cursor?.gameDay) || cursor.gameDay.id !== dayId || typeof cursor.providerId !== 'string' ||
        !cursor.providerId.trim() || cursor.providerId !== cursor.selectedProviderId || !cursor.interval) throw new Error('Corrupt activity cursor');
    for (const [name, number] of [
      ['connectedAtMs', cursor.connectedAtMs], ['sourceRevision', cursor.sourceRevision],
      ['intervalStartUtcMs', cursor.interval.startUtcMs], ['intervalEndUtcMs', cursor.interval.endUtcMs],
      ['steps', cursor.steps], ['runningSteps', cursor.runningSteps], ['processedWeightedUnits', cursor.processedWeightedUnits],
    ] as const) wholeNonnegative(number, name);
    const weighted = 2 * cursor.steps + (2 * config.source.runningMultiplier - 2) * cursor.runningSteps;
    if (!Number.isSafeInteger(weighted) || cursor.processedWeightedUnits < weighted ||
        cursor.runningSteps > cursor.steps || cursor.interval.startUtcMs < cursor.gameDay.startUtcMs ||
        cursor.interval.endUtcMs > cursor.gameDay.endUtcMs || cursor.interval.startUtcMs < cursor.connectedAtMs ||
        cursor.interval.endUtcMs <= cursor.interval.startUtcMs) throw new Error('Corrupt activity cursor');
  }
}

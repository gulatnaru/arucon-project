import { DEV_GAME_CONFIG } from '../domain/config';
import type { GameConfig } from '../domain/config';
import { initialPet } from '../domain/model';
import type { Command, DomainEvent, PetState } from '../domain/model';
import { LocalPetStore, expoSqliteConnection } from '../storage/sqlite';
import type { SqlConnection, StoredTransition } from '../storage/sqlite';
import type { NormalizedActivity } from '../activity/activityProvider';
import { projectPetForWidget } from '../widget';
import type { PetProjection } from '../widget';
import type { SQLiteDatabase } from 'expo-sqlite';

const HOUR_MS = 3_600_000;

export type JournalEntry = Readonly<{
  id: string;
  sequence: number;
  commandId: string;
  event: DomainEvent;
}>;

function assertTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid service time');
}

/** One service instance serializes its own commands; SQLite remains the authoritative writer. */
export class DevLifeService {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: LocalPetStore,
    private readonly db: SqlConnection,
    private readonly petId: string,
    private readonly config: GameConfig = DEV_GAME_CONFIG,
  ) {}

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  async currentState(): Promise<PetState> {
    const state = await this.store.loadPet(this.petId);
    if (!state) throw new Error('Pet not found');
    return state;
  }

  private async commit(command: Command): Promise<StoredTransition> {
    return this.store.execute(this.petId, command);
  }

  private autoEligible(state: PetState): boolean {
    return state.tableInstalled && state.autoFeedOptIn && state.food > 0 && !state.sleeping && !state.hibernating;
  }

  private async eatAutoAtCurrentTime(state: PetState): Promise<PetState> {
    if (this.config.proposal.hungerReductionPerMeal <= 0) throw new Error('Invalid DEV meal reduction');
    while (this.autoEligible(state) && state.hunger >= this.config.proposal.mealHungerThreshold &&
           state.lastSimulatedAtMs < state.lastForegroundAtMs + this.config.proposal.hibernateAfterMs) {
      const mealId = `auto:${this.petId}:${state.lastSimulatedAtMs}:${state.revision}`;
      const transition = await this.commit({
        type: 'consumeMeal', commandId: mealId, mealId, mode: 'auto', observedAtMs: state.lastSimulatedAtMs,
      });
      state = transition.currentState;
    }
    return state;
  }

  /** Settle previously owned food before accepting new activity. Hibernation wins equal-time ties. */
  private async settleUntil(toMs: number): Promise<PetState> {
    assertTime(toMs);
    let state = await this.currentState();
    if (toMs < state.lastSimulatedAtMs) throw new Error('Service clock moved backward');
    while (true) {
      state = await this.eatAutoAtCurrentTime(state);
      if (state.lastSimulatedAtMs === toMs) return state;
      if (state.hibernating || !this.autoEligible(state) || this.config.proposal.hungerPerAwakeHour <= 0) {
        const transition = await this.commit({
          type: 'advance', commandId: `advance:${this.petId}:${state.lastSimulatedAtMs}:${toMs}`,
          toMs,
        });
        return transition.currentState;
      }
      const hibernateAt = state.lastForegroundAtMs + this.config.proposal.hibernateAfterMs;
      const threshold = this.config.proposal.mealHungerThreshold;
      const remaining = threshold - state.hunger;
      const untilMealMs = Math.max(1, Math.ceil(remaining * HOUR_MS / this.config.proposal.hungerPerAwakeHour));
      const mealAt = state.lastSimulatedAtMs + untilMealMs;
      // A meal at the hibernation boundary is not eligible. The domain advances to that boundary first.
      const nextAt = mealAt < hibernateAt && mealAt <= toMs ? mealAt : toMs;
      const transition = await this.commit({
        type: 'advance', commandId: `advance:${this.petId}:${state.lastSimulatedAtMs}:${nextAt}`,
        toMs: nextAt,
      });
      state = transition.currentState;
    }
  }

  advanceTo(toMs: number): Promise<PetState> {
    return this.exclusive(() => this.settleUntil(toMs));
  }

  /** Confirm continuous foreground use in safe slices, preserving auto-meal thresholds. */
  leaveForeground(toMs: number): Promise<PetState> {
    return this.exclusive(async () => {
      assertTime(toMs);
      let state = await this.currentState();
      if (toMs < state.lastSimulatedAtMs) throw new Error('Service clock moved backward');
      const halfWindow = Math.max(1, Math.floor(this.config.proposal.hibernateAfterMs / 2));
      while (!state.hibernating && toMs >= state.lastForegroundAtMs + this.config.proposal.hibernateAfterMs) {
        const checkpointAt = Math.max(state.lastSimulatedAtMs, state.lastForegroundAtMs + halfWindow);
        state = await this.settleUntil(checkpointAt);
        const transition = await this.commit({
          type: 'foregroundExit', commandId: `foreground-exit:${this.petId}:${checkpointAt}`, toMs: checkpointAt,
        });
        state = transition.currentState;
      }
      state = await this.settleUntil(toMs);
      const transition = await this.commit({
        type: 'foregroundExit', commandId: `foreground-exit:${this.petId}:${toMs}`, toMs,
      });
      return transition.currentState;
    });
  }

  private async applyActivity(activity: NormalizedActivity, nowMs: number): Promise<PetState> {
    if (activity.status !== 'available') throw new Error('DecisionRequired: DEC-02 partial activity reward policy');
    if (activity.observedAtMs > nowMs) throw new Error('Future activity observation');
    const commandId = `activity:${this.petId}:${activity.providerId}:${activity.gameDayId}:${activity.sourceRevision}`;
    const transition = await this.commit({
      type: 'activity', commandId, gameDay: activity.gameDay,
      selectedProviderId: activity.selectedProviderId, providerId: activity.providerId,
      connectedAtMs: activity.connectedAtMs, sourceRevision: activity.sourceRevision,
      interval: activity.interval, observedAtMs: activity.observedAtMs,
      steps: activity.steps, runningSteps: activity.runningSteps,
    });
    return transition.currentState;
  }

  receiveActivity(activity: NormalizedActivity, nowMs: number): Promise<PetState> {
    return this.exclusive(async () => {
      await this.settleUntil(nowMs);
      const state = await this.applyActivity(activity, nowMs);
      return this.eatAutoAtCurrentTime(state);
    });
  }

  returnToForeground(nowMs: number, activity?: NormalizedActivity): Promise<PetState> {
    return this.exclusive(async () => {
      await this.settleUntil(nowMs);
      if (activity) await this.applyActivity(activity, nowMs);
      const transition = await this.commit({
        type: 'foregroundReturn', commandId: `foreground:${this.petId}:${nowMs}`, toMs: nowMs,
      });
      return this.eatAutoAtCurrentTime(transition.currentState);
    });
  }

  private async replayIfCommitted(commandId: string, type: Command['type'], makeCommand: (state: PetState) => Command): Promise<PetState | undefined> {
    const row = await this.db.getFirstAsync<{ command_json: string }>('SELECT command_json FROM command_ledger WHERE command_id = ? AND pet_id = ?', [commandId, this.petId]);
    if (!row) return undefined;
    const command = JSON.parse(row.command_json) as Command;
    if (command.type !== type) throw new Error('commandId reused for a different action');
    const candidate = makeCommand(await this.currentState());
    if (command.type === 'consumeMeal' && candidate.type === 'consumeMeal') {
      if (command.mode !== candidate.mode || command.mealId !== candidate.mealId) throw new Error('commandId reused with different meal');
    } else if (JSON.stringify(command) !== JSON.stringify(candidate)) {
      throw new Error('commandId reused with different payload');
    }
    const transition = await this.commit(command);
    return transition.currentState;
  }

  private runAt(nowMs: number, commandId: string, type: Command['type'], makeCommand: (state: PetState) => Command, autoAfter = false): Promise<PetState> {
    return this.exclusive(async () => {
      if (!commandId) throw new Error('Missing commandId');
      const replay = await this.replayIfCommitted(commandId, type, makeCommand);
      if (replay) return replay;
      const settled = await this.settleUntil(nowMs);
      const transition = await this.commit(makeCommand(settled));
      return autoAfter ? this.eatAutoAtCurrentTime(transition.currentState) : transition.currentState;
    });
  }

  feedDirect(nowMs: number, commandId: string): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'consumeMeal', state => ({
      type: 'consumeMeal', commandId, mealId: `direct:${commandId}`, mode: 'direct', observedAtMs: state.lastSimulatedAtMs,
    }));
  }

  interact(nowMs: number, commandId: string, kind: 'touch' | 'greet' | 'observe'): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'interact', () => ({ type: 'interact', commandId, kind }));
  }

  clean(nowMs: number, commandId: string): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'clean', () => ({ type: 'clean', commandId }));
  }

  sleep(nowMs: number, commandId: string): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'sleep', () => ({ type: 'sleep', commandId }));
  }

  wake(nowMs: number, commandId: string): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'wake', () => ({ type: 'wake', commandId }), true);
  }

  setAutoFeed(nowMs: number, commandId: string, enabled: boolean): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'setAutoFeed', () => ({ type: 'setAutoFeed', commandId, enabled }), enabled);
  }

  installFacilityFixture(nowMs: number, commandId: string, facility: 'table' | 'toilet'): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'installFacilityFixture', () => ({ type: 'installFacilityFixture', commandId, facility }), facility === 'table');
  }

  setSleepMultiplierFixture(nowMs: number, commandId: string, multiplier: number): Promise<PetState> {
    return this.runAt(nowMs, commandId, 'setSleepMultiplierFixture', () => ({ type: 'setSleepMultiplierFixture', commandId, multiplier }));
  }

  /** The outbox row and economic snapshot were committed in the same LocalPetStore transaction. */
  async readJournal(): Promise<JournalEntry[]> {
    const rows = await this.db.getAllAsync<{ sequence: number; command_id: string; event_json: string }>(
      'SELECT sequence, command_id, event_json FROM local_outbox WHERE pet_id = ? ORDER BY sequence', [this.petId],
    );
    return rows.flatMap(row => (JSON.parse(row.event_json) as DomainEvent[]).map((event, index) => ({
      id: `${row.command_id}:${index}`, sequence: row.sequence, commandId: row.command_id, event,
    })));
  }

  /** Read-only allowlist projection from the persisted pet; no game command is issued. */
  async readWidgetProjection(nowMs: number): Promise<PetProjection> {
    assertTime(nowMs);
    const state = await this.currentState();
    if (nowMs < state.lastSimulatedAtMs) throw new Error('Widget clock moved backward');
    return projectPetForWidget(state, state.lastSimulatedAtMs);
  }
}

export async function createDevLifeService(
  db: SqlConnection, petId: string, givenName: string, personalityProfileId: string, createdAtMs: number,
  config: GameConfig = DEV_GAME_CONFIG,
): Promise<DevLifeService> {
  const store = new LocalPetStore(db, config);
  await store.migrate();
  await store.createPet(initialPet(petId, givenName, personalityProfileId, createdAtMs, config));
  return new DevLifeService(store, db, petId, config);
}

export async function createDevLifeServiceFromExpo(
  database: SQLiteDatabase, petId: string, givenName: string, personalityProfileId: string, createdAtMs: number,
): Promise<DevLifeService> {
  return createDevLifeService(expoSqliteConnection(database), petId, givenName, personalityProfileId, createdAtMs);
}

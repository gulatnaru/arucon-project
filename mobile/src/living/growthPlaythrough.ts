import type { ApprovedMvpService } from '../application/approvedMvpService';
import { nextSyntheticWalk, utcFixtureDay } from '../application/devClock';
import type { NormalizedActivity } from '../activity/activityProvider';
import type { PetState } from '../domain/model';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import { APPROVED_GROWTH_POLICY, projectGrowth } from '../progression/projection';
import { approvedSyntheticSleepFixture } from '../presentation/approvedPresentation';
import type { SqlConnection } from '../storage/sqlite';
import { levelExpression } from './levelExpressions';

export const GROWTH_PLAYTHROUGH = Object.freeze({ reviewLevel: 20, holdMs: 20_000, petPrefix: 'life-experience-v1:growth_playthrough:' });
export type GrowthCheckpoint = { level: number; formId: PetState['formId']; totalExpUnits: number;
  virtualAtMs: number; observedDays: number; meals: number; expression: string };
type MealPlan = { sequence: number; toMs: number; nightAtMs: number | null; wakeAtMs: number | null; activity: NormalizedActivity };
export type GrowthPlaythroughProgress = { schemaVersion: 1; petId: string; sequence: number; targetLevel: number | null;
  sleepDay: string | null; pending: MealPlan | null; checkpoints: GrowthCheckpoint[] };

/** Resumable isolated-clock driver. Only service commands change the pet.
 * The pending immutable activity/time plan is saved before execution, so an
 * uncertain SQL acknowledgement replays that request rather than adding food. */
export class GrowthPlaythrough {
  private tail: Promise<void> = Promise.resolve();
  private constructor(private db: SqlConnection, private service: ApprovedMvpService, private petId: string) {}
  static async open(db: SqlConnection, service: ApprovedMvpService): Promise<GrowthPlaythrough> {
    const state = await service.currentState();
    if (!state.petId.startsWith(GROWTH_PLAYTHROUGH.petPrefix)) throw new Error('Growth clock is allowed only in its isolated profile');
    const driver = new GrowthPlaythrough(db, service, state.petId);
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.execAsync('CREATE TABLE IF NOT EXISTS growth_playthrough (pet_id TEXT PRIMARY KEY, progress_json TEXT NOT NULL)');
      const existing = await tx.getFirstAsync<{ progress_json: string }>('SELECT progress_json FROM growth_playthrough WHERE pet_id=?', [state.petId]);
      if (!existing) {
        if (state.totalExpUnits !== 0 || state.formId !== 'arucon') throw new Error('New continuous playthrough must start at Lv.1 without seeded EXP');
        const progress: GrowthPlaythroughProgress = { schemaVersion: 1, petId: state.petId, sequence: 0, targetLevel: null,
          sleepDay: null, pending: null, checkpoints: [{ level: 1, formId: state.formId, totalExpUnits: 0,
            virtualAtMs: state.lastSimulatedAtMs, observedDays: 0, meals: 0, expression: levelExpression(1).name }] };
        await tx.runAsync('INSERT INTO growth_playthrough VALUES (?,?)', [state.petId, JSON.stringify(progress)]);
      }
    });
    await driver.progress(); return driver;
  }
  async progress(): Promise<GrowthPlaythroughProgress> {
    const row = await this.db.getFirstAsync<{ progress_json: string }>('SELECT progress_json FROM growth_playthrough WHERE pet_id=?', [this.petId]);
    if (!row || row.progress_json.length > 32_768) throw new Error('Growth experience progress is missing or oversized; original retained');
    const value = JSON.parse(row.progress_json) as GrowthPlaythroughProgress;
    if (value.schemaVersion !== 1 || value.petId !== this.petId || !Number.isSafeInteger(value.sequence) || value.sequence < 0 ||
        !Array.isArray(value.checkpoints) || value.checkpoints.length > 20 || value.checkpoints.some((x, i) => x.level !== i + 1 || !Number.isSafeInteger(x.totalExpUnits) || x.totalExpUnits < 0)) {
      throw new Error('Growth experience progress is invalid; original retained');
    }
    return value;
  }
  private save(progress: GrowthPlaythroughProgress) {
    return this.db.withExclusiveTransactionAsync(tx => tx.runAsync('UPDATE growth_playthrough SET progress_json=? WHERE pet_id=?', [JSON.stringify(progress), this.petId]));
  }
  advanceLevel(continuePlaying: () => boolean = () => true, requestedLevel?: number) {
    const result = this.tail.then(() => this.advance(continuePlaying, requestedLevel));
    this.tail = result.then(() => undefined, () => undefined); return result;
  }
  private async advance(continuePlaying: () => boolean, requestedLevel?: number) {
    let progress = await this.progress();
    let state = await this.service.currentState();
    const before = projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY);
    if (requestedLevel !== undefined) {
      if (!Number.isInteger(requestedLevel) || requestedLevel < 2 || requestedLevel > 20) throw new Error('Invalid review target');
      if (progress.checkpoints.some(x => x.level === requestedLevel)) return { state, progress, interrupted: false };
      if (requestedLevel !== (progress.targetLevel ?? before.level + 1)) throw new Error('Growth request does not match the pending target');
    }
    if (before.level >= 20 && progress.targetLevel === null) return { state, progress, interrupted: false };
    if (progress.targetLevel === null) {
      progress.targetLevel = before.level + 1;
      await this.save(progress);
    }
    const target = progress.targetLevel;
    for (let count = 0; count < 100; count++) {
      state = await this.service.currentState();
      const level = projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY).level;
      if (level >= target) {
        if (level !== target || level > 20) throw new Error('Continuous experience skipped a level');
        state = (await this.service.resolveEligibleGrowth(Math.random)).state;
        const care = await this.service.deriveCareProfile();
        const meals = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?', [this.petId]);
        if (!progress.checkpoints.some(x => x.level === level)) progress.checkpoints.push({ level, formId: state.formId,
          totalExpUnits: state.totalExpUnits, virtualAtMs: state.lastSimulatedAtMs, observedDays: care.observedDays,
          meals: meals?.count ?? 0, expression: levelExpression(level).name });
        progress.targetLevel = null; progress.pending = null;
        await this.save(progress); return { state, progress, interrupted: false };
      }
      if (!continuePlaying()) return { state, progress, interrupted: true };
      if (!progress.pending) {
        const neededMs = Math.ceil(Math.max(0, APPROVED_GAME_CONFIG.proposal.mealHungerThreshold - state.hunger) /
          APPROVED_GAME_CONFIG.proposal.hungerPerAwakeHour * 3_600_000);
        const nextAt = state.lastSimulatedAtMs + neededMs + 1;
        const night = progress.sleepDay !== utcFixtureDay(nextAt).id;
        const wakeAt = night ? state.lastSimulatedAtMs + 4 * 3_600_000 : null;
        const toMs = nextAt + (night ? 4 * 3_600_000 : 0);
        const supply = await nextSyntheticWalk(state, toMs);
        progress.pending = { sequence: progress.sequence, toMs, nightAtMs: night ? state.lastSimulatedAtMs : null,
          wakeAtMs: wakeAt, activity: supply.activity };
        await this.save(progress);
      }
      const plan = progress.pending;
      const key = `growth-play:${this.petId}:${plan.sequence}`;
      if (plan.nightAtMs !== null && plan.wakeAtMs !== null) {
        await this.service.sleep(Math.max(plan.nightAtMs, state.lastSimulatedAtMs), `${key}:sleep`);
        state = await this.service.currentState();
        await this.service.advanceForeground(Math.max(plan.wakeAtMs, state.lastSimulatedAtMs));
        const wakeTime = Math.max(plan.wakeAtMs, (await this.service.currentState()).lastSimulatedAtMs);
        await this.service.applySyntheticSleep(approvedSyntheticSleepFixture(wakeTime, 100), wakeTime);
        state = await this.service.wake(wakeTime, `${key}:wake`);
        progress.sleepDay = utcFixtureDay(wakeTime).id;
      }
      state = await this.service.advanceForeground(Math.max(plan.toMs, state.lastSimulatedAtMs));
      const prior = state.activityByDay[plan.activity.gameDay.id];
      // Activity and food grant share one durable command. Already committed
      // supply is not prepared again after an uncertain progress write.
      if (!prior || prior.sourceRevision < plan.activity.sourceRevision) {
        state = (await this.service.receiveActivity(plan.activity, Math.max(plan.toMs, state.lastSimulatedAtMs))).state;
      } else state = await this.service.advanceForeground(state.lastSimulatedAtMs);
      progress.sequence++; progress.pending = null;
      await this.save(progress);
      // Service work is asynchronous; yield also bounds content/JSON work on JS.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    throw new Error('Growth experience meal bound reached; progress preserved');
  }
}

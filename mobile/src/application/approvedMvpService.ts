import type { NormalizedActivity } from '../activity/activityProvider';
import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';
import { APPROVED_GAME_CONFIG } from '../domain/config';
import { initialPet, type Command, type PetState } from '../domain/model';
import {
  APPROVED_FORM_SLOT, APPROVED_GROWTH_POLICY, APPROVED_SEX_POLICY, APPROVED_SEX_SLOT,
  approvedFormPolicy, isApprovedFormValue, isApprovedSexValue, projectGrowth, resolveOnce,
  ResolutionLedger, type ApprovedFormValue, type ApprovedSexValue, type CareProfile,
  type FrozenResolution, type GrowthProjection,
} from '../progression';
import {
  ApprovedCoinPurchaseService, ApprovedCoinShopPolicy, ApprovedDisabledCashPaymentPort,
  type ApprovedCoinCommit, type ApprovedCoinQuote,
} from '../shop';
import { approvedUtcGameDay, scoreApprovedSyntheticSleep, type ApprovedSleepScore, type ApprovedSleepScoreInput } from '../sleep';
import { DevSleepRecoveryService } from '../sleep/devRecovery';
import { DevAtomicTransactionStore, type DevSleepBenefitCommit } from '../storage/devTransactions';
import { LocalPetStore, type PetSyncRegistration, type SqlConnection } from '../storage/sqlite';
import { ReadOnlyWriterError, type LocalWriteAuthorityGuard } from '../sync/writeGuard';
import type { WriterIdentity } from '../sync/contracts';
import { DevLifeService } from './devLifeService';

export type ApprovedRuntimeStatus = Readonly<{
  policy: 'APPROVED';
  policyVersion: string;
  provider: 'synthetic_local_only';
  badge: '로컬 미리보기 · 건강 연결 꺼짐';
}>;

export type ApprovedGrowthView = Readonly<{
  state: PetState;
  projection: GrowthProjection;
  sex: ApprovedSexValue['sex'] | null;
  form: ApprovedFormValue | null;
}>;

export type ApprovedSleepApplication = Readonly<{
  score: ApprovedSleepScore;
  state: PetState;
  recovery: DevSleepBenefitCommit | null;
  benefitDay: ApprovedSleepScoreInput['gameDay'];
  benefitApplied: boolean;
}>;

export type ApprovedActivityReceipt = Readonly<{
  status: 'applied' | 'withheld_partial';
  state: PetState;
  notice: string;
}>;

export type ApprovedMvpServiceOptions = Readonly<{
  petId: string;
  givenName: string;
  personalityProfileId: string;
  createdAtMs: number;
  writeGuard?: LocalWriteAuthorityGuard;
  initialSyncRegistration?: PetSyncRegistration;
  outboxWriter?: WriterIdentity;
}>;

export class ApprovedMvpService {
  readonly status: ApprovedRuntimeStatus = Object.freeze({
    policy: 'APPROVED', policyVersion: APPROVED_MVP_POLICY.version,
    provider: 'synthetic_local_only', badge: '로컬 미리보기 · 건강 연결 꺼짐',
  });
  readonly cashPayments = new ApprovedDisabledCashPaymentPort();
  private tail: Promise<void> = Promise.resolve();
  private readonly life: DevLifeService;
  private readonly resolutions: ResolutionLedger;
  private readonly coinShop: ApprovedCoinShopPolicy;
  private readonly coinPurchases: ApprovedCoinPurchaseService;
  private readonly transactions: DevAtomicTransactionStore;

  private constructor(
    private readonly db: SqlConnection,
    private readonly store: LocalPetStore,
    private readonly petId: string,
    private readonly writeGuard?: LocalWriteAuthorityGuard,
    outboxWriter?: WriterIdentity,
  ) {
    this.life = new DevLifeService(store, db, petId, APPROVED_GAME_CONFIG);
    this.resolutions = new ResolutionLedger(db, APPROVED_GAME_CONFIG);
    this.coinShop = new ApprovedCoinShopPolicy();
    this.transactions = new DevAtomicTransactionStore(db, APPROVED_GAME_CONFIG, outboxWriter);
    this.coinPurchases = new ApprovedCoinPurchaseService(this.transactions, this.coinShop);
  }

  static async initialize(db: SqlConnection, options: ApprovedMvpServiceOptions): Promise<ApprovedMvpService> {
    const registrationWriter = options.initialSyncRegistration
      ? { deviceId: options.initialSyncRegistration.deviceId, deviceEpoch: options.initialSyncRegistration.deviceEpoch }
      : undefined;
    if (options.outboxWriter && registrationWriter &&
        (options.outboxWriter.deviceId !== registrationWriter.deviceId || options.outboxWriter.deviceEpoch !== registrationWriter.deviceEpoch)) {
      throw new Error('Outbox writer does not match initial sync registration');
    }
    const outboxWriter = options.outboxWriter ?? registrationWriter;
    const store = new LocalPetStore(db, APPROVED_GAME_CONFIG, outboxWriter);
    await store.migrate();
    const existing = await store.loadPet(options.petId);
    if (!existing) {
      const state = initialPet(options.petId, options.givenName, options.personalityProfileId, options.createdAtMs, APPROVED_GAME_CONFIG);
      if (options.writeGuard) {
        if (!options.initialSyncRegistration) throw new Error('Initial sync registration is required with a write guard');
        await store.createPetWithSyncRegistration(state, options.initialSyncRegistration);
        await options.writeGuard.assertCanCommit(options.petId);
      } else {
        if (options.initialSyncRegistration) throw new Error('Initial sync registration requires a write guard');
        await store.createPet(state);
      }
    }
    const service = new ApprovedMvpService(db, store, options.petId, options.writeGuard, outboxWriter);
    const loaded = await service.currentState();
    if (!loaded.toiletInstalled || loaded.sleepGrowthMultiplier < APPROVED_GAME_CONFIG.sleepGrowthMultiplier.minimum) {
      try {
        await service.ensureApprovedPolicyUpgrade();
      } catch (error) {
        if (!(error instanceof ReadOnlyWriterError)) throw error;
      }
    }
    try {
      await service.reconcileCommittedForm();
    } catch (error) {
      if (!(error instanceof ReadOnlyWriterError)) throw error;
    }
    return service;
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  private async assertCanWrite(): Promise<void> {
    await this.writeGuard?.assertCanCommit(this.petId);
  }

  private mutate<T>(work: () => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      await this.assertCanWrite();
      return work();
    });
  }

  currentState(): Promise<PetState> { return this.life.currentState(); }
  readJournal() { return this.life.readJournal(); }
  readWidgetProjection(nowMs: number) { return this.life.readWidgetProjection(nowMs); }

  ensureApprovedPolicyUpgrade(): Promise<PetState> {
    return this.mutate(async () => {
      const command: Command = {
        type: 'applyApprovedPolicyUpgrade', commandId: `approved-policy-upgrade:${this.petId}:${APPROVED_GAME_CONFIG.version}`,
        policyVersion: APPROVED_GAME_CONFIG.version,
      };
      return (await this.store.execute(this.petId, command)).currentState;
    });
  }

  advanceTo(toMs: number) {
    return this.mutate(async () => { await this.prepareBenefitDay(toMs, false); return this.life.advanceTo(toMs); });
  }
  leaveForeground(toMs: number) {
    return this.mutate(async () => { await this.prepareBenefitDay(toMs, true); return this.life.leaveForeground(toMs); });
  }
  returnToForeground(nowMs: number, activity?: NormalizedActivity): Promise<ApprovedActivityReceipt> {
    return this.mutate(async () => {
      await this.prepareBenefitDay(nowMs, false);
      const complete = activity?.status === 'available' ? activity : undefined;
      const state = await this.life.returnToForeground(nowMs, complete);
      return Object.freeze({
        status: activity?.status === 'partial' ? 'withheld_partial' as const : 'applied' as const,
        state,
        notice: activity?.status === 'partial'
          ? '일부 활동 기록은 확정 전이라 새 보상을 보류했어요. 기존 보유량은 유지돼요.'
          : '확정된 활동만 반영했어요.',
      });
    });
  }
  receiveActivity(activity: NormalizedActivity, nowMs: number): Promise<ApprovedActivityReceipt> {
    return this.mutate(async () => {
      await this.prepareBenefitDay(nowMs, false);
      if (activity.status === 'partial') return Object.freeze({
        status: 'withheld_partial' as const, state: await this.life.advanceTo(nowMs),
        notice: '일부 활동 기록은 확정 전이라 새 보상을 보류했어요. 기존 보유량은 유지돼요.',
      });
      return Object.freeze({
        status: 'applied' as const, state: await this.life.receiveActivity(activity, nowMs),
        notice: '확정된 활동만 반영했어요.',
      });
    });
  }
  feedDirect(nowMs: number, commandId: string) {
    return this.mutate(async () => { await this.prepareBenefitDay(nowMs, false); return this.life.feedDirect(nowMs, commandId); });
  }
  interact(nowMs: number, commandId: string, kind: 'touch' | 'greet' | 'observe', gameDayId: string) {
    return this.mutate(async () => {
      await this.prepareBenefitDay(nowMs, false);
      await this.life.advanceTo(nowMs);
      const transition = await this.store.execute(this.petId, { type: 'interact', commandId, kind, gameDayId });
      return transition.currentState;
    });
  }
  clean(nowMs: number, commandId: string) {
    return this.mutate(async () => { await this.prepareBenefitDay(nowMs, false); return this.life.clean(nowMs, commandId); });
  }
  sleep(nowMs: number, commandId: string) {
    return this.mutate(async () => { await this.prepareBenefitDay(nowMs, false); return this.life.sleep(nowMs, commandId); });
  }
  wake(nowMs: number, commandId: string): Promise<PetState> {
    return this.mutate(async () => {
      await this.prepareBenefitDay(nowMs, false);
      const benefitDay = approvedUtcGameDay(nowMs);
      const before = await this.life.currentState();
      const sleepStart = before.sleeping
        ? await this.latestSleepStartMs()
        : await this.latestSleepStartMs(commandId);
      let state = await this.life.wake(nowMs, commandId);
      if (sleepStart === null || nowMs - sleepStart < APPROVED_MVP_POLICY.sleep.petSleepMinimumMs) return state;
      const row = await this.db.getFirstAsync<{ command_json: string }>(`
        SELECT command_json FROM command_ledger
        WHERE pet_id = ? AND command_id IN (?, ?)
        ORDER BY CASE WHEN command_id = ? THEN 0 ELSE 1 END LIMIT 1
      `, [
        this.petId, `sleep-growth:${this.petId}:${benefitDay.id}`, `sleep-reset:${this.petId}:${benefitDay.id}`,
        `sleep-growth:${this.petId}:${benefitDay.id}`,
      ]);
      if (!row) return state;
      const priorRecovery = await this.db.getFirstAsync<{ command_id: string }>(
        'SELECT command_id FROM dev_sleep_benefit_ledger WHERE pet_id = ? AND game_day_id = ?',
        [this.petId, benefitDay.id],
      );
      if (priorRecovery) return state;
      const scoreCommand = JSON.parse(row.command_json) as Command;
      if (scoreCommand.type !== 'setSleepGrowthMultiplier') throw new Error('Stored sleep score command has the wrong type');
      const latestSleepDay = await this.latestSleepDayCommand();
      if (!latestSleepDay || latestSleepDay.gameDay.id !== benefitDay.id) return state;
      const target = scoreCommand.confirmation === 'neutral_reset'
        ? APPROVED_MVP_POLICY.sleep.noDataRecoveryTarget
        : APPROVED_MVP_POLICY.sleep.recoveryTargetAtScoreZero +
          (APPROVED_MVP_POLICY.sleep.recoveryTargetAtScoreHundred - APPROVED_MVP_POLICY.sleep.recoveryTargetAtScoreZero) *
          ((scoreCommand.multiplier - 1) / (APPROVED_MVP_POLICY.sleep.maximumBonusMultiplier - 1));
      const recovery = await new DevSleepRecoveryService(this.transactions, {
        decide: (_request, current) => ({
          kind: 'approved', nextStamina: Math.max(current.stamina, target),
          policyVersion: `${APPROVED_MVP_POLICY.version}:wake-recovery`,
        }),
      }).apply({
        commandId: `sleep-recovery:${this.petId}:${benefitDay.id}`,
        petId: this.petId, gameDayId: benefitDay.id, appliedAtMs: nowMs,
      });
      if (recovery.kind === 'applied') state = recovery.currentState;
      return state;
    });
  }
  setAutoFeed(nowMs: number, commandId: string, enabled: boolean) {
    return this.mutate(async () => { await this.prepareBenefitDay(nowMs, false); return this.life.setAutoFeed(nowMs, commandId, enabled); });
  }

  beginGameDay(gameDay: ApprovedSleepScoreInput['gameDay'], nowMs: number): Promise<PetState> {
    return this.mutate(async () => {
      const expected = approvedUtcGameDay(nowMs);
      if (JSON.stringify(gameDay) !== JSON.stringify(expected)) throw new Error('Game day does not match the approved UTC clock');
      await this.prepareBenefitDay(nowMs, false);
      return this.life.advanceTo(nowMs);
    });
  }

  quoteCoinItem(itemId: string, coinBalance: number): ApprovedCoinQuote {
    return this.coinShop.quote(itemId, coinBalance);
  }

  async readOwnedItemKeys(): Promise<readonly string[]> {
    const rows = await this.db.getAllAsync<{ ownership_key: string }>(
      'SELECT ownership_key FROM dev_item_ownership WHERE pet_id = ? ORDER BY ownership_key', [this.petId],
    );
    if (rows.some(row => !row.ownership_key?.trim())) throw new Error('Corrupt local item ownership');
    return Object.freeze(rows.map(row => row.ownership_key));
  }

  purchaseCoinItem(input: Readonly<{ purchaseId: string; itemId: string; committedAtMs: number }>): Promise<ApprovedCoinCommit> {
    return this.mutate(() => this.coinPurchases.purchase({ ...input, petId: this.petId }));
  }

  applySyntheticSleep(input: ApprovedSleepScoreInput, appliedAtMs: number): Promise<ApprovedSleepApplication> {
    return this.mutate(async () => {
      if (!Number.isSafeInteger(appliedAtMs) || appliedAtMs < input.gameDay.endUtcMs) {
        throw new Error('Sleep score cannot be confirmed before its game day ends');
      }
      const score = scoreApprovedSyntheticSleep(input);
      const benefitDay = approvedUtcGameDay(input.gameDay.endUtcMs);
      await this.prepareBenefitDay(appliedAtMs, false);
      const commandId = `sleep-growth:${this.petId}:${benefitDay.id}`;
      const prior = await this.db.getFirstAsync<{ command_json: string }>(
        'SELECT command_json FROM command_ledger WHERE pet_id = ? AND command_id = ?', [this.petId, commandId],
      );
      if (appliedAtMs >= benefitDay.endUtcMs || (!prior && score.status === 'no_data')) return Object.freeze({
        score, state: await this.life.currentState(), recovery: null, benefitDay, benefitApplied: false,
      });
      const command: Command = prior ? JSON.parse(prior.command_json) as Command : {
        type: 'setSleepGrowthMultiplier', commandId, gameDay: benefitDay, recordDayId: input.gameDay.id,
        policyVersion: APPROVED_GAME_CONFIG.version,
        multiplier: score.growthMultiplier, confirmation: 'valid_score',
      };
      if (command.type !== 'setSleepGrowthMultiplier') throw new Error('Sleep command ID has a different type');
      await this.store.execute(this.petId, command);
      const confirmedScore = (command.multiplier - 1) /
        (APPROVED_MVP_POLICY.sleep.maximumBonusMultiplier - 1) * 100;
      const effectiveScore: ApprovedSleepScore = prior ? Object.freeze({
        status: 'valid', score: confirmedScore, growthMultiplier: command.multiplier,
        coveredMinutes: score.coveredMinutes,
        explanation: '이 날짜에 먼저 확정한 게임 보너스를 유지해요.',
        policyVersion: score.policyVersion, source: 'SYNTHETIC_LOCAL_ONLY',
      }) : score;
      return Object.freeze({
        score: effectiveScore, state: await this.life.currentState(), recovery: null,
        benefitDay, benefitApplied: true,
      });
    });
  }

  private async latestSleepDayCommand(): Promise<Extract<Command, { type: 'setSleepGrowthMultiplier' }> | null> {
    const rows = await this.db.getAllAsync<{ command_json: string }>(`
      SELECT ledger.command_json
      FROM local_outbox AS outbox
      JOIN command_ledger AS ledger ON ledger.command_id = outbox.command_id
      WHERE outbox.pet_id = ? ORDER BY outbox.sequence DESC
    `, [this.petId]);
    for (const row of rows) {
      const command = JSON.parse(row.command_json) as Command;
      if (command.type === 'setSleepGrowthMultiplier') return command;
    }
    return null;
  }

  private async resetBenefitDay(gameDay: ApprovedSleepScoreInput['gameDay']): Promise<PetState> {
    return (await this.store.execute(this.petId, {
      type: 'setSleepGrowthMultiplier', commandId: `sleep-reset:${this.petId}:${gameDay.id}`,
      gameDay, recordDayId: null, policyVersion: APPROVED_GAME_CONFIG.version,
      multiplier: APPROVED_GAME_CONFIG.sleepGrowthMultiplier.minimum, confirmation: 'neutral_reset',
    })).currentState;
  }

  private async prepareBenefitDay(toMs: number, continuousForeground: boolean): Promise<PetState> {
    if (!Number.isSafeInteger(toMs) || toMs < 0) throw new Error('Invalid approved service time');
    let state = await this.life.currentState();
    if (toMs < state.lastSimulatedAtMs) throw new Error('Service clock moved backward');
    let day = approvedUtcGameDay(state.lastSimulatedAtMs);
    const targetDay = approvedUtcGameDay(toMs);
    state = await this.resetBenefitDay(day);
    if (day.id !== targetDay.id) {
      state = continuousForeground
        ? await this.life.leaveForeground(day.endUtcMs)
        : await this.life.advanceTo(day.endUtcMs);
      day = approvedUtcGameDay(day.endUtcMs);
      state = await this.resetBenefitDay(day);
      if (day.id !== targetDay.id) {
        state = continuousForeground
          ? await this.life.leaveForeground(targetDay.startUtcMs)
          : await this.life.advanceTo(targetDay.startUtcMs);
        state = await this.resetBenefitDay(targetDay);
      }
    }
    return state;
  }

  private async latestSleepStartMs(wakeCommandId?: string): Promise<number | null> {
    const rows = await this.db.getAllAsync<{ command_json: string; result_json: string }>(`
      SELECT ledger.command_json, ledger.result_json
      FROM local_outbox AS outbox
      JOIN command_ledger AS ledger ON ledger.command_id = outbox.command_id
      WHERE outbox.pet_id = ? ORDER BY outbox.sequence DESC
    `, [this.petId]);
    let seekSleep = wakeCommandId === undefined;
    for (const row of rows) {
      const command = JSON.parse(row.command_json) as Command;
      if (command.type === 'wake' && command.commandId === wakeCommandId) seekSleep = true;
      if (seekSleep && command.type === 'sleep') {
        const result = JSON.parse(row.result_json) as { state?: PetState };
        return result.state?.lastSimulatedAtMs ?? null;
      }
    }
    return null;
  }

  async deriveCareProfile(): Promise<CareProfile> {
    const active = new Set<string>();
    const rest = new Set<string>();
    const interaction = new Set<string>();
    for (const entry of await this.life.readJournal()) {
      if (entry.event.type === 'ActivityRewarded') active.add(entry.event.gameDayId);
      if (entry.event.type === 'SleepGrowthMultiplierChanged' && entry.event.confirmation === 'valid_score' && entry.event.recordDayId) {
        rest.add(entry.event.recordDayId);
      }
      if (entry.event.type === 'InteractionObserved' && entry.event.gameDayId) interaction.add(entry.event.gameDayId);
    }
    const observed = new Set([...active, ...rest, ...interaction]);
    return Object.freeze({
      observedDays: observed.size, activeDays: active.size,
      restfulRoutineDays: rest.size, interactionDays: interaction.size,
    });
  }

  async readGrowthView(): Promise<ApprovedGrowthView> {
    const state = await this.life.currentState();
    const [sex, form] = await Promise.all([
      this.resolutions.load(this.petId, APPROVED_SEX_SLOT, isApprovedSexValue),
      this.resolutions.load(this.petId, APPROVED_FORM_SLOT, isApprovedFormValue),
    ]);
    return Object.freeze({
      state, projection: projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY),
      sex: sex?.value.sex ?? null, form: form?.value ?? null,
    });
  }

  resolveEligibleGrowth(random: () => number): Promise<ApprovedGrowthView> {
    return this.mutate(async () => {
      const care = await this.deriveCareProfile();
      const state = await this.life.currentState();
      const projection = projectGrowth(state.totalExpUnits, APPROVED_GROWTH_POLICY);
      const context = { level: projection.level, stage: projection.stage };
      let sex = await this.resolutions.load(this.petId, APPROVED_SEX_SLOT, isApprovedSexValue);
      if (!sex) {
        const result = resolveOnce({
          slot: APPROVED_SEX_SLOT, existing: null, context, policy: APPROVED_SEX_POLICY,
          validateStoredValue: isApprovedSexValue, random,
        });
        if (result.status === 'resolved') {
          sex = (await this.resolutions.commit({
            petId: this.petId, resolutionId: `${this.petId}:${APPROVED_SEX_SLOT}`,
            prepared: result.record, validateStoredValue: isApprovedSexValue,
          })).record;
        }
      }

      let form = await this.resolutions.load(this.petId, APPROVED_FORM_SLOT, isApprovedFormValue);
      const formPolicy = approvedFormPolicy(care);
      if (!form && formPolicy.isEligible(context)) {
        const value = formPolicy.resolve(0, context);
        const prepared: FrozenResolution<ApprovedFormValue> = {
          slot: APPROVED_FORM_SLOT, policyId: formPolicy.id, policyVersion: formPolicy.version,
          decision: formPolicy.decision, resolvedAt: context, value,
        };
        form = (await this.resolutions.commit({
          petId: this.petId, resolutionId: `${this.petId}:${APPROVED_FORM_SLOT}`,
          prepared, validateStoredValue: isApprovedFormValue,
        })).record;
      }
      let currentState = state;
      if (form && currentState.formId !== form.value.formId) {
        currentState = (await this.store.execute(this.petId, {
          type: 'applyEvolutionForm', commandId: `evolution-form:${this.petId}:${form.policyVersion}`,
          policyVersion: APPROVED_GAME_CONFIG.version, formId: form.value.formId,
        })).currentState;
      }
      return Object.freeze({ state: currentState, projection, sex: sex?.value.sex ?? null, form: form?.value ?? null });
    });
  }

  private async reconcileCommittedForm(): Promise<void> {
    const form = await this.resolutions.load(this.petId, APPROVED_FORM_SLOT, isApprovedFormValue);
    if (!form) return;
    const state = await this.life.currentState();
    if (state.formId === form.value.formId) return;
    await this.assertCanWrite();
    await this.store.execute(this.petId, {
      type: 'applyEvolutionForm', commandId: `evolution-form:${this.petId}:${form.policyVersion}`,
      policyVersion: APPROVED_GAME_CONFIG.version, formId: form.value.formId,
    });
  }
}

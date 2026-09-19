import { validatePetState } from '../domain/engine';
import type { GameConfig } from '../domain/config';
import type { PetState } from '../domain/model';
import type { WriterIdentity } from '../sync/contracts';
import { checkedSnapshot, CorruptSnapshotError, type SqlConnection, type SqlExecutor } from './sqlite';

export type DevPurchaseCommitInput = Readonly<{
  purchaseId: string;
  petId: string;
  itemId: string;
  ownershipKey: string;
  coinCost: number;
  catalogVersion: string;
  committedAtMs: number;
}>;

export type DevPurchaseCommit = Readonly<{
  replayed: boolean;
  committedState: PetState;
  currentState: PetState;
}>;

export type ApprovedCoinPurchaseInput = Readonly<{
  purchaseId: string;
  petId: string;
  itemId: string;
  ownershipKey: string | null;
  effect: 'medicine_recovery' | 'install_table' | 'grant_ownership';
  coinCost: number;
  catalogVersion: string;
  committedAtMs: number;
}>;

export type DevSleepBenefitInput = Readonly<{
  commandId: string;
  petId: string;
  gameDayId: string;
  appliedAtMs: number;
}>;

export type DevSleepBenefitDecision =
  | Readonly<{ kind: 'not_eligible'; reason: string }>
  | Readonly<{ kind: 'approved'; nextStamina: number; policyVersion: string }>;

export type DevSleepBenefitCommit =
  | Readonly<{ kind: 'not_eligible'; reason: string; currentState: PetState }>
  | Readonly<{ kind: 'applied'; replayed: boolean; appliedDelta: number; committedState: PetState; currentState: PetState }>;

type PurchaseRow = {
  pet_id: string;
  item_id: string;
  ownership_key: string;
  coin_cost: number;
  catalog_version: string;
  committed_at_ms: number;
  result_state_json: string;
};

type SleepRow = {
  pet_id: string;
  game_day_id: string;
  policy_version: string;
  applied_delta: number;
  applied_at_ms: number;
  result_state_json: string;
};

function requireId(value: string, name: string): void {
  if (!value || value.trim() !== value || value.length > 200 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
}

function requireWhole(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}`);
}

function parseLedgerState(raw: string, config: GameConfig): PetState {
  try {
    const state = JSON.parse(raw) as PetState;
    validatePetState(state, config);
    return state;
  } catch (error) {
    throw new CorruptSnapshotError(error);
  }
}

function cloneState(state: PetState): PetState {
  return {
    ...state,
    activityByDay: Object.fromEntries(Object.entries(state.activityByDay).map(([day, cursor]) => [day, {
      ...cursor,
      gameDay: { ...cursor.gameDay },
      interval: { ...cursor.interval },
    }])),
  };
}

function frozenPolicyState(state: PetState): Readonly<PetState> {
  const snapshot = cloneState(state);
  for (const cursor of Object.values(snapshot.activityByDay)) {
    Object.freeze(cursor.gameDay);
    Object.freeze(cursor.interval);
    Object.freeze(cursor);
  }
  Object.freeze(snapshot.activityByDay);
  return Object.freeze(snapshot);
}

export class DevAtomicTransactionStore {
  constructor(
    private readonly db: SqlConnection,
    private readonly config: GameConfig,
    private readonly outboxWriter: WriterIdentity | null = null,
  ) {
    if (outboxWriter && (!outboxWriter.deviceId || !Number.isSafeInteger(outboxWriter.deviceEpoch) || outboxWriter.deviceEpoch < 0)) {
      throw new Error('Invalid outbox writer identity');
    }
  }

  private async appendOutbox(tx: SqlExecutor, actionId: string, petId: string, events: readonly unknown[]): Promise<void> {
    await tx.runAsync(
      'INSERT INTO local_outbox (command_id, pet_id, event_json, device_id, device_epoch, config_version) VALUES (?, ?, ?, ?, ?, ?)',
      [actionId, petId, JSON.stringify(events), this.outboxWriter?.deviceId ?? null, this.outboxWriter?.deviceEpoch ?? null, this.config.version],
    );
  }

  async commitCoinOwnership(input: DevPurchaseCommitInput): Promise<DevPurchaseCommit> {
    requireId(input.purchaseId, 'purchase ID');
    requireId(input.petId, 'pet ID');
    requireId(input.itemId, 'item ID');
    requireId(input.ownershipKey, 'ownership key');
    requireId(input.catalogVersion, 'catalog version');
    requireWhole(input.coinCost, 'coin cost');
    requireWhole(input.committedAtMs, 'purchase time');
    return this.db.withExclusiveTransactionAsync(async tx => {
      const previous = await tx.getFirstAsync<PurchaseRow>(`
        SELECT pet_id, item_id, ownership_key, coin_cost, catalog_version, committed_at_ms, result_state_json
        FROM dev_purchase_ledger WHERE purchase_id = ?
      `, [input.purchaseId]);
      if (previous) {
        if (previous.pet_id !== input.petId || previous.item_id !== input.itemId || previous.ownership_key !== input.ownershipKey ||
            previous.coin_cost !== input.coinCost || previous.catalog_version !== input.catalogVersion || previous.committed_at_ms !== input.committedAtMs) {
          throw new Error('purchaseId reused with different payload');
        }
        const currentState = await checkedSnapshot(tx, input.petId, this.config);
        if (!currentState) throw new CorruptSnapshotError('Missing pet snapshot');
        return { replayed: true, committedState: parseLedgerState(previous.result_state_json, this.config), currentState };
      }
      const owned = await tx.getFirstAsync<{ purchase_id: string }>(
        'SELECT purchase_id FROM dev_item_ownership WHERE pet_id = ? AND ownership_key = ?', [input.petId, input.ownershipKey],
      );
      if (owned) throw new Error(`Ownership already granted by ${owned.purchase_id}`);
      const before = await checkedSnapshot(tx, input.petId, this.config);
      if (!before) throw new Error('Pet not found');
      if (before.coin < input.coinCost) throw new Error('Insufficient coin');
      const state = cloneState(before);
      state.coin -= input.coinCost;
      state.revision++;
      validatePetState(state, this.config);
      const updated = await tx.runAsync(
        'UPDATE pet_snapshot SET revision = ?, state_json = ?, config_version = ? WHERE pet_id = ? AND revision = ?',
        [state.revision, JSON.stringify(state), this.config.version, input.petId, before.revision],
      );
      if (updated && typeof updated === 'object' && 'changes' in updated && updated.changes !== 1) throw new Error('Concurrent snapshot update');
      await tx.runAsync('INSERT INTO dev_item_ownership (pet_id, ownership_key, purchase_id) VALUES (?, ?, ?)', [input.petId, input.ownershipKey, input.purchaseId]);
      await tx.runAsync(`
        INSERT INTO dev_purchase_ledger
          (purchase_id, pet_id, item_id, ownership_key, coin_cost, catalog_version, committed_at_ms, result_state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [input.purchaseId, input.petId, input.itemId, input.ownershipKey, input.coinCost, input.catalogVersion, input.committedAtMs, JSON.stringify(state)]);
      await this.appendOutbox(tx, input.purchaseId, input.petId, [{
        type: 'DevCoinPurchaseCommitted', purchaseId: input.purchaseId, itemId: input.itemId,
        ownershipKey: input.ownershipKey, coinCost: input.coinCost,
      }]);
      return { replayed: false, committedState: state, currentState: state };
    });
  }

  /**
   * Approved local coin purchase boundary. The effect is an allowlisted value,
   * so callers cannot mutate arbitrary snapshot fields inside this transaction.
   */
  async commitApprovedCoinItem(input: ApprovedCoinPurchaseInput): Promise<DevPurchaseCommit> {
    requireId(input.purchaseId, 'purchase ID');
    requireId(input.petId, 'pet ID');
    requireId(input.itemId, 'item ID');
    requireId(input.catalogVersion, 'catalog version');
    requireWhole(input.coinCost, 'coin cost');
    requireWhole(input.committedAtMs, 'purchase time');
    if (input.coinCost === 0 || !['medicine_recovery', 'install_table', 'grant_ownership'].includes(input.effect)) {
      throw new Error('Invalid approved coin purchase');
    }
    if (input.effect === 'medicine_recovery') {
      if (input.ownershipKey !== null) throw new Error('Medicine must be consumable');
    } else {
      if (input.ownershipKey === null) throw new Error('Durable item ownership key required');
      requireId(input.ownershipKey, 'ownership key');
    }
    const ledgerOwnershipKey = input.effect === 'medicine_recovery'
      ? `approved:${input.effect}:consumable:${input.purchaseId}`
      : `approved:${input.effect}:${input.ownershipKey}`;
    requireId(ledgerOwnershipKey, 'approved ledger effect key');

    return this.db.withExclusiveTransactionAsync(async tx => {
      const previous = await tx.getFirstAsync<PurchaseRow>(`
        SELECT pet_id, item_id, ownership_key, coin_cost, catalog_version, committed_at_ms, result_state_json
        FROM dev_purchase_ledger WHERE purchase_id = ?
      `, [input.purchaseId]);
      if (previous) {
        if (previous.pet_id !== input.petId || previous.item_id !== input.itemId ||
            previous.ownership_key !== ledgerOwnershipKey || previous.coin_cost !== input.coinCost ||
            previous.catalog_version !== input.catalogVersion || previous.committed_at_ms !== input.committedAtMs) {
          throw new Error('purchaseId reused with different payload');
        }
        const currentState = await checkedSnapshot(tx, input.petId, this.config);
        if (!currentState) throw new CorruptSnapshotError('Missing pet snapshot');
        return { replayed: true, committedState: parseLedgerState(previous.result_state_json, this.config), currentState };
      }

      if (input.ownershipKey !== null) {
        const owned = await tx.getFirstAsync<{ purchase_id: string }>(
          'SELECT purchase_id FROM dev_item_ownership WHERE pet_id = ? AND ownership_key = ?',
          [input.petId, input.ownershipKey],
        );
        if (owned) throw new Error(`Ownership already granted by ${owned.purchase_id}`);
      }
      const before = await checkedSnapshot(tx, input.petId, this.config);
      if (!before) throw new Error('Pet not found');
      if (before.coin < input.coinCost) throw new Error('Insufficient coin');
      if (input.effect === 'install_table' && before.tableInstalled) throw new Error('Table already installed');
      if (input.effect === 'medicine_recovery' && before.condition === 'well') {
        throw new Error('Medicine requires a low or recovering condition');
      }

      const state = cloneState(before);
      state.coin -= input.coinCost;
      if (input.effect === 'install_table') state.tableInstalled = true;
      if (input.effect === 'medicine_recovery') {
        state.condition = 'well';
        state.dirtyElapsedMs = 0;
        state.recoveryElapsedMs = 0;
      }
      state.revision++;
      validatePetState(state, this.config);
      const updated = await tx.runAsync(
        'UPDATE pet_snapshot SET revision = ?, state_json = ?, config_version = ? WHERE pet_id = ? AND revision = ?',
        [state.revision, JSON.stringify(state), this.config.version, input.petId, before.revision],
      );
      if (updated && typeof updated === 'object' && 'changes' in updated && updated.changes !== 1) {
        throw new Error('Concurrent snapshot update');
      }
      if (input.ownershipKey !== null) {
        await tx.runAsync(
          'INSERT INTO dev_item_ownership (pet_id, ownership_key, purchase_id) VALUES (?, ?, ?)',
          [input.petId, input.ownershipKey, input.purchaseId],
        );
      }
      await tx.runAsync(`
        INSERT INTO dev_purchase_ledger
          (purchase_id, pet_id, item_id, ownership_key, coin_cost, catalog_version, committed_at_ms, result_state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        input.purchaseId, input.petId, input.itemId, ledgerOwnershipKey, input.coinCost,
        input.catalogVersion, input.committedAtMs, JSON.stringify(state),
      ]);
      await this.appendOutbox(tx, input.purchaseId, input.petId, [{
        type: 'ApprovedCoinPurchaseCommitted', purchaseId: input.purchaseId, itemId: input.itemId,
        ownershipKey: input.ownershipKey, effect: input.effect, coinCost: input.coinCost,
      }]);
      return { replayed: false, committedState: state, currentState: state };
    });
  }

  async commitSleepBenefit(
    input: DevSleepBenefitInput,
    decide: (current: Readonly<PetState>) => DevSleepBenefitDecision,
  ): Promise<DevSleepBenefitCommit> {
    requireId(input.commandId, 'sleep benefit command ID');
    requireId(input.petId, 'pet ID');
    requireId(input.gameDayId, 'game day ID');
    requireWhole(input.appliedAtMs, 'sleep benefit time');
    return this.db.withExclusiveTransactionAsync(async tx => {
      const previous = await tx.getFirstAsync<SleepRow>(`
        SELECT pet_id, game_day_id, policy_version, applied_delta, applied_at_ms, result_state_json
        FROM dev_sleep_benefit_ledger WHERE command_id = ?
      `, [input.commandId]);
      if (previous) {
        if (previous.pet_id !== input.petId || previous.game_day_id !== input.gameDayId || previous.applied_at_ms !== input.appliedAtMs) {
          throw new Error('sleep benefit commandId reused with different payload');
        }
        const currentState = await checkedSnapshot(tx, input.petId, this.config);
        if (!currentState) throw new CorruptSnapshotError('Missing pet snapshot');
        return {
          kind: 'applied', replayed: true, appliedDelta: previous.applied_delta,
          committedState: parseLedgerState(previous.result_state_json, this.config), currentState,
        };
      }
      const sameDay = await tx.getFirstAsync<{ command_id: string }>(
        'SELECT command_id FROM dev_sleep_benefit_ledger WHERE pet_id = ? AND game_day_id = ?', [input.petId, input.gameDayId],
      );
      if (sameDay) throw new Error(`Sleep benefit already applied by ${sameDay.command_id}`);
      const before = await checkedSnapshot(tx, input.petId, this.config);
      if (!before) throw new Error('Pet not found');
      const decision = decide(frozenPolicyState(before));
      if (decision.kind === 'not_eligible') {
        requireId(decision.reason, 'sleep ineligibility reason');
        return { kind: 'not_eligible', reason: decision.reason, currentState: before };
      }
      requireId(decision.policyVersion, 'sleep recovery policy version');
      if (!Number.isFinite(decision.nextStamina) || decision.nextStamina < before.stamina || decision.nextStamina > this.config.source.staminaMax) {
        throw new Error('Invalid approved sleep recovery state');
      }
      const state = cloneState(before);
      state.stamina = decision.nextStamina;
      state.revision++;
      validatePetState(state, this.config);
      const appliedDelta = state.stamina - before.stamina;
      const updated = await tx.runAsync(
        'UPDATE pet_snapshot SET revision = ?, state_json = ?, config_version = ? WHERE pet_id = ? AND revision = ?',
        [state.revision, JSON.stringify(state), this.config.version, input.petId, before.revision],
      );
      if (updated && typeof updated === 'object' && 'changes' in updated && updated.changes !== 1) throw new Error('Concurrent snapshot update');
      await tx.runAsync(`
        INSERT INTO dev_sleep_benefit_ledger
          (command_id, pet_id, game_day_id, policy_version, applied_delta, applied_at_ms, result_state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [input.commandId, input.petId, input.gameDayId, decision.policyVersion, appliedDelta, input.appliedAtMs, JSON.stringify(state)]);
      await this.appendOutbox(tx, input.commandId, input.petId, [{
        type: 'DevSleepRecoveryCommitted', commandId: input.commandId, gameDayId: input.gameDayId, appliedDelta,
      }]);
      return { kind: 'applied', replayed: false, appliedDelta, committedState: state, currentState: state };
    });
  }
}

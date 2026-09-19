import { DecisionRequired } from '../domain/config';
import type { DevAtomicTransactionStore, DevPurchaseCommit } from '../storage/devTransactions';

export type DevPurchaseCatalogDecision = Readonly<{
  itemId: string;
  coinCost: number;
  catalogVersion: string;
  effectKey: string;
  scope: 'DEV_FIXTURE_ONLY';
}>;

export interface DevPurchaseCatalogPolicy {
  decide(itemId: string): DevPurchaseCatalogDecision;
}

export interface DevPurchaseEffectResolver {
  ownershipKey(decision: DevPurchaseCatalogDecision): string;
}

export class UnconfiguredPurchaseCatalogPolicy implements DevPurchaseCatalogPolicy {
  decide(_itemId: string): never {
    throw new DecisionRequired('DEC-09/24 purchase catalog and price');
  }
}

export class UnconfiguredPurchaseEffectResolver implements DevPurchaseEffectResolver {
  ownershipKey(_decision: DevPurchaseCatalogDecision): never {
    throw new DecisionRequired('DEC-09/24 purchase effect');
  }
}

/** DEV-only orchestration; cash payment and production catalog activation are absent. */
export class DevCoinPurchaseService {
  constructor(
    private readonly transactions: DevAtomicTransactionStore,
    private readonly catalog: DevPurchaseCatalogPolicy = new UnconfiguredPurchaseCatalogPolicy(),
    private readonly effects: DevPurchaseEffectResolver = new UnconfiguredPurchaseEffectResolver(),
  ) {}

  async purchase(input: Readonly<{ purchaseId: string; petId: string; itemId: string; committedAtMs: number }>): Promise<DevPurchaseCommit> {
    const decision = this.catalog.decide(input.itemId);
    if (decision.scope !== 'DEV_FIXTURE_ONLY' || decision.itemId !== input.itemId || !Number.isSafeInteger(decision.coinCost) || decision.coinCost < 0 ||
        !decision.catalogVersion || !decision.effectKey) throw new Error('Invalid DEV purchase catalog decision');
    const ownershipKey = this.effects.ownershipKey(decision);
    if (!ownershipKey) throw new Error('Invalid DEV purchase ownership key');
    return this.transactions.commitCoinOwnership({
      ...input, ownershipKey, coinCost: decision.coinCost, catalogVersion: decision.catalogVersion,
    });
  }
}

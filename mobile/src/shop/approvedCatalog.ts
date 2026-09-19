import { APPROVED_MVP_POLICY } from '../config/approvedMvpPolicy';
import type { PetState } from '../domain/model';

export type ApprovedCoinItem = Readonly<{
  id: string;
  kind: 'medicine' | 'table' | 'furniture' | 'toy';
  payment: 'coin';
  coinPrice: number;
  ownershipKey: string | null;
  effect: 'medicine_recovery' | 'install_table' | 'grant_ownership';
}>;

export const APPROVED_COIN_CATALOG: readonly ApprovedCoinItem[] = Object.freeze(
  APPROVED_MVP_POLICY.shop.items.map(item => Object.freeze({
    ...item,
    payment: 'coin' as const,
    effect: item.kind === 'medicine' ? 'medicine_recovery' as const
      : item.kind === 'table' ? 'install_table' as const : 'grant_ownership' as const,
  })),
);

export type ApprovedCoinQuote =
  | Readonly<{ status: 'available'; item: ApprovedCoinItem; remainingCoin: number; scope: 'APPROVED' }>
  | Readonly<{ status: 'insufficient_coin'; item: ApprovedCoinItem }>
  | Readonly<{ status: 'not_found' }>;

export function validateApprovedCoinCatalog(catalog: readonly ApprovedCoinItem[]): void {
  const ids = new Set<string>();
  for (const item of catalog) {
    if (!item.id || ids.has(item.id) || item.payment !== 'coin' || !Number.isSafeInteger(item.coinPrice) || item.coinPrice <= 0 ||
        (item.effect === 'medicine_recovery') !== (item.kind === 'medicine') ||
        (item.effect === 'install_table') !== (item.kind === 'table') ||
        (item.effect === 'grant_ownership' && !item.ownershipKey) ||
        (item.kind === 'medicine' && item.ownershipKey !== null)) throw new Error('Invalid approved coin catalog');
    ids.add(item.id);
  }
}

export class ApprovedCoinShopPolicy {
  readonly mode = 'APPROVED' as const;
  readonly version = APPROVED_MVP_POLICY.shop.catalogVersion;
  constructor(private readonly catalog: readonly ApprovedCoinItem[] = APPROVED_COIN_CATALOG) {
    validateApprovedCoinCatalog(catalog);
  }

  find(itemId: string): ApprovedCoinItem | undefined {
    return this.catalog.find(item => item.id === itemId);
  }

  quote(itemId: string, coinBalance: number): ApprovedCoinQuote {
    if (!Number.isSafeInteger(coinBalance) || coinBalance < 0) throw new Error('Invalid coin balance');
    const item = this.find(itemId);
    if (!item) return Object.freeze({ status: 'not_found' });
    if (coinBalance < item.coinPrice) return Object.freeze({ status: 'insufficient_coin', item });
    return Object.freeze({ status: 'available', item, remainingCoin: coinBalance - item.coinPrice, scope: 'APPROVED' });
  }
}

export type ApprovedCoinCommit = Readonly<{
  replayed: boolean;
  committedState: PetState;
  currentState: PetState;
}>;

export interface ApprovedCoinTransactionPort {
  commitApprovedCoinItem(input: Readonly<{
    purchaseId: string;
    petId: string;
    itemId: string;
    ownershipKey: string | null;
    effect: ApprovedCoinItem['effect'];
    coinCost: number;
    catalogVersion: string;
    committedAtMs: number;
  }>): Promise<ApprovedCoinCommit>;
}

export class ApprovedCoinPurchaseService {
  constructor(
    private readonly transactions: ApprovedCoinTransactionPort,
    private readonly catalog = new ApprovedCoinShopPolicy(),
  ) {}

  async purchase(input: Readonly<{ purchaseId: string; petId: string; itemId: string; committedAtMs: number }>): Promise<ApprovedCoinCommit> {
    const item = this.catalog.find(input.itemId);
    if (!item) throw new Error('Unknown approved coin item');
    return this.transactions.commitApprovedCoinItem({
      ...input, ownershipKey: item.ownershipKey, effect: item.effect,
      coinCost: item.coinPrice, catalogVersion: this.catalog.version,
    });
  }
}

export type ApprovedCashPurchaseResult = Readonly<{
  status: 'disabled';
  policyVersion: string;
  reason: 'cash_payment_not_available';
}>;

export class ApprovedDisabledCashPaymentPort {
  async purchaseCosmetic(): Promise<ApprovedCashPurchaseResult> {
    return Object.freeze({
      status: 'disabled', policyVersion: APPROVED_MVP_POLICY.version,
      reason: 'cash_payment_not_available',
    });
  }
}

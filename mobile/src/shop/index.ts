import { MVP_BALANCE_REGISTRY } from '../config/balanceRegistry';

/** DEC-09 OPEN: this catalog is a development fixture, never a live storefront. */
export type UtilityKind = 'medicine' | 'toilet' | 'table' | 'furniture' | 'toy';

export type UtilityItem = Readonly<{
  id: string;
  category: 'utility';
  kind: UtilityKind;
  payment: 'coin';
  coinPrice: number | null;
  priceStatus: 'source_value' | 'dev_fixture' | 'decision_required';
}>;

export type CosmeticItem = Readonly<{
  id: string;
  category: 'cosmetic';
  payment: 'cash_disabled';
  productId: null;
  effect: 'appearance_only';
}>;

export type CatalogItem = UtilityItem | CosmeticItem;

export const DEV_SHOP_CATALOG: readonly CatalogItem[] = Object.freeze([
  { id: 'medicine', category: 'utility', kind: 'medicine', payment: 'coin', coinPrice: MVP_BALANCE_REGISTRY.source.shop.medicinePriceCoin, priceStatus: 'source_value' },
  { id: 'toilet-dev', category: 'utility', kind: 'toilet', payment: 'coin', coinPrice: MVP_BALANCE_REGISTRY.devFixture.shop.toiletPriceCoin, priceStatus: 'dev_fixture' },
  { id: 'table-dev', category: 'utility', kind: 'table', payment: 'coin', coinPrice: MVP_BALANCE_REGISTRY.devFixture.shop.tablePriceCoin, priceStatus: 'dev_fixture' },
  { id: 'furniture-pending', category: 'utility', kind: 'furniture', payment: 'coin', coinPrice: null, priceStatus: 'decision_required' },
  { id: 'cosmetic-placeholder', category: 'cosmetic', payment: 'cash_disabled', productId: null, effect: 'appearance_only' },
]);

export function validateCatalog(items: readonly CatalogItem[]): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) throw new Error('Invalid or duplicate catalog ID');
    ids.add(item.id);
    if (item.category === 'utility') {
      if (item.payment !== 'coin') throw new Error('Utility must be coin only');
      if (item.coinPrice === null) {
        if (item.priceStatus !== 'decision_required') throw new Error('Missing utility price');
      } else if (!Number.isSafeInteger(item.coinPrice) || item.coinPrice < 0 || item.priceStatus === 'decision_required') {
        throw new Error('Invalid utility price');
      }
      if (item.kind === 'medicine' && (item.coinPrice !== MVP_BALANCE_REGISTRY.source.shop.medicinePriceCoin || item.priceStatus !== 'source_value')) {
        throw new Error('Medicine price must match source value');
      }
    } else if (item.category === 'cosmetic') {
      if (item.payment !== 'cash_disabled' || item.productId !== null || item.effect !== 'appearance_only') {
        throw new Error('Cosmetic payment is disabled and cannot affect growth');
      }
    } else {
      throw new Error('Unsupported catalog category');
    }
  }
}

export type CoinQuote =
  | { status: 'available'; itemId: string; coinPrice: number; remainingCoin: number; scope: 'DEV_FIXTURE_ONLY' }
  | { status: 'insufficient_coin'; itemId: string; coinPrice: number }
  | { status: 'decision_required'; decision: 'DEC-09' | 'DEC-24' }
  | { status: 'not_coin_item' };

/** Preflight only. Authoritative debit, grant, and idempotency require one storage transaction. */
export class DevCoinShopPolicy {
  readonly mode = 'DEV_FIXTURE_ONLY' as const;

  constructor(private readonly catalog: readonly CatalogItem[] = DEV_SHOP_CATALOG) {
    validateCatalog(catalog);
  }

  quote(itemId: string, coinBalance: number): CoinQuote {
    if (!Number.isSafeInteger(coinBalance) || coinBalance < 0) throw new RangeError('Invalid coin balance');
    const item = this.catalog.find(entry => entry.id === itemId);
    if (!item) return { status: 'decision_required', decision: 'DEC-09' };
    if (item.category !== 'utility') return { status: 'not_coin_item' };
    if (item.coinPrice === null) return { status: 'decision_required', decision: item.kind === 'furniture' ? 'DEC-24' : 'DEC-09' };
    if (coinBalance < item.coinPrice) return { status: 'insufficient_coin', itemId, coinPrice: item.coinPrice };
    return { status: 'available', itemId, coinPrice: item.coinPrice, remainingCoin: coinBalance - item.coinPrice, scope: 'DEV_FIXTURE_ONLY' };
  }
}

export type CashPurchaseResult = { status: 'disabled'; decision: 'DEC-09' };
export interface CashPaymentPort {
  purchaseCosmetic(item: CosmeticItem): Promise<CashPurchaseResult>;
}

export class DisabledCashPaymentPort implements CashPaymentPort {
  async purchaseCosmetic(_item: CosmeticItem): Promise<CashPurchaseResult> {
    return { status: 'disabled', decision: 'DEC-09' };
  }
}

/** Local shop presentation; no payment or game command is emitted from this model. */
export function devShopRows(catalog: readonly CatalogItem[] = DEV_SHOP_CATALOG): readonly Readonly<{
  id: string; category: 'utility' | 'cosmetic'; label: string; priceLabel: string; actionEnabled: false;
}>[] {
  validateCatalog(catalog);
  return catalog.map(item => ({
    id: item.id,
    category: item.category,
    label: item.category === 'utility' ? item.kind : '꾸미기',
    priceLabel: item.category === 'utility' && item.coinPrice !== null ? `${item.coinPrice} 코인 (개발 미리보기)` : '결정 대기',
    actionEnabled: false as const,
  }));
}

export * from './approvedCatalog';

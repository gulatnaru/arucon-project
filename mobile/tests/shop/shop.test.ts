import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEV_SHOP_CATALOG, DevCoinShopPolicy, DisabledCashPaymentPort, devShopRows, validateCatalog,
  type CatalogItem, type CosmeticItem,
} from '../../src/shop/index';

test('AT-SHOP-01/02 scaffold: medicine coin quote does not mutate wallet', () => {
  const policy = new DevCoinShopPolicy();
  const wallet = { coin: 50 };
  assert.deepEqual(policy.quote('medicine', wallet.coin), {
    status: 'available', itemId: 'medicine', coinPrice: 50, remainingCoin: 0, scope: 'DEV_FIXTURE_ONLY',
  });
  assert.equal(wallet.coin, 50);
  assert.deepEqual(policy.quote('medicine', 49), { status: 'insufficient_coin', itemId: 'medicine', coinPrice: 50 });
  assert.equal(policy.quote('furniture-pending', 999).status, 'decision_required');
});

test('AT-SHOP-03/05: paid utility and cosmetic growth bypasses fail catalog validation', () => {
  validateCatalog(DEV_SHOP_CATALOG);
  const paidUtility = { id: 'paid-power', category: 'utility', kind: 'medicine', payment: 'cash_disabled', coinPrice: 50, priceStatus: 'source_value' } as unknown as CatalogItem;
  assert.throws(() => validateCatalog([paidUtility]), /coin only/);
  const paidGrowth = { id: 'paid-growth', category: 'cosmetic', payment: 'cash_disabled', productId: null, effect: 'growth' } as unknown as CatalogItem;
  assert.throws(() => validateCatalog([paidGrowth]), /cannot affect growth/);
  assert.equal(new DevCoinShopPolicy().quote('cosmetic-placeholder', 500).status, 'not_coin_item');
  assert.ok(devShopRows().every(row => row.actionEnabled === false));
});

test('AT-SHOP-06: cash port is disabled and cannot grant ownership', async () => {
  const cosmetic = DEV_SHOP_CATALOG.find(item => item.category === 'cosmetic') as CosmeticItem;
  assert.deepEqual(await new DisabledCashPaymentPort().purchaseCosmetic(cosmetic), {
    status: 'disabled', decision: 'DEC-09',
  });
});

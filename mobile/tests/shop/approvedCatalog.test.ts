import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_COIN_CATALOG, ApprovedCoinShopPolicy, ApprovedDisabledCashPaymentPort,
  validateApprovedCoinCatalog,
} from '../../src/shop';

test('approved catalog is coin-only, omits toilet resale, and exposes required care/convenience items', () => {
  validateApprovedCoinCatalog(APPROVED_COIN_CATALOG);
  assert.deepEqual(APPROVED_COIN_CATALOG.map(item => [item.id, item.coinPrice]), [
    ['medicine', 50], ['table', 60], ['ball', 30], ['cushion', 40],
  ]);
  assert.equal(APPROVED_COIN_CATALOG.map(item => String(item.kind)).includes('toilet'), false);
  assert.equal(APPROVED_COIN_CATALOG.every(item => item.payment === 'coin'), true);
});

test('coin quote never exposes a cash efficiency path', async () => {
  const shop = new ApprovedCoinShopPolicy();
  assert.equal(shop.quote('table', 59).status, 'insufficient_coin');
  assert.deepEqual(shop.quote('table', 60), {
    status: 'available', item: APPROVED_COIN_CATALOG.find(item => item.id === 'table'),
    remainingCoin: 0, scope: 'APPROVED',
  });
  assert.deepEqual(await new ApprovedDisabledCashPaymentPort().purchaseCosmetic(), {
    status: 'disabled', policyVersion: 'approved-mvp-34ab069-v1', reason: 'cash_payment_not_available',
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AccessDecisionRequired,
  createSyntheticAccessFixture,
  isIssuedSyntheticAccessGrant,
  requireProductionAccessPolicy,
  SyntheticAccessAuthority,
} from '../../src/auth/syntheticAccess';

const request = {
  accountId: 'fixture-account', petId: 'fixture-pet', deviceId: 'fixture-device', purpose: 'outbound_aggregate',
} as const;

test('AT-ACCOUNT-04/05: DEV fixture defaults to unverified and production stays DecisionRequired', () => {
  const fixture = createSyntheticAccessFixture();
  assert.equal(fixture.mode, 'DEV_ONLY');
  assert.equal(fixture.consentState, 'unverified');
  assert.deepEqual(new SyntheticAccessAuthority(fixture).authorize(request), { status: 'blocked', reason: 'consent_unverified' });
  assert.throws(requireProductionAccessPolicy, AccessDecisionRequired);
});

test('AT-PRIVACY-02: account, pet and device mismatch are independently blocked', () => {
  const fixture = createSyntheticAccessFixture({ consentState: 'verified' });
  const authority = new SyntheticAccessAuthority(fixture);
  assert.deepEqual(authority.authorize({ ...request, accountId: 'other' }), { status: 'blocked', reason: 'account_mismatch' });
  assert.deepEqual(authority.authorize({ ...request, petId: 'other' }), { status: 'blocked', reason: 'pet_mismatch' });
  assert.deepEqual(authority.authorize({ ...request, deviceId: 'other' }), { status: 'blocked', reason: 'device_mismatch' });
});

test('AT-ACCOUNT-04: revoked account, device or consent cannot mint a grant', () => {
  assert.deepEqual(new SyntheticAccessAuthority(createSyntheticAccessFixture({ accountStatus: 'revoked', consentState: 'verified' })).authorize(request), { status: 'blocked', reason: 'account_revoked' });
  assert.deepEqual(new SyntheticAccessAuthority(createSyntheticAccessFixture({ deviceStatus: 'revoked', consentState: 'verified' })).authorize(request), { status: 'blocked', reason: 'device_revoked' });
  assert.deepEqual(new SyntheticAccessAuthority(createSyntheticAccessFixture({ consentState: 'revoked' })).authorize(request), { status: 'blocked', reason: 'consent_revoked' });
});

test('DEV_ONLY: explicit verified synthetic fixture mints only an in-process purpose grant', () => {
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({ consentState: 'verified' }));
  const decision = authority.authorize(request);
  assert.equal(decision.status, 'allowed');
  if (decision.status !== 'allowed') assert.fail('expected a DEV access grant');
  assert.equal(isIssuedSyntheticAccessGrant(decision.grant, 'outbound_aggregate'), true);
  assert.equal(isIssuedSyntheticAccessGrant(decision.grant, 'pet_access'), false);
  assert.equal(isIssuedSyntheticAccessGrant({ ...decision.grant }, 'outbound_aggregate'), false, 'copied claims are not grants');
  authority.revokeConsent();
  assert.equal(isIssuedSyntheticAccessGrant(decision.grant, 'outbound_aggregate'), false, 'revocation invalidates an issued grant');
});

test('runtime-invalid fixture states and request purposes fail closed', () => {
  assert.throws(() => createSyntheticAccessFixture({ consentState: 'unknown-runtime' as never }));
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({ consentState: 'verified' }));
  assert.deepEqual(authority.authorize({ ...request, purpose: 'admin' as never }), { status: 'blocked', reason: 'invalid_request' });
});

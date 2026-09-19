import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticAccessFixture, SyntheticAccessAuthority } from '../../src/auth/syntheticAccess';
import {
  assertNoRawOrSecretMaterial,
  buildSyntheticOutboundEnvelope,
  isIssuedSyntheticOutboundEnvelope,
} from '../../src/privacy/outbound';

function grant() {
  const decision = new SyntheticAccessAuthority(createSyntheticAccessFixture({ consentState: 'verified' })).authorize({
    accountId: 'fixture-account', petId: 'fixture-pet', deviceId: 'fixture-device', purpose: 'outbound_aggregate',
  });
  if (decision.status !== 'allowed') throw new Error('fixture grant failed');
  return decision.grant;
}

test('AT-PRIVACY-01: only approved aggregate fields enter a DEV outbound envelope', () => {
  const envelope = buildSyntheticOutboundEnvelope(grant(), {
    kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 1234, runningSteps: 20, sourceRevision: 2,
  });
  assert.deepEqual(envelope, {
    mode: 'DEV_ONLY', accountId: 'fixture-account', petId: 'fixture-pet', deviceId: 'fixture-device',
    payload: { kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 1234, runningSteps: 20, sourceRevision: 2 },
  });
  assert.equal(isIssuedSyntheticOutboundEnvelope(envelope), true);
  assert.equal(isIssuedSyntheticOutboundEnvelope({ ...envelope }), false, 'copied envelopes are not issued transport values');
  assert.deepEqual(buildSyntheticOutboundEnvelope(grant(), {
    kind: 'sleep_score', gameDayId: '2026-09-19', score: 70, scorerVersion: 'fixture-v1',
  }).payload, { kind: 'sleep_score', gameDayId: '2026-09-19', score: 70, scorerVersion: 'fixture-v1' });
});

test('AT-PRIVACY-01/04: raw health, audio, location, birth data and credentials are rejected recursively', () => {
  for (const value of [
    { rawSamples: [{ count: 1 }] }, { sleep: { audioBytes: [1, 2] } }, { gps: { latitude: 1 } },
    { dateOfBirth: '2010-01-01' }, { auth: { accessToken: 'token' } }, { note: 'Bearer abc.def.ghi' },
    { key: '-----BEGIN PRIVATE KEY-----' },
  ]) assert.throws(() => assertNoRawOrSecretMaterial(value));
});

test('AT-PRIVACY-01: unknown top-level fields are rejected rather than silently forwarded', () => {
  const unsafe = {
    kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 10, runningSteps: 0, sourceRevision: 1,
    samples: [{ count: 10 }],
  };
  assert.throws(() => buildSyntheticOutboundEnvelope(grant(), unsafe as never), /Unapproved outbound field/);
  const protoKey = JSON.parse('{"kind":"activity_aggregate","gameDayId":"2026-09-19","steps":10,"runningSteps":0,"sourceRevision":1,"__proto__":{"rawSamples":[]}}');
  assert.throws(() => buildSyntheticOutboundEnvelope(grant(), protoKey), /Unapproved outbound field/);
  const inherited = Object.create({ rawSamples: [{ count: 10 }] });
  Object.assign(inherited, { kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 10, runningSteps: 0, sourceRevision: 1 });
  assert.throws(() => buildSyntheticOutboundEnvelope(grant(), inherited), /Non-plain outbound input/);
});

test('AT-PRIVACY-02: forged grants and cross-pet projections are blocked', () => {
  assert.throws(() => buildSyntheticOutboundEnvelope({
    mode: 'DEV_ONLY', accountId: 'fixture-account', petId: 'fixture-pet', deviceId: 'fixture-device', purpose: 'outbound_aggregate',
  }, { kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 1, runningSteps: 0, sourceRevision: 1 }));
  assert.throws(() => buildSyntheticOutboundEnvelope(grant(), {
    kind: 'pet_projection', projection: {
      petId: 'other-pet', stateRevision: 1, updatedAtMs: 1, formId: 'arucon', personalityProfileId: 'reserved', displayState: 'awake',
    },
  }), /pet mismatch/);
});

test('AT-PRIVACY-03: consent revocation invalidates a previously issued outbound grant', () => {
  const authority = new SyntheticAccessAuthority(createSyntheticAccessFixture({ consentState: 'verified' }));
  const decision = authority.authorize({
    accountId: 'fixture-account', petId: 'fixture-pet', deviceId: 'fixture-device', purpose: 'outbound_aggregate',
  });
  if (decision.status !== 'allowed') assert.fail('expected a DEV grant');
  const issuedBeforeRevocation = buildSyntheticOutboundEnvelope(decision.grant, {
    kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 1, runningSteps: 0, sourceRevision: 1,
  });
  authority.revokeConsent();
  assert.equal(isIssuedSyntheticOutboundEnvelope(issuedBeforeRevocation), false, 'queued envelopes expire with their grant');
  assert.throws(() => buildSyntheticOutboundEnvelope(decision.grant, {
    kind: 'activity_aggregate', gameDayId: '2026-09-19', steps: 1, runningSteps: 0, sourceRevision: 1,
  }), /grant required/);
});

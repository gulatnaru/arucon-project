export type ConsentState = 'unverified' | 'pending' | 'verified' | 'revoked' | 'not_required';
export type AccessPurpose = 'pet_access' | 'outbound_aggregate';

export type SyntheticAccountAccessFixture = Readonly<{
  mode: 'DEV_ONLY';
  accountId: string;
  petId: string;
  deviceId: string;
  accountStatus: 'active' | 'revoked';
  deviceStatus: 'active' | 'revoked';
  consentState: ConsentState;
}>;

export type SyntheticAccessRequest = Readonly<{
  accountId: string;
  petId: string;
  deviceId: string;
  purpose: AccessPurpose;
}>;

export type SyntheticAccessBlockReason =
  | 'account_mismatch'
  | 'pet_mismatch'
  | 'device_mismatch'
  | 'account_revoked'
  | 'device_revoked'
  | 'consent_unverified'
  | 'consent_revoked'
  | 'invalid_request';

type GrantRecord = { authority: SyntheticAccessAuthority; generation: number; purpose: AccessPurpose };
const issuedGrants = new WeakMap<object, GrantRecord>();

export type SyntheticAccessGrant = Readonly<{
  mode: 'DEV_ONLY';
  accountId: string;
  petId: string;
  deviceId: string;
  purpose: AccessPurpose;
}>;

export type SyntheticAccessDecision =
  | { status: 'allowed'; grant: SyntheticAccessGrant }
  | { status: 'blocked'; reason: SyntheticAccessBlockReason };

export class AccessDecisionRequired extends Error {
  readonly decisions = ['DEC-10', 'DEC-11', 'DEC-17'] as const;

  constructor() {
    super('DecisionRequired: production account, consent, device access and retention policy');
    this.name = 'AccessDecisionRequired';
  }
}

function requiredId(value: string, name: string): string {
  if (!value || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`Invalid ${name}`);
  return value;
}

/** DEV-only fixture. `unverified` is deliberate and cannot authorize an outbound payload. */
export function createSyntheticAccessFixture(
  overrides: Partial<Omit<SyntheticAccountAccessFixture, 'mode'>> = {},
): SyntheticAccountAccessFixture {
  const fixture = {
    mode: 'DEV_ONLY',
    accountId: requiredId(overrides.accountId ?? 'fixture-account', 'fixture account'),
    petId: requiredId(overrides.petId ?? 'fixture-pet', 'fixture pet'),
    deviceId: requiredId(overrides.deviceId ?? 'fixture-device', 'fixture device'),
    accountStatus: overrides.accountStatus ?? 'active',
    deviceStatus: overrides.deviceStatus ?? 'active',
    consentState: overrides.consentState ?? 'unverified',
  } as const;
  if (!['active', 'revoked'].includes(fixture.accountStatus) || !['active', 'revoked'].includes(fixture.deviceStatus) ||
      !['unverified', 'pending', 'verified', 'revoked', 'not_required'].includes(fixture.consentState)) {
    throw new Error('Invalid synthetic access fixture state');
  }
  return Object.freeze(fixture);
}

/**
 * Local contract only. A verified synthetic state is not evidence of legal consent
 * and is never accepted by the production access entry point.
 */
export class SyntheticAccessAuthority {
  private fixture: SyntheticAccountAccessFixture;
  private generation = 0;

  constructor(fixture: SyntheticAccountAccessFixture = createSyntheticAccessFixture()) {
    if (fixture.mode !== 'DEV_ONLY') throw new Error('Synthetic access fixture must be DEV_ONLY');
    this.fixture = createSyntheticAccessFixture(fixture);
  }

  authorize(request: SyntheticAccessRequest): SyntheticAccessDecision {
    if (!request || !['pet_access', 'outbound_aggregate'].includes(request.purpose)) return { status: 'blocked', reason: 'invalid_request' };
    if (request.accountId !== this.fixture.accountId) return { status: 'blocked', reason: 'account_mismatch' };
    if (request.petId !== this.fixture.petId) return { status: 'blocked', reason: 'pet_mismatch' };
    if (request.deviceId !== this.fixture.deviceId) return { status: 'blocked', reason: 'device_mismatch' };
    if (this.fixture.accountStatus === 'revoked') return { status: 'blocked', reason: 'account_revoked' };
    if (this.fixture.deviceStatus === 'revoked') return { status: 'blocked', reason: 'device_revoked' };
    if (this.fixture.consentState === 'revoked') return { status: 'blocked', reason: 'consent_revoked' };
    // `not_required` also needs an approved age/jurisdiction policy. The fixture only
    // opens when a test explicitly supplies `verified`.
    if (this.fixture.consentState !== 'verified') return { status: 'blocked', reason: 'consent_unverified' };
    const grant = Object.freeze({
      mode: 'DEV_ONLY' as const,
      accountId: this.fixture.accountId,
      petId: this.fixture.petId,
      deviceId: this.fixture.deviceId,
      purpose: request.purpose,
    });
    issuedGrants.set(grant, { authority: this, generation: this.generation, purpose: request.purpose });
    return { status: 'allowed', grant };
  }

  revokeAccount(): void {
    this.fixture = Object.freeze({ ...this.fixture, accountStatus: 'revoked' });
    this.generation += 1;
  }

  revokeDevice(): void {
    this.fixture = Object.freeze({ ...this.fixture, deviceStatus: 'revoked' });
    this.generation += 1;
  }

  revokeConsent(): void {
    this.fixture = Object.freeze({ ...this.fixture, consentState: 'revoked' });
    this.generation += 1;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation && this.fixture.accountStatus === 'active' &&
      this.fixture.deviceStatus === 'active' && this.fixture.consentState === 'verified';
  }
}

export function isIssuedSyntheticAccessGrant(value: unknown, purpose: AccessPurpose): value is SyntheticAccessGrant {
  if (typeof value !== 'object' || value === null || !['pet_access', 'outbound_aggregate'].includes(purpose)) return false;
  const record = issuedGrants.get(value);
  return !!record && record.purpose === purpose && record.authority.isCurrent(record.generation) &&
    (value as SyntheticAccessGrant).mode === 'DEV_ONLY' && (value as SyntheticAccessGrant).purpose === purpose;
}

/** Production remains fail closed until the listed decisions and external verification exist. */
export function requireProductionAccessPolicy(): never {
  throw new AccessDecisionRequired();
}

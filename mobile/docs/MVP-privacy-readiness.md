# MVP privacy, access, and notification readiness

## Current result

This checkpoint adds fail-closed local contracts. It does not implement a production account, legal age verification, guardian consent, cloud transport, token storage, retention/deletion, notification scheduling, or notification delivery. Those remain blocked by DEC-10/11/14/17 and external legal/service decisions.

## Outbound boundary

- `buildSyntheticOutboundEnvelope` accepts only an in-process DEV grant minted by the synthetic access gate.
- The only payload variants are an activity aggregate, a versioned sleep score, and the existing six-field pet projection.
- Each variant rejects unknown top-level keys. Runtime recursion rejects raw samples, raw sleep/session data, audio, microphone, GPS/location, birth date, credentials, authorization values, cookies, private keys, and obvious bearer/key material.
- The module has no network, logging, analytics, crash-reporting, environment-secret, or storage API.
- Aggregate values remain sensitive. Passing the allowlist does not approve production collection or transmission.

## Synthetic account, device, and consent fixture

- Fixtures are marked `DEV_ONLY` and default to `unverified` consent.
- Account, pet, and device identity must match exactly.
- Account revocation, device revocation, pending/unverified/not-required policy, and consent revocation fail closed.
- DEV authorities carry a generation. Account, device, or consent revocation invalidates grants that were issued before the change.
- Only an explicit synthetic `verified` state can mint an in-process test grant. Copying its fields does not mint another grant.
- `verified` in this fixture is not proof of guardian consent. The production access entry point always throws `DecisionRequired` until DEC-10/11/17 and external verification are complete.

## Notification and tone boundary

- The catalog contains short invitational copy and no blame, guilt, medical diagnosis, or inactivity accusation.
- Copy can be previewed locally.
- Delivery is always `disabled` and throws `DecisionRequired` because consent, cadence, quiet hours, deduplication, cancellation, and hibernation behavior remain undecided in DEC-14.
- No local notification or push provider is present.

## Verification and limits

Local tests cover fixture default state, production rejection, account/pet/device mismatch, revocation, grant forgery, strict outbound field allowlists, nested raw/secret rejection, cross-pet projection rejection, static transport/logging boundary checks, tone checks, and disabled notification delivery.

This is contract evidence only. Live authentication authorization, server-side ownership enforcement, encryption, network inspection, analytics/crash payload inspection, account deletion, guardian-consent validity, retention, push permissions, duplicate suppression, quiet hours, and actual notification delivery are `NOT_RUN` or `HARD_STOP_EXTERNAL`. They must not be reported as PASS from these synthetic tests.

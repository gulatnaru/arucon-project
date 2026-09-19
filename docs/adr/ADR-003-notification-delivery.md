# ADR-003 — Synthetic local notification delivery boundary

- Date: 2026-09-19
- Status: Accepted for local synthetic verification; operational notification policy remains DecisionRequired
- Scope: DQ-08 technical deduplication, retry, cancellation, revocation, and quiet-hours boundary

## Context

FR-NF.5 requires invitational copy and forbids blame. DEC-14 still leaves user opt-in, cadence, quiet hours, notification conditions, cancellation, and hibernation behavior unresolved. DQ-08 allows the technical delivery boundary to be tested independently, while actual OS notifications, permission requests, server push, and product policy remain disabled.

## Options considered

### A. Pure planner plus injected idempotent local delivery port

The planner receives an explicit `DEV_FIXTURE_ONLY` policy, synthetic consent, local clock fields, and caller-provided history. It emits a stable request or a typed suppression result. A dispatcher forwards planned requests to an injected port. The in-memory fake provides key idempotency, cancellation, and scope revocation for deterministic tests.

This option separates product values from technical behavior and needs no native SDK, permission, server, or new storage schema.

### B. Durable SQLite notification ledger

A local ledger could retain deduplication and cancellation state across process restarts. It would require storage ownership, schema migration, retention rules, and coordination with OS-assigned notification identifiers. Those concerns are outside this task and several policies remain unresolved.

### C. Server push coordinator

Server push would require an external account, tokens, consent and retention policy, server idempotency, and actual delivery infrastructure. It crosses HS-02/04 and is prohibited for this task.

## Decision

Choose option A for the synthetic technical contract.

- Operational default remains disabled and `requireOperationalNotificationPolicy()` throws `NotificationDecisionRequired` for DEC-14.
- Cadence and quiet-hour numbers exist only in explicitly supplied DEV fixtures. No exported operating values or user opt-in default are introduced.
- Stable keys include pet scope, game day, copy type, and condition identity. Policy version remains request metadata and cannot create a second key for the same condition.
- Planner history suppresses known duplicates. The delivery port independently treats repeated identical keys as replay and rejects changed payloads.
- Quiet hours use an injected start-inclusive/end-exclusive interval. The DEV planner defers to the interval end; this is fixture behavior, not an approved product schedule.
- Cancellation prevents the same key from being resurrected by retry. Scope revocation cancels pending fake requests and blocks later upserts for that scope.

## Limits

The fake keeps state only for its own process lifetime. It does not prove durable deduplication after restart, OS scheduling, OS display, permission state, background execution, or cancellation races after an OS has already displayed a notification. The port is idempotent at the scheduling-request boundary; it cannot promise that an operating system presents a notification exactly once. A future native adapter must document platform identifiers and observed cancellation limits without upgrading this contract to an exactly-once delivery claim.

No actual OS notification, permission request, server push, external write, or product opt-in decision is implemented by this ADR.

## Verification

Environment: local Node.js with synthetic inputs and an in-memory fake; no native notification SDK or permission prompt.

| Check | Command | Result | Evidence |
|---|---|---|---|
| Notification and privacy boundary | `node --import tsx --test tests/notifications/*.test.ts tests/privacy/staticBoundary.test.ts` from `mobile/` | exit 0, 12/12 | `mobile/evidence/decision-audit/notification-tests.log` |
| TypeScript | `npm run typecheck` from `mobile/` | exit 0 | `mobile/evidence/decision-audit/notification-typecheck.log` |
| ESLint | `npm run lint` from `mobile/` | exit 0 | `mobile/evidence/decision-audit/notification-lint.log` |
| Changed-file whitespace | `git diff --check -- mobile/src/notifications mobile/tests/notifications docs/adr/ADR-003-notification-delivery.md mobile/tests/progression/resolutionLedger.test.ts` | exit 0 | `mobile/evidence/decision-audit/notification-diff-check.log` |

The v6 storage migration changed only the adjacent progression test schema assertion. `node --import tsx --test tests/progression/resolutionLedger.test.ts` passed 8/8; evidence is `mobile/evidence/decision-audit/v6-resolution-ledger-compat.log`.

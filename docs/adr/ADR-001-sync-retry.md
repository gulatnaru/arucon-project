# ADR-001: Durable local sync retry

- Status: Accepted under technical `AUTO_DECIDE`
- Date: 2026-09-19
- Scope: reversible client scheduling mechanics only

## Context

The local outbox already preserves actions and uses `actionId` for synthetic idempotency, but every coordinator pass immediately retried all `pending` and `error` rows. A process restart lost retry timing. A failed earlier action also allowed a later action in the same writer and pet stream to reach a strict-order transport, where the later action could be recorded as a false conflict.

This decision must remain independent of production server, account, compensation, conflict merge, retention, permanent drop, and multi-device ownership policy. No real network or external account is available in this repository checkpoint.

## Alternatives considered

1. **Durable fixed delay.** Small implementation and predictable timing, but one value cannot provide both quick transient recovery and lower sustained retry load. Identical clients also tend to retry together.
2. **Durable capped exponential backoff with equal jitter.** Fast early retry, bounded later load, spread retry times, deterministic tests through injected clock and randomness, and durable restart behavior. This is selected.
3. **Operating-system background scheduler as the only scheduler.** It can improve battery behavior, but its timing is nondeterministic, depends on unavailable native SDK validation, and cannot be the sole correctness mechanism for persisted retry state.

## Decision

Use a local durable retry state and a single scheduler actor:

- SQLite schema v6 adds `next_attempt_at_ms`, `last_attempt_at_ms`, and `retry_policy_version` to `local_outbox`. The migration is additive and transactional. Existing rows remain immediately eligible with `next_attempt_at_ms = 0`.
- Retry policy `sync-retry-v1` uses a 1 second base, a 5 minute cap, and equal jitter in `[cappedDelay / 2, cappedDelay)`. Clock and random sources are injected. There is no maximum attempt and no automatic deletion.
- The queue exposes only due rows. For each `(pet_id, device_id, device_epoch)` stream, an earlier `pending`, `error`, or `conflict` row blocks later rows. Unrelated streams can continue. A conflict stays blocked for the existing DEC-10 resolution boundary.
- The coordinator persists retry metadata after a retryable response or thrown transport error. A server acknowledgement clears retry scheduling metadata but retains the outbox record and acknowledgement evidence.
- `DurableSyncScheduler` provides an injected connectivity gate, coalesces overlapping runs with singleflight, and derives its next wakeup from durable queue state. Its default integration values are supplied by its caller; tests use 20 second idle and 30 second offline fixture intervals.
- Synthetic idempotency fingerprints exclude local `attemptCount`, because retry bookkeeping is not part of the transported action identity.

## Consequences

- Process restart retains retry eligibility and attempt evidence.
- A response lost after server commit safely retries the same transport payload and receives the original synthetic acknowledgement.
- A delayed or failed stream head cannot turn its later action into an artificial strict-order conflict.
- Conflicts are not merged, compensated, dropped, or reclassified. Production transport error taxonomy, server retry hints, OS background execution, multi-device ownership, and retention remain separate decisions and integrations.
- The current evidence uses only the synthetic in-process transport. Native background timing and a production endpoint are unverified.

## Verification

Run from `mobile/`:

```text
node --import tsx --test tests/storage/syncQueue.test.ts tests/sync/*.test.ts tests/domain/sqlite.test.ts
npm run typecheck
npm run lint
```

The tests cover v0/v2/v4/v5 migration and rollback, due-time persistence across coordinator recreation, capped equal jitter, response loss after commit, stream ordering, offline gating, and scheduler singleflight.

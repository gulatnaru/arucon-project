# MVP storage, sync, and recovery contract

## Scope and decision boundary

This checkpoint implements the locally testable part of SRS 10-2 and the SRS 14-1 offline/retry/recovery/migration gate. It does not approve DEC-10, DEC-17, or DEC-25. No real server, user account, network, HealthKit/Health Connect data, or production database is used.

Permanent attempt/drop behavior, production API error codes and server hints, retention/deletion, active-device transfer, forced recovery UX, backup format, and automatic handling of an old device remain `DecisionRequired`. The reversible client timing mechanism is accepted in `docs/adr/ADR-001-sync-retry.md`; writer identity and fake server policy remain explicit inputs.

## Implemented local contract

- SQLite schema v6 retains the additive v3 `local_outbox` status fields (`pending / synced / conflict / error`), attempt/error and acknowledgement metadata, and the writer identity captured at local commit. V4 stores the originating config version directly on the outbox row so non-domain ledgers can use the same queue; v5 adds a caller-prepared one-time resolution ledger; v6 persists next/last attempt time and retry-policy version. Existing rows are preserved, backfilled as `pending`, and immediately eligible; an identity is never invented for them.
- Snapshot, ledger, meal identity, and outbox creation remain one exclusive transaction. Sync updates never re-run a game command and therefore cannot grant food, coins, or EXP.
- `SqliteSyncQueue` reads only durable outbox rows. Before transport it requires an in-process envelope issued by the strict privacy allowlist builder; raw outbox events and copied envelope objects cannot reach the synthetic server. `synced` and `conflict` rows are retained and are not automatically sent again. Generic acknowledgement/error recording cannot resolve a conflict before DEC-10. Replayed acknowledgements must match exactly, and one pet's acknowledgement sequence cannot be assigned to two actions. Retention is intentionally not implemented before DEC-17.
- `SyncCoordinator` performs one due batch and persists capped exponential equal-jitter retry timing through an injected policy, clock, and random source. `DurableSyncScheduler` adds an injected offline gate and one singleflight timer actor whose wakeup comes from the durable queue. Neither component caps attempts, drops rows, or resolves conflicts.
- Only the earliest unresolved row in a `(pet, device, epoch)` stream can dispatch. A delayed retry blocks later actions until acknowledgement, and a conflict blocks later actions until DEC-10 resolution; independent streams remain eligible.
- `SyntheticIdempotentServer` is a deterministic test fake. It stores one result per `actionId`, can lose the first response after commit, returns the original acknowledgement on retry, and checks an explicitly supplied writer epoch, config allowlist, and sequence policy. Current tests inject a strict first local sequence; the fake does not select an operational ordering policy.
- `planServerConfirmedRecovery` marks a server-confirmed checkpoint as ready only when no unconfirmed local actions exist. With local actions it returns `decision_required`, preserves every action ID, and performs no automatic merge. A ready plan also states `emitRewardEvents: false` so recovery display is not a new reward.
- Schema migration is transactional. A v2→v6 injected failure leaves `user_version`, snapshot bytes, and old table shape unchanged; a later retry upgrades and preserves the row. Separate v4→v6 and v5→v6 injected failures roll back marker/retry-column changes while preserving queued and resolution bytes, then clean retry succeeds. Unsupported future versions still fail without replacement.

## Verification mapping

| Gate | Local evidence | Current limit |
|---|---|---|
| AT-SYNC-01 offline change then reconnect | local meal commit is pending, one allowlisted pet projection envelope is acknowledged, persisted EXP is unchanged | transport/idempotence scaffold only; no authoritative server command application |
| AT-SYNC-02 server commit then response loss | first pass durably records retry time/policy; a recreated queue waits until due, then the same `actionId` returns the original ack; fake committed count stays one | production endpoint and error mapping are DEC-17/external |
| AT-SYNC-03 inactive writer epoch | explicit fake policy returns conflict; row and local state remain; no auto-resend/merge | single-writer product policy is still DEC-10 PROPOSED |
| AT-SYNC-05 server-confirmed recovery | planner accepts confirmed checkpoint without emitting rewards; unconfirmed local IDs produce `decision_required` | applying a production backup and recovery UX await DEC-10/17 |
| AT-SYNC-06 unsupported/order/version boundaries | config allowlist, strict injected local order, writer epoch, per-pet acknowledgement reuse, exponential jitter/cap, offline gate, and singleflight checks exist as fake/local boundaries | production error/version/server-hint policy remains OPEN |
| AT-SYNC-07 status display source | queue summary exposes pending/error/conflict/synced and last ack metadata | UI wording is outside this storage checkpoint |
| AT-DATA-03 migration failure | injected v2→v6, v4→v6, and v5→v6 failures preserve prior schema/data and clean retry succeeds | file backup/restore operations remain DEC-17 |

This is engineering completion for the local synthetic portion, not a PASS for the full SRS 14-1 gate. Real server ownership/authentication, multi-device transfer, forced recovery, production migration backup/restore, and device execution remain unverified.

## Commands and results

Environment: macOS, Node test adapter using in-memory SQLite; no simulator or physical device.

```sh
node --import tsx --test tests/domain/sqlite.test.ts tests/storage/syncQueue.test.ts tests/sync/*.test.ts tests/progression/resolutionLedger.test.ts tests/shop/devPurchase.test.ts tests/sleep/devRecovery.test.ts tests/application/devLifeService.test.ts tests/application/devSleepWidgetFlow.test.ts
# exit 0 — 63/63 pass, 0 fail, 0 skip

npm run lint
# exit 0

npm run typecheck
# exit 0
```

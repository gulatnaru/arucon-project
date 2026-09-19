# MVP storage, sync, and recovery contract

## Scope and decision boundary

This checkpoint implements the locally testable part of SRS 10-2 and the SRS 14-1 offline/retry/recovery/migration gate, including the approved single-writer, explicit-handoff, non-merging conflict, server-confirmed recovery, and last-sync explanation defaults. DEC-17/25 and the external account/service boundary remain unresolved. No real server, user account, network, HealthKit/Health Connect data, or production database is used.

Permanent attempt/drop behavior, production API error codes and server hints, retention/deletion, backup format, and external account/service details remain unresolved. The approved product behavior is one writer, explicit transfer, no automatic conflict merge, and server-confirmed-only recovery. This implementation exercises that behavior with reversible client timing and an in-process fake; it does not claim production authority or restart recovery for the fake service.

## Implemented local contract

- SQLite schema v7 retains the v3–v6 outbox, resolution, and retry metadata and adds durable local writer registration plus server-confirmed recovery metadata. Existing snapshots and outbox rows are preserved; registration of an existing DEV snapshot does not replace its game state.
- Snapshot, ledger, meal identity, and outbox creation remain one exclusive transaction. Sync updates never re-run a game command and therefore cannot grant food, coins, or EXP.
- `SqliteSyncQueue` reads only durable outbox rows. Before transport it requires an in-process envelope issued by the strict privacy allowlist builder; raw outbox events and copied envelope objects cannot reach the synthetic server. `synced` and `conflict` rows are retained and are not automatically sent again. Generic acknowledgement/error recording cannot convert a preserved conflict. Replayed acknowledgements must match exactly, and one pet's acknowledgement sequence cannot be assigned to two actions. Retention is intentionally not implemented before the external retention service is approved.
- `SyncCoordinator` performs one due batch and persists capped exponential equal-jitter retry timing through an injected policy, clock, and random source. `DurableSyncScheduler` adds an injected offline gate and one singleflight timer actor whose wakeup comes from the durable queue. Neither component caps attempts, drops rows, or resolves conflicts.
- Only the earliest unresolved row in a `(pet, device, epoch)` stream can dispatch. A delayed retry blocks later actions until acknowledgement, and a preserved conflict blocks later actions until an explicit user/service recovery action; independent streams remain eligible.
- `SyntheticIdempotentServer` stores one result per `actionId`, can lose the first response after commit, returns the original acknowledgement on retry, and enforces the current writer epoch, config allowlist, and monotonic sequence. Global SQLite sequence gaps are valid; duplicate/reverse values are not.
- The App fixture resolves the exact historical state stored by each command, approved purchase, or sleep-benefit ledger. The outbound pet projection and fake server checkpoint must match that action's revision, form, personality, and display state before acknowledgement. Food, EXP, purchase effects, and growth committed after an earlier action are never included in that earlier checkpoint.
- `SyntheticSingleWriterAuthority` and `SyncApplicationService` implement explicit handoff and forced-recovery fixtures. `SqliteServerConfirmedRecoveryStore` atomically restores the exact checkpoint, records its metadata, and converts every unconfirmed local row to a preserved conflict. Exact recovery replay does not overwrite later work. `planServerConfirmedRecovery` always emits no reward event.
- `DurableSyncStatusReader` exposes pending/error/conflict/synced, active/fenced access, and the last server-confirmed time from SQLite. Known fencing survives restart and blocks approved mutation facades through `LocalWriteAuthorityGuard`; a live guard also consults the in-process fence before local fence persistence completes.
- `createLocalSyntheticSyncController` is the reachable App demonstration for status, explicit flush, and handoff. It sends only an allowlisted pet projection and labels every result local/synthetic. Once any registration exists, recreating the controller does not recreate a fake authority; pending/conflict rows remain and transfer/retry require a newly established external authority later.
- Schema migration is transactional. v2/v4/v5 paths retain the earlier rollback evidence, and an injected v6→v7 failure preserves the pet and old schema before a clean retry creates registration storage. Unsupported future versions still fail without replacement.

## Verification mapping

| Gate | Local evidence | Current limit |
|---|---|---|
| AT-SYNC-01 offline change then reconnect | local meal commit is pending, one allowlisted pet projection envelope is acknowledged, persisted EXP is unchanged | transport/idempotence scaffold only; no authoritative server command application |
| AT-SYNC-02 server commit then response loss | first pass durably records retry time/policy; a recreated queue waits until due, then the same `actionId` returns the original ack; fake committed count stays one | production endpoint and error mapping are DEC-17/external |
| AT-SYNC-03 inactive writer epoch | authority fences the old epoch; row and local state remain; no auto-resend/merge | production authentication/service remains external |
| AT-SYNC-04 normal/forced device change | confirmed source is required for normal handoff; forced recovery issues a new epoch and preserves old conflicts | in-process fake is not server restart evidence |
| AT-SYNC-05 server-confirmed recovery | snapshot/checkpoint/conflict rows commit atomically; exact replay preserves later work and emits no reward | production backup transport remains external |
| AT-SYNC-06 unsupported/order/version boundaries | config allowlist, global-gap monotonic order, writer epoch, acknowledgement reuse, exponential jitter/cap, offline gate, and singleflight checks exist | production error/version/server-hint policy remains OPEN |
| AT-SYNC-07 status display source | durable reader exposes queue status, active/fenced access, last ack/checkpoint time, and explanation token | production wording/device execution remain separate |
| AT-DATA-03 migration failure | earlier migration failures plus v6→v7 registration failure preserve prior schema/data and clean retry succeeds | file backup/restore operations remain DEC-17 |

This is engineering completion for the local synthetic portion, not a PASS for the full SRS 14-1 gate. Real server ownership/authentication, cross-device network transfer, production forced recovery, migration backup/restore, and device execution remain unverified.

## Commands and results

Environment: macOS, Node test adapter using in-memory SQLite; no simulator or physical device.

```sh
node --import tsx --test tests/domain/sqlite.test.ts tests/storage/syncQueue.test.ts tests/storage/syncRegistration.test.ts tests/storage/serverRecovery.test.ts tests/sync/*.test.ts tests/auth/syntheticAccess.test.ts tests/privacy/outbound.test.ts tests/privacy/staticBoundary.test.ts tests/shop/devPurchase.test.ts tests/sleep/devRecovery.test.ts tests/progression/resolutionLedger.test.ts tests/application/approvedMvpService.test.ts tests/application/syntheticSyncController.test.ts
# exit 0 — 91/91 pass, 0 fail, 0 skip

npm run lint
# exit 0

npm run typecheck
# exit 0
```

Canonical logs: `evidence/approved-mvp/storage-sync-impact.log`, `storage-sync-typecheck.log`, and `storage-sync-lint.log`.

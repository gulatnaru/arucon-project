# MVP local transaction readiness

## Scope

This checkpoint contains the original fail-closed DEV primitives and the approved local MVP coin effects:

- coin debit plus an ownership grant for a DEV catalog/effect decision supplied by the caller;
- a once-per-game-day sleep recovery result supplied by an injected policy.
- approved catalog effects that atomically debit coin and either install the table, grant durable ownership, or apply the medicine recovery transition.

The legacy DEV services still fail closed unless supplied synthetic policies. `ApprovedCoinPurchaseService` is separately bound to `APPROVED_MVP_POLICY`; cash payment stays disabled. None of these paths reads a health record, contacts an account/server, performs real payment, or enables cash efficiency.

## Atomic contracts

SQLite schema v7 retains the three development-scoped transaction tables introduced in v4, the caller-owned one-time resolution ledger introduced in v5, and v6 durable retry metadata; v7 adds only local active/fenced writer registration:

- `dev_purchase_ledger`: stable purchase ID, quoted item/ownership, coin cost, catalog version, time, and committed result;
- `dev_item_ownership`: one ownership key per pet, linked to one purchase ID;
- `dev_sleep_benefit_ledger`: stable command ID and one row per pet/game-day with the injected policy version and applied stamina delta.
- `dev_resolution_ledger`: one canonical caller-prepared result per pet/slot, with stable resolution ID and DEC/policy identity; storage does not run RNG or choose the result.

`DevCoinPurchaseService` requires both an injected DEV catalog decision and an injected effect-to-ownership resolver. `DevAtomicTransactionStore` then checks the balance and commits snapshot revision, one debit, ownership, purchase ledger, and local outbox in one exclusive transaction. Reusing the same purchase ID and payload returns the historical result; a changed payload or a second purchase for the same ownership key is rejected without another debit.

`ApprovedCoinPurchaseService` passes an allowlisted effect instead of a mutation callback. Storage applies the exact transition inside the same exclusive transaction: table purchase sets `tableInstalled=true` and grants `facility:table`; furniture/toy purchases grant their configured ownership; medicine is consumable, accepts only `low` or `recovering`, sets condition to `well`, and clears dirty/recovery timers. Each path debits exactly once, increments one snapshot revision, writes one purchase ledger row and one outbox row, and rolls back all of them on failure. Replay compares purchase, item, effect, ownership, price, catalog, and time.

`DevSleepRecoveryService` passes the caller-provided day and current state to an injected policy. The policy returns either an explicit ineligible reason or an approved next stamina and policy version. Storage accepts only a finite nondecreasing stamina within the configured maximum. Snapshot, daily ledger, and outbox commit together. Same-command replay uses the stored result without calling the policy again; a different command for the same pet/day is rejected. No recovery formula or eligibility rule is embedded.

The policy sees a detached, deeply frozen state: the activity map, cursor, game-day window, and interval are cloned and frozen. A policy cannot smuggle activity mutations into an approved stamina result. Policy mutation attempts and callback exceptions leave snapshot and ledger unchanged.

The legacy paths keep DEV event names; approved coin purchase events are identified separately. Any synthetic transport must first convert a local row to an issued privacy-allowlisted envelope; raw ledger events are not transport payloads.

## Failure and decision behavior

| Case | Result |
|---|---|
| Default purchase policy/effect | `DecisionRequired`; no debit, ownership, ledger, or outbox |
| Insufficient coin | explicit error; prior snapshot retained |
| Failure after snapshot/ownership write | transaction rollback; retry commits once |
| Purchase replay | prior committed result; no second debit/grant |
| Approved table/ownership item | debit, state effect where applicable, ownership, ledger and outbox commit together |
| Approved medicine while well | explicit error; no debit or ledger |
| Approved medicine while low/recovering | one debit; condition becomes well and dirty/recovery timers reset atomically |
| Default sleep recovery policy | `DecisionRequired`; no stamina or ledger change |
| Injected ineligible sleep result | no state/ledger/outbox mutation |
| Invalid/lower/over-cap approved stamina | explicit error; no mutation |
| Sleep ledger failure after state update | transaction rollback; retry commits once |
| Second command for same pet/day | explicit duplicate-day error; prior result retained |

This closes the local primitive and approved coin effect failure paths. Production account ownership, live sync, UI/device execution, real purchase verification, restore/refund, external services, and legal policy remain external gates.

## Verification

Environment: macOS, Node v26.7.0, in-memory `node:sqlite`, synthetic pet/catalog/recovery fixtures only. No simulator or physical device.

```sh
node --import tsx --test tests/domain/sqlite.test.ts tests/storage/syncQueue.test.ts tests/storage/syncRegistration.test.ts tests/storage/serverRecovery.test.ts tests/sync/*.test.ts tests/auth/syntheticAccess.test.ts tests/privacy/outbound.test.ts tests/privacy/staticBoundary.test.ts tests/shop/devPurchase.test.ts tests/sleep/devRecovery.test.ts tests/progression/resolutionLedger.test.ts tests/application/approvedMvpService.test.ts tests/application/syntheticSyncController.test.ts
# exit 0 — 91/91 pass, 0 fail, 0 skip

npm run lint
# exit 0

npm run typecheck
# exit 0
```

Canonical logs: `evidence/approved-mvp/storage-sync-impact.log`, `storage-sync-typecheck.log`, and `storage-sync-lint.log`.

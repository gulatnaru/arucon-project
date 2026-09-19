# MVP DEV transaction readiness

## Scope

This checkpoint prepares two standalone, DEV-only atomic transaction paths without selecting open product behavior:

- coin debit plus an ownership grant for a catalog/effect decision supplied by the caller;
- a once-per-game-day sleep recovery result supplied by an injected policy.

The production defaults fail closed with `DecisionRequired`. The code does not activate the current preview shop, set utility prices/effects, choose a sleep recovery amount, derive a game day, read a health record, contact an account/server, or enable cash payment. DEC-05, DEC-09, DEC-10, DEC-17, DEC-24, and DEC-25 remain unchanged.

## Atomic contracts

SQLite schema v5 retains the three development-scoped transaction tables introduced in v4 and adds the separate caller-owned one-time resolution ledger:

- `dev_purchase_ledger`: stable purchase ID, quoted item/ownership, coin cost, catalog version, time, and committed result;
- `dev_item_ownership`: one ownership key per pet, linked to one purchase ID;
- `dev_sleep_benefit_ledger`: stable command ID and one row per pet/game-day with the injected policy version and applied stamina delta.
- `dev_resolution_ledger`: one canonical caller-prepared result per pet/slot, with stable resolution ID and DEC/policy identity; storage does not run RNG or choose the result.

`DevCoinPurchaseService` requires both an injected DEV catalog decision and an injected effect-to-ownership resolver. `DevAtomicTransactionStore` then checks the balance and commits snapshot revision, one debit, ownership, purchase ledger, and local outbox in one exclusive transaction. Reusing the same purchase ID and payload returns the historical result; a changed payload or a second purchase for the same ownership key is rejected without another debit.

`DevSleepRecoveryService` passes the caller-provided day and current state to an injected policy. The policy returns either an explicit ineligible reason or an approved next stamina and policy version. Storage accepts only a finite nondecreasing stamina within the configured maximum. Snapshot, daily ledger, and outbox commit together. Same-command replay uses the stored result without calling the policy again; a different command for the same pet/day is rejected. No recovery formula or eligibility rule is embedded.

The policy sees a detached, deeply frozen state: the activity map, cursor, game-day window, and interval are cloned and frozen. A policy cannot smuggle activity mutations into an approved stamina result. Policy mutation attempts and callback exceptions leave snapshot and ledger unchanged.

Both paths write only DEV ledger events. Any later synthetic transport must first convert the local row to an issued privacy-allowlisted envelope; raw ledger events are not transport payloads.

## Failure and decision behavior

| Case | Result |
|---|---|
| Default purchase policy/effect | `DecisionRequired`; no debit, ownership, ledger, or outbox |
| Insufficient coin | explicit error; prior snapshot retained |
| Failure after snapshot/ownership write | transaction rollback; retry commits once |
| Purchase replay | prior committed result; no second debit/grant |
| Default sleep recovery policy | `DecisionRequired`; no stamina or ledger change |
| Injected ineligible sleep result | no state/ledger/outbox mutation |
| Invalid/lower/over-cap approved stamina | explicit error; no mutation |
| Sleep ledger failure after state update | transaction rollback; retry commits once |
| Second command for same pet/day | explicit duplicate-day error; prior result retained |

This closes local primitive and failure-path implementation gaps only. Catalog inclusion, utility effects, prices, sleep eligibility/amount/day definition, production account ownership, live sync, UI activation, real purchase verification, restore/refund, and legal policy remain decision or external gates.

## Verification

Environment: macOS, Node v26.7.0, in-memory `node:sqlite`, synthetic pet/catalog/recovery fixtures only. No simulator or physical device.

```sh
node --import tsx --test tests/domain/sqlite.test.ts tests/progression/progression.test.ts tests/progression/resolutionLedger.test.ts tests/storage/syncQueue.test.ts tests/shop/devPurchase.test.ts tests/sleep/devRecovery.test.ts
# exit 0 — 50/50 pass, 0 fail, 0 skip

npm run lint
# exit 0

npm run typecheck
# exit 0
```

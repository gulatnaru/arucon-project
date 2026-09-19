# APP-02 — domain and local storage boundary

Status: **development fixture only / partial gate**. This code is a pure TypeScript reducer plus a SQLite persistence boundary. It reads no system clock, OS activity, real health records, account, or payment data. `initialPet` and `reducePet` require an explicit `DEV_GAME_CONFIG`. The config identifies SRS section 9 source constants separately from unapproved DEC-02/03/04/06/07/24/25 proposals. No production config is exported.

## Contract

- `src/domain/model.ts` keeps `speciesFamily`, `givenName`, `formId`, and `personalityProfileId` separate. `CharacterFormCatalog` contains the approved names from DEC-32. `resolveAppearance` raises `DecisionRequired` for DEC-08.
- `src/domain/engine.ts` processes injected aggregate activity, direct/auto meal completion, free interaction, cleaning, foreground return, elapsed time, and explicit development fixtures for sleep/table/toilet/auto opt-in/growth multiplier. Only `consumeMeal` can add EXP. Direct and opted-in auto feeding call the same function. Walking/running changes neither EXP nor stamina. Free touch/greet/observe changes no resource or condition meter.
- The activity input is a *selected, deduplicated day aggregate*. The activity command carries its full game-day window, selected and observed provider IDs, connection time, eligible interval, source revision, observation time, and counts. The persisted day cursor locks source/connection/window, rejects older and conflicting same revisions, and rechecks the eligible interval after reload inside the snapshot transaction. The command ledger retains the same metadata. Source selection, permissions, historical lookback and late data policy remain DEC-01/02/17 and APP-04 responsibilities. The reducer keeps the highest processed weighted units per day, carries fractional progress, and never confiscates existing food when a cap is lowered.
- Time progression is explicit (`advance`/`foregroundReturn`/`foregroundExit` with caller supplied milliseconds). `foregroundExit` records the actual end of continuous foreground use without emitting `Returned` or waking a hibernating pet. The application must schedule automatic meals around that checkpoint; the domain command itself only advances time. Hibernation freezes meters and condition timers at the fixture boundary and does not backfill them on return. Condition onset is from sustained dirty floor state only. Cleaning starts medicine-free recovery. The toilet fixture clears floor waste and handles later waste automatically without cost or maintenance.
- Expected action refusals are `DomainActionRejected` with `code` (`no_food`, `not_hungry`, `sleeping`, `hibernating`, `table_required`, `auto_feed_disabled`, `stale_meal_state`). The application can show a notice and accept the next action. Storage/corruption failures remain separate errors and must retain their retry/recovery path.
- `src/storage/sqlite.ts` migrates schema version 0→5 or development v1–v4→v5 in an exclusive transaction. Version 2 introduced `pet_registry`; version 3 introduced outbox sync metadata; version 4 records config version on every outbox row and adds DEV-only purchase ownership and daily sleep-benefit ledgers; version 5 adds the caller-prepared one-time resolution ledger without running a policy or RNG. The writer identity is fixed at local commit time and is never invented for older rows. Migrations backfill markers from snapshots and every dependent ledger, pending, ownership, and outbox row, including orphaned rows, while old outbox rows remain pending. If a pet snapshot is missing but its marker or any dependent row survives, `loadPet` and `createPet` throw `CorruptSnapshotError`; they never treat that pet ID as fresh or overwrite its history. Reads and cancellation of pending intent also preserve orphaned evidence. A completely new pet ID still loads as `null`. Snapshot, command result, meal ID, and local event outbox commit together. Activity source/cursor checks run while this transaction holds the latest snapshot. Duplicate command IDs return the historical result with `replayed: true` and the latest `currentState`. A duplicate meal ID under another command cannot grant EXP. Damaged snapshots, failed migrations, and unsupported future schema versions cause errors and preserve prior data. Pending intent persists across reload but grants no reservation or economic effect. The separate synthetic sync/recovery and DEV transaction boundaries are recorded in `MVP-storage-recovery.md` and `MVP-transactions-readiness.md`.
- Use `expoSqliteConnection(database)` to adapt Expo SQLite's void-returning exclusive transaction callback to `LocalPetStore`. The Node `node:sqlite` test adapter exercises actual SQLite transactions. Native Expo SQLite execution remains an APP-03 integration check.

The dev facility commands do not purchase items. The dev sleep/wake commands do not grant recovery. The growth multiplier command accepts a synthetic number, never a health record. Operational pending reservation, unattended meal scheduling/priority, approved hunger and capacity values, sleep scorer/recovery, growth stages, and real facility prices need decisions or later work. APP-03 may integrate the explicit fixture commands for a labelled dev flow; this does not approve those policies.

## Requirement and acceptance mapping

| Contract | Source | Executed evidence |
|---|---|---|
| Activity → food/coin, no direct EXP or activity stamina drain; cap keeps old stock | FR-3/7, DEC-02 proposal | AT-ACT-09, AT-REWARD-01/04/08/10 subset |
| Persisted provider lock, source revision and connection/interval gate | FR-2/3, DEC-02/17 proposals | AT-ACT-04/08, AT-REWARD-02/08/09 subset; SQLite reload/source-mix/conflict/rollback tests |
| One meal path, same economy for direct and auto; opt-in/table required; sleep/hibernation blocks | FR-4/18, DEC-21 approved direction, DEC-25 proposal | AT-FEED-02/05/06/07, AT-AUTO-01/02/04/07 subset |
| Free interaction neutral | FR-7/16, DEC-22 approved | AT-PERSONALITY-03 |
| Dirty floor sole low-condition cause, medicine-free recovery, no toilet upkeep | FR-8/9/17, DEC-06 proposal, DEC-20 approved direction | AT-CLEAN-04, AT-CONDITION-02/03/04 subset |
| Hibernation stops active timers and return does not backfill | FR-13, DEC-07 proposal | AT-HIB-01/02/03 subset, AT-TIME-01 subset |
| Atomic snapshot/ledger/outbox, reload/idempotency, damaged or missing snapshot protection | SRS 10-1, DEC-03/10/17 proposals | AT-TXN-01/03, AT-FEED-05, AT-DATA-03/04 subset; marker/orphaned ledger preservation tests |
| Identity/form/personality separation | FR-5/16, DEC-08 OPEN, DEC-32 approved names | Resolver raises `DecisionRequired`; appearance branching not executed |

These automated cases are **development fixture evidence**, not an operational approval of the associated proposed numeric expectations. Full AT scenario coverage and production readiness are not claimed.

## Validation record

Environment: macOS, Node v26.7.0, TypeScript 5.9 package, Expo SDK 57 package; synthetic pet/activity records only.

| Command | Exit | Result |
|---|---:|---|
| `node --import tsx --test tests/domain/sqlite.test.ts` (cwd `mobile`) | 0 | 13/13 actual `node:sqlite` integration tests pass, including marker-only loss, each orphaned row type, v1 backfill and first-create rollback |
| `node --import tsx --test tests/domain/*.test.ts` (cwd `mobile`) | 0 | 28/28 pure domain and actual `node:sqlite` tests pass, including expected action refusal and foreground exit |
| `node --import tsx --test tests/*/*.test.ts` (cwd `mobile`) | 0 | 63/63 available mobile tests pass, including current APP-03 application and DEV clock tests |
| `node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2022 --module preserve --moduleResolution bundler src/domain/*.ts src/storage/*.ts tests/domain/*.ts` (cwd `mobile`) | 0 | APP-02 owned TypeScript files compile |
| `node node_modules/typescript/bin/tsc --noEmit` (cwd `mobile`) | 0 | Current mobile tree compiles |
| `python validation/check_workflow.py` (cwd root) | 127 | `python` executable absent |
| `python3 validation/check_workflow.py` (cwd root) | 1 | System Python 3.9.6 lacks `tomllib` (requires Python ≥3.11) |

Native Expo SQLite tests, actual mobile rendering, unattended auto-meal timing, and operational pending reservation were not run or approved here.

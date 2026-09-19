# MVP progression readiness

## Scope and status

This package adds a standalone, pure projection for FR-5, a reusable one-time random-resolution contract, and durable storage for caller-prepared results. It does not change `PetState`, the domain engine, or `App.tsx`; the storage layer owns the additive SQLite v5 table migration.

| Requirement | Implementation | Status |
|---|---|---|
| SRS 9 growth thresholds | `DEV_SOURCE_GROWTH_POLICY` reads the CONFIG-01 registry | DEV fixture only |
| Level and stage projection | `projectGrowth` requires an explicit policy | Ready for synthetic verification |
| Multiple boundaries from one EXP change | `projectGrowthTransition` returns all crossed boundaries in order | Ready for synthetic verification |
| Stable random result on retry | `resolveOnce` returns the existing frozen record before policy or RNG access | Ready as a persistence contract |
| Durable prepared result | `ResolutionLedger` stores canonical JSON in `dev_resolution_ledger` | Ready as a standalone local ledger |
| Operational growth interpretation | `requireOperationalGrowthPolicy` | DecisionRequired: DEC-03 |
| Operational sex ratio/policy | `requireOperationalSexResolutionPolicy` | DecisionRequired: DEC-03 |
| Operational appearance branching | `requireOperationalAppearanceResolutionPolicy` | DecisionRequired: DEC-08 |

## Policy boundary

SRS 9 supplies the four threshold rows and final level 46. The interpretation that each row is the cost from the current level to the next level remains proposed in DEC-03. For that reason the source-derived policy is marked `DEV_FIXTURE_ONLY`; there is no implicit or operational default.

No sex ratio, appearance branch count, care-history window, tie rule, missing-data rule, or second-form stage is defined here. Tests inject a local binary fixture only to verify RNG call count and frozen-result reuse. The fixture is not a product sex or appearance policy.

The projection reads `totalExpUnits` and returns a value. It cannot grant EXP, consume food, change forms, or mutate the pet. EXP beyond the DEV final boundary stays visible as overflow in the projection; no level 47, reward, or form is generated.

## Integration contract after approval

1. Prepare the JSON-only `FrozenResolution`, then commit it with a stable `resolutionId` through `ResolutionLedger`. The ledger transaction provides idempotency and rejects a reused ID or pet/slot with a different payload.
2. Supply a stable saved-format validator that is independent of the resolving policy. On retry or reload, use `ResolutionLedger.load`, then pass the record as `existing`; `resolveOnce` validates and defensively clones/freezes it, makes zero random calls, and preserves the recorded value even when the current policy version differs.
3. Generate presentation events from committed boundary records, not by replaying the full EXP history.
4. Do not map a temporary fixture outcome to `formId` until DEC-08 supplies an approved branch table.

`ResolutionLedger` owns atomic record persistence, pet/slot lookup, defensive validation, conflict detection, and transaction rollback. It receives the DEV game config and reuses `checkedSnapshot` inside the same transaction, so a missing marker, missing snapshot, or corrupt current pet prevents both a new commit and an idempotent replay without repairing or replacing bytes. It never accepts or invokes an RNG or resolution policy. The caller still owns when a prepared record becomes eligible and, after policy approval, coordinating the record with a persisted pet stage transition. Until DEC-03/08 are approved, progression must not be connected to `App.tsx` or used to mutate a persisted form.

## QA boundary coverage

`tests/progression/progression.test.ts` covers the 749/750 and 27,749/27,750 source boundaries, multi-level ordering, stable one-time resolution, RNG call count, defensive JSON immutability, invalid saved values and injected policies, unsafe parsed JSON keys, and DecisionRequired operational entry points.

`tests/progression/resolutionLedger.test.ts` uses actual SQLite to cover durable load, exact idempotent replay, changed-payload conflicts, pet/slot isolation, rollback after an injected post-INSERT failure, corrupt-byte preservation, process-style reload followed by RNG-zero reuse, and fail-closed behavior for nonexistent pets or missing/corrupt identity state.

`tests/domain/mvpBoundaries.test.ts` fills gaps in the existing domain suite for midnight carry, downward corrections with a reward high-water mark, food-cap suppression, clock rollback, and split execution at the sleep/recovery/hibernation boundary. These are regression checks for current DEV behavior; they do not approve DEC-02/04/06/07.

## Out of scope and unresolved

- Atomic coordination with a future persisted pet stage transition; `PetState` has no approved progression fields yet.
- Actual form changes, first-form art selection, second forms, P2 social, and P3 breeding.
- Approval of DEC-03 and DEC-08.
- Native runtime or visual evolution evidence.
- App/scene integration, which remains gated by DEC-03/08.

## Verification record

Environment: local macOS workspace, Node.js test runner with `tsx`; synthetic fixtures only.

| Check | Command from `mobile/` | Result | Evidence |
|---|---|---|---|
| Growth, ledger, domain, and SQLite boundaries | `node --import tsx --test tests/config/*.test.ts tests/progression/*.test.ts tests/domain/engine.test.ts tests/domain/mvpBoundaries.test.ts tests/domain/sqlite.test.ts` | exit 0, 54/54 | `mobile/evidence/mvp-engineering/growth-affected-tests.log` |
| TypeScript | `npm run typecheck` | exit 0 | `mobile/evidence/mvp-engineering/growth-typecheck.log` |
| ESLint | `npm run lint` | exit 0 | `mobile/evidence/mvp-engineering/growth-lint.log` |
| Changed-file whitespace | `git diff --check -- mobile/src/progression mobile/tests/progression mobile/tests/domain/mvpBoundaries.test.ts mobile/docs/MVP-progression-readiness.md` (repository root) | exit 0 | `mobile/evidence/mvp-engineering/growth-diff-check.log` |

The first typecheck found a test-only literal widening error at `progression.test.ts:62`; it was fixed and the recorded rerun passed. Native SDK execution and visual evolution evidence are `BLOCKED_ENV`; this standalone package has no approved native or presentation integration to exercise.

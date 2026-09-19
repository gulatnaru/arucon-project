# ADR-005 — Approved local MVP game policy

- Date: 2026-09-19
- Status: Accepted by user approval after baseline `34ab069`
- Scope: local game balance, synthetic sleep scoring, first evolution, initial toilet, and a small coin catalog

## Context

The source SRS values and the earlier CONFIG-01 DEV fixtures intentionally failed closed while DEC-03/05/08/09/24 were unresolved. User approval after baseline `34ab069` authorizes reversible local values and branch conditions for an MVP while keeping real health reads, real payment products, guardian consent, public release, and device support claims outside this decision.

The approved runtime lives in `APPROVED_MVP_POLICY` version `approved-mvp-34ab069-v1`. `MVP_BALANCE_REGISTRY` and its DEV fixtures remain unchanged as historical source and test inputs.

## Decision

### Game economy and upgrade

- Existing SRS activity, food, coin, EXP, stamina, hygiene, hunger, and hibernation figures become the approved local rules through `APPROVED_GAME_CONFIG`.
- A new pet starts with a toilet installed and no table. The toilet has no upkeep, fault, or consumable.
- Existing local pets receive an idempotent policy upgrade. It installs the toilet without charging coin, raises a legacy sleep multiplier below `1.0` to the neutral value, and preserves food, coin, EXP, existing waste, timers, and condition. It does not immediately cure low condition; cleaning and the existing natural recovery path remain valid.
- Food above the current cap is never reclaimed. Confirmed activity can add rewards only up to the cap, as before.
- Direct feeding and opted-in table feeding use the same domain meal reducer, cost, eligibility, and EXP calculation.
- Partial activity aggregates grant no new reward until complete. Existing inventory is preserved and the UI receives a non-blaming withheld notice.

### Synthetic sleep scorer and benefit timing

- Input is only explicit `SYNTHETIC_LOCAL` session intervals. There is no HealthKit, Health Connect, permission, or background sensor adapter in this path.
- The local policy uses fixed 24-hour UTC game days. This is deterministic scaffolding for the local MVP; a future timezone adapter needs its own approval and migration contract. Sessions are clipped to the supplied record day and unioned, so overlap and split records do not double count. The caller supplies a positive personal **game baseline** no longer than that game-day window.
- Score is `min(100, unionMinutes / personalBaselineMinutes × 100)`. This is a game progress comparison and is not a medical normality, quality, or recommended-duration assessment.
- The growth multiplier is bonus-only and linear from `1.0` at score `0` to `1.25` at score `100`; no data is neutral `1.0`. The `1.25` cap is lower than the historical source fixture's `1.5` to limit growth variance while this reversible local policy is observed.
- A completed record day `D` can affect only benefit day `D+1`. Confirmation at the `D/D+1` boundary applies immediately; a later confirmation affects only future commits during the remainder of `D+1`; a confirmation at or after the end of `D+1` is expired. No past meal or EXP is recalculated.
- Every time-advancing approved service entry point splits at UTC boundaries and durably resets the new benefit day to `1.0` before advancing further. A no-data day therefore stays neutral and an earlier bonus cannot leak into a later day. Neutral reset and valid confirmation use separate idempotency keys, so no data cannot block a later valid record during `D+1`.
- Recovery remains separate from score confirmation. An eligible wake requires at least four hours of pet game sleep, then applies at most once for the current benefit day derived from the service clock through the durable sleep benefit ledger. The caller cannot select an old reward date. No data and score `0` both use the neutral stamina target `65`; valid scores add linearly up to target `100` at score `100`. Recovery never lowers current stamina. A committed wake can retry a failed recovery after restart without requiring the pet to be put to sleep again. This avoids a hidden penalty between no record and a low record. This is pet game state, not guidance about human sleep.

### Growth and one-time evolution

- The SRS growth costs remain: level 1–5 `150`, 6–15 `300`, 16–30 `600`, and 31–45 `1000` EXP per level; level 46 is final.
- Sex resolves once at level 6 with an injected RNG and a `0.5` female sample boundary. The frozen result is reused from the durable resolution ledger without another random call.
- First form resolves once at level 16 after at least seven distinct **confirmed game-record dates**. Dates come from committed activity rewards, committed synthetic sleep scores, or dated free interactions. Feeding mode does not enter the care profile, so absence automation and direct feeding cannot change the branch.
- A care share of at least `0.60` must also be strictly larger than both other shares:

| Rule | Form | Explanation basis |
|---|---|---|
| Active dates dominant | 피코 (`piko`) | confirmed activity dates |
| Rest-routine dates dominant | 몽글 (`mongle`) | confirmed synthetic sleep-score dates |
| Interaction dates dominant | 말루 (`mallu`) | dated free interactions |
| No strict dominant category | 모노 (`mono`) | mixed or tied care record |

`observedDays` is the union of those confirmed dates, not elapsed calendar time. No confirmed dates remains pending and is never described as balanced care. Personality is absent from the branch input. The ledger result is projected into `PetState.formId` with a stable command, so reloads and read-only projections use the same form. No second evolution is introduced.

### Small local catalog

The approved coin catalog is version `approved-coin-catalog-34ab069-v1`:

| Item | Price | Effect |
|---|---:|---|
| Medicine | 50 coin | optional immediate low-condition recovery; natural recovery remains available |
| Table | 60 coin | installs the table; auto feeding still requires opt-in and remains equal to direct feeding |
| Ball | 30 coin | durable local toy ownership |
| Cushion | 40 coin | durable local furniture ownership |

The initial toilet is not resold. Coin debit and item effect must share one SQLite transaction and stable purchase ID. Cash payment stays disabled through an explicit local port; no cash product ID, store SDK, purchase grant, or efficiency shortcut exists.

## Application boundary

`ApprovedMvpService` is the local façade. It loads or creates one pet, performs the idempotent policy upgrade, serializes lifecycle and economy calls through existing local services, derives care from committed journal events, and exposes the badge `로컬 미리보기 · 건강 연결 꺼짐` with provider state `synthetic_local_only`. The badge reports the input boundary; it does not claim live health connection or platform support.

All state-changing entry points consult an injected local writer authority guard when present. A known fenced device remains readable and cannot use the façade to commit. Sync conflict resolution, widget read-only timestamps, and native application rendering are handled by their owning modules.

## Alternatives considered

1. Keep approved values in the DEV registry. Rejected because an approved runtime must not depend on a `DEV_FIXTURE_ONLY` status.
2. Use the historical sleep curve including values below `1.0`. Rejected for this approval because the user selected bonus-only behavior.
3. Resolve form from personality or feeding mode. Rejected because personality must remain non-hierarchical and direct/automatic feeding must be economically and relationally equal.
4. Install a purchased table in a second transaction. Rejected because a crash could debit coin without applying the item.
5. Read live platform health data. Rejected for this scope; synthetic local sessions are the only accepted scorer input.

## Verification boundary

Pure and SQLite integration tests cover version isolation, no-clawback upgrade, direct/auto parity, interval union and no-data behavior, score timing, wake recovery, level boundaries, RNG reuse, care mapping and journal derivation, form snapshot persistence, partial activity withholding, and the catalog/payment boundary. They do not prove real health accuracy, actual OS API support, store payment behavior, legal consent, multi-device merge, or release readiness.

| Check | Command (from `mobile/`) | Result | Evidence |
|---|---|---|---|
| Approved policy and SQLite integration | `node --import tsx --test tests/config/approvedMvpPolicy.test.ts tests/domain/approvedPolicy.test.ts tests/sleep/approvedSessionScorer.test.ts tests/progression/approvedEvolution.test.ts tests/application/approvedMvpService.test.ts tests/shop/approvedCatalog.test.ts tests/shop/devPurchase.test.ts` | exit 0, 30/30 | `mobile/evidence/approved-mvp/approved-policy-tests.log` |
| TypeScript | `npm run typecheck` | exit 0 | `mobile/evidence/approved-mvp/approved-policy-typecheck.log` |
| ESLint | `npm run lint` | exit 0 | `mobile/evidence/approved-mvp/approved-policy-lint.log` |
| Changed-file whitespace | scoped `git diff --check` | exit 0 | `mobile/evidence/approved-mvp/approved-policy-diff-check.log` |

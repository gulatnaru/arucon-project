# APP-05 local scaffold

Scope: FR-6/11/12, DEC-05/09/14/29. These modules are development boundaries, not an approved live sleep, purchase, or widget integration.

## Sleep

- `SleepScoreProvider` returns `valid`, `no_data`, `unavailable`, `error`, or `not_configured`. The default provider is `NotConfiguredSleepProvider` and blocks the unresolved DEC-05 source/scorer.
- `SyntheticSleepProvider` contains explicit null/0/70/100 days. The DEV panel selects one named fixture; `prepareDevSleepFixture` reads that provider result once and passes it through `DevSleepBenefitPolicy` before the existing persisted `setSleepMultiplierFixture` command. Retry reuses the prepared result and command payload. The old direct `1.2` injection is removed.
- `DevSleepBenefitPolicy` reads the versioned SRS score-to-growth curve and neutral no-data multiplier from `src/sleep/config.ts`; the config is injectable and validated. `unavailable` and `error` produce explicit DEV guidance and do not issue a multiplier command, preserving the existing value. The operational default remains `NotConfiguredSleepProvider`, surfaced as DEC-05 `decision_required` rather than no-data.
- A SQLite integration test verifies that applying null/0/70/100 changes no EXP by itself and that only a later committed meal earns EXP at 1.0/0.7/1.0/1.5. Date attribution, first-effective timestamp, recovery ledger, native scoring, and stamina recovery remain unimplemented pending DEC-04/05.

## Shop

- `DEV_SHOP_CATALOG` makes every utility coin-only. The 50 coin medicine price is a source value. Toilet/table prices are visibly marked development fixtures; other prices and item effects remain `decision_required`.
- `DevCoinShopPolicy.quote` is a read-only preflight. Rows keep purchase actions disabled. Coin debit, inventory grant, and command idempotency require a single authoritative storage transaction before any live sale. This scaffold does not claim AT-SHOP-01/02 transactional completion.
- `DisabledCashPaymentPort` returns `disabled` for cosmetics. There are no product IDs, receipt handling, cash-to-coin path, or paid efficiency bundle.

## Widget

- `projectPetForWidget` allowlists `petId`, revision, timestamp, form, personality profile, and a short display state. It does not copy wallet, EXP, food, or health data. The reader interface has no game command method.
- `devWidgetSnapshotReader` connects the persisted read-only projection to `widgetView`. The DEV panel exposes ready, stale, missing, error, and unsupported previews, showing status, `lastUpdated`, and the sole `open_app` action. Preview/read integration tests leave pet state and the command, meal, and outbox ledgers unchanged. `open_app` is displayed as a descriptor in the DEV preview; no interactive or native app-entry route is executed by these tests. The stale age is a named DEV fixture rather than an operational threshold because DEC-14/31 remain unresolved.
- Native iOS/Android widget extension, signing, OS refresh timing, and on-device display remain unverified. An OS refresh request must never be reported as actual display completion.

Targeted synthetic and SQLite tests passed on 2026-09-19 with Node 26.7.0. Native rendering is `NOT_RUN` because no native SDK/device evidence is available. Actual health inputs, payments, external accounts, signing, operational date attribution/recovery policy, and OS stale thresholds remain outside this scaffold.

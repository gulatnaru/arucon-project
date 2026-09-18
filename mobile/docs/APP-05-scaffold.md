# APP-05 local scaffold

Scope: FR-6/11/12, DEC-05/09/14/29. These modules are development boundaries, not an approved live sleep, purchase, or widget integration.

## Sleep

- `SleepScoreProvider` returns `valid`, `no_data`, `unavailable`, `error`, or `not_configured`. The default provider is `NotConfiguredSleepProvider` and blocks the unresolved DEC-05 source/scorer.
- `SyntheticSleepProvider` contains explicit null/0/70/100 days. A missing fixture is `unavailable`. No raw sleep sessions, health records, location, or audio enter this interface.
- `DevSleepBenefitPolicy` reads the versioned SRS score-to-growth curve and neutral no-data multiplier from `src/sleep/config.ts`; the config is injectable and validated. Its `DEV_FIXTURE_ONLY` mode and the unconfigured result prevent presenting it as an operational scorer. The optional confirmed daily multiplier models an already fixed value, but date attribution, first-effective timestamp, recovery ledger, and native scoring are not implemented; DEC-04/05 approval and domain integration remain required.

## Shop

- `DEV_SHOP_CATALOG` makes every utility coin-only. The 50 coin medicine price is a source value. Toilet/table prices are visibly marked development fixtures; other prices and item effects remain `decision_required`.
- `DevCoinShopPolicy.quote` is a read-only preflight. Rows keep purchase actions disabled. Coin debit, inventory grant, and command idempotency require a single authoritative storage transaction before any live sale. This scaffold does not claim AT-SHOP-01/02 transactional completion.
- `DisabledCashPaymentPort` returns `disabled` for cosmetics. There are no product IDs, receipt handling, cash-to-coin path, or paid efficiency bundle.

## Widget

- `projectPetForWidget` allowlists `petId`, revision, timestamp, form, personality profile, and a short display state. It does not copy wallet, EXP, food, or health data. The reader interface has no game command method.
- `widgetView` handles fresh, stale, missing, unsupported, and error states. Stale age is supplied by the host because DEC-14/31 have not set a threshold. Its sole action is `open_app`; native routing and shared storage remain unconnected.
- Native iOS/Android widget extension, signing, OS refresh timing, and on-device display remain unverified. An OS refresh request must never be reported as actual display completion.

Targeted synthetic tests: `node --import tsx --test tests/sleep/*.test.ts tests/shop/*.test.ts tests/widget/*.test.ts` from `mobile/`: 9/9 passed on 2026-09-19 with Node 26.7.0. This includes injected curve behavior and widget type/config corrections after independent review. Actual health inputs, payments, external accounts, and signing are outside this scaffold.

# ADR-015 — native DB access and one-pet growth playthrough

2026-10-06 · SOL_DIRECT / SELF_REVIEW · accepted technical implementation under the current user request. Final fun/art approval remains USER_REVIEW_PENDING.

## Database decision

Before this change, ApprovedMvpService and LifeMemoryStore had separate queues, while profile settings used the cached raw Expo connection. Expo SDK55 exclusive transactions open another native connection. Same-file writes could therefore overlap; a read-to-write transaction could fail with SQLITE_BUSY. Increasing the existing 50/100/200/400/800ms retry delays would leave that race intact.

Choose a process-wide lane keyed by native databasePath. Every application query, settings operation, migration, life-memory save and transaction uses it. A transaction's executor operates inside its owner's lane. Hold the lane through commit/rollback and closing the temporary connection. Retain the existing bounded retry for external contention. Keep the original database files and schema7; no reset, destructive migration or Expo patch.

Use the public prepared-statement API and finalize once in every outcome. Preserve prepare/execute/read as the primary error and attach a separate cleanup error. SQLite finalize may return the previous step's error, and Expo convenience methods finalize in a finally block; the surfaced finalizeAsync name is not proof that cleanup caused the lock. Local bounded traces include operation/table/file and phase, never binds or pet snapshot contents. See [Expo SDK55 SQLite](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/) and [SQLite finalize semantics](https://sqlite.org/c3ref/finalize.html).

Alternatives: longer retries (race remains); a single nonexclusive connection transaction (requires replacing established transaction semantics); per-file access coordination with the existing exclusive transaction (chosen, preserves contracts). App connections remain process-owned; fixture connections close only after awaited work and finalized statements.

## Growth decision

New `growth_playthrough#runKey` is an opt-in separate saved pet in the existing experience database. It starts with EXP0/arucon, uses the existing coin-shop facility path, synthetic activity normalization/supply, approved sleep, normal sleep/wake recovery, continuous-foreground settlement, automatic meals, and existing sex/evolution resolvers. Each consumption/time plan is persisted before execution and replays the same activity and sleep/wake identities. Level requests name their target so a read-model failure after commit cannot advance another level on retry.

The virtual clock belongs only to this profile. Pause/background/menu stop further plans; a committed request is finished safely. At each level the clock pauses for 20s of normal-speed rendering. Twenty additive expression recipes expose new body acts through growth reveals AND normal life scenes. Earlier learned acts remain eligible, with separate motion repetition control. Touch uses location/current intent/actual recent experience/level. Personality ID and all economic rules remain unchanged. Level20 is a review endpoint; production level46 is unchanged.

Before/after preview changes only presentation props and suppresses memory writes. It does not mutate the authoritative form, EXP or rewards. Original DB/widget/health OFF and original art are preserved. The old seeded Lv5→6 and evolution boundary scenarios remain labeled diagnostics, not the new continuous experience.

## Validation

Current automated results, actual Release build identity, native contention reproduction/retest, normal-input growth video, time/save/input regressions, measurement limits and tool availability are recorded in `../../GROWTH-PLAYTHROUGH-REPORT.md`. Node tests are not native/visual PASS. SELF_REVIEW is not independent review.

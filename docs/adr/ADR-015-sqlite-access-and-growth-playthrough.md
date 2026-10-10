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

### LIFE-02 version and transaction audit (2026-10-06)

- package.json / lockfile / installed packages agree: Expo55.0.31 and expo-sqlite55.0.20. [SDK55 SQLite documentation](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/) recommends `~55.0.20`. SDK version55 in the URL is not the Expo package patch number31.
- [Published npm metadata for55.0.20](https://registry.npmjs.org/expo-sqlite/55.0.20) identifies gitHead `856b99321eeb04bd528b33f90c0e7fa2859a1fcb`. The [exact source](https://raw.githubusercontent.com/expo/expo/856b99321eeb04bd528b33f90c0e7fa2859a1fcb/packages/expo-sqlite/src/SQLiteDatabase.ts) and installed SQLiteDatabase.ts have identical SHA256 `44c8f53de7c04749f239fee553d38f1322b7408ce93e3ebb59b59b9d60c16d38`.
- Exclusive scopes use their `txn`; the SDK opens another connection and does not queue all application writers. Official API text explicitly allows an outside async writer to fail with a lock. [SQLITE_BUSY](https://www.sqlite.org/rescode.html#busy) describes competition between connections; it is distinct from SQLITE_LOCKED. [finalize](https://www.sqlite.org/c3ref/finalize.html) can return the previous evaluation error while destroying the statement.
- All30 current transaction callbacks were inspected with a local TypeScript AST audit. No direct SQL call on an outer DB appeared inside them. `checkedSnapshot`, registration, outbox and memory helpers receive the transaction executor. Game settlement/touch, life-memory, profile settings, migrations and saved-profile reads use the same per-file lane; only the intentionally uncoordinated native QA reproduction bypasses it in its own fixture file.
- Fresh impact tests16/16 include delayed-finalize ownership and a finalize-only failure. This verifies first execution versus cleanup failure without pretending every finalize error has the same cause. Retry delays remain unchanged. Existing v4 native execute→finalize code5 evidence remains scoped to that run; latest v5 actual pressure/input remains pending while Mac is locked.
- Context7 catalog reports installed/ENABLED; current Codex callable inventory contains zero Context7 tools and no Context7 direct MCP entries were found in user/project config. No Context7 documentation call was executed. Official source retrieval was used, with public library/version queries only. No plugin install, permissions change or project data transmission.

Audit files are local under `evidence/life-02-context7-sqlite-2026-10-06/`. Documentation/tool availability is not completion of LIFE-02.

Current automated results, actual Release build identity, native contention reproduction/retest, normal-input growth video, time/save/input regressions, measurement limits and tool availability are recorded in `../../GROWTH-PLAYTHROUGH-REPORT.md`. Node tests are not native/visual PASS. SELF_REVIEW is not independent review.

## 2026-10-10 — first-error diagnostic archive persistence

A separate STORAGE-01 diagnostic defect was reproduced in the installed v2: four incidents existed on disk but a cold process exported zero. A subsequent failure could overwrite that history. This is not evidence of the original CANTOPEN cause.

Choose two bounded local cache checkpoints with a generation number and verified readback. Restore the newest complete one before observing SQL. On failure or truncated write, preserve the other complete checkpoint. Import only validated fields; seal loaded incidents so process-local connection/transaction/trace IDs cannot label an old failure as a new recovery. Keep at most eight incidents, four cleanup entries each; reject oversized/invalid metadata. This is best-effort diagnostic persistence, not an authoritative ledger, power-loss/fsync guarantee or a DB recovery policy. OS cache eviction is still possible.

Alternatives: one overwritten file (history/readback failure); unbounded per-event files (disk growth); adding telemetry writes to the game DB (extra failure/transaction coupling). The two cache slots keep the existing SQLite lane, schema7, primary-error and retry contracts unchanged. No player DB, cache deletion, SDK patch or external upload is used.

SDK55's public [FileSystem API](https://docs.expo.dev/versions/v55.0.0/sdk/filesystem/) and the installed expo-file-system55.0.26 were checked. Its iOS string-write implementation explicitly uses `atomically:false`; do not assume public `File.write` is atomic. Existing package.json/lock/installed Expo55.0.31 and SQLite55.0.20 agree. Context7 plugin resolve+query succeeded for `/websites/expo_dev_versions_v55_0_0` with public library queries only; this is current evidence and does not rewrite the earlier unavailable-tool audit.

Node checks cover interrupted and silent partial writes, malformed types, old/new session ID reuse and bounded history. Native QA uses separate retained files with **synthetic interruption/incident metadata** and actual File IO. SQLite14/13 are tested separately through actual native statements. Current build identities, cold restoration and actual normal input are in [STORAGE-01](../defects/STORAGE-01-cantopen.md) and the latest REBOOT-03.2 report. Original VFS cause remains OPEN.

# ADR-014: Foreground time and consistent rest-state recovery

- Status: Accepted technical defect repair; actual Simulator verification completed
- Date: 2026-10-04
- Basis: SRS FR-7.1 / FR-13, approved DEC-04 / DEC-07; no balance or schema change

## Evidence and cause

The preserved ordinary save has `sleeping=false`, `hibernating=true`. Its ledger contains active-app thirty-second `advance` commands that cross 24 hours after the last foreground checkpoint and emit `Hibernated`. App's renderer combined both flags while the food panel and action read only `sleeping`. The first run was blocked by host lock. After unlocking, the old installed app showed awake/sleep-button food UI while sleeping animation and room input rejection continued even after closing the panel.

## Decision

1. Active-app polls and ordinary care actions use `advanceForeground`, recorded as `foregroundTick`. It shares the tested sliced foreground settlement with exit, including auto-meal thresholds and benefit-day expiry. Background/absence `advanceTo`, widget reads and synthetic activity keep their existing absence semantics. A heartbeat never releases an already saved hibernation.
2. `projectPetRest` selects awake, manual sleep or hibernation, with hibernation taking precedence. The food label, action and renderer use this interpretation. Drowsy/cushion life poses remain decorative and interruptible.
3. Hibernation's action calls the normal `returnToForeground` service, not `wake`. It preserves intentional manual sleep. Manual sleep then offers a separate wake command. In actual cf26058 verification, automatic cold return skipped the user-requested visible hibernation/resume action. Cold start and AppState arrival now use `enterForeground`: settle absence first and expose `needsResume` for saved/newly reached hibernation. The existing normal resume button completes the return. Non-hibernating arrival follows normal return and preserves manual sleep. No flags are rewritten outside domain commands.
4. Rest/background cancel transient clips, intents, pending meal/growth presentation and input holds. A presentation epoch fences late asynchronous results, rechecked after journal reads. This cancels visuals only; committed meals and EXP remain in the ledger.
5. Qualified manual sleep is derived from committed active intervals, excluding frozen hibernation time. Same-day recovery retry stays idempotent; an old wake replay cannot claim a different day's recovery or wake a newer session. No recovery is awarded by the return command itself.
6. Local diagnostics retain 24 snapshots of App flags/time/menu/cancellation and actual controller clip/intent/pose/input gate. They update a ref at most once per second in steady play and export only on the existing diagnostic action. No per-frame DB write or normal-screen diagnostic card is added.

## Alternatives

- Label-only change: rejected because uninterrupted foreground would still hibernate and block input.
- Clear flags or treat hibernation as manual wake: rejected because it bypasses absence/recovery policy and loses intentional sleep.
- Explicit foreground settlement plus one rest projection: selected because it preserves the approved domain and persisted economy while repairing the caller/UI inconsistency.

## Verification scope

SQLite boundary tests cover continuous foreground versus absence, split/unsplit auto meals, hibernation/manual sleep return, qualified recovery excluding frozen time, same-day retry, cross-day stale wake and arrival/resume separation. New tests 362/362 and impact29/29 pass. The old installed defect was directly reproduced, and cf26058 was installed with its expected hash. Following its skipped-resume-path repair, one new Release was installed on both the original device and a separate Simulator seeded with the byte-identical online backup. Original data was never reset or rewound. The copy passed the full visible hibernation -> normal resume -> movement/touch/life -> sleep/wake -> menu/background/relaunch sequence; the original passed normal input and manual-sleep persistence through foreground/cold restart. Same-time App/controller diagnostics, unedited video and unchanged economy ledgers are recorded in LIFE-00-REPORT.md. Physical-device, GPU/physical input performance and user art/fun approval remain separate.

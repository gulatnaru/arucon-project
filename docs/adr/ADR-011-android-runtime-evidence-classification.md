# ADR-011: Android runtime evidence classification

- Status: Accepted for local development
- Date: 2026-09-25
- Scope: classification of observed Android AVD runtime evidence
- Product decisions changed: none

## Decision

Record Android runtime evidence at the narrowest proven scope. A static capture, APK inspection, or baseline test does not promote an unobserved lifecycle, animation, widget visual, performance, or cross-platform behavior to PASS.

## Observed scope

The Windows AVD observed synthetic onboarding and room/GLB rendering, cold-start room recovery after an AppState null/unknown guard, meal force-stop/relaunch SQLite equality, normal touch lean/restore, floor arrival, corrected reduced-motion with `transition_animation_scale=0`, sleep UI and old widget home bind/tap. The corrected reduced-motion recording is `android-reduced-correct.mp4`; the earlier animator-scale-only recording is not evidence.

The SQLite comparison reports integrity_check OK and food 0/coin 5/EXP 15,000,000/meals 1/registry 1 before and after restart. Synthetic 70-minute sleep displays multiplier 1.175 and no immediate EXP; feeding while resting is rejected and wake restores the available state.

## Non-results and pending work

Projection callback dedupe did not prove an overall FPS improvement (about 24 ViewRoot events/s, jank about 65%, p50 about 25 ms). A host-GPU emulator attempt failed because OpenGL Core is unsupported; software mode was restored. Transient app/SystemUI ANR dialogs after restart and 4-core warmed-app visibility do not establish smoothness.

The widget source repair adds iOS17 `containerBackground`, target-phase PNG handling, the timestamp footer, and the generated widget pet asset. Static review is closed, native checker/plugin/templates/renderer checks pass 17/17, and the current source suite passes 254/254 with lint/typecheck PASS. Final Android debug and release x86_64 APK builds pass (CNG Android 16/16); the release APK installs and cold-launches the bundled GLB room without an adb reverse/Metro dependency. Footer/home/tap/rest observation is PASS on the Android AVD. Release-performance A/B is PARTIAL/NOT_PASS. iOS compile/runtime and iOS widget OS rendering are NOT_RUN on Windows.

## Balanced release renderer

Set the release renderer to MSAA 0/no AA, DPR 1.65, and Lambert shading. These were previously dev-only settings. The bounded tradeoff preserves the GLB and feature behavior while keeping room shading visible on the tested release path. Footer visual/tap/rest observation now passes on the Android AVD. Runtime A/B remains PARTIAL/NOT_PASS: modern jank and high percentiles improved, but median, legacy jank, and high-input jank regressed. It is neither GL FPS nor causal/physical-device proof.

Font 130 activity recreation/storage DB is PASS for the observed Android release scope. A simple busy retry did not correct the earlier runtime finalization failure; the React Native `fontScale` activity-recreation CNG manifest patch was rebuilt and 1→1.3→1→1.3 was observed without errors on the same process, with resized UI evidence. Retain the failed retry history; it was not the fix.

These observations retain Health OFF and involve no real health data, accounts, payment, store/admin operation, or release action.

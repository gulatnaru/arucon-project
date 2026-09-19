# ADR-009: Expo SDK 55 compatibility baseline

- Status: Accepted for local development
- Date: 2026-09-20
- Scope: Expo, React Native, React and first-party Expo package compatibility
- Product decisions changed: none
- Supersedes: ADR-008's SDK 57 ExpoModulesJSI lifecycle-patch decision only

## Context

Expo SDK 57 requires Xcode 26.4 or newer. The available host is macOS 15.6 with Xcode
26.3, and Xcode 26.4.1 requires an operating-system upgrade that is outside the current
work. The SDK 57 build therefore reached unsupported compiler combinations even after
the independent widget source-path defect was repaired.

The previous checkout applied an exact `postinstall` patch to
`expo-modules-jsi@57.1.0`. That patch was useful to distinguish the widget defect from
the later SDK/toolchain failure, but it modified package internals and was not an
acceptable product baseline. The product requires an official Expo combination on the
current host without weakening compiler checks or deleting features.

Expo's official SDK 55 `bundledNativeModules.json` published with `expo@55.0.31`
defines the following direct compatibility baseline used by this application:

| Package | Selected SDK 55 range/version |
|---|---|
| `expo` | `~55.0.31` |
| `react-native` | `0.83.10` |
| `react` | `19.2.0` |
| `expo-asset` | `~55.0.20` |
| `expo-dev-client` | `~55.0.40` |
| `expo-file-system` | `~55.0.26` |
| `expo-gl` | `~55.0.18` |
| `expo-sqlite` | `~55.0.20` |
| `expo-system-ui` | `~55.0.22` |
| `react-native-safe-area-context` | `~5.6.2` |
| `eslint-config-expo` | `~55.0.1` |

The host's Xcode 26.3 is above Expo SDK 55's documented Xcode 26.2 minimum. This makes
SDK 55 an official local compatibility target while leaving final release OS support and
physical-device validation gated by their existing decisions.

## SDK API compatibility audit

Application imports and native boundaries were checked before the dependency change:

- `expo-file-system`: `File` and `bytes()` remain available.
- `expo-sqlite`: the asynchronous database API used by the repository remains available.
- `expo-gl`: `GLView` and `ExpoWebGLRenderingContext` remain available.
- `expo-asset`: the asset-loading API remains available.
- `expo-modules-core`: `requireOptionalNativeModule` remains available to keep native
  health access optional and OFF by default.
- Expo autolinking continues to support the configured local `./native` module directory.

No SDK 57-only product API was found. The only SDK 57-specific application-owned code
was the ExpoModulesJSI lifecycle patch and its exact-content test. Both are removed as
part of this migration rather than carried into SDK 55. No domain, SQLite schema,
renderer asset, motion, widget snapshot contract, or health-policy code needs an API
substitute.

There is one config-plugin capability difference. `expo-asset@57.0.18` includes `.glb`
in its native resource-copy allowlist, while `expo-asset@55.0.20` does not. SDK 55
therefore warns that `.glb` is unsupported and omits that file from the config plugin's
direct PBX/Android resource-copy step. The application does not address that direct
resource: `metro.config.js` registers `glb` as a Metro asset, and `RoomController` uses a
static `require` followed by `Asset.fromModule`, `downloadAsync` and `File.bytes()`.
The SDK 55 production bundle contains the GLB through that Metro path. Keep the existing
config entry visible during migration rather than deleting asset intent to silence the
warning. Native compile and runtime evidence must still confirm that the built app's
Metro asset is readable; export presence alone is not a runtime PASS.

## Decision

Use the official Expo SDK 55 package graph in `package.json` and `package-lock.json`.
Build the lock from the SDK 55 manifest without `--force` or `--legacy-peer-deps`, then
run the official migration consistency steps:

1. `npx expo install --fix`
2. `npx expo-doctor`
3. regenerate ignored native projects through Expo CNG when native verification starts
4. verify that the application and widget targets are still emitted by the source-owned
   config plugin
5. run TypeScript, lint, domain/DB regression, platform bundle, prebuild and native
   compile checks

The first install attempt against the stale SDK 57 lock correctly failed with `ERESOLVE`.
The old generated dependency tree and lock were kept outside the repository temporarily,
and a clean SDK 55 lock was produced without bypassing peer-dependency checks. The
resulting install reports zero audit vulnerabilities. `expo install --fix` reports the
dependencies are up to date, and `expo-doctor` passes 20/20 checks.

Do not restore the SDK 57 `postinstall` patch, directly edit Expo package headers, lower
Swift concurrency checks, or use forced peer resolution. A future SDK change must use
Expo's package matrix and repeat the same generated-project and native verification.

## Product and native invariants

- Domain behavior and all approved balance configuration remain unchanged.
- SQLite schema and migration history remain unchanged.
- The 3D GLB asset, renderer and motion behavior remain unchanged.
- The widget remains a read-only snapshot with the same fields, timestamp and app-link
  contract. ADR-008's group-relative Swift source-path repair remains active.
- Health declarations and actual HealthKit/Health Connect access remain OFF.
- No external account, payment, signing, release or deployment state is created.

## Verification boundary

Package alignment and `expo-doctor` establish dependency/config consistency only. CNG
generation proves source reproducibility only. Neither result alone establishes an iOS
native compile, simulator launch, widget rendering, Android native compile, signing,
archive or physical-device behavior. Those results must be recorded separately from JS
bundles and source checks.

## Rollback

Revert `package.json`, `package-lock.json`, this ADR and the removal of the SDK 57 patch
files as one change. Reinstall from the restored lock. Do not combine SDK 55 packages
with the prior SDK 57 patch or lock. Because this decision changes no product data or
SQLite schema, rollback requires no user-data migration.

## Observed migration validation (2026-09-20)

The final SDK55 run passed 239/239 tests, lint/typecheck, Expo Doctor 20/20,
Android/iOS JS bundles, and 25 generated native-boundary checks. The first actual
Simulator installation exposed a missing `CFBundleExecutable` in the project-owned
widget Info.plist generator. Adding `$(EXECUTABLE_NAME)` in that CNG source, testing
it, and regenerating the project fixed installation without an Expo internal patch.

The final standalone `xcodebuild` exited 0; the app and its widget extension installed,
and a separate `simctl launch` returned a process PID. `expo run:ios` itself exited 1
after build/install because its final Simulator-window activation via System Events
lacked macOS automation permission. This is `BLOCKED_ENV_AUTOMATION_PERMISSION`, not
a compiler failure or missing Simulator runtime. Actual GLB rendering, interactive
motion, WidgetKit UI and physical-device behavior remain unverified. The validated
migration is stored as an authorized feature-branch checkpoint; main, merge, release,
and deployment remain out of scope. See `mobile/evidence/sdk55-migration/` and the latest
`AUTONOMOUS-RUN-REPORT.md` for command-level evidence.

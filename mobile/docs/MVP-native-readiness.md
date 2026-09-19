# MVP native readiness scaffold

## Scope and current result

This checkpoint adds local contracts for a future HealthKit, Health Connect, and home-widget integration. All native reads are OFF by default. No entitlement, manifest permission, Expo config plugin, native SDK, real health record, shared widget container, or OS widget extension is active in the application.

The scaffold is IMPLEMENTABLE_NOW evidence only. It does not satisfy the SRS 14-1 physical-device gate.

## Health boundary

- `NativeHealthBridge` returns only a daily activity aggregate or a versioned sleep score. Raw samples, source payloads, GPS, audio, and user identifiers cannot cross this TypeScript boundary.
- `FailClosedNativeActivityProvider` checks capability and permission before every read. It distinguishes unsupported, permission-required, denied, empty, delayed/error, partial, and available results.
- HealthKit read authorization may remain `unknown`; an empty query is kept as `empty` and is never converted to denied access or zero steps.
- `FailClosedNativeSleepScoreProvider` stays `not_configured` until both the read feature and an approved scorer version are supplied. DEC-05 remains OPEN.
- No read path requests permission automatically. Permission prompting belongs to an explicit UI action after approved privacy copy.
- The declaration scaffold contains read-only steps and sleep identifiers. Write, background, and historical permissions are empty or disabled. It is not wired into `app.json`.

Official references checked 2026-09-19:

- Apple, HealthKit authorization: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Apple, HealthKit entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.healthkit
- Android, Health Connect get started and permission checks: https://developer.android.com/health-and-fitness/health-connect/get-started
- Android, Health Connect data types and permissions: https://developer.android.com/health-and-fitness/health-connect/data-types
- Android, cumulative step aggregation: https://developer.android.com/health-and-fitness/health-connect/read-data

## Widget boundary

- `NativeWidgetBridge` receives only the six-field `PetProjection` allowlist.
- Runtime sanitization removes extra economic, health, identity, and domain fields before native shared storage receives a projection.
- Reads and timeline reload requests receive no domain command writer. A reload result means only that the request was made; it is not evidence that the OS rendered it.
- Widget native access is OFF by default. No App Group, Android widget receiver, extension, or refresh interval is configured before DEC-14/31 and native target decisions.

## Local contract verification

The native contract tests cover default-OFF behavior, unsupported service, permission not requested, denial and revocation, HealthKit unknown authorization, delayed read, adapter recreation after restart, missing scorer decision, minimum read-only declarations, projection allowlisting, resource-neutral read/reload, and native failure display behavior.

## Remaining device gate

Status is `BLOCKED_ENV / NOT_RUN` until approved native targets and SDKs are available. The required follow-up is:

1. approve DEC-01/05/11/12/14/31 details needed by the selected release scope;
2. wire reviewed usage text, entitlement, and manifest entries into platform targets;
3. implement native modules without logging raw records;
4. on iOS and Android physical devices, exercise denial, revocation, unsupported state, reboot, force quit, delayed records, foreground reconciliation, widget install/update/stale/error/open-app, and resource neutrality;
5. record device model, OS, build revision, commands, screenshots/logs with no sensitive payload, and separate simulator from physical-device results.

This checkpoint does not claim simulator or physical-device PASS.

## Reproducible environment inventory

Run `node scripts/check-native-environment.mjs --output evidence/mvp-engineering/native-environment.json` from `mobile/`. The script performs read-only tool and target inventory, redacts device identifiers and simulator names, and records every app, Health API, widget, simulator, and physical-device execution field as `NOT_RUN`. It installs nothing and never reads health data.

## Dependency and prebuild readiness

- A fresh audit found GHSA-w5hq-g745-h8pq through `xcode@3.0.1 -> uuid@7.0.3`. GitHub lists `uuid@11.1.1` as the patched CommonJS line, so `package.json` scopes an override to the `xcode` dependency only.
- `xcode` calls `require('uuid').v4()`. A parsed-project-compatible `generateUuid()` smoke check passed with `uuid@11.1.1`, producing the required 24-character PBX identifier.
- `npm audit --json` reports zero vulnerabilities after the override. Evidence is in the ignored `evidence/mvp-engineering/dependency-audit.json`.
- `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` completed. Generated `ios/` and `android/` remain ignored artifacts.
- Generated native files contained no HealthKit entitlement, Health usage description, Health Connect steps/sleep permission, microphone permission, activity-recognition permission, or location permission. Health reads therefore remain OFF.
- The DEV shell retains local-network/dev-launcher settings needed for the development client. The app config blocks legacy Android external-storage permissions because the bundled GLB and internal SQLite do not require them. Production network and development-client permissions still require a separate release manifest review.
- The final clean prebuild used SDK 57's bundled `expo-system-ui@57.0.4` and completed without the earlier `userInterfaceStyle` warning. Canonical output is `evidence/mvp-engineering/native-prebuild-final.log`.
- The bundled GLB uses the Android-safe `arucon_tsundere_motion.glb` basename. Its SHA-256 remains `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`, byte-identical to the approved reference. The generated iOS project contains only the underscore basename; the old copied-asset basename is absent.
- Android's generated source manifest represents both external-storage blocks as `tools:node="remove"`. These are removal directives, not granted runtime permissions. A merged release manifest still requires review on a build-capable Android host.

Official security references checked 2026-09-19:

- GitHub advisory GHSA-w5hq-g745-h8pq: https://github.com/advisories/GHSA-w5hq-g745-h8pq
- uuid 11.1.1 release: https://github.com/uuidjs/uuid/releases/tag/v11.1.1

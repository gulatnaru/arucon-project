# MVP native readiness scaffold

## Scope and current result

This checkpoint adds local contracts, build-discoverable Expo Modules, and generated development widget targets for future HealthKit, Health Connect, and home-widget integration. All health reads are OFF. No health entitlement, health manifest permission, health SDK client, real health record, signed App Group, installed widget, or OS-verified widget execution is active.

The independent local scaffold is complete within its source/static scope. It does not satisfy the SRS 14-1 physical-device gate.

## Health boundary

- `NativeHealthBridge` returns only a daily activity aggregate or a versioned sleep score. Raw samples, source payloads, GPS, audio, and user identifiers cannot cross this TypeScript boundary.
- `FailClosedNativeActivityProvider` checks capability and permission before every read. It distinguishes unsupported, permission-required, denied, empty, delayed/error, partial, and available results.
- HealthKit read authorization may remain `unknown`; an empty query is kept as `empty` and is never converted to denied access or zero steps.
- The local synthetic scorer is approved and runs without a health API. `FailClosedNativeSleepScoreProvider` stays `not_configured` until a separately enabled native read feature supplies the reviewed scorer version; operational health access remains OFF.
- No read path requests permission automatically. Permission prompting belongs to an explicit UI action after approved privacy copy.
- The declaration scaffold contains read-only steps and sleep identifiers. Write, background, and historical permissions are empty or disabled.
- `native/arucon-health` is discovered by Expo autolinking for Apple and Android. Its Swift and Kotlin code exposes only a versioned `readMode: disabled` contract; it imports no HealthKit/Health Connect client, has no permission launcher, and performs no query.
- `ExpoNativeHealthBridge` connects that optional module to the existing `NativeHealthBridge` shape. It defaults OFF, makes zero native calls in that state, never exposes an automatic permission prompt, and still fails closed when explicitly constructed against the disabled native module.
- `plugins/withAruconNativeIntegration.js` is registered in `app.json` with declarations OFF. It strips health declarations and emits only a contract-version marker so clean-prebuild execution can be verified. Its tested opt-in generation path is not enabled in the application.

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
- Development identifiers are fixed in `native/arucon-widget-template/contract.json`. Clean prebuild now generates the iOS extension target/App Group entitlements and Android receiver/resources. Apple portal registration, signing, installation, and OS execution remain external or environment-blocked.
- The tracked WidgetKit/AppWidget templates strictly decode the same six-field projection, model the existing four display states and five view statuses, read only shared storage, and expose only `arucondev://open/widget`. They perform no network, game command, reward, scheduled cadence, or health read.
- The iOS template uses `.never` and the Android provider metadata uses `updatePeriodMillis=0`, so this checkpoint does not invent a refresh interval. Stale status is renderable but no native stale threshold is selected.
- The plugin's DEV-only generation plan is enabled in `app.json`. It creates the Xcode extension target, copies Android/iOS sources and resources, registers the receiver, and declares the EAS extension metadata. App Group signing, compilation, install, and OS rendering remain `BLOCKED_ENV / NOT_RUN`.
- `native/arucon-widget` is an autolinked app-side bridge. It validates and stores only the six-field JSON projection and requests an OS reload. The approved local App composition enables this read-only snapshot path and reports missing modules/errors explicitly; actual OS rendering remains unverified.

## Local contract verification

The native contract tests cover default-OFF behavior, unsupported service, permission not requested, denial and revocation, HealthKit unknown authorization, delayed read, adapter recreation after restart, missing scorer decision, minimum read-only declarations, projection allowlisting, resource-neutral read/reload, native failure display behavior, local-module absence/malformed contracts, zero native calls while OFF, config declaration removal, the exact read-only opt-in declaration set, and widget template/generation-plan source contracts.

Expo autolinking `search` and `resolve` both find `arucon-health` for Apple and Android, including the podspec/Swift module and Gradle/Kotlin module. Apple modules-provider generation with `--packages arucon-health` emits the `AruconHealth` import and `AruconHealthModule.self` registration. This verifies build-graph discovery and provider generation only. Swift/Kotlin compilation and runtime invocation remain `BLOCKED_ENV / NOT_RUN`.

After clean prebuild, run `node scripts/check-native-generation.mjs --output evidence/approved-mvp/native-generation.json`. It checks health declarations remain OFF, widget targets are generated, plugin markers are present, Health SDK imports and permission-request APIs are absent, and native runtime fields remain explicitly `NOT_RUN`.

## Remaining device gate

Tracked widget targets and build generation are ready. Native compilation/runtime remains `BLOCKED_ENV / NOT_RUN` until the platform SDKs are available. The required follow-up is:

1. install or select the platform SDKs on an authorized host and perform the first build/launch with health reads OFF; approve only the product/legal details needed for later operational activation (technical structure is adopted under ADR-002/007);
2. activate the existing config-plugin declaration gate with reviewed usage text and release scope;
3. replace the native module's disabled contract with official platform clients without logging raw records;
4. on iOS and Android physical devices, exercise denial, revocation, unsupported state, reboot, force quit, delayed records, foreground reconciliation, widget install/update/stale/error/open-app, and resource neutrality;
5. record device model, OS, build revision, commands, screenshots/logs with no sensitive payload, and separate simulator from physical-device results.

This checkpoint does not claim simulator or physical-device PASS.

## Reproducible environment inventory

Run `node scripts/check-native-environment.mjs --output evidence/approved-mvp/native-environment.json` from `mobile/`. The script performs read-only CLT/Xcode/Swift/CocoaPods, Java, Android SDK/tool, simulator/emulator, and device inventory; redacts device identifiers, simulator names, and SDK paths; and records every app, Health API, widget, simulator, and physical-device execution field as `NOT_RUN`. It installs nothing and never reads health data.

## Dependency and prebuild readiness

- Historical a8aa900 preparation found GHSA-w5hq-g745-h8pq through `xcode@3.0.1 -> uuid@7.0.3`. GitHub lists `uuid@11.1.1` as the patched CommonJS line, so `package.json` scopes an override to the `xcode` dependency only.
- In that historical preparation, `xcode` calls `require('uuid').v4()`. A parsed-project-compatible `generateUuid()` smoke check passed with `uuid@11.1.1`, producing the required 24-character PBX identifier.
- `npm audit --json` reports zero vulnerabilities after the override. Evidence is in the ignored `evidence/decision-audit/dependency-audit.json`.
- `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` completed. Generated `ios/` and `android/` remain ignored artifacts.
- After registering the local plugin and autolinking directory, the same offline clean prebuild completed again. The iOS `AruconNativeIntegrationContractVersion` and Android `com.arucon.native.CONTRACT_VERSION` markers prove plugin execution; output is in ignored `evidence/decision-audit/final-prebuild.log`.
- Generated native files contained no HealthKit entitlement, Health usage description, Health Connect steps/sleep permission, microphone permission, activity-recognition permission, or location permission. Health reads therefore remain OFF.
- The DEV shell retains local-network/dev-launcher settings needed for the development client. The app config blocks legacy Android external-storage permissions because the bundled GLB and internal SQLite do not require them. Production network and development-client permissions still require a separate release manifest review.
- The final clean prebuild used SDK 57's bundled `expo-system-ui@57.0.4` and completed without the earlier `userInterfaceStyle` warning. Canonical output is `evidence/decision-audit/final-prebuild.log`.
- The bundled GLB uses the Android-safe `arucon_tsundere_motion.glb` basename. Its SHA-256 remains `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`, byte-identical to the approved reference. The generated iOS project contains only the underscore basename; the old copied-asset basename is absent.
- Android's generated source manifest represents both external-storage blocks as `tools:node="remove"`. These are removal directives, not granted runtime permissions. A merged release manifest still requires review on a build-capable Android host.

## Approved MVP native generation

- `widgetTargetsEnabled` is true only for tracked development target generation; `healthDeclarationsEnabled` remains false.
- Offline clean prebuild generates and embeds `AruconWidget`, applies the development App Group to both iOS targets, and generates the Android provider/receiver/resources.
- `node scripts/check-native-generation.mjs --output evidence/approved-mvp/native-generation.json` parses the Xcode project and verifies target attributes, exact source copies, receiver metadata, last-confirmed timestamp, no automatic cadence, `open_app` only, and absence of health declarations.
- Apple and Android autolinking resolve both `arucon-health` and `arucon-widget`.
- Current host evidence: Swift and Java are present; full Xcode/simulator SDK/CocoaPods and Android SDK/adb/emulator are absent. The iOS compile attempt reached `xcodebuild` and stopped because only Command Line Tools are selected. The Android attempt stopped before compilation because the sandbox denied creation of the Gradle distribution lock; the separate inventory also confirms the Android SDK is absent. Module invocation, widget install/render, simulator/emulator, and physical device remain `BLOCKED_ENV / NOT_RUN`.

Official security references checked 2026-09-19:

- GitHub advisory GHSA-w5hq-g745-h8pq: https://github.com/advisories/GHSA-w5hq-g745-h8pq
- uuid 11.1.1 release: https://github.com/uuidjs/uuid/releases/tag/v11.1.1

Official widget references checked 2026-09-19:

- Apple WidgetKit update strategy: https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
- Android basic app widgets: https://developer.android.com/develop/ui/views/appwidgets
- Android `AppWidgetProviderInfo`: https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo

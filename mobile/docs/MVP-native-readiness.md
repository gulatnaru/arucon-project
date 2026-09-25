# MVP native readiness scaffold

## 2026-09-26 current validation appendix

SDK55.0.31 / iOS 26.3 Simulator Release validation passed within host-lock and motion limits. Focused fresh tests are 82/82 and final scene checks are 25/25, with lint/typecheck, CNG 27/27, and workflow 38/38 passing. Final Release compile/install/launch passed with Metro stopped; the embedded `main.jsbundle` is 3.4 MB. Final CPU sample is 46.4%; benchmark/FPS and 3Hz motion texture remain unapproved. Android, physical devices, and unknown renderers are unchanged.

The SDK55 Release path now copies the iOS bundled asset into cache before `File.bytes`, reuses valid hash/size, and cleans invalid hash state. Cache and source SHA-256 both equal `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`; relaunch metadata is stable. Android keeps its original path.

Windows Android engineering is complete in its own historical scope. Android 17/17, debug/release, FontScale, and widget runtime evidence are preserved as Windows evidence and are not counted as this iOS run. Health remains OFF: no real HealthKit/Health Connect read, account, payment, signing account, or physical-device gate is enabled. The current final input recheck is blocked by automatic host lock (`BLOCKED_HOST_LOCKED`); this replaces the older historical “Android SDK absent” and interactive permission wait wording.

## Historical scaffold scope (2026-09-19/20)

The following scaffold and host-result statements describe the earlier preparation stage. Their `NOT_RUN`/`BLOCKED_ENV` wording is historical; use the current appendix and run report for today's results. The Health OFF and read-only widget boundaries remain current requirements.

This checkpoint adds local contracts, build-discoverable Expo Modules, and generated development widget targets for future HealthKit, Health Connect, and home-widget integration. All health reads are OFF. No health entitlement, health manifest permission, health SDK client, real health record, signed App Group, installed widget, or OS-verified widget execution is active.

The independent local scaffold is complete within its source/static scope. It does not satisfy the SRS 14-1 physical-device gate.

## Historical host result (2026-09-20 KST, SDK55 migration)

Expo SDK 55.0.31, React Native 0.83.10, React 19.2.0, Xcode 26.3, Swift 6.2.4, CocoaPods 1.17.0, and an iPhone 16e iOS 26.3 Simulator are available. Android SDK/adb/emulator are absent. SDK55 prebuild generated the same widget target and the native iOS app compiled and installed successfully; separate `simctl launch` returned a process PID. The final Expo CLI GUI activation step exited 1 because System Events permission is unavailable, recorded as `BLOCKED_ENV_AUTOMATION_PERMISSION`. CUA accessibility/screen recording permission is pending, so GLB rendering, touch/motion, and WidgetKit OS rendering are `NOT_EVALUATED`; physical device remains `NOT_RUN`. Evidence is in `evidence/sdk55-migration/`. The prior SDK57 failure remains historical.

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
- The plugin's DEV-only generation plan is enabled in `app.json`. It creates the Xcode extension target, copies Android/iOS sources and resources, registers the receiver, and declares the EAS extension metadata. SDK55 iOS compilation and installation with the host app pass. Actual portal signing is an external gate; WidgetKit OS rendering remains `NOT_EVALUATED`, and Android native compilation remains `BLOCKED_ENV`.
- `native/arucon-widget` is an autolinked app-side bridge. It validates and stores only the six-field JSON projection and requests an OS reload. The approved local App composition enables this read-only snapshot path and reports missing modules/errors explicitly; actual OS rendering remains unverified.

## Local contract verification

The native contract tests cover default-OFF behavior, unsupported service, permission not requested, denial and revocation, HealthKit unknown authorization, delayed read, adapter recreation after restart, missing scorer decision, minimum read-only declarations, projection allowlisting, resource-neutral read/reload, native failure display behavior, local-module absence/malformed contracts, zero native calls while OFF, config declaration removal, the exact read-only opt-in declaration set, and widget template/generation-plan source contracts.

Expo autolinking `search` and `resolve` both find `arucon-health` for Apple and Android, including the podspec/Swift module and Gradle/Kotlin module. Apple modules-provider generation with `--packages arucon-health` emits the `AruconHealth` import and `AruconHealthModule.self` registration. This verifies build-graph discovery and provider generation only. The SDK55 iOS Swift modules now compile successfully. Kotlin compilation remains `BLOCKED_ENV`; actual native invocation remains `NOT_RUN`.

After clean prebuild, run `node scripts/check-native-generation.mjs --output evidence/sdk55-migration/native-generation-final.json`. It checks health declarations remain OFF, widget targets are generated, plugin markers are present, Health SDK imports and permission-request APIs are absent, and native runtime fields remain explicitly `NOT_RUN`.

## Remaining device gate

Tracked widget targets and build generation are ready. SDK55 iOS compilation, installation and process start pass on the current host. Interactive iOS runtime validation awaits UI permission or manual testing; Android native validation still needs its SDK. The required follow-up is:

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
- SDK55 dependency alignment was completed with `npx expo install --fix`; `npx expo-doctor` reports 20/20 checks passing. The clean CNG regeneration and final native generation check are recorded in `evidence/sdk55-migration/`.
- The bundled GLB uses the Android-safe `arucon_tsundere_motion.glb` basename. Its SHA-256 remains `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`, byte-identical to the approved reference. Both platform exports preserve the source hash. The direct-copy warning from the asset plugin is handled by Metro static require and `Asset`/`File.bytes`; no product asset was removed.
- Android's generated source manifest represents both external-storage blocks as `tools:node="remove"`. These are removal directives, not granted runtime permissions. A merged release manifest still requires review on a build-capable Android host.

## Approved MVP native generation

- `widgetTargetsEnabled` is true only for tracked development target generation; `healthDeclarationsEnabled` remains false.
- Offline clean prebuild generates and embeds `AruconWidget`, applies the development App Group to both iOS targets, and generates the Android provider/receiver/resources.
- `node scripts/check-native-generation.mjs --output evidence/sdk55-migration/native-generation-final.json` parses the Xcode project and verifies target attributes, exact source copies, receiver metadata, last-confirmed timestamp, no automatic cadence, `open_app` only, and absence of health declarations.
- Apple and Android autolinking resolve both `arucon-health` and `arucon-widget`.
- Historical host evidence above remains preserved. The SDK55 iOS build compiled and installed the app and widget target, and a simulator process was launched. Module invocation, actual GLB/touch/motion, WidgetKit OS rendering, and physical device remain `NOT_EVALUATED / NOT_RUN`; Android SDK/adb/emulator remain `BLOCKED_ENV`.

Official security references checked 2026-09-19:

- GitHub advisory GHSA-w5hq-g745-h8pq: https://github.com/advisories/GHSA-w5hq-g745-h8pq
- uuid 11.1.1 release: https://github.com/uuidjs/uuid/releases/tag/v11.1.1

Official widget references checked 2026-09-19:

- Apple WidgetKit update strategy: https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
- Android basic app widgets: https://developer.android.com/develop/ui/views/appwidgets
- Android `AppWidgetProviderInfo`: https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo

# ADR-002: local Expo native integration boundary

- Status: Accepted for reversible engineering scaffolding
- Date: 2026-09-19
- Scope: development build integration only
- Product decisions changed: none

## Context

The TypeScript health and widget contracts already fail closed, but declarations alone do not prove that a native implementation can enter the Expo build graph. Generated `ios/` and `android/` directories are ignored and recreated by Continuous Native Generation, so editing them directly would not produce a durable implementation. The current host also lacks full Xcode, CocoaPods, the Android SDK, emulators, and physical devices.

The integration must preserve these boundaries:

- real HealthKit and Health Connect reads and permission prompts remain OFF;
- health write, background, history, microphone, motion, and location access are absent;
- the app must still run when the optional native module is unavailable;
- widget development identifiers and read-only container contracts may be selected locally, while signing/provisioning and release refresh policy remain inactive;
- generated native projects remain build artifacts rather than tracked source.

## Options considered

### External React Native health wrapper

This can shorten API implementation, but adds another native dependency and version/permission audit surface before the supported OS and SDK scope in DEC-01/12/31 is settled. Rejected for this checkpoint.

### Direct edits to generated native projects

This is quick for a one-off experiment, but `expo prebuild --clean` deletes the edits. Rejected because the result is not reproducible from tracked source.

### Local Expo Module plus local config plugin

The module is tracked under `mobile/native/`, discovered through Expo autolinking, and owns the future native API boundary. The plugin is tracked under `mobile/plugins/` and owns reproducible entitlement, usage-description, and manifest changes. Selected because it is local, reversible, visible to clean prebuild, and does not require choosing a third-party health SDK now.

## Decision

Use a local Expo Module named `AruconHealth` and a local CNG config plugin.

The current Swift and Kotlin module is tracked build source for a boundary scaffold, not a compiled health implementation. It reports contract version 1 with `readMode: disabled`, never imports HealthKit or Health Connect, exposes no permission-request function, and performs no record query. The TypeScript `ExpoNativeHealthBridge` also defaults OFF and returns fail-closed results. Future direct HealthKit and AndroidX Health Connect implementations must replace the disabled native contract only after the related product, consent, SDK, and supported-device decisions are approved.

The config plugin is registered in `app.json` with both `healthDeclarationsEnabled` and `widgetTargetsEnabled` false. In this state it removes Health declarations and emits only a resource-neutral contract-version marker so prebuild execution is observable. Its tested opt-in health mode can generate only:

- iOS HealthKit entitlement and a required reviewed `NSHealthShareUsageDescription`;
- Android `READ_STEPS`, `READ_SLEEP`, and the Health Connect package visibility query.

It does not generate writes, background/history reads, activity recognition, audio, or location access. The opt-in mode is not active in the application.

The widget app-side TypeScript bridge and projection allowlist remain usable and default OFF. Development-only identifiers are fixed at `group.com.arucon.dev.widget`, `com.arucon.dev.widget`, and `com.arucon.widget.AruconWidgetProvider`. Tracked WidgetKit and Android AppWidget templates implement strict six-field snapshot decoding, the existing four pet display states, the five preview/view states, a read-only shared-container boundary, and `open_app` as the only action. They schedule no cadence (`Timeline.Policy.never` and `updatePeriodMillis=0`) and perform no network, reward, or game command.

The plugin exposes a pure generation plan for those identifiers and files, but still rejects `widgetTargetsEnabled: true`. It does not claim to create an Xcode extension target, copy Android sources/resources, register an AppWidget receiver, or provision an App Group. Actual target activation, App Group registration/signing, native compilation, install, and OS rendering remain `BLOCKED_ENV / NOT_RUN`.

## Verification evidence

Executed on 2026-09-19:

- native contract and plugin tests validate zero native calls by default, malformed/missing module failure, no prompt/read path, declaration removal, read-only opt-in output, the DEV-only widget generation plan, and widget-target fail-closed behavior;
- widget template contract tests validate the exact six projection fields, four pet display states, five view statuses, strict extra-field rejection seams, resource-neutral reads, no cadence, and `open_app` only. `swiftc -parse` accepts the Swift template and `xmllint --noout` accepts both Android resource templates; these are syntax checks, not native compilation;
- Expo autolinking `search` and `resolve` discover `arucon-health`, its iOS podspec and `AruconHealthModule`, and its Android project and `com.arucon.health.AruconHealthModule`. An Apple modules-provider generation with `--packages arucon-health` emits the expected `internal import AruconHealth` and `AruconHealthModule.self` entry;
- offline clean prebuild completes and produces the iOS and Android contract-version markers;
- generated files contain no HealthKit usage key/entitlement or Health Connect read permission while the feature is OFF;
- TypeScript and ESLint complete successfully with no reported errors or warnings.

Swift/Kotlin compilation, app launch, native module invocation, health access, permission denial/revocation on an OS, and widget installation are `BLOCKED_ENV / NOT_RUN`. Full Xcode/CocoaPods, Android SDK/ADB, simulator/emulator, and physical devices are unavailable on this host.

## Consequences and rollback

This creates a durable native seam without enabling health access. A future implementation can add official platform API code behind the same contract and feature gates, while raw records remain outside the TypeScript boundary.

Rollback is limited to removing the app plugin entry, the `expo.autolinking.nativeModulesDir` setting, and the tracked local module/plugin/bridge files, followed by clean prebuild. No database or user-data migration is involved.

## Official sources

- Expo local modules: https://docs.expo.dev/modules/get-started/
- Expo module configuration and autolinking: https://docs.expo.dev/modules/module-config/
- Expo config plugins and CNG: https://docs.expo.dev/config-plugins/introduction/
- Apple HealthKit setup: https://developer.apple.com/documentation/healthkit/setting-up-healthkit
- Apple HealthKit authorization: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Android Health Connect setup: https://developer.android.com/health-and-fitness/health-connect/get-started
- Android Health Connect data types and permissions: https://developer.android.com/health-and-fitness/health-connect/data-types
- Android Health Connect reads and aggregation: https://developer.android.com/health-and-fitness/health-connect/read-data
- Apple WidgetKit timeline strategy: https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
- Android basic app widgets: https://developer.android.com/develop/ui/views/appwidgets
- Android `AppWidgetProviderInfo` update behavior: https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo

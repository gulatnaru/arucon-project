# ADR-007: generated native targets and build readiness

- Status: Accepted for local development generation
- Date: 2026-09-19
- Scope: native target generation with live health access OFF
- Product decisions changed: none

## Context

ADR-002 selected a local Expo Module and config-plugin boundary, but the first checkpoint stopped at templates and build-graph discovery. The approved MVP direction now fixes the widget as a read-only, last-known snapshot surface. It shows the stored `updatedAtMs`, does not imply OS-real-time state, and exposes only `open_app`. Technical target identifiers may be selected locally; Apple App Group registration/signing and store credentials remain external operations.

The host was re-inventoried before implementation. Command Line Tools, Swift 6.1.2, and Java/Javac 21 are present. Full Xcode, the iPhone simulator SDK, `simctl`, CocoaPods, Android SDK/platform/build-tools, `adb`, and Android emulator tooling are absent. No installer, administrator action, account login, or external project was used.

## Decision

Generate development widget targets from tracked source through `withAruconNativeIntegration`:

- iOS: copy the WidgetKit source, Info plist, and entitlements; create and embed an `AruconWidget` app-extension target; link WidgetKit and SwiftUI; apply `group.com.arucon.dev.widget` to both app and extension; use bundle identifier `com.arucon.dev.widget`.
- Android: copy `AruconWidgetProvider`, layout, and provider metadata; register the exported `APPWIDGET_UPDATE` receiver `com.arucon.widget.AruconWidgetProvider`.
- App-side bridge: autolink `AruconWidgetBridge` on both platforms. It validates and writes only the six-field JSON projection and requests an OS timeline/widget update. The approved local application composition explicitly enables this read-only path and reports unsupported/error when the optional module is absent.
- Health: keep `healthDeclarationsEnabled: false`; generate no HealthKit/Health Connect permission, prompt, client, or record query.

The iOS and Android renderers distinguish missing and malformed snapshots, render a stored last-confirmed timestamp, use no automatic cadence (`.never` and `updatePeriodMillis=0`), and perform no network or game command. Generated `ios/` and `android/` remain ignored CNG artifacts.

The app config declares the experimental EAS extension metadata recommended by Expo. This is build metadata only. Credentials, App Group portal registration, signing, EAS project creation, and deployment were not performed.

## Verification

The current clean offline prebuild completed and the generated result passed these local checks:

- the Xcode project parses through the local `xcode` library and contains the extension target, sources phase, framework links, embed phase, bundle identifier, entitlements, and App Group capabilities for both targets;
- Android manifest, Kotlin provider, layout, and provider metadata are generated and well-formed;
- generated sources are byte-identical to tracked templates;
- both local Expo modules resolve for Apple and Android autolinking;
- health declarations and permission-request APIs remain absent;
- Swift source parse, XML parse, TypeScript contract tests, and ESLint pass.

Canonical evidence is under `mobile/evidence/approved-mvp/`, including `native-environment.json`, `native-widget-prebuild.log`, `native-generation.json`, and autolinking output.

Native compilation and execution are not PASS. `xcodebuild` cannot run with Command Line Tools as the active developer directory and no simulator SDK. The Android Gradle attempt stopped before compilation because the sandbox denied its distribution lock; the independent inventory also shows that the Android SDK is absent. Simulator/emulator launch, native module invocation, widget installation, and physical-device validation are `BLOCKED_ENV / NOT_RUN`.

## Rollback

Set `widgetTargetsEnabled` false, remove the extension declaration from app config, and rerun clean prebuild. The plugin removes its development App Group and Android receiver when disabled. No database or user-data migration is involved.

## Official sources

- Expo iOS app extensions: https://docs.expo.dev/build-reference/app-extensions/
- Expo native module/config-plugin tutorial: https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial/
- Expo config-plugin mods: https://docs.expo.dev/config-plugins/mods/
- Apple WidgetKit extension creation: https://developer.apple.com/documentation/WidgetKit/Creating-a-Widget-Extension
- Apple WidgetKit foundations and shared App Group data: https://developer.apple.com/videos/play/wwdc2026/277/
- Android basic app widgets: https://developer.android.com/develop/ui/views/appwidgets
- Android `AppWidgetProvider`: https://developer.android.com/reference/android/appwidget/AppWidgetProvider

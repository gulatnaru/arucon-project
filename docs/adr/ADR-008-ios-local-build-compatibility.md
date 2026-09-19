# ADR-008: iOS generated source paths and local ExpoModulesJSI compatibility

> **Partial supersession (2026-09-20):** [ADR-009](ADR-009-expo-sdk-55-compatibility.md)
> supersedes this ADR's Expo SDK 57 / ExpoModulesJSI lifecycle-patch decision. The widget
> source-path decision and its CNG verification remain active. The historical failure and
> investigation below are retained as build evidence.

- Status: Accepted for local development
- Date: 2026-09-20
- Scope: Expo CNG iOS project generation and reproducible local dependency compatibility
- Product decisions changed: none

## Context

The first real Xcode 26.3 simulator build exposed two independent failures after the iOS widget target had been generated.

First, the Xcode project placed `AruconWidget/AruconWidget.swift` inside a `PBXGroup` whose own path was already `AruconWidget`. Xcode resolves a `<group>` file reference relative to all parent group paths, so it searched for `AruconWidget/AruconWidget/AruconWidget.swift`. A text check for the source name and target could pass while the resolved path did not exist. The plugin also returned immediately when the target already existed, so a normal non-clean prebuild could not repair the project.

After that path was repaired, compilation reached `expo-modules-jsi@57.1.0` and stopped in `RuntimeScheduler.h`. Its two constructors use `SWIFT_RETURNS_RETAINED`, although that attribute is documented for functions and methods returning a `SWIFT_SHARED_REFERENCE` type. Xcode 26.3 with Swift 6.2.4 rejects both constructor annotations. Expo issue [#49214](https://github.com/expo/expo/issues/49214) records the same failure and correction; later SDK 57 reports, including [#50067](https://github.com/expo/expo/issues/50067), show that `57.1.0` remains affected. The package keeps the valid `SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler)` ownership declaration on the class.

With that exact constructor correction applied, the same active toolchain advances into `JavaScriptRuntime.swift` and reports seven Swift concurrency errors: `resultPtr`, `thisPtr`, and `argumentsPtr` are diagnosed as risking data races when captured by `JavaScriptActor`-isolated closures. The package manifest requires Swift tools 6.2, Swift language mode 6, `NonisolatedNonsendingByDefault`, and `InferIsolatedConformances`; the affected source already contains the package authors' scoped `nonisolated(unsafe)` bindings and synchronous-actor rationale. The nested SwiftPM build therefore exercises the package's own concurrency model rather than the app target's Swift setting.

Expo's official [SDK version support table](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions) requires **Xcode 26.4 or newer** for SDK 57. The active Xcode 26.3 build `17C529` with Swift 6.2.4 is below that supported floor. Disabling concurrency checks, adding more unchecked annotations, or lowering the language mode would change the dependency's safety contract and is outside this decision.

## Alternatives

| Alternative | Effect | Decision |
|---|---|---|
| Edit generated `ios/` files or `node_modules` manually | Can unblock one checkout, but is lost on prebuild or install and cannot be reproduced in CI | Rejected |
| Require clean prebuild for the widget path | Recreates the same source-level PBX path error and discards useful generated state | Rejected |
| Upgrade Expo SDK or React Native broadly | No verified SDK 57 package fix is available in the current lock; a framework upgrade expands the compatibility and regression surface | Deferred until an official compatible release is verified |
| Downgrade `expo-modules-core` and `expo-modules-jsi` | Violates the current dependency relationship and can remove later fixes or introduce binary symbol mismatches | Rejected |
| Suppress warnings or lower the project Swift version | The compiler diagnostic is a hard C++ interop error, and `expo-modules-jsi` itself declares Swift tools 6.2 | Rejected |
| Use Xcode 26.4 or newer | Matches the documented SDK 57 toolchain floor without weakening library checks | **Required for the next native build attempt; selecting an already-installed copy is allowed, installing one is HS-08** |
| Repair PBX references in CNG and apply an exact guarded dependency patch during install | Keeps generated projects repeatable and limits the compatibility correction to the known package and source | **Selected** |

## Decision

### Widget source path

`withAruconNativeIntegration` owns the widget target source reference. The `AruconWidget` group carries path `AruconWidget`; its Swift child therefore carries only `AruconWidget.swift` with `sourceTree = "<group>"`. The target's Sources build phase must point to that same file reference. The plugin resolves the file reference through its parent groups and repairs this representation when the target already exists, so repeated `expo prebuild --no-install` runs are idempotent and do not require `--clean`.

Static native generation verification resolves the PBX file reference through its group ancestry and compares the result with the generated `ios/AruconWidget/AruconWidget.swift` path. Target-name or project-text presence alone is insufficient.

### ExpoModulesJSI compatibility

The root package `postinstall` lifecycle runs `scripts/patch-expo-modules-jsi.mjs`. The script:

- accepts only `expo-modules-jsi@57.1.0`;
- accepts only the exact known pair of invalid constructor annotations and the expected shared retain/release declaration;
- removes `SWIFT_RETURNS_RETAINED` from those two constructors only;
- preserves `SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler)`;
- is idempotent and fails closed for another version or unexpected header content.

This correction follows the package's constructor behavior before `57.0.5` and the fix documented in Expo issue #49214. It does not select behavior by guessed Clang version. The direct proof covers Xcode 26.3 / Swift 6.2.4; other compiler combinations remain unverified.

Remove the lifecycle patch when an SDK 57-compatible `expo-modules-jsi` release is verified to omit the invalid constructor annotations. Removal requires updating the lockfile, running a clean dependency install without the patch, repeating the focused C++ interop proof, and completing the native build checks below.

### Toolchain boundary

Do not patch the seven `JavaScriptRuntime.swift` concurrency diagnostics or turn off Swift concurrency checking. Retry with an already-installed Xcode 26.4-or-newer toolchain if one exists. If the host has no supported Xcode, native compilation is `BLOCKED_ENV / HS-08`: installing or changing the system-selected developer toolchain requires the system-install boundary. A supported compiler retry must still record its exact `xcodebuild -version`, `swiftc --version`, command, exit code, and first real error; the documented minimum does not itself prove that the build passes.

## Verification boundary

The focused tests cover fresh widget target generation, existing-project repair, repeated generation, real PBX group-relative resolution, dependency patch exactness, shared ownership preservation, idempotency, version rejection, and changed-source rejection. A direct Swift C++ interop typecheck reproduces the two errors against the original header and exits successfully against the corrected header.

These source checks do not establish native compilation, simulator installation, widget rendering, signing, archive, physical-device behavior, or App Group portal configuration. Those states must be reported separately. The Xcode 26.3 retry is recorded in [`xcodebuild-compatibility.log`](../../mobile/evidence/ios-widget-path-fix/xcodebuild-compatibility.log): it proves that compilation passed the corrected constructor and then failed with seven separate Swift concurrency diagnostics. Therefore full native compilation and installation remain **NOT PASS / BLOCKED_ENV** pending a supported Xcode 26.4-or-newer retry. No widget runtime claim follows from the source checks.

## Rollback

For the PBX correction, disable widget target generation or revert the config-plugin change and regenerate the project; no user data changes. For the dependency correction, remove the `postinstall` entry and patch script only after installing a verified fixed package. Do not leave a silently unpatched `57.1.0` lock under the affected toolchain.

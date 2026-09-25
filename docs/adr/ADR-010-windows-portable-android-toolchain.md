# ADR-010: Windows portable Android toolchain

- Status: Accepted for local development
- Date: 2026-09-25
- Scope: project-local Android compilation and AVD validation
- Product decisions changed: none

## Context

The Android SDK/emulator absence recorded in the 2026-09-20 macOS run was true for that host. It is not a permanent repository state. Windows 10 Home 19045 now runs project-local Temurin 17, Android SDK/build-tools 36, NDK 27.1, Gradle 9, and Emulator 37.1.11; no administrator install or system PATH change was made.

## Decision

Use the project-local toolchain to compile Android debug builds and run synthetic AVD evidence. Tooling choices do not establish release support. Keep Windows Android observations distinct from the macOS iOS history and from unobserved iOS runtime behavior.

## Evidence boundary

`:app:assembleDebug --max-workers=2 -PreactNativeArchitectures=x86_64` passed in 13m58s (366 tasks); the APK is 63,158,450 bytes with SHA-256 `C19315CE8C1E77027368E440A8BB8476EEF2B615B066881A373F36FB54143A19`. Inspection found package `com.arucon.dev`, minSdk24/targetSdk36, widget resources, no Health permissions, and a verified debug v2 signature. The 245/245 suite, native 8/8, and Android checker 15/15 are pre-UI/perf-change baseline evidence only.

The AVD can establish only observed synthetic flows. It cannot establish real Health Connect behavior, accounts, payment, store, signing, release support, or iOS behavior.

## Reversal

The local toolchain can be removed without schema or product-data migration. That returns Android native validation to `BLOCKED_ENV`.

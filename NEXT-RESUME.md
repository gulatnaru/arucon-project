# Next resume — Windows completion and macOS follow-up

2026-09-25 · `feature/arucon-mobile-autonomous`

Read `AGENTS.md`, the status/report, ADR-010/011, the gap matrix, and the decision queue first. The Windows record is current. Historical macOS/iOS results are retained only as `historicalMac*` status fields and report history; they are not current-host instructions.

Scoped Windows engineering is complete. Current source checks are `npm test` 254/254 (0 skipped), lint/typecheck PASS, targeted checker/plugin/templates/renderer 17/17 PASS, CNG Android16/16 PASS, and debug/release x86_64 builds PASS. Font130 activity recreation and widget footer/tap/rest are PASS in observed Android release/runtime scope. The balanced-renderer A/B is PARTIAL/NOT_PASS: it is host-software evidence, not GL FPS, causal proof, or physical acceptance. The ignored evidence archive is complete at `mobile/evidence/windows-android-runtime/` (123 files plus manifest) and workflow passes 38/38. Health remains OFF and no real health data, account, payment, store, administrator, or release action is authorized.

On a macOS host, first use the repository lock and run `cd mobile && npm ci`. Regenerate both native projects with `npx expo prebuild --platform all --no-install --skip-dependency-update react,react-native`. Then run `cd ios && pod install --no-repo-update && cd ..` with the already installed project-compatible CocoaPods; do not upgrade the system. Run `node scripts/check-native-generation.mjs --platform all` only after both Android and iOS generated paths exist. Build with `xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<booted-simulator-UDID>' CODE_SIGNING_ALLOWED=NO build`. Only after that succeeds, install/launch on that selected simulator and record actual app and WidgetKit surface observations. Keep Health OFF throughout. Do not infer iOS runtime/WidgetKit PASS from Windows Android results.

Physical-device performance, final supported-OS declaration, real Health permissions/data, account/cloud/signing, payment/store, legal policies, and public release remain separate external gates. Feature-branch commit and normal push are authorized; before performing them, record the exact staged files, local/tracking/origin hashes, and clean status. Main/merge/force/history rewrite/tag/release/deployment remain out of scope.

The release renderer uses MSAA 0/no AA, DPR1.65, and Lambert shading. It preserves GLB/features and visible room shading on the observed release path. Its A/B cannot claim a physical-device performance gain because median/legacy/high-input results regress despite some aggregate and percentile improvements.

## Publication follow-up

Local implementation `5493d08` and report `c2ac5fb` are committed. Push was attempted and failed because this Windows Git installation has no usable GitHub authentication; origin remained `3310d38`. Read `mobile/evidence/windows-android-runtime/git-audit.json` for the exact final local metadata checkpoint and clean status. After existing-account authentication, fetch the feature branch, inspect divergence, and perform the already-authorized normal push. Do not request renewed technical approval or use force/main/tag/release.

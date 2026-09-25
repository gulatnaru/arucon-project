# Next resume — fresh macOS iOS validation

2026-09-26 · `feature/arucon-mobile-autonomous` · baseline `5da0048`

Read `AGENTS.md`, the status/report, the gap matrix, and the decision queue first. The fresh macOS iOS record is current. Prior Windows Android and old macOS host-lock records remain historical facts.

Fresh iOS Release validation passed within host-lock and motion limits: focused command 82/82, lint/typecheck PASS, separate final scene 25/25 PASS, CNG checker 27/27 PASS, workflow 38/38, and Release compile/install/launch PASS with Metro OFF. `main.jsbundle` is 3.4 MB; final GLB/cache/storage evidence passes. Final CPU sample is 46.4%; benchmark/FPS and 3Hz motion texture remain unapproved. Earlier 77/77 and 20/20 values are intermediate evidence. Mac lock blocks final Release input and normal/reduced rechecks.

On a macOS host, first use the repository lock and run `cd mobile && npm ci`. Regenerate both native projects with `npx expo prebuild --platform all --no-install --skip-dependency-update react,react-native`. Then run `cd ios && pod install --no-repo-update && cd ..` with the already installed project-compatible CocoaPods; do not upgrade the system. Run `node scripts/check-native-generation.mjs --platform all` only after both Android and iOS generated paths exist. Compile-only may use `CODE_SIGNING_ALLOWED=NO`; Simulator runtime and WidgetKit validation must use `xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<booted-simulator-UDID>' CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- build`, then install/launch and record actual observations. Keep Health OFF throughout. Do not infer iOS runtime/WidgetKit PASS from Windows Android results.

For a dev-client runtime session, use `NODE_OPTIONS=--dns-result-order=ipv4first EXPO_OFFLINE=1 ./node_modules/.bin/expo start --dev-client --localhost --port 8081`. Release validation uses the embedded bundle without Metro. The SDK55 iOS GLB path must cache-copy the bundled asset before `File.bytes`, reuse valid hash/size, and clean invalid hash state; Android retains its original path.

Physical-device performance, final supported-OS declaration, real Health permissions/data, account/cloud/signing, payment/store, legal policies, and public release remain separate external gates. Feature-branch commit and normal push are authorized; before performing them, record the exact staged files, local/tracking/origin hashes, and clean status. Main/merge/force/history rewrite/tag/release/deployment remain out of scope.

The Release path preserves GLB/features and visible room shading with the iOS cache copy and software fallback. Continue from the installed Release app with Metro OFF after Mac unlock; start the IPv4 Metro command only when Debug validation is needed.

## Publication follow-up

Source/native and scoped runtime reviews passed. This file is prepared before its own publication checkpoint; read the current HEAD and `mobile/evidence/ios-5da0048/git-audit.json` for the final local/tracking/live-origin hashes. Baseline `5da0048` and the historical Windows authentication failure are not the final publication result. Normal feature push is authorized; main/merge/force/tag/release/deploy remain out of scope.

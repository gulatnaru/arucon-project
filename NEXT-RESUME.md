# Next resume — fresh macOS iOS validation

## Current physical run — 2026-09-26 / baseline `b6aee5b`

Physical validation is `BLOCKED_ENV`. `devicectl` succeeded with no connected iOS devices; `xctrace` saw only the Mac and Simulators; USB iPhone, signing identity, and provisioning profiles were unavailable. iOS CNG `23/23` passed and unsigned iphoneos Release compile exited 0, but install/physical execution is not PASS. Android physical count is **UNKNOWN** because adb/SDK are absent and wireless discovery was not verified. All physical runtime/motion/input-to-photon/FPS/thermal/battery checks are **NOT_RUN**. Evidence: `mobile/evidence/physical-b6aee5b/readiness.json`, `ios-generation.json`, `iphoneos-unsigned-build.log`. Readiness tooling and the measurement runbook are now present; consult the current report for final source checks. Health OFF; DEC31 remains OPEN.

Resume prompt: Read AGENTS/status/report and `mobile/docs/PHYSICAL-VALIDATION.md`. Run `cd mobile && node scripts/check-physical-readiness.mjs` on the prepared host. Use an unlocked/trusted USB iPhone with Developer Mode and existing host/widget App Group signing, or an authorized USB Android on the already prepared Windows SDK/adb host. Start with the available physical platform; do not repeat completed Simulator/emulator observations. Verify install/cold start, GLB, real touch/retarget/petting, synthetic sleep/meal, SQLite restore, lifecycle, reduced motion, widget, safe area, sustained frame/touch/thermal/battery evidence. Keep Health OFF; never convert inventory/build-only success into physical PASS. Preserve the approved asset and motion while diagnosing measured technical bottlenecks. Feature checkpoint commit/push is authorized; main/merge/deploy remain forbidden.

## Historical Simulator resume result — 2026-09-26 / c0719ea

Mac unlock 후 Metro 8081 없이 설치된 Release를 재개했다. `fixed-bundle-sha256.txt` 기준 installed `main.jsbundle`와 DerivedData SHA가 일치했다. Release 상세/바닥 이동·연속 retarget/AX 펫 touch, 휴식 pose, feed 거절→wake→feed 성공, reduced motion ON 이동 유지·도착 후 idle 정지·OFF 복원을 실제 확인했다. Evidence: `mobile/evidence/ios-release-c0719ea/` (`01-release-input.mp4`~`13-widget-returned-room.png`). `restart-comparison.json`의 food0/coin15/EXP25125000/multiplier1.175/sleepingfalse/meals3/registry1/integrityok와 widget before/after diff0도 확인했다.

UI 거절 notice 잔존은 `App.tsx` busy guard 통과 후 `setNotice('')` 한 줄로 수정했고 대상 lint/typecheck와 Release 재빌드(`BUILD SUCCEEDED`)를 통과했다. 08 거절→09 wake/feed 성공에서 낡은 notice가 사라졌다. 현재 host-lock 차단은 없고 Release 기능 관찰 gate는 완료됐다. 과거 82/25/CNG27/workflow38 수치는 이 재개 실행 수치가 아니다. 333ms software-renderer 모션/FPS와 physical-device 검증은 계속 `PARTIAL/NOT_RUN`; product MVP remains `MVP_NOT_COMPLETE`.

2026-09-26 · `feature/arucon-mobile-autonomous` · baseline `5da0048`

Read `AGENTS.md`, the status/report, the gap matrix, and the decision queue first. The fresh macOS iOS record is current. Prior Windows Android and old macOS host-lock records remain historical facts.

Historical pre-unlock snapshot (`5da0048`): Fresh iOS Release validation passed within host-lock and motion limits: focused command 82/82, lint/typecheck PASS, separate final scene 25/25 PASS, CNG checker 27/27 PASS, workflow 38/38, and Release compile/install/launch PASS with Metro OFF. `main.jsbundle` is 3.4 MB; final GLB/cache/storage evidence passes. Final CPU sample is 46.4%; benchmark/FPS and 3Hz motion texture remain unapproved. Earlier 77/77 and 20/20 values are intermediate evidence. The lock blocked final Release input and normal/reduced rechecks at that time.

Historical Simulator/native resume procedure (not the current next step): On a macOS host, first use the repository lock and run `cd mobile && npm ci`. Regenerate both native projects with `npx expo prebuild --platform all --no-install --skip-dependency-update react,react-native`. Then run `cd ios && pod install --no-repo-update && cd ..` with the already installed project-compatible CocoaPods; do not upgrade the system. Run `node scripts/check-native-generation.mjs --platform all` only after both Android and iOS generated paths exist. Compile-only may use `CODE_SIGNING_ALLOWED=NO`; Simulator runtime and WidgetKit validation must use `xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<booted-simulator-UDID>' CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- build`, then install/launch and record actual observations. Keep Health OFF throughout. Do not infer iOS runtime/WidgetKit PASS from Windows Android results.

For a dev-client runtime session, use `NODE_OPTIONS=--dns-result-order=ipv4first EXPO_OFFLINE=1 ./node_modules/.bin/expo start --dev-client --localhost --port 8081`. Release validation uses the embedded bundle without Metro. The SDK55 iOS GLB path must cache-copy the bundled asset before `File.bytes`, reuse valid hash/size, and clean invalid hash state; Android retains its original path.

Physical-device performance, final supported-OS declaration, real Health permissions/data, account/cloud/signing, payment/store, legal policies, and public release remain separate external gates. Feature-branch commit and normal push are authorized; before performing them, record the exact staged files, local/tracking/origin hashes, and clean status. Main/merge/force/history rewrite/tag/release/deployment remain out of scope.

The Release path preserves GLB/features and visible room shading with the iOS cache copy and software fallback. The installed Release app is available with Metro OFF and host lock resolved; start the IPv4 Metro command only when Debug validation is needed.

## Publication follow-up

Source/native and scoped runtime reviews passed. This file is prepared before its own publication checkpoint; read the current HEAD and `mobile/evidence/ios-release-c0719ea/git-audit.json` for the final local/tracking/live-origin hashes. Baseline `5da0048` and the historical Windows authentication failure are not the final publication result. Normal feature push is authorized; main/merge/force/tag/release/deploy remain out of scope.

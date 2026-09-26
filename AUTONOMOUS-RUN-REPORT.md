# iOS validation history and Release input resume

## 2026-09-26 macOS unlock Release resume appendix — c0719ea

Mac unlock 이후 설치된 Release 앱을 Metro 없이 재개 검증했다. `fixed-bundle-sha256.txt` 기준으로 installed/DerivedData `main.jsbundle` SHA가 일치했고 Metro 8081 listener는 없었다. Release 상세 화면, 바닥 이동과 연속 retarget, Accessibility 펫 touch 응답, 휴식 pose, feed 거절, wake 후 feed 성공, reduced motion ON 이동 유지와 도착 후 idle 정지, OFF 복원을 실제 화면에서 확인했다. 증거는 `mobile/evidence/ios-release-c0719ea/01-release-input.mp4`~`13-widget-returned-room.png`에 있다.

이전 UI 거절 notice가 성공 후 남던 문제는 `App.tsx`의 busy guard 통과 후 `setNotice('')` 한 줄로 수정했다. 대상 lint/typecheck와 Release 재빌드는 PASS이며 `release-notice-build.log`는 `BUILD SUCCEEDED`를 기록한다. 08 거절 후 09 wake/feed 성공 시 낡은 문구가 사라지는 것도 확인했다. Release 재시작 비교는 `restart-comparison.json`에서 food0/coin15/EXP25125000/multiplier1.175/sleepingfalse/meals3/registry1/integrityok가 전부 동일했고, 위젯 before/after diff도 0이었다. `11-widget-return.mp4`/`12-widget-sleep.png`/`13-widget-returned-room.png`에서 위젯 진입 후 Release 방 복귀를 확인했으며, reduced motion OFF와 펫 awake도 복원됐다.

현재 host-lock 차단은 없다. Release 기능 관찰 gate는 완료했으며, 과거 `82/25/CNG27/workflow38` 자동검사는 이번 rerun이 아니다. 이번 small-fix lint/typecheck와 Release build 및 실제 UI 결과만 현재 부록에 반영한다. 333ms software-renderer 모션 부드러움/FPS와 physical-device 수용은 계속 `PARTIAL/NOT_RUN`; 제품 MVP는 `MVP_NOT_COMPLETE`다.

이번 재개에서는 `release_notice_fix`(요청 Sol), `release_resume_review`(요청 Terra High), `release_resume_docs`(요청 Luna)에 위임했다. 실제 backend model ID는 노출되지 않아 모두 `ROUTING_UNVERIFIED`다. 독립 리뷰는 수정 코드와 관찰 범위 및 문서 정합성을 통과시켰다.

2026-09-26 KST · branch `feature/arucon-mobile-autonomous` · root Git normal · Health OFF.

Historical pre-unlock snapshot (`5da0048`): `IOS_RELEASE_VALIDATED_WITH_HOST_LOCK_AND_MOTION_LIMITS`. macOS 15.6 / Xcode 26.3 / iOS 26.3 iPhone 16e. Focused source tests 82/82, separately rerun scene tests 25/25, lint, typecheck, CNG 27/27, and workflow 38/38 passed; these are not counts of Simulator UI tests. Final Release `xcodebuild` exited 0. With Metro stopped and port 8081 without a listener, install/launch and the embedded `main.jsbundle` passed. Existing stale iOS PNG/widget template/PBX artifacts were preserved as history and current Expo CNG artifacts were regenerated; Pods passed.

Observed evidence in `mobile/evidence/ios-5da0048`: source GLB visible, input responsive, CPU samples approximately 26.9–38.5%, and widget home image/time fully visible. Widget tap opened the room and returned; SQL before/after diff was zero. Synthetic economy/storage checks matched before and after restart: food 1, coins 10, EXP 8,812,500, meals 1, registry 1, integrity OK. Reduced motion preserved movement and stopped idle roaming after arrival; normal input/motion was observed. Touch deformation remains PARTIAL because 3Hz visual smoothness was not approved.

The final Release path includes the iOS cache copy and software fallback. `30-release-final-room.png` shows the full GLB room; `31-release-cache-relaunch.png` shows GLB after relaunch. Cache and source SHA-256 both equal `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`, cache metadata is stable, and `release-final-storage.json` records food1/coin10/EXP8812500/meals1/registry1/integrityOK. Final CPU sample is 46.4%; benchmark/FPS approval is not claimed. The earlier software-render stall and the separate bundle-read permission error are retained as resolved failures. At that checkpoint the Mac was locked, so Release input and normal/reduced rechecks were `BLOCKED_HOST_LOCKED`; prior Debug input/meal/sleep/storage/widget/reduced observations remain valid. Independent source, native-build, widget, cache and scoped-runtime reviews passed. This document is prepared before its own feature checkpoint; actual publication hashes and status are recorded in `mobile/evidence/ios-5da0048/git-audit.json` and the final response.

## Delegation for this macOS run

| Agent | Role / requested model | Effective model | Work |
|---|---|---|---|
| `ios_current_cng_audit` | explorer / GPT-5.6 Terra | ROUTING_UNVERIFIED | Stale CNG, GL queue, hit projection and SDK file-read investigation |
| `ios_widget_runtime_audit` | explorer / GPT-5.6 Terra | ROUTING_UNVERIFIED | Installed widget assets and App Group diagnosis |
| `ios_checker_scope_fix` | builder / GPT-5.6 Sol | ROUTING_UNVERIFIED | Checker scope, renderer/layout/input and release asset-read fixes |
| `ios_widget_asset_fix` | builder / GPT-5.6 Sol | ROUTING_UNVERIFIED | Widget image lookup, thumbnail budget and timestamp layout |
| `ios_final_review` | reviewer / GPT-5.6 Terra high | ROUTING_UNVERIFIED | Independent source, native, observed-runtime and documentation review |
| `ios_validation_docs` | documentation worker / GPT-5.6 Luna | ROUTING_UNVERIFIED | Status, gap, decision and resume documentation |

The root coordinated native builds, Simulator observations, integration and publication. No Spark role was invoked. Role configuration does not prove the backend model identifier.

## Historical Windows Android record

## 2026-09-25 Windows Android 실제 실행 부록 (현재)

Source checkpoint: `5493d08` (24 mobile source/test/asset files). Documentation and validation remain a separate pending checkpoint; no final push is claimed here.

Windows 10 Home 19045의 `feature/arucon-mobile-autonomous` HEAD `3310d38`에서 프로젝트 로컬 Temurin 17, Android SDK/build-tools 36, NDK 27.1, Gradle 9 및 Emulator 37.1.11로 실제 Android debug APK를 컴파일하고 AVD `Arucon_API_36`에서 설치·실행했다. 이 부록은 아래 macOS iOS 이력을 대체하지 않는다. 모든 입력은 합성이고 Health는 OFF이며, 실제 계정·결제·스토어·관리자 작업은 수행하지 않았다.

| 관찰/검사 | 상태 | 근거 |
|---|---|---|
| Android x86_64 debug compile | PASS | `android-build.log`: 13m58s, 366 tasks, APK 63,158,450 bytes, SHA-256 `C19315CE8C1E77027368E440A8BB8476EEF2B615B066881A373F36FB54143A19` |
| AVD boot/install/launch 및 합성 onboarding/room | PASS (관찰 범위) | `android-emulator-install.log`, `android-onboarding.png`, `android-room-first.png`, `android-cold-v2.png`, `android-cold-second.png` |
| meal 후 force-stop/relaunch SQLite 복원 | PASS (관찰 범위) | `android-after-meal.sqlite`, `android-after-restore.sqlite`; integrity_check OK, food 0/coin 5/EXP 15,000,000/meals 1/registry 1 일치 |
| reduced motion | PASS (관찰 범위) | `android-reduced-correct.mp4`; `transition_animation_scale=0`로 기록 후 원래 `1.0` 복원. arrival at 5s and same pose at 10/20/28s are reduced-motion evidence. |
| normal touch / floor arrival | PASS (관찰 범위) | `android-touch.mp4` shows normal touch lean/restore; floor arrival was observed in earlier videos. Misnamed `android-reduced-v2.mp4` used the wrong OS setting and is not valid reduced-motion evidence. |
| sleep UI | PASS (관찰 범위) | `android-ui-sleep-feed.xml`; 합성 70분에서 multiplier 1.175, 즉시 EXP 없음, 휴식 중 feed 거절/깨우기 복귀 |
| widget home/footer/tap | PASS (observed Android scope) | `android-widget-footer.png` fully reads `9/25/26 7:53 AM`; tap opens the room (`android-widget-tapped.png`) and activities report topResumed MainActivity. After app rest→HOME, widget shows `쉬는 중` with updated 7:54 AM (`android-balanced-rest.png`, `android-widget-sleep.png`). |
| widget/footer source repair / targeted checks | PASS (source scope) | iOS17 `containerBackground`, target phase PNG, timestamp footer, Android/iOS widget template asset path; static review closed and native checker/plugin/templates/renderer 17/17 PASS. iOS compile/runtime remains NOT_RUN on Windows. |
| Android final debug/release x86_64 compile | PASS | current rebuild exit0, 2m06s, 943 tasks/39 executed. Debug SHA-256 `4290D27DD6A3F82AF9DC563D50666F0E72960A0D1AD29293751F2DDF53129105`, release `A2F318723CD20E3FF005758900ADA49630CEE4CC6F67667976B717D5C25247BD`. Earlier builds/hashes are retained as history. |
| current source suite / final widget runtime QA | PASS / PASS (observed Android scope) | `npm test` 254/254, 0 skipped; lint/typecheck and CNG Android16/16 PASS. Footer/home/tap/rest observations are recorded above. |
| perf improvement | NOT_PROVEN | `android-perf-idle-v2.txt`: projection callback dedupe A/B가 overall FPS를 개선했다는 근거 없음; ViewRoot 약 24/s, jank 약 65%, p50 약 25ms |
| Font 130 activity recreation storage DB | PASS (observed Android scope) | simple busy retry failure history is retained. React Native `fontScale` activity-recreation CNG manifest patch rebuilt successfully; release APK install/retry observed 1→1.3→1→1.3 without errors, same PID 3500, and resized UI XML/PNG (`android-release-font100.xml`, `android-release-font130.xml`, `android-release-font130-repeat.xml`). |

콜드 시작 GL blank 문제는 initial `null`/unknown AppState resume guard 뒤 실제 방이 바로 보이는 것으로 재관찰했다. 상태바 대비, compact default UI, details/fixture modal, 최소 48dp action은 `android-cold-second.png`와 `android-fixtures-v2.png` 범위에서 확인했다. These initial static/partial captures do not establish overall motion/FPS. They do not negate the separately observed final Android widget footer/home/tap/rest PASS. Host GPU mode는 OpenGL Core unsupported로 실패했고 software mode를 복원했다. 재시작 뒤 software emulator의 app/SystemUI transient ANR dialogs와 4-core warmed app visibility는 smoothness PASS 근거가 아니다.

Release APK 설치 후 `adb reverse --list`는 empty였고, cold MainActivity launch에서 bundled GLB room이 보였다 (`android-release-first.png`). Widget footer/tap/rest observation is PASS on the Android AVD, and balanced-renderer warm room render is PASS in the observed Android AVD scope. Runtime A/B is separately PARTIAL/NOT_PASS; it is not GL FPS or physical acceptance. Feature commit/push is authorized; the final audit must record the resulting local/tracking/origin hashes and clean status.

Release balanced renderer is source-validated and warm-render PASS on this Android AVD. Release uses MSAA 0/no AA, DPR 1.65, and Lambert shading; these settings were previously dev-only. The tradeoff keeps GLB/features while making room shading visible on the tested release path. It is a bounded release rendering choice, not a physical-device performance claim.

The current release APK installs with `adb install -r`, has no adb reverse dependency, and native MainActivity launch succeeds. The first post-boot capture (`android-balanced-first.png`) showed a SystemUI—not Arucon—"isn't responding" dialog. After waiting, the GLB room rendered (`android-balanced-warm.png`). Preserve this host-instability limitation: the renderer change does not claim to fix host ANRs or establish physical acceptance.

Runtime A/B is **PARTIAL / NOT_PASS**. Aggregate frame samples changed from baseline 772/42.434s (18.19/s) to balanced 1241/47.189s (26.30/s); modern jank 64.38%→42.79%, p90 53→44ms, p95 65→53ms, and p99 101→69ms. Median regressed 19→32ms, legacy jank 47.8%→87.83%, and high-input jank 84→746. This is host-software evidence only, not GL FPS, not causal proof, and not a physical-device acceptance result.

Scoped Windows authorized engineering is complete. Product MVP remains NOT_COMPLETE. Evidence is archived in ignored `mobile/evidence/windows-android-runtime/`: 123 evidence files plus manifest, limited to `android*.png`, `.mp4`, `.sqlite`, `.xml`, `.txt`, `.log`, `.json`, `.md`; patches and dependency directories are excluded. The static workflow passes 38/38 (`generatedvalidation/v1.9-static-check.json`). Feature commit/push is authorized but awaits root evidence/audit.

Windows evidence is archived at `mobile/evidence/windows-android-runtime/`. The emulator and owned Metro port 8088 are stopped; font scale and transition settings are restored to 1. Requested Sol/Terra role effectiveness remains `ROUTING_UNVERIFIED` because backend model metadata was not exposed.

## Historical 2026-09-20 macOS Simulator validation

현재 HEAD는 `0f102f8`, 브랜치는 `feature/arucon-mobile-autonomous`이며 이번 검증에서는 commit/push를 수행하지 않았다. `open -a Simulator`는 exit0, iPhone 16e iOS 26.3 Simulator는 booted 상태였다. `simctl launch <Simulator> com.arucon.dev`는 exit0과 PID 18389를 반환했고 `ps`로 프로세스를 확인했다. `pluginkit`으로 `com.arucon.dev.widget` 등록도 확인했다. 이번에는 native 재빌드를 하지 않았으며, 기존 SDK55 `xcodebuild` exit0 증거를 유지한다.

새 targeted native/scene/storage/widget 검사는 **64/64 PASS**다. `01-launch.png`는 빈 배경의 앱 열기 확인창, `02-loaded.png`와 `03-direct-launch.png`는 개발 클라이언트의 “No development servers found” 배경 위 확인창이다. 02와 03만 SHA-256이 동일하며 별개의 동작 증거가 아니다. CUA가 Mac 잠금 상태에서 차단되어 사용자의 잠금 해제 대기 중이므로 실제 방/GLB/이동/목적지 변경/쓰다듬기/식사/수면/SQLite 종료 복원/background/reduced-motion/safe-area/widget 홈 렌더는 **NOT_RUN / BLOCKED_HOST_LOCKED**다. 현재 Accessibility/Screen Recording 권한 상태는 잠금 때문에 확인하지 못했다. 위젯 extension 등록은 PASS지만 GLB 또는 WidgetKit visual PASS로 해석하지 않는다. physical device는 NOT_RUN, Health는 계속 OFF다. Metro는 localhost:8081에서 실행 중이며 연결·번들 로드 성공은 아직 확인되지 않았다.

이번 명령/cwd/시각/HEAD/원시 출력은 `mobile/evidence/simulator-validation/commands-verified.log`, 13개 요청 항목과 증거 SHA는 같은 폴더 `session.md`에 기록했다. Terra explorer는 실제 UI/저장 호출 경로를 매핑했고 Terra reviewer는 화면·단위 검사·문서의 판정 범위를 검토했다. Luna는 상태 문서를 정정했다. 각 effective model은 `ROUTING_UNVERIFIED`이며 제품 결함이 확정되지 않아 구현 역할은 호출하지 않았다.

## SDK55 마이그레이션 이력


2026-09-20 KST · baseline `0e795d9` · `feature/arucon-mobile-autonomous` · **SDK55 체크포인트 commit/push 수행**

## 현재 결과

**SDK 55 마이그레이션 검증 완료, GUI 검증 제한 잔여.** macOS15.6 + Xcode26.3을 그대로 사용했다. Expo55.0.31 / React Native0.83.10 / React19.2.0과 SDK55의 공식 Expo 패키지 조합으로 정렬했다. SDK55의 공식 최소 Xcode는26.2이며 현재 호스트가 충족한다. 제품 전체 MVP나 출시 검증 완료를 의미하지 않는다.

## 변경 및 제품 보존

- `expo install --fix`로 의존성 정렬을 확인하고 `expo-doctor`20/20을 통과했다. 기존 SDK57 peer graph를 사용한 첫 npm 설치는 ERESOLVE였으며, 강제 peer 무시 없이 SDK55 manifest에서 lock을 새로 생성했다.
- SDK57의 JSI postinstall 내부 패치와 그 전용 테스트3개를 제거했다. 제품 테스트는 삭제·완화하지 않았다. ADR-009가 ADR-008의 임시 패치 결정을 대체하며, 위젯 source 경로 수리는 유지한다.
- File/bytes, SQLite async, Asset, GLView, optional native module API는 SDK55에도 있어 제품 API 대체가 필요하지 않았다. 도메인·SQLite schema7·기존 자산/모션·위젯6필드·Health OFF를 유지했다.
- `.glb`를 expo-asset plugin이 직접 native resource로 복사하는 기능은 SDK57에만 있다. SDK55에서는 경고가 나오지만 기존 Metro 정적 require→Asset→File.bytes 경로를 유지하며 Android/iOS export에 원본과 동일한 GLB가 포함됨을 확인했다. 실제 GLB 화면 렌더는 아래 권한 제한으로 미검증이다.
- 실제 native compile 후 Simulator 설치에서 위젯 Info.plist의 CFBundleExecutable 누락을 발견했다. 프로젝트 CNG plugin에 `$(EXECUTABLE_NAME)` 선언과 회귀를 추가하고, PBX 검사를 parsed build settings 기준으로 보강했다. CNG 재생성·독립 리뷰·재빌드 후 설치 결함을 해결했다. Expo 내부 코드는 수정하지 않았다.

## 실제 실행한 최종 검증

| 검사 | 결과 |
|---|---|
| `npx expo install --fix` / `npm ls --all` | PASS / PASS |
| `npx expo-doctor` | **20/20 PASS** |
| `npm test` | **239/239 PASS**, fail0/skipped0; 위젯 수정 전238은 중간 실행 |
| lint / typecheck | **PASS / PASS** |
| Android / iOS JS bundle | **PASS / PASS**, GLB bytes 동일 |
| Expo clean prebuild → 위젯 수정 후 non-clean prebuild | PASS, generated ios/android 재생성 |
| generated widget/native boundary | **25/25 PASS** |
| `npx expo run:ios` | 컴파일/설치 PASS. **전체 명령 exit1**: 마지막 Simulator 창 활성화용 System Events/osascript 권한 실패 |
| 별도 `xcodebuild … build` | **BUILD SUCCEEDED, exit0** |
| Simulator runtime | iOS26.3 / iPhone16e 사용 가능, `BLOCKED_ENV_SIM_RUNTIME` 아님 |
| `simctl launch … com.arucon.dev` | **exit0, 프로세스 시작 확인** |
| 실제 화면·GLB·터치·모션·OS 위젯 렌더 | **NOT_EVALUATED** — macOS 자동화/접근성·화면 기록 권한 대기 |
| physical device | **NOT_RUN** |
| Android native/emulator | **NOT_RUN / BLOCKED_ENV**, Android SDK 부재 |

`expo run:ios` 전체를 PASS로 표현하지 않는다. 실패한 GUI 단계는 `BLOCKED_ENV_AUTOMATION_PERMISSION`이다. 기존 SDK57 Swift7개 오류는 현재 SDK55 네이티브 빌드에서 재현되지 않았다. 시스템 설치·OS 업그레이드·건강 읽기·외부 계정·실결제·배포는 수행하지 않았다. 이번 요청에서 승인된 feature 브랜치 체크포인트 commit/push만 수행하며 main/merge/deploy는 하지 않는다. 이번 Metro 서버는 검증 뒤 종료했다.

## 독립 리뷰와 위임

Sol builder: package/lock·CNG 설치 결함 수정·ADR. Terra explorer: API·DB·3D 호출 경로 조사. Terra reviewer: package matrix, DB/schema/asset/motion 보존, CNG 및 실제 native 로그 독립 대조; CFBundleExecutable 결함 발견→수정→재검증 PASS. Luna: 모바일 실행 문서 정정. 루트 Astra 역할: 환경·전체 검사·native 실행·권한 경계·최종 통합. 실제 backend model metadata는 미노출이므로 ROUTING_UNVERIFIED를 유지한다.

증거: `mobile/evidence/sdk55-migration/`의 `results.json`, `api-audit.md`, `review.md`, `expo-doctor.log`, `tests-final.log`, `bundles.log`, `native-generation-final.json`, `expo-run-ios-final.log`, `xcodebuild-final.log`. 중간 설치/빌드 실패 로그도 보존했다. 생성 산출물·DB·증거는 ignored이며 index는 변경하지 않는다. 변경 목록과 HEAD 보존 확인은 `final-git-audit.json`을 따른다.

다음은 UI 권한이 준비된 환경 또는 수동 조작으로 합성 온보딩→방 GLB/모션·위젯·저장 lifecycle 검증이다. 실제 HealthKit는 OFF다. 이전 실행 숫자는 아래 이력으로 보존하며 현재239개 검사와 혼합하지 않는다.

---

## 아래는 SDK57에서의 과거 실행 이력 (현재 환경/판정 아님)

# iOS 로컬 빌드 오류 수정 실행 보고서

2026-09-20 KST · 시작 `fce0bac7a0b240c3a396edc91f93d4e0c0d6b20c` · `feature/arucon-mobile-autonomous`

## 현재 판정

**WAITING_FOR_HUMAN_DECISIONS / MVP_NOT_COMPLETE**. 첨부 로그의 `AruconWidget/AruconWidget/AruconWidget.swift` 경로 결함을 수정했다. 실제 위젯 Swift compile/link는 통과했지만 **전체 iOS 앱은 아직 빌드 실패**다. Xcode26.3은 Expo SDK57의 [공식 최소26.4+](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions)에 미달한다. 시스템 설치는 HS-08 경계로 수행하지 않았다.

## 이번 변경과 검증

- CNG plugin이 위젯 group 안의 파일을 basename으로 참조하고, 기존 잘못된 target도 중복 생성 없이 수리한다. 새 생성·재적용·기존 결함 회귀를 추가했다.
- `expo-modules-jsi@57.1.0`의 잘못된 constructor `SWIFT_RETURNS_RETAINED` 두 곳을 버전/내용 검사 후 수정하는 postinstall script를 추가했다. 메모리 shared ownership 선언은 유지하며, 다른 버전/예상 밖 소스는 거절한다. [Expo upstream issue49214](https://github.com/expo/expo/issues/49214), 선택/제거 조건은 ADR-008을 따른다.
- `npm ci --offline` **exit0**, postinstall `patched` 확인. 두 번째 적용은 `already-patched`. package graph는 유지하고 lock의 root install-script metadata만 일치시켰다. npm의 offline audit 표시는 새 네트워크 보안 감사 결과로 사용하지 않는다.
- 경로/JSI 호환성 영향 테스트 **9/9 PASS**, 독립 reviewer 재실행. 원본 헤더 `swiftc` exit1 → 두 주석만 수정한 헤더 exit0도 독립 재현했다.
- `npm run lint`, `npm run typecheck` **PASS**. 게임/경제 코드는 변경하지 않았으며 과거 전체236/236을 이번 실행으로 재사용하지 않는다.
- Expo iOS prebuild 및 generated source 경로 검사 PASS. SDK57 prebuild가 기본 clean으로 ios를 재생성해 Pods/workspace를 지웠으므로 설치돼 있던 CocoaPods로 `pod install --no-repo-update`를 실행해 복구했다(exit0). 재생성 산출물은 ignored이며 Git에 포함하지 않는다.

## 실제 native 실행 결과

| 대상/시도 | 결과 |
|---|---|
| 도구 inventory | Xcode26.3 / Swift6.2.4 / CocoaPods1.17.0 / iOS Simulator 사용 가능 |
| simulator 대상 | iPhone16e, iOS26.3; compile SDK iphonesimulator26.2 |
| 첫 workspace build | prebuild 직후 workspace 부재 exit66; Pods 복구 후 해결 |
| Pods 복구 후 build | 위젯 Swift compile/link PASS, JSI constructor annotation 오류로 전체 앱 exit65 |
| npm ci + constructor patch 후 build | 기존 경로/annotation 오류 없음. `JavaScriptRuntime.swift`의 `resultPtr/thisPtr/argumentsPtr` data-race 진단7개로 전체 앱 **exit65** |
| iOS 앱 설치/실행·위젯 OS 렌더 | **NOT_RUN** — 전체 앱 build 실패 |
| Android native/emulator | **BLOCKED_ENV** — SDK/adb/emulator 부재; 이번 Android build 미시도 |
| physical device / 화면·터치·모션·FPS | **NOT_RUN** |
| 실제 건강/민감정보·계정·결제·배포 | 수행하지 않음; Health OFF 유지 |

동시성 검사를 끄거나 unchecked pointer 전달을 추가하지 않았다. Xcode26.4+ 환경에서 재빌드해 잔여 호환성을 확인해야 하며, 업그레이드만으로 모든 오류가 해결된다고 보증하지 않는다. 동일 명령을 현재26.3에서 반복해도 앱 실행 검증을 진행할 수 없다. 이번에 시작한 Metro는 종료했다.

## 독립 리뷰·라우팅

- `ios_widget_path_fix`: arucon_builder/Sol 요청 — CNG 수리·회귀·guarded lifecycle patch·ADR-008.
- `ios_widget_review`: arucon_reviewer/Terra High 요청 — source generation/9개 영향 검사/헤더 Swift 재현·npm ci 검토. 수정 소스는 PASS, 전체 앱 컴파일 P1 실패는 잔여로 분리.
- `ios_docs_audit`: arucon_explorer/Terra 요청 — 현재 환경 주장과 과거 기록의 문서 감사.
- `ios_environment_docs`: arucon_luna_worker/Luna 요청 — 모바일 문서의 환경/재개 절차 정정.
- 루트 Astra 역할 — 실제 도구/빌드 실행·공식 요구 대조·HS-08 판정·통합 문서/Git. 실제 backend model metadata는 미노출이므로 ROUTING_UNVERIFIED.

로그/독립 리뷰: `mobile/evidence/ios-widget-path-fix/`의 `npm-ci.log`, `prebuild.log`, `pod-install.log`, `native-environment.json`, `native-generation.json`, `xcodebuild-after-pods.log`, `xcodebuild-compatibility.log`, `review.md`, `dependency-review.md`. 증거·Pods·node_modules·생성 native·DB·영상은 Git 제외다. 아래 2026-09-19 전체 검증 기록은 당시 이력으로 보존한다.

## Git·재개

feature의 일반 commit/push만 기존 승인 범위로 수행한다. 이 문서는 자기 commit 이전에 쓰며 실제 HEAD/tracking/live origin 및 clean status는 `mobile/evidence/ios-widget-path-fix/publication.json`과 최종 응답에 기록한다. mobile은 root Git 일반 디렉터리다. main/merge/force/tag/release/배포는 하지 않는다.

재개: Xcode26.4+ 환경 준비 후 `npm ci` → 필요 시 `expo prebuild --no-clean --platform ios --no-install`와 `pod install --no-repo-update` → 현재 source/header 확인 → iOS native build → 성공할 때만 simulator 설치·앱 smoke/위젯·lifecycle 검증. 정확한 절차와 남은 외부 경계는 NEXT-RESUME 및 DECISION-QUEUE 참조.

---

## 2026-09-19 승인 MVP 구현 이력 (현재 실행 결과 아님)

# 승인된 MVP 정책 구현·통합 실행 보고서

2026-09-19 · 시작 `34ab069dc874947a0f71ff7b70c3be2b14065e00` · `feature/arucon-mobile-autonomous`

## 2026-09-19 당시 판정

**WAITING_FOR_HUMAN_DECISIONS / MVP_NOT_COMPLETE**. 승인된 여섯 방향과 그 안에서 독립적으로 할 수 있는 로컬 구현·자동검증을 완료했다. 남은 일은 법률 / 실제 건강정보 / 외부 계정 / 실결제·출시 / 시스템 환경이다. 제품 계수·케어표·코인 가격·기술 선택을 다시 사람 결정 대기 상태로 돌리지 않는다.

SRS §14의19행과 §14-1의11행 판정은 [MVP-GAP-MATRIX](MVP-GAP-MATRIX.md), 승인 범위·원래10개 DQ 처리와 재개는 [DECISION-SUMMARY](DECISION-SUMMARY.md), 외부 작업은 [DECISION-QUEUE](DECISION-QUEUE.md)를 따른다. 전체 MVP 완료나 출시 준비 완료를 주장하지 않는다.

## 완료한 구현

- 승인 config와 기존 DEV fixture를 분리했다. 기존 food/coin/EXP를 회수하지 않고 기본 화장실을 무료 이행한다. 식탁 자동급식과 직접급식은 공통 원자 식사 규칙을 사용한다.
- 개인 게임 기준과 유효 합성 세션 합집합 scorer를 연결했다. 의료 판정 없이 1.0~1.25 보너스를 주며, UTC 기록D/혜택D+1·만료·무기록·날짜 경계·기존 식사 비소급을 처리한다. 펫의 자격 있는 wake 회복은 날짜당 단회이고, 무기록/0점 목표65에서 최대100이며 현재 체력을 낮추지 않는다.
- 성장 비용·Lv6 단회 성별·Lv16 및 확정 기록7일의 케어 결정표를 앱 서비스/원장/snapshot에 연결했다. 활동→피코, 휴식→몽글, 교감→말루, 혼합/동률→모노이며 personality/급식 모드는 분기에서 제외한다.
- 코인 약50·식탁60·공30·쿠션40의 원자 구매/효과·소유/재시도를 연결했다. 공·쿠션은 로컬 방의 무료 놀이/휴식 경로를 제공한다. 현금 코스메틱은 비활성 경계다.
- schema7의 durable writer 등록, 한 writer epoch, 명시 이전, 충돌 보존, 서버 확인분 복구 계약과 원자 저장을 구현했다. App의 LOCAL SYNTHETIC flush/handoff로 실제 서비스 경로를 검증하며, 재시작으로 fake authority를 재생성해 쓰기 권한을 되살리지 않는다. 이 fake는 실제 계정/서버가 아니다.
- 위젯 strict6필드·시각·open_app bridge와 iOS WidgetKit extension/Android receiver 생성, 앱의 read-only snapshot 게시 경로를 연결했다. 건강 권한·읽기는 OFF, 위젯은 경제 명령을 실행하지 않는다.
- 앱 안 안내를 우선하고 실제 건강/계정/서버 연결이 아님을 표시한다. 합성 동의/scope/철회·실결제 비활성·원본/비밀 outbound 차단 경계를 유지했다.

## 2026-09-19 당시 실행한 최종 검사

| 명령/검사 | 결과 | 범위 |
|---|---|---|
| `npm test` | **236/236 PASS**, fail0 | 이번 최종 소스의 Node/SQLite/contract 자동 검사 |
| `npm run lint` | PASS | 앱/소스 정적 검사 |
| `npm run typecheck` | PASS | TypeScript |
| `expo export --platform all --max-workers 2` | Android/iOS PASS | JavaScript bundle, 네이티브 build 아님 |
| `expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` | PASS | ignored native project generation, compile 아님 |
| native generation/autolinking/Swift parse/XML/podspec | PASS | source/build graph/syntax 검사 |
| `validation/check_workflow.py` | 38/38 PASS | 필수 문서/작업 구조 검사 |
| workflow regression | PASS | 현재 workflow 검사 회귀 |
| `git diff --check` | PASS | whitespace 검사 |

명령 인수·시각·exit·로그는 `mobile/evidence/approved-mvp/results.json`과 `native-final-validation.json`에 있다. evidence/build/로컬 DB/테스트 영상은 Git에서 제외한다. 의존성 manifest/lock의 변경이 없어 이번 요청에서 dependency audit를 새 실행 결과로 주장하지 않는다. 과거179/147/77/13 결과는 Git 이력이며 위 fresh 실행 숫자로 재사용하지 않았다.

## 독립 리뷰와 수정 루프

- 게임 정책: fresh focused19/19, 날짜 만료/모든 clock path·wake 실패 후 복구·무기록·단회 성장/비회수 검사. 발견된 `firstEvolutionLevel=6` 명명 결함은 성별6/외형16 config와 소비 코드·검사로 수정 후 재검증했다.
- 저장/동기화: focused source/SQLite 검토. 복구 snapshot/conflict와 writer registration 분리 저장 P1을 발견해 원자 경계·실패 주입/재시도 검증을 보강했다. 최종 저장 영향91/91, 독립 복구 원자성14/14·정확 checkpoint2/2 재검증으로 두 P1을 닫았다. `review-storage-final.md`와 `storage-sync-evidence.md`를 따른다.
- 네이티브 phase1: independent28/28 PASS(source/CNG 한정).
- 앱 통합: 미래 자정으로 시계를 전진시키던 수면 fixture를 완료된 전일 기록과 현재 적용 시각으로 수정했다. formId→renderer 계약 및 명시적인 공통 GLB fallback을 연결하고 fresh19/19 독립 재검증을 했다. approved service·합성 sync controller·소유 가구·위젯/상태 안내를 source/계약 검사로 검토했다. 실제 렌더/모션 실행을 대신하지 않는다. 최종 review 기록은 `review-app*.md/log`다.
- 중간 WIP typecheck 실패와 최초 native 환경 실패는 숨기지 않고 해당 로그에 보존했다. 최종 소스의 정적 검사와 자동 테스트는 위 표 기준이다.

## 2026-09-19 당시 환경 기록 (현재 환경 아님)

2026-09-19 당시 macOS에는 Command Line Tools/Swift와 Java21이 있었고, full Xcode/iOS Simulator SDK/simctl/CocoaPods 및 Android SDK/platform/build-tools/adb/emulator는 없었다. 아래 표는 그날의 결과다. 2026-09-20 현재 환경·실패 결과는 이 문서 맨 위 표를 따른다. 당시 시스템 설치·관리자 작업·계정 인증은 수행하지 않았다.

| 대상 | 결과 |
|---|---|
| iOS native compile | BLOCKED_ENV — xcodebuild가 full Xcode 필요 오류 |
| Android native compile | BLOCKED_ENV — SDK 미설치. 첫 Gradle 시도는 cache lock sandbox 실패이며 SDK compile 도달 증거가 아님 |
| iOS Simulator / Android emulator | NOT_RUN |
| physical device (iOS/Android) | NOT_RUN |
| 실제 화면·터치·모션·FPS·OS 위젯 실행 | NOT_RUN |
| 실제 건강 읽기/permission prompt | OFF / NOT_RUN |
| 실제 계정·클라우드·결제·스토어/운영 배포 | 수행 안 함 |

CNG 생성/Swift parse/JS bundle을 실기기 통과로 표현하지 않는다. 빌드 파일의 최소 버전 값은 최종 지원 OS 선언이 아니다. 승인 2D 진화 참고 시트는 존재하지만 네 전용 rigged/animated runtime asset은 없다. 현재 form selector는 이를 명시적인 공통 GLB fallback으로 표시한다. 새 외형 결정을 요구하지 않으며 최종 1차 진화 아트 납품/기기 렌더 PASS라고 표현하지 않는다.

## 모델별 위임

- 루트: 요청된 Astra 역할로 승인 범위·SRS/DEC·교차 모듈 날짜/복구 판단·최종 통합/검증/Git을 담당했다.
- `rebuild_app04`: arucon_builder/Sol 요청 — 승인 policy/scorer/evolution/shop/앱 façade·게임 회귀.
- `mvp_storage`: arucon_builder/Sol 요청 — writer/sync/recovery/schema/원자 거래·합성 App controller.
- `mvp_native`: arucon_builder/Sol 요청 — native/CNG/widget bridge·환경 조사·App/presentation/가구 연결.
- `mvp_gap_explore`: arucon_explorer/Terra 요청 — SRS/DEC 대량 읽기 및 코드 작성과 분리된 초기 독립 QA.
- `approved_final_review`: arucon_reviewer/Terra High 요청 — 구현 작업 종료로 슬롯이 확보된 뒤 앱의 교차 모듈 연결과 최종 변경을 독립 검토했다.
- `approved_readme`: arucon_luna_worker/Luna 요청 — 모바일 README의 현재 진입점·승인 범위·환경 한계를 좁게 갱신했다. Spark는 지원 확인이 없어 호출하지 않았다.
- 실제 backend 모델/추론 metadata는 노출되지 않아 **ROUTING_UNVERIFIED**다. 요청한 역할을 실제 모델 ID 증명으로 표시하지 않는다.

## Git·외부 반영

현재 feature 브랜치의 논리적 checkpoint commit과 일반 origin push만 승인 범위다. root Git의 일반 `mobile/` 파일이며 `mobile/.git`이나 mode160000 gitlink를 만들지 않는다. stage 전후 제외 경로/secret 패턴/파일목록/package modes와 최종 테스트를 검사한다.

이 문서는 자신의 checkpoint commit 이전에 작성된다. 이 문서를 포함하는 HEAD/원격 추적/live origin의 최종 비교와 clean status는 `mobile/evidence/approved-mvp/publication.json` 및 최종 응답에 기록한다. main push/merge, force/history rewrite, tag/release, 배포는 수행하지 않는다.

## 2026-09-19 당시 다음 작업 (최신 절차는 NEXT-RESUME)

[DECISION-QUEUE](DECISION-QUEUE.md)의 준비된 외부/환경 가지부터 재개한다. SDK 준비만 되면 실제 건강 읽기 OFF 상태로 native compile/simulator 및 별도 physical device 검증을 먼저 수행할 수 있다. 건강/실계정/법적 정책/결제·출시는 명시된 추가 승인 범위에서만 수행한다. 승인된 여섯 제품 방향은 다시 승인 요청하지 않는다.

## Final Windows publication result

Implementation checkpoint `5493d08` and reviewed documentation checkpoint `c2ac5fb` were committed locally. Final independent code/evidence/document review passed; workflow 38/38 and validator regression passed. A normal feature push was attempted, but Git Credential Manager had no usable GitHub authentication. A noninteractive retry failed with terminal credentials unavailable; no credentials were requested or stored in this report. Live origin remains `3310d38`. No push, merge, tag, release, or deployment occurred. A final local metadata checkpoint records this result; exact final local/tracking/origin hashes and clean status are in ignored `mobile/evidence/windows-android-runtime/git-audit.json`.

Existing-account GitHub authentication is the only remaining publication action. After the user authenticates this Git installation, resume with a fetch/divergence check and ordinary feature push. All current Windows engineering is complete; this does not change the product, iOS, physical-performance, or external gates above.

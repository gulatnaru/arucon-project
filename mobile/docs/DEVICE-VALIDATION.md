# Native / simulator / physical-device 검증 재개표

## 2026-09-26 fresh iOS checkpoint

Baseline `5da0048`, macOS 15.6, Xcode 26.3, iOS 26.3 iPhone 16e Simulator. `npm ci` PASS; focused source suite 82/82, lint/typecheck, separately rerun scene suite 25/25, CNG checker 27/27, and Pods PASS. Current Expo CNG artifacts replaced stale iOS PNG/widget template/PBX history. Source GLB was visible; normal input responded; widget 384px ImageIO thumbnail and two-line local date/time fully rendered; tap opened the room and returned; SQL before/after diff was zero. Synthetic restart state matched: food1/coin10/EXP8812500/meals1/registry1/integrityOK. Reduced motion kept movement and stopped idle roaming after arrival. Touch deformation is visual PARTIAL at 3Hz.

Final iOS Release path uses the cache copy and software fallback; GLB is visible in `30-release-final-room.png` and after relaunch in `31-release-cache-relaunch.png`. Cache/source SHA-256 match `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`; final CPU sample is 46.4%. The earlier software-render stall and the separate bundle-read permission error are resolved failures. Final input and normal/reduced rechecks are `BLOCKED_HOST_LOCKED`; motion quality and physical FPS remain unapproved. Health remains OFF.

## Historical 2026-09-20 environment record

2026-09-20 KST SDK55 최신 부록: Expo 55.0.31/RN 0.83.10으로 정렬 후 iOS native compile/install은 PASS, 별도 `simctl launch`는 PID 확인까지 PASS다. `open -a Simulator`와 iPhone 16e iOS26.3 booted, `pluginkit` widget registration도 확인했다. CUA가 Mac 잠금 상태에서 차단되어 실제 GLB 렌더·터치·모션·WidgetKit 홈 화면은 `NOT_RUN / BLOCKED_HOST_LOCKED`; physical device는 `NOT_RUN`. Android SDK/adb/emulator는 `BLOCKED_ENV`다. 상세 증거는 `evidence/simulator-validation/` 및 `evidence/sdk55-migration/`에 있다.

2026-09-20 KST 환경: macOS 15.6, Xcode 26.3, Swift 6.2.4, CocoaPods 1.17.0 및 iPhone 16e iOS 26.3 Simulator를 사용했다. SDK55 native compile/install과 별도 process launch는 PASS다. Expo CLI GUI 활성화는 `BLOCKED_ENV_AUTOMATION_PERMISSION`이다. Android SDK/adb/emulator는 없다. SDK57 실패 기록은 `evidence/ios-widget-path-fix/`에 역사적으로 보존한다.

JS/asset bundle 성공, native project 생성, Node SQLite, synthetic bridge 테스트는 각각 다른 증거이며 이 문서의 실제 실행을 대신하지 않는다.

## 시작 전

1. `git status -sb`, HEAD, `npm ls --depth=0`, OS·SDK·장치 모델/버전 기록. 건강 원본/계정·기기 고유 ID는 증거에 남기지 않는다.
2. 준비된 Xcode/Android SDK 및 승인된 simulator/emulator가 있는지 재확인한다. 관리자/전역 설치가 필요하면 DQ-09에서 멈춘다.
3. 해당 DEC·실제 건강 접근·계정/결제 권한이 없으면 synthetic 모드만 실행한다. 앱 권한 프롬프트 승인과 실제 데이터 읽기 승인을 혼동하지 않는다.
4. 로컬 개발 빌드만 실행한다. 스토어/TestFlight/Play 트랙 업로드, 코드 서명용 새 계정 생성, 클라우드 빌드는 이 절차에 포함하지 않는다.

## 실행표 — 각 행의 결과를 독립 기록

| 검증 | simulator/emulator | physical iOS | physical Android | 필요한 증거 |
|---|---|---|---|---|
| local development/release build/install/start | iOS Debug/Release compile/install/launch PASS; final Release input BLOCKED_HOST_LOCKED | NOT_RUN | NOT_RUN | `xcodebuild-release-final.log`, `30/31` captures, embedded bundle |
| 합성 온보딩·이름·콘 표시 | 기존 펫 복원·이름 표시 PASS; 새 온보딩 이번 NOT_RUN | NOT_RUN | NOT_RUN | `Sim콘` 화면 및 기존 SQLite 보존 |
| 합성 활동→food/coin→직접/자동 식사 | Debug 직접 급식 PASS; 자동급식 이번 NOT_RUN | NOT_RUN | NOT_RUN | `04` video, `sqlite-after-walk/meal` |
| 식사 전·transaction 중·commit 직후 종료/relaunch | commit 후 종료/재설치/복원 PASS; 전/중 fault injection NOT_RUN | NOT_RUN | NOT_RUN | `sqlite-restore-comparison.json`, `release-final-storage.json` |
| foreground/background·긴 부재·동면·복귀 | Settings/Home/widget 복귀 관찰 PASS; 동면 통제 시나리오 NOT_RUN | NOT_RUN | NOT_RUN | `19` video 및 자원 전후 비교 |
| Expo SQLite migration 실패/손상 snapshot | NOT_RUN | NOT_RUN | NOT_RUN | 합성 DB/rollback/original bytes 보존 |
| 두 성격·floor hit·배회·touch/meal pose | PARTIAL_OBSERVED | NOT_RUN | NOT_RUN | normal input/arrival/trace; touch smoothness pending |
| OS 동작 줄이기 변경·복귀 | PASS_OBSERVED_SIMULATOR_SCOPE | NOT_RUN | NOT_RUN | reduced-motion captures/video |
| FPS·프레임 시간·배터리/백그라운드 중지 | NOT_RUN | NOT_RUN | NOT_RUN | 측정 도구/구간/기기·raw 수치; 예산 DEC-31 |
| screen reader·touch target·색/큰 글꼴 | NOT_RUN | NOT_RUN | NOT_RUN | 실제 포커스/접근성 동작 |
| portrait 기본 safe area·컨트롤 잘림 | PASS_OBSERVED_DEFAULT_VIEWPORT | NOT_RUN | NOT_RUN | `17/20/30/31` captures; 큰 글꼴/VoiceOver 수용 아님 |
| native Health 거부·철회·미지원·지연/재부팅 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-05/HS-01 승인 후 최소 메타데이터만 |
| native widget 설치·갱신시각·stale·앱 진입 | home image/time/tap PASS; 모든 stale/error 전환 검증 아님 | NOT_RUN | NOT_RUN | `18/19/20` actual home/tap evidence |
| widget read/reload와 앱 자원 중립 | 위젯 진입 전후 food/coin/EXP/meal 불변 PASS | NOT_RUN | NOT_RUN | `sqlite-before/after-widget-tap.json` diff 0 |
| auth scope·철회·다기기/offline 복구 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-06/07 및 별도 synthetic 테스트 계정 승인 |
| 결제 실패·중복·복원·환불 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-04/HS-03 승인 후 해당 환경 결과 |

모션/FPS는 정지 화면이나 영상 인코딩 fps로 PASS 처리하지 않는다. 이번 실행에서 WidgetKit 홈 렌더와 앱 진입은 실제 관찰했다. 이후 Mac이 다시 잠겨 최종 Release 입력 재검증만 차단됐다. 이전 Debug 입력 결과를 Release 입력 PASS로 확대하지 않는다. Health module은 OFF 계약만 검증하며 실제 데이터 접근은 하지 않는다.

## 실패 기록

각 항목은 command/cwd/timestamp/revision/environment/exit/evidence/판정을 남긴다. NOT_RUN, FAIL, BLOCKED_ENV, HARD_STOP을 PASS와 분리한다. 생성 프로젝트/DB/영상/기기 로그는 ignored `mobile/evidence/`에 보관하고 Git에는 비밀 없는 요약만 저장한다.

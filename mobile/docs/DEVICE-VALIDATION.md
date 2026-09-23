# Native / simulator / physical-device 검증 재개표

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
| local development build/install/start | iOS PASS_INSTALL_AND_PROCESS_START_ONLY; Android NOT_RUN | NOT_RUN | NOT_RUN | SDK55 / prior xcodebuild exit0 / simctl process PID; GUI activation exit1 |
| 합성 온보딩·이름·콘 표시 | NOT_RUN | NOT_RUN | NOT_RUN | 작은 화면 및 큰 글꼴/keyboard 캡처 |
| 합성 활동→food/coin→직접/자동 식사 | NOT_RUN | NOT_RUN | NOT_RUN | 조작 순서와 자원/원장 전후 |
| 식사 전·transaction 중·commit 직후 종료/relaunch | NOT_RUN | NOT_RUN | NOT_RUN | DB 보존/중복 EXP 없음, fault mode 구분 |
| foreground/background·긴 부재·동면·복귀 | NOT_RUN | NOT_RUN | NOT_RUN | 타임라인·식사/dirty/회복 중복 없음 |
| Expo SQLite migration 실패/손상 snapshot | NOT_RUN | NOT_RUN | NOT_RUN | 합성 DB/rollback/original bytes 보존 |
| 두 성격·floor hit·배회·touch/meal pose | NOT_RUN | NOT_RUN | NOT_RUN | 실제 앱 전환 영상, viewport/revision |
| OS 동작 줄이기 변경·복귀 | NOT_RUN | NOT_RUN | NOT_RUN | 전환 전후 영상, 이동 유지/장식 정지 |
| FPS·프레임 시간·배터리/백그라운드 중지 | NOT_RUN | NOT_RUN | NOT_RUN | 측정 도구/구간/기기·raw 수치; 예산 DEC-31 |
| screen reader·touch target·색/큰 글꼴 | NOT_RUN | NOT_RUN | NOT_RUN | 실제 포커스/접근성 동작 |
| native Health 거부·철회·미지원·지연/재부팅 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-05/HS-01 승인 후 최소 메타데이터만 |
| native widget 설치·갱신시각·stale·앱 진입 | extension registration PASS; OS home render NOT_RUN/BLOCKED_HOST_LOCKED | NOT_RUN | NOT_RUN | pluginkit registration; actual home screen requires unlocked host |
| widget read/reload와 앱 자원 중립 | NOT_RUN | NOT_RUN | NOT_RUN | pending/meal/EXP/food 불변 |
| auth scope·철회·다기기/offline 복구 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-06/07 및 별도 synthetic 테스트 계정 승인 |
| 결제 실패·중복·복원·환불 | NOT_RUN | NOT_RUN | NOT_RUN | DQ-04/HS-03 승인 후 해당 환경 결과 |

모션/FPS는 정지 화면이나 영상 인코딩 fps로 PASS 처리하지 않는다. SDK55 native widget target은 compile/install 및 extension registration까지 확인했지만, WidgetKit 홈 렌더와 앱 연결은 Mac 잠금으로 미실행이다. 현재 화면·접근성 권한 상태는 확인하지 못했다. Health module은 Health OFF 계약만 검증하며 실제 데이터 접근은 하지 않는다. 실제 SDK 없이 컴파일되지 않은 Swift/Kotlin 파일을 만들어 완료를 주장하지 않는다.

## 실패 기록

각 항목은 command/cwd/timestamp/revision/environment/exit/evidence/판정을 남긴다. NOT_RUN, FAIL, BLOCKED_ENV, HARD_STOP을 PASS와 분리한다. 생성 프로젝트/DB/영상/기기 로그는 ignored `mobile/evidence/`에 보관하고 Git에는 비밀 없는 요약만 저장한다.

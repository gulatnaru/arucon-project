# 다음 재개 — SDK55 호환성 마이그레이션 이후

2026-09-20 · feature/arucon-mobile-autonomous · 현재 HEAD `0f102f8`. SDK55 마이그레이션 후 Simulator process launch와 widget registration을 확인했으며, 이번 검증은 commit/push하지 않았다.

## 먼저 확인

1. AGENTS, STATUS/REPORT, ADR-009, MVP-GAP-MATRIX, DECISION-QUEUE/SUMMARY를 읽고 `git status -sb`를 확인한다. mobile은 루트 Git 일반 디렉터리이며 mobile/.git을 만들지 않는다.
2. 현재 Expo55.0.31 / RN0.83.10 / React19.2.0이다. SDK57 내부 패치/postinstall은 제거됐다. 과거 SDK57 Xcode26.4 요구를 현재 재개 조건으로 적용하지 않는다. SDK55는 현 macOS15.6/Xcode26.3 조합에서 빌드됐다.
3. SDK55 이력의 239/239, lint/typecheck, doctor20/20, 두 JS bundle, CNG25/25 및 native compile/install/process 시작은 실행 증거다. 최신 targeted native/scene/storage/widget 검사는 64/64 PASS이며, 미래 변경의 fresh 결과로 재사용하지 않는다.
4. `expo run:ios`는 마지막 Simulator 창 활성화용 System Events 권한 때문에 전체exit1이다. 독립 xcodebuild exit0와 simctl process start exit0를 구분한다. iOS26.3 runtime은 이미 있으므로 BLOCKED_ENV_SIM_RUNTIME이 아니다.

## 로컬 실행과 남은 검증

- `cd mobile` 후 `npm ci`, 필요 시 `npx expo prebuild --platform all --no-install`로 CNG를 재생성한다. SDK55에서는 SDK57용 `--no-clean` 옵션을 쓰지 않는다. `--clean`은 생성 native를 새로 만들 때만 명시한다.
- 이번 검증의 Metro는 localhost:8081에서 실행 중이다. 포트 상태를 먼저 확인하고 종료된 경우에만 다시 시작한다. Simulator의 개발 앱 열기 확인창을 처리하고 실제 JS 번들 연결을 확인한다.
- 현재 CUA 차단은 Mac 잠금이다. 잠금 해제 후 입력 접근을 다시 확인한다(Accessibility/Screen Recording의 현재 권한 상태는 미확인). 이후 합성 온보딩, GLB 로딩/모션·터치, 위젯 OS 렌더, 저장/lifecycle를 검증한다. 현재 process start와 extension registration은 이 동작들의 PASS가 아니다.
- `.glb` config-plugin 직접 복사는 SDK55에서 지원되지 않지만 기존 Metro static require 경로와 양OS export 원본bytes는 보존됐다. ADR009에 기술 차이와 런타임 확인 경계를 기록했다.
- Android native SDK 및 physical device 검증은 별도 미준비/NOT_RUN이다. 실제 Health 읽기·법적 미성년 정책·실계정·실결제·배포·지원 OS 출시 선언은 기존 외부 승인 경계다.

## 재개 프롬프트

“현재 SDK55 체크포인트와 ADR009 및 실제 검증 증거를 읽고 제공된 UI 권한/기기 범위에서 합성 앱 runtime 검증을 이어가라. 제품 로직/DB schema/3D asset/모션/위젯 계약을 유지하고 Health OFF로 검사하라. build·process start·실제 화면·physical device를 분리하라. 새 변경의 commit/push는 별도 승인 범위를 확인하라.”

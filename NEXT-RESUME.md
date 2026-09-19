# 다음 재개 — 결정 재감사 이후

2026-09-19 · 시작 a8aa900 · feature/arucon-mobile-autonomous. 최신 checkpoint hash는 `git rev-parse HEAD`와 publication 증거에서 확인한다. 상태 WAITING_FOR_HUMAN_DECISIONS, 제품 MVP 미완이다.

## 먼저 확인

AGENTS.md → AUTONOMOUS-STATUS.json → AUTONOMOUS-RUN-REPORT.md → DECISION-SUMMARY.md → DECISION-QUEUE.md → MVP-GAP-MATRIX.md → docs/model-routing.md / hard-stops.md / SRS13~14.

- `mobile/`은 루트 Git 일반 디렉터리. mobile/.git·gitlink 금지.
- 원래10개 DQ의 기술 범위는 ADR-001~004로 AUTO_DECIDE 채택했다. SQLite/retry/SDK 구조/테스트 전략을 다시 사람에게 묻지 않는다.
- 최신 로컬 구현: SQLite schema6 durable retry/HOL/single-flight/offline, default-OFF local Expo module/plugin/autolinking, read-only 위젯 템플릿, synthetic 알림·cancel/revoke, TEST_ONLY bonus curve 격리.
- 제품값은 계속 OPEN/PROPOSED·DEV_FIXTURE_ONLY. 추천은 승인이 아니며 정확한 값/예시가 비어 있으면 운영 활성화하지 않는다.
- 정확한 최신 test 수·명령·review 결과는 실행 보고서/results.json을 사용한다. 소스 변경 후 지난 숫자를 새 실행처럼 인용하지 않는다.
- Xcode/simctl/Android SDK/adb 없음. native compile BLOCKED_ENV, simulator/emulator/physical device NOT_RUN. template parse/prebuild/export를 실기기 통과로 취급하지 않는다.

## 자동 재개 순서

1. worktree/branch/source hash와 승인·환경의 변경분을 확인한다. 완료한 scaffold를 재구현하지 않는다.
2. 제품 결정: 승인된 DQ의 선택안·수치·예시만 DEC/SRS/config/tests에 반영한다. 미승인 추천 기본값은 OFF 유지.
3. 환경 준비: `node scripts/check-native-environment.mjs` 후 DEVICE-VALIDATION 절차. 건강 읽기 OFF native build/launch·저장/lifecycle/렌더부터 진행한다. template를 실제 target에 연결한 후 native compile/기기 검증이 필요하다.
4. 실제 건강정보·동의·외부 프로젝트·결제는 각각 별도 승인 범위가 있을 때만 실행한다. SDK 제공은 건강 읽기 승인이 아니다.
5. 구현→영향 tests→독립 reviewer→수정→재검증. SRS14/14-1의30행을 계속 갱신한다.

## Git와 증거

이 결정 재감사 작업은 현 feature local commit/normal push가 승인됐다. 후속 세션은 최신 지시를 우선한다. main push/merge, PR merge, force/history rewrite, tag/release, 운영 배포 금지. 저장 전에 비밀/DB/의존성/.expo/생성물/영상ZIP 제외와 테스트 상태를 확인한다.

현재 로그는 ignored `mobile/evidence/decision-audit/`. `mobile/native/**`는 tracked 소스, 루트 `mobile/ios/`와 `mobile/android/`는 ignored 생성물이다. 미노출 모델 metadata는 ROUTING_UNVERIFIED. 기존 builder/explorer를 재사용했고 전용 Luna/reviewer 배정은 slot 제한이 있었다.

재개 프롬프트는 DECISION-SUMMARY.md 또는 AUTONOMOUS-RUN-REPORT.md 마지막 절을 사용한다.

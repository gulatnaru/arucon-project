# 다음 재개 — SRS MVP 전체 기준

2026-09-19. 상태 **WAITING_FOR_HUMAN_DECISIONS**. 독립 로컬 개발·검증·QA는 완료, MVP 제품 완료는 아니다. 현재 branch `feature/arucon-mobile-autonomous`; 시작 기준 `c99a4c0`, 최종 실제 hash는 `git rev-parse HEAD` 및 publication 증거/직전 종료 응답을 확인한다.

## 먼저 읽기

AGENTS.md → AUTONOMOUS-STATUS.json → AUTONOMOUS-RUN-REPORT.md → MVP-GAP-MATRIX.md → DECISION-QUEUE.md → docs/model-routing.md / hard-stops.md → SRS13~14.

- mobile은 루트 Git의 일반 디렉터리다. `mobile/.git`이나 gitlink를 만들지 않는다.
- APP 단계별 완료를 최종 범위로 쓰지 않는다. SRS14의19개와14-1의11개가 기준이다.
- 이번 최종 실행은 테스트147/147, lint/typecheck, 두 플랫폼 JS bundle, clean native project generation, workflow38/38 PASS, audit0. 이후 소스가 바뀌면 이 숫자를 현재 결과로 재사용하지 않는다.
- SQLite DEV schema5와 source registry/progression/원자 구매/회복/outbox/privacy 계약을 이어 쓴다. 전체 운영 경로는 미정 DEC 때문에 활성화하지 않았다.
- 환경은 Xcode/simctl/Android SDK/adb 없음. native compile BLOCKED_ENV, simulator와 physical device 모두 NOT_RUN. prebuild/export는 실제 native build가 아니다.

## 재개 순서

1. Git status와 `mobile/evidence/mvp-engineering/source-sha256.json`의 소스 일치, 최신 승인/장치 환경을 확인한다.
2. DQ-01~10 중 새로 승인된 항목/준비된 환경을 식별한다. 아무것도 바뀌지 않았으면 완료된 scaffold를 다시 만들지 말고 남은 결정을 요약한다.
3. DQ-09 환경 준비 후 `node scripts/check-native-environment.mjs`와 DEVICE-VALIDATION.md부터 진행한다. SDK/관리자 설치를 자동 실행하지 않는다.
4. 승인된 config/정책/예시가 있을 때만 운영 resolver·sleep·shop·auth·sync·native widget 경로를 연결한다. 실제 Health 데이터 읽기, 실계정·서버/결제는 각각 별도 경계를 확인한다.
5. 구현→영향 검사→독립 QA→수정→재검증. 최종 native/visual/FPS/권한 검증은 실제 명령·장치·원시 증거와 기록한다.

## 권한 / 산출물

이번 장기 작업에는 현재 feature의 local commit/일반 push 승인이 있다. 후속 세션은 최신 사용자 지시를 우선한다. main push/merge, PR merge, force/history rewrite, tag/release, 배포는 금지다. Git 저장 전에는 비밀·DB·의존성·.expo·생성 native·build·영상/ZIP 제외와 실제 테스트 상태를 확인한다.

로그/생성물은 ignored `mobile/evidence/mvp-engineering/`, `mobile/ios/`, `mobile/android/`다. 결정 대기열과 전체 gap/실행 보고서는 tracked Markdown/JSON에 있다. 전용 Luna/reviewer 할당은 thread limit으로 불가했으며 기존 Sol/Terra를 재사용했다. 실제 model ID는 미노출(ROUTING_UNVERIFIED).

재개 프롬프트는 AUTONOMOUS-RUN-REPORT.md 마지막 부분을 사용한다.

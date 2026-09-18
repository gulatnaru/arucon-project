# Codex 멀티모델 자율 개발 로드맵 — 모바일 본앱

버전: v1.8 · 2026-09-18  
최상위 작업: `../tasks/AUTO-00-orchestrate.md`

## 원칙

이 로드맵은 **사람 검토 게이트가 아니라 자동 품질 게이트**다. APP 단계가 PASS/PARTIAL이면 Hard Stop이 아닌 한 사용자 답변을 기다리지 않고 다음 단계로 진행한다.

| 게이트 | 결과 | 다음 단계 조건 |
|---|---|---|
| APP-01 | 설치형 모바일 셸 + 현재 아루콘 3D/입력 | renderer/input 기반이 성립 |
| APP-02 | 순수 domain + local DB | 핵심 invariant/unit+DB 검사 |
| APP-03 | 방/급식/생활 UI 통합 | 로컬 life loop/E2E |
| APP-04 | onboarding + activity adapter scaffold | synthetic activity end-to-end |
| APP-05 | sleep/shop/widget scaffold | 미정 정책을 interface/flag로 격리 |
| APP-06 | 통합 QA + developer build | 전체 보고/재개점 |

## 사람에게 돌아오는 시점

`hard-stops.md`에 해당하는 작업이 필요하고 독립 작업이 더 없을 때, 또는 APP-06 종료 시점뿐이다.

## 이후

사용자가 Hard Stop 결정을 내려 실제 HealthKit/Health Connect, 서버 auth/sync, 수면 scorer, 결제, 운영 배포를 승인하면 기존 S/D 단계의 해당 항목을 재개한다. PC/위젯 추가 교감/Android 배경화면/P2/P3는 별도 범위다.

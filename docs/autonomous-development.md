# 멀티모델 자율 개발 운영 — v1.9

작성일: 2026-09-18  
상태: **ENG-03 사용자 승인 / 제품 요구 v1.8 유지**

## 목표
루트 GPT-6 Astra는 계획·분해·통합과 어려운 판단을 맡고, 실제 하위 작업은 비용/난이도에 맞춰 Sol/Terra/Luna/Spark로 라우팅한다. APP-01~06 사이에서 사람의 중간 검토를 기다리지 않되 제품 결정·민감정보·결제·배포 권한은 위임하지 않는다.

## 게이트 루프
1. Astra가 현재 APP의 결과/제약/검증/멈출 지점을 확정한다.
2. 코드베이스 탐색이 넓으면 `arucon_explorer`(Terra)에게 맡긴다.
3. 비사소한 구현은 `arucon_builder`(Sol), 좁은 반복은 `arucon_luna_worker`, 짧은 즉답형 편집은 사용 가능할 때 `arucon_spark_worker`에 배정한다.
4. 변경에 맞는 lint/typecheck/unit/integration/build와 필요한 실제 화면/모션 증거를 실행한다.
5. `arucon_reviewer`(Terra High)가 읽기 전용으로 diff + FR/DEC + 증거를 검토한다.
6. 결함은 적합한 워커에게 재배정한다. 같은 근본 원인 3회 실패 시 가지를 BLOCKED로 격리하고 독립 범위를 계속한다.
7. PASS/PARTIAL 후 사용자 응답을 기다리지 않고 다음 APP으로 간다.

## 라우팅 원칙
Astra가 직접 코딩하는 것은 예외다. 두 하위 모델의 결과가 충돌하거나, 교차 모듈 원인이 복잡하거나, Sol까지 실패한 고난도 문제처럼 높은 판단 가치가 있을 때만 루트가 직접 구현/수정할 수 있다.

각 역할의 정확한 모델과 행동은 `docs/model-routing.md`와 `.codex/agents/*.toml`이 기준이다.

## OPEN 제품 결정
OPEN 값을 그럴듯한 default로 채우지 않는다. interface, feature flag 기본 OFF, devFixture, NotConfigured/DecisionRequired로 격리한다. 독립 작업은 계속한다.

## Hard Stop
`docs/hard-stops.md`를 따른다. 한 가지 Hard Stop이 한 branch만 막으면 해당 branch만 `SKIPPED_HARD_STOP`으로 두고 나머지를 계속한다.

## 보고
진행률만 알리려고 멈추지 않는다. 모든 가능한 APP 범위를 끝냈거나 Hard Stop이 모든 남은 meaningful work를 막을 때만 사람에게 돌아온다. 최종 보고에는 단계별 결과와 함께 **요청 모델/실제 모델 확인 상태**(`ROUTING_OK`, `ROUTING_UNVERIFIED`, `ROUTING_MISMATCH`)를 기록한다.

# AUTO-00 — 멀티모델 자율 모바일 개발 오케스트레이션

작업 유형: 장기 연속 개발 / 최상위 작업  
루트 모델: **GPT-6 Astra**  
하위 역할: `docs/model-routing.md`

## 최종 목표
사용자 중간 검토 없이 가능한 범위의 아루콘 설치형 모바일 앱 개발을 APP-01부터 APP-06까지 연속 수행한다. 루트 Astra는 모든 구현을 직접 하지 않고 난이도/반복성에 맞는 하위 역할을 사용한다.

## PRECHECK — 코드 수정 전
1. `AGENTS.md`, 이 파일, `docs/model-routing.md`, `docs/autonomous-development.md`, `docs/hard-stops.md`를 읽는다.
2. 루트가 GPT-6 Astra인지 확인한다. 아니라면 `BLOCKED_ROOT_MODEL`로 중단한다.
3. `.codex/agents/*.toml`의 요청 모델을 확인한다: Sol builder, Terra explorer/reviewer, Luna repetitive worker, optional Codex-Spark worker.
4. 가능하면 각 역할을 아주 작은 read-only/무해한 probe로 1회만 띄워 effective model metadata를 확인한다. 하위 역할이 Astra로 실행된 것이 확인되면 반복 사용하지 말고 `ROUTING_MISMATCH`를 기록한다. 런타임이 모델 메타데이터를 제공하지 않으면 `ROUTING_UNVERIFIED`로 기록하고 실제 모델을 단정하지 않는다.
5. OS, Node/package manager, Git 상태, Xcode/Android SDK/Java 등 설치 도구를 탐색한다. 관리자 설치를 요구하지 않는다.
6. 기존 사용자 변경을 보존하고 `AUTONOMOUS-STATUS.json`을 생성/갱신한다.

## 실행 순서
`APP-01-mobile-shell.md` → `APP-02-domain-storage.md` → `APP-03-life-room-integration.md` → `APP-04-onboarding-activity-adapter.md` → `APP-05-sleep-shop-widget-scaffold.md` → `APP-06-integration-qa.md`

## 기본 위임
- 넓은 탐색/대량 읽기 → `arucon_explorer`
- 비사소한 구현/아키텍처/교차 모듈 수정 → `arucon_builder`
- 반복적인 파일/fixture/명명/좁은 테스트 추가 → `arucon_luna_worker`
- 작은 UI/코드 즉답형 반복 → 사용 가능할 때 `arucon_spark_worker`
- 게이트 독립 검토 → `arucon_reviewer`
- 충돌 통합/고난도 교착/최종 판정 → 루트 Astra

작은 작업을 굳이 Astra가 직접 처리하지 않는다. 반대로 제품 안전/정합성 판단이 필요한 일을 Luna/Spark에 맡기지 않는다.

## 각 브리핑 형식
하위 역할에 보낼 메시지에는 반드시 다음 네 항목을 넣는다.
- 결과
- 제약/수정 허용·금지 범위
- 검증 명령 또는 증거
- 멈출 지점

## 검증/리뷰
각 APP는 변경 영향에 맞는 검사와 저장소 필수 검사를 실행한다. UI/모션은 실제 앱 렌더 증거를 남긴다. `arucon_reviewer`가 독립 검토하고, 결함은 적합한 워커에게 재배정한다. 같은 근본 원인은 최대 3회 수정 루프 후 BLOCKED 처리한다.

## Hard Stop / Git / 외부 반영
`docs/hard-stops.md`를 적용한다. 로컬 수정은 허용하지만 사용자 명시 승인 없이 commit/push/merge/배포/외부 계정 생성/공유 변경을 하지 않는다.

## 종료 산출물
- `AUTONOMOUS-RUN-REPORT.md`
- `AUTONOMOUS-STATUS.json` (각 APP 상태 + routing 상태 포함)
- 앱 소스/lockfile
- 테스트/빌드 로그
- 실제 앱 캡처/영상
- `docs/adr/`
- Hard Stop과 `NEXT-RESUME.md`

최종 보고는 자율 허용 범위와 미완 범위를 분리하며, 요청한 하위 모델과 실제 모델이 확인됐는지도 별도로 표시한다.

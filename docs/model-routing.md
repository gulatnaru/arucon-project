# 아루콘 v1.9 — 멀티모델 라우팅

상태: ENG-03 개발 운영 규칙. 제품 요구는 v1.8 SRS에서 변경하지 않는다.

## 목적
Astra의 장기 계획·통합 능력은 유지하되, 탐색·리뷰·반복 수정을 전부 Astra에 태우지 않는다. 공유 `AGENTS.md`에는 모든 모델에게 필요한 사실/완료 조건만 두고, 모델별 행동 지시는 `.codex/agents/*.toml`로 분리한다.

## 기본 라우팅

| 역할 | 모델 | 추론 | 권한 | 사용 시점 |
|---|---|---:|---|---|
| root orchestrator | GPT-6 Astra | high | workspace-write | APP 게이트 조율, 교차 모듈 판단, 막힌 가지 통합, 최종 보고 |
| `arucon_builder` | GPT-5.6 Sol | high | workspace-write | 상태 머신, 저장/네이티브 경계, 비사소한 구현·버그 |
| `arucon_explorer` | GPT-5.6 Terra | medium | read-only | 3개 이상 파일 탐색, 대량 읽기, 호출 경로/테스트 위치 수집 |
| `arucon_reviewer` | GPT-5.6 Terra | high | read-only | 독립 QA, diff/FR/DEC/증거 대조 |
| `arucon_luna_worker` | GPT-5.6 Luna | low | workspace-write | 좁고 반복적인 수정, fixture, 명명/스키마 반복, 단순 테스트 추가 |
| `arucon_spark_worker` | GPT-5.3-Codex-Spark | runtime default | workspace-write | 사용 가능할 때 짧은 UI/코드 즉답형 반복. 긴 작업에는 사용 안 함 |

## Astra 사용 기준
Astra는 기본 구현자가 아니다. 다음에 우선 사용한다.
- APP 간 의존 관계와 작업 분해
- OPEN 결정과 구현 가능한 범위 분리
- 두 개 이상의 하위 역할 결과가 충돌하는 통합 판단
- Sol/Terra가 반복 실패한 교차 모듈 원인 분석
- 최종 게이트와 Hard Stop 판단

한 파일의 단순 수정, 검색, fixture 대량 생성, 스타일 미세 조정은 Astra가 직접 수행하지 않는 것을 기본값으로 한다.

## 위임 브리핑 4요소
모든 하위 역할에 아래 네 가지를 쓴다.
1. **결과** — 완료됐을 때 무엇이 존재/동작하는가
2. **제약** — 수정 허용/금지 파일, 제품 불변식, 권한
3. **검증** — 실행할 정확한 targeted check 또는 완료 증거
4. **멈출 지점** — 범위 밖 실패, 제품 결정, 외부 권한에서 어디서 반환할지

## 실패/폴백
- Spark 미지원/거부 → Luna(반복) 또는 Terra/Sol(의미 판단 필요)로 재라우팅.
- Luna 미지원 → Terra medium으로 재라우팅. Astra로 바로 올리지 않는다.
- Terra 미지원 → Sol로 재라우팅하되 탐색/리뷰 범위를 좁힌다.
- Sol 미지원 또는 고난도 통합이 계속 막힘 → Astra가 해당 가지를 직접 처리할 수 있다.
- 자식 역할이 실제로 Astra를 상속한 것이 런타임 증거로 확인되면 반복 호출을 중지하고 `ROUTING_MISMATCH`를 기록한다.
- 런타임이 실제 모델 메타데이터를 노출하지 않으면 `ROUTING_UNVERIFIED`로 기록하며, 요청한 역할/모델을 실제 사용했다고 단정하지 않는다.

## 검증 범위
공유 파일의 "항상 전체 테스트" 같은 절차 잔소리를 사용하지 않는다. 완료 조건은 "변경에 맞는 검사 + 저장소 필수 검사"다. Luna/Spark처럼 절차 지원이 필요한 역할에는 각 TOML에 targeted check 실행을 명시한다.

## 스킬 원칙
- description은 실제 적용 시점만 짧게 쓴다.
- Figma 원격 쓰기 스킬은 `allow_implicit_invocation: false`로 두고 사람이 명시적으로 시작한 작업에서만 호출한다.
- 검증 스킬은 완료 조건 중심으로 유지하고, 작은 무관 변경까지 끌어당기지 않는다.

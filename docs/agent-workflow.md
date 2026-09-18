# 아루콘 — AI 개발 운영 v1.9

2026-09-18 · ENG-03 · 제품 요건이 아닌 개발 방식 개정

## 1. 구조
공유 `AGENTS.md`에는 모든 모델에게 필요한 제품 사실·완료 조건·권한 경계만 둔다. 특정 모델에게 필요한 절차/잔소리는 `.codex/agents/*.toml`에 둔다. 스킬은 실제 발동 범위를 좁게 유지한다.

| 역할 | 모델 | 책임 | 권한 |
|---|---|---|---|
| 루트 | GPT-6 Astra high | 분해·우선순위·통합·Hard Stop·최종 판정 | workspace-write |
| `arucon_builder` | GPT-5.6 Sol high | 고난도 구현·아키텍처·교차 모듈 버그 | workspace-write |
| `arucon_explorer` | GPT-5.6 Terra medium | 코드/문서/테스트 위치와 호출 경로 탐색 | read-only |
| `arucon_reviewer` | GPT-5.6 Terra high | 독립 QA와 증거 대조 | read-only |
| `arucon_luna_worker` | GPT-5.6 Luna low | 좁고 반복적인 수정·fixture·테스트 추가 | workspace-write |
| `arucon_spark_worker` | GPT-5.3-Codex-Spark | 짧고 표적화된 즉답형 코딩 반복 | workspace-write |

## 2. 배정 기준
Astra는 기본 코드 작성자가 아니다. 넓은 탐색은 Terra, 복잡한 구현은 Sol, 반복 편집은 Luna, 짧은 인터랙티브 수정은 Spark에 먼저 배정한다. 두 하위 결과가 충돌하거나 Sol까지 막힌 교차 모듈 문제는 Astra가 직접 해결할 수 있다.

모든 브리핑은 **결과 / 제약·허용 파일 / 검증 / 멈출 지점**을 포함한다. 같은 파일의 동시 작성자는 하나다. 읽기 역할은 코드를 고치지 않는다.

## 3. 검증
"항상 전체 테스트"가 아니라 변경에 맞는 검사 + 저장소 필수 검사가 완료 조건이다. Luna/Spark에는 브리핑에 targeted check를 명시한다. reviewer는 실제 diff와 실행 증거를 읽고 PASS/PARTIAL/BLOCKED/확인 불가를 분리한다.

## 4. 진행
APP-01~06은 게이트마다 사용자 답변을 기다리지 않는다. OPEN/PROPOSED 제품 결정은 interface/feature flag/dev fixture/DecisionRequired로 격리한다. 한 branch가 막혀도 독립 작업은 계속한다.

## 5. 비용/라우팅 보호
- 자식이 Astra를 상속한 것이 확인되면 반복 사용하지 않는다.
- Luna 미지원은 Terra로, Terra 미지원은 Sol로, Sol이 막힌 고난도 문제만 Astra로 올린다.
- Spark 미지원은 정상 폴백이며 전체 실행을 막지 않는다.
- 실제 모델을 확인하지 못하면 요청 모델과 실제 모델을 구분해 `ROUTING_UNVERIFIED`로 보고한다.

## 6. 권한
로컬 수정·합성 fixture·프로젝트 로컬 검사/빌드는 허용한다. 실제 건강정보, 실결제, 외부 계정/클라우드 생성, 공개 배포, push/merge, 공유 변경, 파괴적 삭제는 별도 승인이다. 자세한 내용은 `hard-stops.md`.

## 7. 최종 보고
`AUTONOMOUS-RUN-REPORT.md`와 `AUTONOMOUS-STATUS.json`에 APP별 상태, 명령/증거, routing 상태, Hard Stop, Git/외부 반영 여부를 남긴다. 자식의 완료 문구만으로 총괄 완료를 선언하지 않는다.

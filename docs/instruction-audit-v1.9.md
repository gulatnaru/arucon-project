# v1.8 → v1.9 지시문 감사 결과

## 결론
v1.8은 공유 AGENTS를 줄이고 역할 파일을 분리하는 구조는 반영했지만, **비용 절감을 위한 모델별 라우팅은 반영하지 못했다.**

실제 v1.8의 `arucon_explorer.toml`, `arucon_reviewer.toml`, `arucon_worker.toml`에는 `model`과 `model_reasoning_effort`가 없었고, 주석에 `inherit from the parent session`이라고 적혀 있었다. 루트 `config.toml`은 `gpt-6-astra`였으므로 하위 역할도 부모 Astra를 상속하는 구성이다.

## v1.9에서 이동한 것
- 공유 AGENTS: 제품 사실, 완료 조건, 권한 경계, 역할 안내판만 유지.
- Sol/Terra/Luna/Spark별 행동 지시: `.codex/agents/*.toml`로 이동.
- 검증 절차: 스킬에는 완료 조건 + 기본 절차로 유지. 공유 AGENTS는 발동 조건만 가리킨다.
- Figma 원격 쓰기 스킬: 자동 선택 OFF.
- 자율 오케스트레이터: Astra가 모든 구현을 직접 하지 않고 역할별 위임을 우선하도록 수정.

## 삭제/완화한 부채
- 모든 하위 에이전트가 Astra를 상속한다는 전제.
- APP마다 동일한 "모든 테스트"를 반복하는 표현.
- 탐색자가 전체 docs를 미리 읽는 방식.
- 진행 보고를 위해 사용자 승인을 기다리는 게이트.

제품 안전 경계와 외부 쓰기 Hard Stop은 모델별 잔소리가 아니라 저장소 사실/권한 경계이므로 공유 문서에 유지한다.

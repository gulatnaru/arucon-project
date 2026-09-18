# 적용 안내 — v1.9 멀티모델 프로젝트 설정

이 ZIP은 프로젝트 로컬 Codex 설정이다. 사용자 전역 `~/.codex`나 기존 저장소를 이미 바꾼 것이 아니다. 기존 설정이 있으면 덮어쓰기보다 diff/병합한다.

## 역할 모델
- 루트: GPT-6 Astra high — 오케스트레이션·통합
- `arucon_builder`: GPT-5.6 Sol high — 고난도 구현
- `arucon_explorer`: GPT-5.6 Terra medium — read-only 탐색
- `arucon_reviewer`: GPT-5.6 Terra high — read-only 리뷰
- `arucon_luna_worker`: GPT-5.6 Luna low — 좁은 반복 수정
- `arucon_spark_worker`: GPT-5.3-Codex-Spark — 사용 가능할 때 짧은 표적 코딩

정확한 라우팅 규칙과 폴백은 `model-routing.md`가 기준이다.

## 첫 적용
1. 현재 Git 상태와 사용자 변경을 확인한다.
2. 기존 `.codex/config.toml`의 더 엄격한 sandbox/approval/조직 정책은 보존한다.
3. 최신 Codex 앱/CLI에서 이 프로젝트의 `.codex/agents/*.toml`이 로드되는지 확인한다.
4. 가능하면 작은 무해한 probe로 각 역할의 effective model을 확인한다. 실제 모델 메타데이터가 보이지 않으면 `ROUTING_UNVERIFIED`로 기록한다.
5. 하위 역할이 Astra로 상속된 것이 확인되면 반복 호출하지 않고 설정/세션을 고친 뒤 재시도한다.
6. `python validation/check_workflow.py`를 실행해 프로젝트 로컬 정적 계약을 확인한다.

## 권한
탐색/리뷰는 read-only다. Sol/Luna/Spark 워커만 workspace-write다. 실제 건강정보·결제·외부 계정·공개 배포·push/merge 등은 `hard-stops.md`를 따른다. 모델이 강하다는 이유로 권한을 넓히지 않는다.

## 스킬
게임/시각 검증 스킬은 좁은 조건에서 자동 선택할 수 있다. Figma 원격 쓰기 스킬은 `allow_implicit_invocation: false`이며 사람이 명시한 작업에서만 호출한다. 현재 스킬 수가 작아 역할별 skills.config는 넣지 않았고, 실제 오발동/컨텍스트 과부하가 관찰될 때 추가한다.

## 한계
이 패키지는 요청 모델을 설정하지만 실제 런타임이 해당 역할을 그 모델로 실행했는지는 호스트에서 확인해야 한다. Spark는 research preview/가용성에 따라 호출이 거부될 수 있으므로 실패 시 Luna/Terra로 폴백한다.

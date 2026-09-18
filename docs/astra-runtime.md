# Codex 멀티모델 런타임 메모 — 2026-09-18

이 파일은 제품 요구가 아니라 실행 전제다. 최신 OpenAI 안내는 실행 시 다시 확인한다.

- 루트 오케스트레이터 기본 모델: `gpt-6-astra`, high.
- 하위 역할은 `docs/model-routing.md`와 `.codex/agents/*.toml`의 explicit model을 사용한다.
- 현재 요청 모델: Sol builder, Terra explorer/reviewer, Luna repetitive worker, optional GPT-5.3-Codex-Spark worker.
- Astra를 Codex에서 쓰려면 최신 지원 앱/CLI가 필요하다. 현재 OpenAI Help Center는 Astra에 Codex CLI 0.153.0 이상을 안내한다.
- 실제 플랜/롤아웃/클라이언트가 특정 하위 모델을 지원하지 않을 수 있다. AUTO-00의 routing probe/폴백을 적용한다.
- 하위 역할이 요청 모델 대신 Astra를 상속한 것이 확인되면 비용 보호를 위해 반복 호출하지 않는다.
- 실제 child-session model metadata를 볼 수 없으면 `ROUTING_UNVERIFIED`로 기록하고 요청 모델을 실제 사용했다고 주장하지 않는다.

공식 확인 위치:
- https://help.openai.com/en/articles/20001354
- https://help.openai.com/en/articles/20001516
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/guides/latest-model
- https://openai.com/index/introducing-gpt-5-3-codex-spark/

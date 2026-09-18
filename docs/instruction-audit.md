# 지시문 감사 — 현재판 안내

이 파일의 이전 v1.6 감사 내용은 `references/v1.8-routing-legacy/`에 보존했다. 현재 멀티모델 감사 결과는 `instruction-audit-v1.9.md`를 기준으로 한다.

핵심 변화는 공유 AGENTS를 사실/완료 조건 중심으로 유지하고, Sol/Terra/Luna/Spark의 모델별 행동 지시를 각 `.codex/agents/*.toml`로 이동한 것이다. v1.8처럼 모든 역할이 부모 Astra를 상속하지 않도록 explicit model을 지정했다.

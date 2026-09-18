# Codex 앱 착수 — 멀티모델 자율 실행 v1.9

이제 APP-01만 실행하고 멈추는 방식이 아니다. 루트 Astra가 `AUTO-00`을 읽고 APP-01~06을 가능한 범위까지 조율하되, 실제 작업은 `model-routing.md`에 따라 Sol/Terra/Luna/Spark로 위임한다.

## 시작
`CODEX-START.txt`의 문장을 그대로 실행한다.

## 처음 확인할 것
1. 루트 Astra 활성 여부.
2. `.codex/agents/*.toml`의 explicit model 로드 여부.
3. 가능하면 작은 role probe로 effective model 확인. 확인 불가면 ROUTING_UNVERIFIED.
4. Git/도구/Xcode/Android SDK/Node 상태.
5. 사용자 기존 변경 보존.

## 진행
APP 게이트는 사용자 중간 승인 없이 이어간다. Terra reviewer의 독립 검토와 변경 영향 검사를 통과해야 다음 단계로 간다. 제품 OPEN/Hard Stop은 해당 branch만 격리하고 독립 작업을 계속한다.

Astra가 모든 코드를 직접 작성하는 방식은 v1.9의 기본 운영이 아니다.

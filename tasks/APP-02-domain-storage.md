# APP-02 — 순수 도메인 엔진 + 로컬 저장

자율 게이트: **G2 / APP-01 이후 자동 진행**  
관련: SRS 4-3, FR-3~9/13/17~20, DEC-02~08/19~25/32

## 권장 역할
- 엔진/트랜잭션/DB 경계: `arucon_builder`
- 기존 규칙/테스트 위치 탐색: `arucon_explorer`
- 반복 schema fixture·테스트 케이스 확장: `arucon_luna_worker`
- 정합성 리뷰: `arucon_reviewer`

## 목표

현재 웹 UI 코드를 그대로 옮기지 말고, SRS 기준으로 **UI와 독립된 TypeScript 도메인 엔진 + 로컬 저장 경계**를 모바일 앱에 만든다. 미정 숫자/정책은 dev fixture로 격리한다.

## 구현

1. `domain/` 또는 동등 계층에 순수 상태/명령/이벤트 엔진을 둔다. 시스템 시계·네트워크·OS API를 직접 읽지 않는다.
2. config schema를 만들고 원문/승인값과 `DEV_FIXTURE_ONLY` 값을 구분한다. OPEN 값을 운영 default로 가장하지 않는다.
3. Activity input → food/coin, 실제 meal consume → EXP, stamina/mood/cleanliness/hibernation의 확정 불변식을 구현한다. 세부 수치가 OPEN이면 정책 port로 주입한다.
4. direct feeding과 opt-in table auto feeding은 **같은 consumeMeal 경로/효율**을 사용하게 설계한다.
5. 무료 가벼운 touch/greet/observe는 stamina/coin/food/EXP를 바꾸지 않는 명령/표시 경계를 둔다.
6. SQLite 또는 증거가 더 좋은 프로젝트 로컬 DB를 provisional ADR로 선택해 schema version, transaction, commandId/idempotency, migration baseline을 만든다.
7. `speciesFamily`, `givenName`, `formId`, `personalityProfileId`를 분리하고 `CharacterFormCatalog`을 사용한다. DEC-08 resolver는 `DecisionRequired/NotConfigured`다.
8. 앱 종료/복귀 시 로컬 snapshot과 pending command가 중복 정산되지 않게 한다.

## 금지/Hard Stop

실제 서버/Firebase 생성, 실제 auth, 실제 health data, 실제 진화 분기 임계값, 실제 수면 scorer, 실제 상품 가격을 만들지 않는다.

## 검증

- 순수 engine unit tests: 걷기만으로 EXP 0, 걷기로 stamina 감소 없음, 무료 교감 자원 중립, meal에서만 EXP, food cap 기존 재고 보존, sick 원인=청결, 약 없이 회복 가능한 계약, hibernation 부정 진행 정지.
- direct/auto meal 동일 입력이면 경제 결과 동일.
- duplicate commandId/reload/migration 최소 케이스.
- DB integration test를 실제 실행.
- reviewer가 UI에 게임 규칙이 새어 들어갔는지 검사.

## 게이트 판정

순수 테스트와 저장 integration이 통과하면 PASS 후 APP-03 자동 진행. OPEN 세부 때문에 일부 계산이 dev fixture면 해당 부분은 PARTIAL이지만 구조/불변식이 검증되면 APP-03은 진행한다.

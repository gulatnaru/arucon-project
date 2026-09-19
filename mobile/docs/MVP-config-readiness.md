# CONFIG-01 MVP 밸런스 준비 상태

기준: `arucon-SRS.md` v1.8 9장·13장·14장, `decisions.md` v1.8. 이 파일은 숫자를 승인하지 않는다.

## 단일 레지스트리

`src/config/balanceRegistry.ts`의 `MVP_BALANCE_REGISTRY`가 모바일 MVP 숫자의 단일 소유자다. `schemaVersion=1`, `version=mvp-balance-registry-v1`이며 다음 세 경계를 분리한다.

- `source`: SRS 9장 원문 시작값. 활동→먹이/코인, 실제 섭취 EXP, 레벨 구간 참고값, 수면 점수→배율 곡선, 체력, 청결·기분·기운 없음, 약 50코인이다.
- `devFixture`: 합성 로컬 생활 루프에만 필요한 제안값. 정밀도 단위, 배고픔, 섭취성 배설, 동면, 식탁·화장실 미리보기 가격을 포함한다. `DEV_FIXTURE_ONLY`이며 운영 기본값이 아니다.
- `unresolved`: 값 대신 `null`, `DECISION_REQUIRED`, DEC ID를 저장한다. 배고픔 운영값, 수면 scorer/적용 정책, 적극적 놀이 체력 비용 적용, 시설·가구·체력 아이템 가격, 실제 코스메틱 카탈로그가 여기에 있다.

`requireBalanceDecision()`은 미결정 값을 숫자 0이나 DEV 값으로 대체하지 않고 `BalanceDecisionRequired`를 던진다.

## 기존 모듈 호환

- `src/domain/config.ts`: `SOURCE_BALANCE`, `DEV_GAME_CONFIG`, `DecisionRequired` 이름을 유지하면서 레지스트리에서 투영한다. 저장 원장에 쓰는 config version도 레지스트리 version이다.
- `src/sleep/config.ts`: SRS 원문 curve와 no-data 1.0만 투영한다. 실제 기록→점수 scorer와 대표 수면/혜택 확정은 DEC-05 결정 대기다.
- `src/shop/index.ts`: 약 50코인만 `source_value`다. 식탁 60·화장실 80은 기존 DEV fixture로 명시한다. 가구 가격은 `null/decision_required`, 현금 코스메틱 구매는 disabled 상태다.

## SRS 14/14-1 판정에 미치는 범위

| 항목 | CONFIG-01 판정 | 근거/남은 조건 |
|---|---|---|
| 활동·급식·EXP·청결 계산의 숫자 출처 | 충족 | 단일 versioned registry와 투영 테스트 |
| 합성 로컬 생활 루프 | 충족 | DEV 값은 명시적으로 격리 |
| 실제 수면 scorer 및 혜택 운영 정책 | 결정 대기 | DEC-05 |
| 배고픔·시설 가격·성장 기간 운영 밸런스 | 결정 대기 | DEC-24, 가격은 DEC-09도 필요 |
| 실제 상품 목록·체력 아이템·현금 코스메틱 | 결정 대기 | DEC-09, 실결제는 HS-03 |
| P2/P3 숫자 실행 | 해당 단계 범위 밖 | source 레지스트리에 실행 설정을 만들지 않음 |

단위 테스트 통과는 플레이테스트, 실제 수면 정확성, 실결제, 법률 검토, 운영 수치 승인을 대체하지 않는다.

## 검증

`tests/config/balanceRegistry.test.ts`는 registry version·동결, domain/sleep/shop 동일 출처, 미결정 값의 DecisionRequired를 검사한다. 기존 domain/sleep/shop 테스트는 투영 후 계산과 quote 회귀를 검사한다.

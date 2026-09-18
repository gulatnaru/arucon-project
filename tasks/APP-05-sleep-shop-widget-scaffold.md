# APP-05 — 수면·상점·위젯 scaffold

자율 게이트: **G5 / 실제 scorer·실결제는 Hard Stop**  
관련: FR-6/11/12, FR-NF.5, DEC-05/09/13/14/29~31

## 권장 역할
- 수면/상점/위젯 경계: `arucon_builder`
- 관련 플랫폼/기존 코드 탐색: `arucon_explorer`
- catalog/fixture/UI 반복: `arucon_luna_worker` 또는 짧은 편집은 `arucon_spark_worker`
- read-only/경제 경계 리뷰: `arucon_reviewer`

## 목표

미정 정책을 억지로 확정하지 않고도 수면·상점·위젯의 **교체 가능한 경계와 로컬 개발 흐름**을 만든다.

## 수면

- `SleepScoreProvider`/`SleepBenefitPolicy`를 분리한다.
- `SyntheticSleepProvider`로 null/0/70/100 fixture를 제공하되 의료/건강 판단으로 표현하지 않는다.
- 실제 원시 수면→0~100 scorer는 DEC-05 OPEN이므로 `NotConfigured` 기본.
- 수면 원본을 서버/일반 로그로 보내는 코드 경로를 만들지 않는다.

## 상점

- 로컬 catalog/schema와 UI를 구현한다. utility는 **coin only** invariant를 코드/테스트로 강제한다.
- cosmetic cash 항목은 payment port 뒤 disabled placeholder로만 둘 수 있다. 실상품/가격/결제 SDK 연결 금지.
- 화장실/식탁/가구의 기능과 가격/해금은 분리한다. OPEN 가격은 dev fixture.

## 위젯

- read-only `PetProjection`/snapshot을 만들어 펫 모습·짧은 상태·lastUpdated·앱 진입만 제공한다.
- 위젯에서 meal/EXP/coin/회복/동면 재개 명령을 실행하지 않는다.
- 가능한 OS에서 local widget extension scaffold/build를 시도할 수 있다. signing/외부 계정 필요 시 확인 불가/Hard Stop으로 격리.
- 추가 위젯 인사 반응/배경화면은 현재 기본 범위에 넣지 않는다.

## 검증

- sleep null과 fixture score 적용 경계, raw data leak 없음.
- utility cash path가 코드상 불가능.
- widget projection은 read-only이고 경제 command API를 노출하지 않음.
- widget stale timestamp/error state UI test.

## 게이트 판정

Scaffold/로컬 흐름/테스트가 통과하면 실제 sleep scorer/payment/widget signing이 없어도 PARTIAL로 APP-06 진행한다.

# APP-04 — 온보딩 + 활동 adapter scaffold

자율 게이트: **G4 / 실제 건강정보는 Hard Stop**  
관련: FR-1, FR-2, FR-NF.1/2, DEC-01/02/11/12/15/17

## 권장 역할
- Health adapter 경계/상태 모델: `arucon_builder`
- 플랫폼 코드/문서 위치 탐색: `arucon_explorer`
- synthetic fixture·상태 케이스 반복: `arucon_luna_worker`
- 권한/프라이버시 리뷰: `arucon_reviewer`

## 목표

실제 건강정보를 읽지 않고도 온보딩과 활동 데이터 경계를 완성한다. 나중에 HealthKit/Health Connect를 연결해도 도메인 엔진을 바꾸지 않는 구조를 만든다.

## 구현

1. 로컬 개발용 onboarding: 이름 본문 + 고정 `콘`, 공통형 아루콘 1마리. 초기값 중 OPEN은 dev fixture임을 코드/테스트에 명시.
2. 연령/guardian consent 상태 모델과 화면 flow를 만들 수 있으나 실제 법적 검증 완료로 표시하지 않는다. 실제 가입/외부 auth는 연결하지 않는다.
3. `ActivityProvider` port와 `SyntheticActivityProvider`를 구현한다. normalized activity는 APP-02의 food/coin reconciliation에만 전달하고 EXP/stamina를 직접 건드리지 않는다.
4. iOS HealthKit / Android Health Connect의 native adapter **scaffold**를 공식 현재 API에 맞춰 작성할 수 있다. 실제 데이터 read와 permission prompt는 feature flag 기본 OFF.
5. capability/permission denied/unavailable/empty/partial/error 상태를 구분한다. 빈 결과를 무조건 권한 거부나 0걸음으로 판정하지 않는다.
6. background/reconciliation 계약은 synthetic test clock으로 검증한다. 실제 OS background delivery는 실기기 Hard Stop/확인 불가로 남길 수 있다.

## Hard Stop

실제 Health permission을 요청해 실제 기록을 읽으려는 순간 HS-01. 실제 Apple/Google OAuth/Firebase 계정을 만들려는 순간 HS-02.

## 검증

- synthetic walking/running → food/coin, EXP 직접 변화 없음, stamina 변화 없음.
- duplicate/reordered activity input idempotency.
- onboarding naming: `givenName`과 `콘`, `formId=arucon` 분리.
- permission/capability UI states snapshot/UI test.
- native compile/typecheck 가능한 범위와 실기기 미검증 범위를 분리.

## 게이트 판정

Synthetic provider + UI + adapter contracts가 통과하면 실제 건강 연결이 Hard Stop이어도 APP-05로 자동 진행한다.

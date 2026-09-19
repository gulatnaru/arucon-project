# MVP 전체 gap matrix

기준: SRS v1.8 §14의 19항목과 §14-1의 11게이트. 2026-09-19 시작 HEAD `c99a4c0`, feature/arucon-mobile-autonomous. APP 단계 완료와 MVP 완료는 다르다. 이 문서는 이번 실행 중 갱신한다.

분류는 PASS / IMPLEMENTABLE_NOW / NEEDS_DEVICE_VALIDATION / BLOCKED_ENV / HARD_STOP_DECISION / HARD_STOP_EXTERNAL이다. 아래 최초 분류는 작업 우선순위용 시작 기록이며, 최종 요구 판정은 마지막 표를 사용한다. 부분적인 합성 테스트 성공은 전체 PASS를 뜻하지 않는다. NEEDS_DEVICE_VALIDATION 작업의 현재 호스트 실행은 SDK 부재로 BLOCKED_ENV다. 결정 미정이어도 분리 가능한 구현은 아래 작업 목록으로 추적한다. M03/04/06/09/10/11/16, V02/04/07은 기기/로컬 검증 외에도 해당 행의 DEC 승인이 필요하다.

## §14 전체

| ID | SRS 요구 | 최초 분류 | 현재 구현 / 남은 일 |
|---|---|---|---|
| M01 | 가입·연령 확인·콘 접미사 명명 | HARD_STOP_DECISION | DEV 이름/합성 연령 있음. 동의 DEC-11/15, 실제 계정 HS-02 |
| M02 | 걸음→먹이·코인·상한·폴백 | HARD_STOP_DECISION | 합성 집계/상한 있음. DEC-01/02, 실제 건강 HS-01. 기본 OFF native 준비 가능 |
| M03 | 직접/자동 공통 식사·부재 정산·중복 방지 | NEEDS_DEVICE_VALIDATION | 공통 엔진/SQLite 있음. 실제 중단·복귀 미실행, 운영 DEC-03/25 미정 |
| M04 | 기본 화장실 무유지비·자동 처리 | NEEDS_DEVICE_VALIDATION | 로컬 설치 fixture/자동 처리 있음. 실제 앱 미실행, 가격은 DEC-24 |
| M05 | 성격·무료 교감·취향/현재 상태 분리 | NEEDS_DEVICE_VALIDATION | 두 성격/자원 중립/형태 분리 있음. 렌더·입력 미실행 |
| M06 | 가구 생활·기록 일지·자동화 비서열 | NEEDS_DEVICE_VALIDATION | 생활 서비스/커밋 이벤트 일지 있음. 가구 카탈로그 DEC-24, 화면 미실행 |
| M07 | 레벨·스테이지·성별·외형 분기 | HARD_STOP_DECISION | 명명 카탈로그만 있음. 주입형 성장 projector 가능, DEC-03/08/24 확정 필요 |
| M08 | 수면 성장 배율·회복 | HARD_STOP_DECISION | 합성 배율→섭취 있음. scorer/날짜/회복 DEC-04/05, HS-01 |
| M09 | 체력 감소 경계·저체력 행동 허용 | NEEDS_DEVICE_VALIDATION | 시간/소화 감소, 활동/무료 교감 중립 검사 있음. 적극적 놀이 DEC-24 |
| M10 | 청결 누적·청소·기분 | NEEDS_DEVICE_VALIDATION | 로컬 엔진 있음. 운영 타이머 DEC-06/24, 실제 UI 미실행 |
| M11 | 청결 방치만 기운 없음·약 없는 회복 | NEEDS_DEVICE_VALIDATION | 로컬 dirty/자연 회복 있음. 운영 DEC-06, native 미실행 |
| M12 | 배회·표정·터치 | NEEDS_DEVICE_VALIDATION | GLB/controller 있음. 실제 렌더·입력 미실행 |
| M13 | FR-10.1 방·가독성·시크·말캉 실제 검토 | BLOCKED_ENV | SDK/기기 없음. 정지 이미지·번들로 대체 불가 |
| M14 | 상점 코스메틱/코인 효율·약 경계 | HARD_STOP_DECISION | coin quote/disabled cash만 있음. DEV 원자 구매 준비 가능, DEC-09/24 및 HS-03 |
| M15 | iOS/Android 위젯 상태·갱신·앱 진입·중립 | BLOCKED_ENV | 5상태 projection만 있음. native extension 미구현, DEC-14/31 및 SDK 필요 |
| M16 | 동면 중 부정 진행 정지 | NEEDS_DEVICE_VALIDATION | 엔진 정지/복귀 있음. 운영 DEC-07, 실제 lifecycle 미실행 |
| M17 | 단일 balance config | IMPLEMENTABLE_NOW | domain/sleep/shop 분산값을 단일 registry로 연결 |
| M18 | 헬스 원본 서버 미전송 | IMPLEMENTABLE_NOW | 현재 live health/network 없음. 전송 allowlist/차단 계약 강화 |
| M19 | 비난조 없는 알림·문구 | IMPLEMENTABLE_NOW | 현재 DEV 문구 있음. disabled 알림·tone 계약 준비 |

## §14-1 전체

| ID | 게이트 | 최초 분류 | 현재 구현 / 남은 일 |
|---|---|---|---|
| V01 | 필요한 DEC 승인·SRS/config/test 일치 | HARD_STOP_DECISION | OPEN/PROPOSED를 승인으로 바꾸지 않음 |
| V02 | 중복 활동·상한·분수·과거 수정·자정 | IMPLEMENTABLE_NOW | 기존 검사에 날짜/수정 경계 행렬 보강 |
| V03 | 식사 전/중/후 종료·재시도·실패 | NEEDS_DEVICE_VALIDATION | Node SQLite 원자성 있음. 추가 로컬 failure 가능, OS 종료는 미실행 |
| V04 | 시각/난수 주입·구간분할·복합 상태 | IMPLEMENTABLE_NOW | clock/split 일부 있음. RNG 포트/복합 회귀 보강 |
| V05 | 승인 수면 예시+실제 기록 | HARD_STOP_DECISION | DEC-05 + HS-01. 합성 검사로 대체 불가 |
| V06 | 두 OS 권한/철회/재부팅/종료/지연 실기기 | BLOCKED_ENV | SDK/기기 없음. fake native 계약 준비 가능 |
| V07 | offline/재전송/다기기/복구/migration | IMPLEMENTABLE_NOW | outbox 있음. fake transport/ack/recovery/failure 보강; 실제 서비스 HS-02 |
| V08 | 실결제 검증·실패·중복·복원·환불 | HARD_STOP_EXTERNAL | DEC-09와 HS-03, 현금 경로 OFF |
| V09 | 동의/정책·원본 미전송·접근 통제 | HARD_STOP_DECISION | DEC-11 + 실제 서비스 HS-02. local synthetic 접근 차단 가능 |
| V10 | acceptance 실제 환경/명령/증거/결과 | IMPLEMENTABLE_NOW | 이번 실행 기록으로 갱신. 과거 숫자 재사용 금지 |
| V11 | 치명적 위반/차단 결함 없음·인간 출시 판단 | HARD_STOP_EXTERNAL | 독립 QA 후 판정. merge/release/deploy 미승인 |

## 실행 계획과 의존성

1. STORAGE: 보존 migration, outbox 상태·재전송/ack, synthetic recovery. 운영 정책은 주입.
2. NATIVE: 기본 OFF Health bridge·permission/lifecycle 계약, 위젯 read-only 연결 준비. 실제 읽기·SDK 설치 금지.
3. CONFIG: 단일 config registry와 미정 결정 경계.
4. DOMAIN-QA / GROWTH / SHOP / PRIVACY: 상세 탐색 후 각 독립 범위를 구현하고 영향 검사→독립 검토→수정→재검증.
5. 통합: 전체 테스트/lint/typecheck/Android·iOS JS bundle, 저장소 필수 검사, 신규 증거·잔여 gap 재감사.

현재 실행 기준 검사: `npm test` 77/77 PASS (`mobile/evidence/mvp-engineering/baseline-tests.log`). 이것은 시작 소스 기준이며 최종 변경 검증은 별도로 실행한다. 환경 재확인: Xcode exit1, simctl exit72, adb/emulator 없음 (`environment.json`). simulator/physical device 모두 NOT_RUN.

## 종료 판정용 전체 matrix

아래는 구현 가능한 부분을 분리한 뒤 남는 **SRS 요구 자체의 분류**다. PASS는 명시한 현재 코드/자동검증 범위에 한한다. 테스트 수·최종 독립 검토·실행 시각은 `AUTONOMOUS-RUN-REPORT.md`의 이번 실행 기록을 함께 확인한다.

| ID | 최종 분류 | 완료한 독립 범위 / 남은 gate |
|---|---|---|
| M01 | HARD_STOP_DECISION | 합성 명명/연령 및 계정·기기·철회 계약. DQ-06 실제 동의/가입 |
| M02 | HARD_STOP_DECISION | 집계/상한/수정/날짜 테스트, 기본 OFF native bridge. DQ-05 실제 권한·소스 지원 |
| M03 | HARD_STOP_DECISION | 공통 식사/부재 정산/SQLite 실패·재시도 검사. DQ-01 운영 순서, DQ-09 OS 종료 검증 |
| M04 | HARD_STOP_DECISION | 무유지비 자동 화장실 engine + DEV 구매 원장. DQ-04 초기 설치/가격, DQ-09 화면 |
| M05 | NEEDS_DEVICE_VALIDATION | 성격·형태 분리/무료 교감 검사. DQ-09 기기 준비 후 실제 반응/화면 |
| M06 | HARD_STOP_DECISION | 생활 service/기록 일지/자동화 동등성. DQ-04 가구 카탈로그, DQ-09 실제 화면 |
| M07 | HARD_STOP_DECISION | 순수 level/stage·RNG·확정 결과 영속 계약. DQ-03 승인 resolver 및 App 운영 연결 |
| M08 | HARD_STOP_DECISION | 합성 score→섭취 배율·원자 회복 원장. DQ-02 scorer/날짜/회복 및 실제 기록 |
| M09 | HARD_STOP_DECISION | 시간/소화·무료 교감·저체력 경계 검사. DQ-01/04 적극적 놀이 및 운영 config |
| M10 | HARD_STOP_DECISION | 배설/청소/기분·구간분할 검사. DQ-01 운영 타이머, DQ-09 실제 화면 |
| M11 | HARD_STOP_DECISION | 청결 단일 원인·약 없는 회복 검사. DQ-01 운영 타이머, DQ-09 실제 화면 |
| M12 | NEEDS_DEVICE_VALIDATION | 기존 controller/모션·입력 계약 유지. DQ-09 실제 GL/터치·배회 |
| M13 | BLOCKED_ENV | GLB 바이트 보존·빌드용 경로 정정. DQ-09 실제 가독성/영상/FPS |
| M14 | HARD_STOP_DECISION | DEV coin/ownership 원자 원장·disabled cash. DQ-04 실제 상품/효과/UI·결제 |
| M15 | HARD_STOP_DECISION | 위젯 projection/5상태·읽기 전용 native 계약. DQ-08 target/갱신, DQ-09 SDK/실제 앱 진입 |
| M16 | HARD_STOP_DECISION | 동면 정지/복귀·경계 불변성. DQ-01 운영 threshold, DQ-09 lifecycle |
| M17 | PASS | 단일 versioned registry에서 domain/sleep/shop/progression 값 투영, OPEN 값 분리 |
| M18 | PASS | 현재 구현 경로 raw/secret allowlist 및 전송 전 차단. 실제 bridge/server 연결 후 재검증 필수 |
| M19 | PASS | 현재 문구/tone 계약 검사, 실제 알림 delivery disabled. DQ-08 발송 정책 별도 |
| V01 | HARD_STOP_DECISION | OPEN/PROPOSED 유지, DQ-01~08 승인 후 SRS/config/예시 동기화 |
| V02 | HARD_STOP_DECISION | 합성 중복/cap/분수/자정/과거 수정 검사 완료. DQ-05 운영 날짜/소스 선택 |
| V03 | BLOCKED_ENV | Node SQLite failure/rollback/reload 검사 완료. DQ-09 실제 프로세스 강제 종료/재기동 |
| V04 | HARD_STOP_DECISION | clock/RNG·복합 상태·분할 불변성 및 영속 결과 재사용 계약. DQ-01/03 운영 정책 |
| V05 | HARD_STOP_DECISION | synthetic sleep 계약 완료. DQ-02 승인 예시와 HS-01 실제 기록 필요 |
| V06 | BLOCKED_ENV | fake 권한/철회/지연/재생성 계약. DQ-09 SDK와 DQ-05 실제 데이터 승인 |
| V07 | HARD_STOP_DECISION | local outbox/ack/conflict/복구 planner/migration 실패 검사. DQ-07 운영 복구/다기기 + HS-02 |
| V08 | HARD_STOP_EXTERNAL | 현금 비활성. DQ-04 승인 상품/실제 purchase 검증·복원/환불 |
| V09 | HARD_STOP_DECISION | 합성 scope/철회와 raw 차단 검사. DQ-06 법적 정책 및 실제 backend 접근 통제 |
| V10 | PASS | 이번 실행 command/cwd/환경/결과/증거를 acceptance와 실행 보고서에 별도 기록 |
| V11 | HARD_STOP_EXTERNAL | 독립 코드 QA 결과와 기기 미실행 분리. DQ-10 최종 인간 merge/release 판단 |

NEEDS_DEVICE_VALIDATION인 M05/M12를 포함한 모든 장치 실행은 이 호스트에서 BLOCKED_ENV다. 실제 Health/native widget/auth/backend/상점 운영 UI 연결·성장 resolver는 미구현 부분이 남아 있으며, 각각 명시된 DEC/SDK/민감정보 gate가 해제된 뒤 진행한다. 이 표는 앱 MVP 출시 완료 선언이 아니다.

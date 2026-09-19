# SRS MVP gap matrix — 결정 재감사 종료 기준

2026-09-19 · 시작 a8aa900 · SRS §14의 19개와 §14-1의 11개를 모두 포함한다. APP 단계명은 완료 범위가 아니다. 과거 감사 표는 a8aa900 Git 이력에 보존돼 있다.

기술 결정은 ADR-001~004로 채택했고, 남은 사람 판단은 DECISION-QUEUE.md에 있다. PASS는 명시한 현재 로컬 코드/검사 범위의 판정이다. native project generation·정적 template 검사는 네이티브 컴파일/기기 실행이 아니다.

## §14 MVP Definition of Done

| ID | 요구/게이트 | 현재 분류 | 완료 범위 / 잔여 |
|---|---|---|---|
| M01 | 가입·연령 확인·콘 접미사 명명 | HARD_STOP_EXTERNAL | 합성 명명/연령·계정/기기/철회 계약. DQ-06 법적 동의·실가입; DQ-01 초기값은 별도 제품 승인 |
| M02 | 걸음→먹이·코인·상한·폴백 | HARD_STOP_DECISION | 집계·권한 계약과 기본 OFF local Expo module/plugin/autolinking 준비. DQ-05 공개 지원·소스, DQ-09 실제 기록/기기 |
| M03 | 직접/자동 공통 식사·부재 정산·중복 방지 | HARD_STOP_DECISION | 공통 식사/부재 정산/SQLite 실패·재시도 검사. DQ-01 운영 순서, DQ-09 OS 종료 검증 |
| M04 | 기본 화장실 무유지비·자동 처리 | HARD_STOP_DECISION | 무유지비 자동 화장실 engine + DEV 구매 원장. DQ-04 초기 설치/가격, DQ-09 화면 |
| M05 | 성격·무료 교감·취향/현재 상태 분리 | NEEDS_DEVICE_VALIDATION | 성격·형태 분리/무료 교감 검사. DQ-09 기기 준비 후 실제 반응/화면 |
| M06 | 가구 생활·기록 일지·자동화 비서열 | HARD_STOP_DECISION | 생활 service/기록 일지/자동화 동등성. DQ-04 가구 카탈로그, DQ-09 실제 화면 |
| M07 | 레벨·스테이지·성별·외형 분기 | HARD_STOP_DECISION | 주입 progression/RNG·단회 결과 영속 계약. DQ-03 추천 결정표/비율/성격·기간 승인 후 운영 연결 |
| M08 | 수면 성장 배율·회복 | HARD_STOP_DECISION | 점수→섭취·회복 원장 및 추천형 TEST_ONLY 커브 격리. DQ-02 실제 산식·혜택 승인/실제 기록 |
| M09 | 체력 감소 경계·저체력 행동 허용 | HARD_STOP_DECISION | 시간/소화·무료 교감·저체력 경계 검사. DQ-01/04 적극적 놀이 및 운영 config |
| M10 | 청결 누적·청소·기분 | HARD_STOP_DECISION | 배설/청소/기분·구간분할 검사. DQ-01 운영 타이머, DQ-09 실제 화면 |
| M11 | 청결 방치만 기운 없음·약 없는 회복 | HARD_STOP_DECISION | 청결 단일 원인·약 없는 회복 검사. DQ-01 운영 타이머, DQ-09 실제 화면 |
| M12 | 배회·표정·터치 | NEEDS_DEVICE_VALIDATION | 기존 controller/모션·입력 계약 유지. DQ-09 실제 GL/터치·배회 |
| M13 | FR-10.1 방·가독성·시크·말캉 실제 검토 | BLOCKED_ENV | GLB 바이트 보존·빌드용 경로 정정. DQ-09 실제 가독성/영상/FPS |
| M14 | 상점 코스메틱/코인 효율·약 경계 | HARD_STOP_DECISION | DEV coin/ownership 원자 원장·disabled cash. DQ-04 실제 상품/효과/UI·결제 |
| M15 | iOS/Android 위젯 상태·갱신·앱 진입·중립 | HARD_STOP_DECISION | read-only WidgetKit/AppWidget source template·6필드 decoder·generation plan 준비. DQ-08 최신성/알림 정책, DQ-09 target build/설치·기기 검증 |
| M16 | 동면 중 부정 진행 정지 | HARD_STOP_DECISION | 동면 정지/복귀·경계 불변성. DQ-01 운영 threshold, DQ-09 lifecycle |
| M17 | 단일 balance config | PASS | 단일 versioned registry에서 domain/sleep/shop/progression 값 투영, OPEN 값 분리 |
| M18 | 헬스 원본 서버 미전송 | PASS | 현재 구현 경로 raw/secret allowlist 및 전송 전 차단. 실제 bridge/server 연결 후 재검증 필수 |
| M19 | 비난조 없는 알림·문구 | PASS | 현재 문구/tone 및 합성 알림 중복/취소/철회 검사; 기본 disabled. DQ-08 실제 발송 정책은 미승인 |

## §14-1 검증 게이트

| ID | 요구/게이트 | 현재 분류 | 완료 범위 / 잔여 |
|---|---|---|---|
| V01 | 필요한 DEC 승인·SRS/config/test 일치 | HARD_STOP_DECISION | 기술 AUTO_DECIDE ADR1~4만 채택, 제품 OPEN/PROPOSED 유지. DQ-01~08 정확한 값/예시 승인 필요 |
| V02 | 중복 활동·상한·분수·과거 수정·자정 | HARD_STOP_DECISION | 합성 중복/cap/분수/자정/과거 수정 검사 완료. DQ-05 운영 날짜/소스 선택 |
| V03 | 식사 전/중/후 종료·재시도·실패 | BLOCKED_ENV | Node SQLite failure/rollback/reload 검사 완료. DQ-09 실제 프로세스 강제 종료/재기동 |
| V04 | 시각/난수 주입·구간분할·복합 상태 | HARD_STOP_DECISION | clock/RNG·복합 상태·분할 불변성 및 영속 결과 재사용 계약. DQ-01/03 운영 정책 |
| V05 | 승인 수면 예시+실제 기록 | HARD_STOP_DECISION | synthetic sleep 계약 완료. DQ-02 승인 예시와 HS-01 실제 기록 필요 |
| V06 | 두 OS 권한/철회/재부팅/종료/지연 실기기 | BLOCKED_ENV | fake 권한/철회/지연/재생성 계약. DQ-09 SDK와 DQ-05 실제 데이터 승인 |
| V07 | offline/재전송/다기기/복구/migration | HARD_STOP_DECISION | schema6 보존 migration, durable retry/HOL/no-drop/single-flight/offline 및 fake ack 검증. DQ-07 다기기/분실복구 UX, 실서비스 HS-02 |
| V08 | 실결제 검증·실패·중복·복원·환불 | HARD_STOP_EXTERNAL | 현금 비활성. DQ-04 승인 상품/실제 purchase 검증·복원/환불 |
| V09 | 동의/정책·원본 미전송·접근 통제 | HARD_STOP_EXTERNAL | 합성 scope/철회·raw 차단 검사. DQ-06 법적 정책·실backend 접근 통제 승인/검증 |
| V10 | acceptance 실제 환경/명령/증거/결과 | PASS | 결정 재감사의 실제 명령·179 tests·환경·review·증거를 별도 기록; 과거147/77 결과 미재사용 |
| V11 | 치명적 위반/차단 결함 없음·인간 출시 판단 | HARD_STOP_EXTERNAL | 독립 코드 QA 결과와 기기 미실행 분리. DQ-10 최종 인간 merge/release 판단 |

## 잔여 판정

이 표에서 IMPLEMENTABLE_NOW로 남겨 둔 독립 작업은 없다. 현재 요청 범위의 기술 선택·구현·자동검증을 마쳤다. NEEDS_DEVICE_VALIDATION 행도 현재 환경에서는 SDK/기기 제공이 선행되어야 한다. 실제 Health SDK record query, 운영 scorer/resolver/catalog/동의/backend, native widget target wiring 및 실제 발송은 아직 완료가 아니다. 승인 후 연결·검증할 작업을 각 DQ에 명시했다.

결정 재감사 결과와 기술 대안: [DECISION-SUMMARY](DECISION-SUMMARY.md). 실제 실행/독립 QA: [AUTONOMOUS-RUN-REPORT](AUTONOMOUS-RUN-REPORT.md). 현재 상태는 WAITING_FOR_HUMAN_DECISIONS이며 MVP_ENGINEERING_COMPLETE 또는 출시 완료가 아니다.

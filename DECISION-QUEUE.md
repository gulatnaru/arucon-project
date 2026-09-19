# MVP 결정·외부 준비 대기열

2026-09-19. 사용자 중간 질문 대신 누적한다. 이 문서는 **승인 기록이 아니다**. 기존 OPEN/PROPOSED는 그대로다. 실제 건강정보·계정·결제·배포·관리자 설치는 시도하지 않는다. 각 항목의 선택지는 논의를 위한 대안이며 실제 기본값이 아니다.

## DQ-01 — 운영 게임 정산·밸런스 계약 (HS-06)

- 필요한 결정: DEC-02/03/04/06/07/13/15/24/25의 게임 날짜·정밀도·배고픔·회복/동면·초기 상태·자동급식 순서·밸런스.
- 이유: 현재 엔진 전체가 `DEV_FIXTURE_ONLY`다. 합성값을 운영값으로 승격할 수 없다.
- 선택지: ① 현재 제안 각각을 수치/경계 예시와 함께 승인(기존 엔진의 운영 config/회귀 활성화), ② 수정값/순서 제공(주입 config 및 경계 테스트 변경), ③ 미확정 유지(DEV 로컬 미리보기만 유지).
- 결정 전 가능: 단일 registry, clock 주입, 분할 불변성·중복/실패 회귀, 직접/자동 동등성.
- 결정 후 첫 검증: 승인된 config validator→경계 예시→전체 엔진/저장 회귀. 기존 자원 회수·죽음·현금 효율 구매 금지 불변식 확인.

## DQ-02 — 수면 해석·혜택 확정 (HS-06 / HS-01)

- 필요한 결정: DEC-05 scorer 입력/버전/공식·대표 수면·중복/수정/날짜 귀속, DEC-04/05 회복 자격·시점·재지급 방지.
- 이유: 점수→배율 커브만 원문 확정이며 원본→점수 및 무기록 회복은 미정.
- 선택지: ① 승인된 Health 기록 산식/예시 제공(네이티브 local scorer 연결), ② 제품/수면 전문가 검토 후 산식 제공(interface와 disabled 유지), ③ 실제 수면 연결 보류(합성 fixture 한정; SRS MVP PASS 불가).
- 결정 전 가능: not_configured 포트, synthetic score→식사, 정책 주입형 recovery ledger와 재시도 테스트.
- 결정 후 첫 검증: 승인 입력/출력 예시 + 혜택 날짜/한번 회복 tests. 실제 기록 검증은 별도 HS-01 승인과 기기 준비 후 수행.

## DQ-03 — 성장·성별·진화 분기 (HS-06 / HS-07)

- 필요한 결정: DEC-03 레벨 비용 해석/최종 경계/성별 비율, DEC-08 외형 분기 입력·동률·무기록·확정 시점, DEC-24 운영 성장기간.
- 이유: 명명 DEC-32는 분기 규칙 승인이 아니다. 형태와 성격을 연결해 발명하지 않는다.
- 선택지: ① 결정표와 대표 케어 예시 승인(주입 resolver를 운영 연결), ② 최소 기록량/미정 상태 포함 단계적 설계 승인(보류 상태 UI 필요), ③ 계속 미정(기본형+synthetic projector만 유지).
- 결정 전 가능: 순수 progression/resolver interface, clock/RNG 주입, 저장한 결정 재사용 계약.
- 결정 후 첫 검증: 경계별 level/stage + 한 번의 성별 확정 + 승인 케어 예시와 retry 동일성. 2차 형태/새 아트는 별도 승인.

## DQ-04 — 상점·기본 시설·약·놀이 (HS-06 / HS-03)

- 필요한 결정: DEC-09/24 가격/상품/효과/적극적 놀이, DEC-15/20 기본 화장실의 시작 설치 여부. 현금 코스메틱 출시 포함 여부.
- 이유: 원문 약 가격 50 외 시설 가격은 DEV 값이다. 현재 초기 시설 없음과 기본 설치 후 자동 처리 규칙 사이의 획득 정책은 미정이다.
- 선택지: ① 코인 상품/시설 지급/효과 명세 승인(원자 debit/grant 운영 연결), ② 현금 코스메틱도 포함(스토어 상품/receipt 검증·복원/환불과 HS-03 필요), ③ 가격·효과 보류(견적·fixture 계약만 유지).
- 결정 전 가능: 원자 구매 ledger·retry/잔액/ownership 실패 검사, disabled cash port. 무료 교감 불변식 유지.
- 결정 후 첫 검증: 승인 catalog 가격/효과→마지막 코인 경합·실패 rollback·중복/복원 계약. 실제 결제는 별도 승인.

## DQ-05 — 활동·권한·플랫폼 지원 (HS-06 / HS-01)

- 필요한 결정: DEC-01/02 지원 OS/provider·fallback·측정 불가 수용·지연/소스 변경·재부팅 지원 범위; 실제 건강 접근 승인.
- 이유: 합성 집계와 fake 권한은 실제 OS의 데이터 의미를 입증하지 않는다.
- 선택지: ① 기기/OS/provider 행렬과 실제 테스트 데이터 범위 승인(해당 native adapter 연결·실기기 검증), ② 합성 native bridge까지만 허용(실제 읽기 OFF 유지), ③ 지원 플랫폼 축소를 SRS에 명시 승인(지원/미지원 UI와 acceptance 갱신).
- 결정 전 가능: 기본 OFF bridge, capability/권한 unknown·denied·revoked 계약, manifest/entitlement 준비, 날짜·high-water tests.
- 결정 후 첫 검증: 권한 거부→수락→철회·실제 샘플·중복/지연·앱 종료/재부팅. 원본은 서버/일반 로그로 보내지 않는다.

## DQ-06 — 계정·동의·아동·데이터 정책 (HS-02 / HS-06)

- 필요한 결정: DEC-11 연령/법정대리인 동의·고지/철회·삭제/보존, DEC-12 실제 backend/auth 선택 및 테스트 프로젝트 권한.
- 이유: 합성 연령 입력은 가입·법적 동의나 보안 검증이 아니다.
- 선택지: ① 법적 검토된 정책과 별도 테스트 서비스 접근 승인(실제 auth/권한 규칙 연결), ② 정책만 승인하고 서비스 보류(local interface 검사만), ③ 검토 보류(실가입 비활성 유지).
- 결정 전 가능: account/pet/device scope fake, revoked/unverified 차단, 원본 전송 allowlist, 이름/연령 합성 경계.
- 결정 후 첫 검증: 동의/철회 상태→계정·기기 간 접근 거절→최소 필드 전송→삭제/복구 정책. 실제 키는 Git/로그에 넣지 않는다.

## DQ-07 — 동기화·재설치 복구·마이그레이션 (HS-02 / HS-06)

- 필요한 결정: DEC-10/17/25 활성 기기/epoch·순서·conflict 해결·서버 확인분 복구·미전송 변경 처리·버전 지원/보존.
- 이유: 로컬 원자성과 fake server는 운영 서버의 권위·충돌/복구 정책을 대신하지 못한다.
- 선택지: ① 단일 활성 기기와 서버 확인분 복구 계약 승인(전환 fencing/미전송 충돌 처리 구현), ② 다중 기기 병합 규칙 명시 승인(추가 conflict resolver 및 교차기기 tests), ③ 계속 local-only DEV(서버/복구 PASS 불가).
- 결정 전 가능: outbox 상태·idempotent ack·응답 유실·rollback·migration 실패, synthetic recovery planner. conflict는 자동 성공 처리하지 않는다.
- 결정 후 첫 검증: 승인 epoch/order 및 duplicate replay→서버 확인분 복구→실기기2대/오프라인 분기.

## DQ-08 — 위젯·알림 갱신·지원 버전 (HS-06 / HS-04)

- 필요한 결정: DEC-14/31 widget 갱신/오래됨·OS 지원/성능 예산·알림 cadence와 권한/발송 범위.
- 이유: 5상태 앱 미리보기는 WidgetKit/AppWidget 타깃·홈 진입·배터리 검증이 아니다.
- 선택지: ① iOS/Android 최소 상태 위젯/앱 진입·갱신 한도 승인(native target과 shared storage 연결), ② 위젯 상세/알림은 별도 승인까지 보류(기본 OFF·readonly contract 유지), ③ 지원 범위를 SRS에 명시 변경(수용 행렬 재작성, 자동 축소 불가).
- 결정 전 가능: 읽기 전용 snapshot/allowlist, stale/missing/error/unsupported, disabled notification/tone 계약.
- 결정 후 첫 검증: native extension 설치→갱신 시각/앱 진입/재설치→게임 자원 중립→OS 제한·배터리.

## DQ-09 — SDK·실행 장치 준비 (HS-08)

- 필요한 결정: Xcode/Android SDK·simulator·실기기 제공 또는 관리자 설치 범위.
- 이유: 이번 실제 조회에서 Xcode exit1, simctl exit72, Android SDK/adb/emulator 없음. 실제 네이티브 build/UI/SQLite/GL/lifecycle/접근성/FPS가 미실행.
- 선택지: ① 이미 준비된 Mac/Android 개발환경으로 체크포인트 이동(시스템 설치 없이 수행), ② 관리자가 이 호스트에 SDK/기기 준비(설치 후 동일 체크리스트 실행), ③ 환경 보류(자동 JS 검사까지만, native BLOCKED_ENV).
- 결정 전 가능: JS bundle, 순수 motion/reduced-motion tests, config/native 준비·환경 점검 스크립트.
- 결정 후 첫 검증: 로컬 development build→simulator smoke→physical device UI/SQLite/종료 복구/영상/FPS. simulator와 physical 결과를 별도로 기록.

## DQ-10 — 출시·보안/이상탐지·상표 판단 (HS-04 / HS-05 / HS-06)

- 필요한 결정: DEC-16 어뷰징 탐지/오탐, DEC-18 상표, 지원 출시 범위/최종 머지·배포의 인간 판단.
- 이유: 과도 활동 차단·운영 telemetry와 출시/법률 선택을 임의로 할 수 없다.
- 선택지: ① 필요한 정책/리뷰 완료 후 별도 출시 승인(운영 범위 security/실기기 gate 실행), ② 개발 feature checkpoint만 유지(원격 저장만, 출시 없음), ③ 출시 범위 변경을 명시 승인(SRS/acceptance 재검토).
- 결정 전 가능: 정적 경계 검사·의존성 감사·구성 검증·비밀/산출물 제외 검사 및 feature checkpoint.
- 결정 후 첫 검증: 모든 matrix 미충족 재대조→사람의 merge/release 판단. 현재 main push/merge/force/tag/release/배포는 금지.

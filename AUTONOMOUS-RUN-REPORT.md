# 아루콘 MVP 전체 자율 개발 보고서

2026-09-19 KST · 시작 HEAD `c99a4c0ee9486193a7514983e29a778f361c9a84` · `feature/arucon-mobile-autonomous`

## 최종 상태: WAITING_FOR_HUMAN_DECISIONS

SRS v1.8 §14의 19개 항목과 §14-1의 11개 게이트를 모두 대조했다. APP-01~06에 범위를 제한하지 않았다. 결정·SDK·실제 서비스 접근 전에 가능한 독립 구현과 로컬 검증 및 독립 QA는 완료했다. **MVP 제품 완료 또는 출시 가능 상태는 아니다.** 운영 정책, 실제 native Health/widget/auth/backend 연결, 실기기 검증은 남아 있다. 기존 완료 소스를 재구현하지 않고 필요한 gap을 확장했다.

## 완료한 독립 개발

- **설정:** 단일 versioned registry에서 domain/sleep/shop/progression을 투영한다. SRS 원문·DEV fixture·미정 값을 분리하고 운영 활성화는 DecisionRequired로 막는다.
- **저장·동기화:** SQLite schema v5 additive migration, pending/error/conflict/synced outbox, commit 시 고정 writer identity, 응답 유실 후 idempotent ack, 충돌 보존, 서버 확인분 복구 planner. 실제 서버는 synthetic fake뿐이며 미전송 변경 자동 병합은 하지 않는다.
- **구매·회복:** DEV 코인 차감/ownership 원자 원장과 주입형 수면 회복 일별 원장. 중복·실패·rollback·원본 보존을 검증했다. 실제 상품 효과·가격·회복 시점은 미정이며 App 운영 UI에 활성화하지 않았다.
- **성장:** 순수 level/stage projection, 주입 RNG, JSON 결과 방어 복사/동결, prepared 결과 영속 ledger. 재시작 후 다시 뽑지 않으며 없는/손상된 펫 기록은 거절한다. 실제 성별 비율·외형 resolver와 PetState/App 운영 연계는 DEC-03/08 승인 후 작업이다.
- **프라이버시·접근:** synthetic account/pet/device scope, 기본 unverified 동의, 철회 후 이미 발급한 grant/envelope 무효화, outbound allowlist, raw health/secret/prototype 오염 차단. 실제 법적 동의·서버 보안을 검증한 것은 아니다.
- **네이티브 준비:** 기본 OFF health/widget bridge 계약, 권한 unknown/denied/revoked/unsupported·timeout 처리, 위젯 읽기 전용 allowlist. Swift/Kotlin Health 모듈·WidgetKit/AppWidget target은 아직 연결되지 않았다.
- **알림·품질:** 비난 없는 문구 계약, delivery disabled, SDK/장치 종류를 구분하는 환경 점검 스크립트, 자정/과거 수정/구간분할/동면 복합 회귀.
- **빌드 준비:** xcode 하위 uuid만 11.1.1로 override해 감사 10건을 해소했다. SDK57의 expo-system-ui 57.0.4를 추가했다. GLB basename을 Android 호환 underscore로 바꿨으며 바이트는 동일하다. legacy external-storage 권한은 manifest 제거 지시문으로 차단했다.

uuid 근거: [공식 보안 공지](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [수정 릴리즈](https://github.com/uuidjs/uuid/releases/tag/v11.1.1). GLB SHA-256: `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`.

## 이번에 실제 실행한 검증

아래는 과거 숫자를 재사용한 것이 아니다. `mobile/evidence/mvp-engineering/`에 원시 로그와 results/source-sha256을 보관하며 Git에서 제외한다. 새로 실행한 시작 baseline 77/77과 최종 변경 후 147/147을 구분한다.

| 명령 | cwd | 실제 결과 | 증거 |
|---|---|---|---|
| `npm test` | mobile | **147/147 PASS**, fail/skip 0 | final-tests.log |
| `npm run lint` | mobile | exit0, warning0 | final-lint.log |
| `npm run typecheck` | mobile | exit0 | final-typecheck.log |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo export --platform all --max-workers 2 --output-dir evidence/mvp-engineering/metro` | mobile | exit0, iOS/Android Hermes·GLB bundle | final-bundle.log, metro/metadata.json |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` | mobile | exit0, 생성 경고0 | native-prebuild-final.log |
| `npm audit --json` | mobile | exit0, 모든 심각도 합계 **0** | dependency-audit.json |
| Python3.12 `validation/check_workflow.py` | root | **38/38 PASS** | workflow-initial.log |
| Python3.12 `runpy.run_path('validation/test_workflow_validator.py')['test_current_workflow_validator_passes']()` | root | assertion PASS | root 도구 실행 출력, results.json |

Python 실행 파일: `/Users/heung/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`. Node26.7.0/npm11.19.0. 초기 npm audit/설치의 sandbox DNS 실패는 escalated 레지스트리 접근 후 해결했다. 첫 prebuild의 잘못된 asset명/누락 패키지 경고를 실제 수정한 뒤 최종 clean prebuild를 실행했다. 생성 native 프로젝트는 ignored 폴더에만 있다. **prebuild는 native 컴파일이 아니고 export는 APK/IPA가 아니다.**

## 독립 QA와 수정 루프

Terra 읽기 전용 검토자가 작성자와 독립적으로 소스·FR/DEC·테스트·증거를 대조했다. 1차 CONFIG/NATIVE/OFFLINE 37/37, 성장/거래 문제 수정 closure 28/28, 최종 성장 원장 54/54 focused 검사와 native/dependency 최종 검토를 각각 기록했다. 각 수는 서로 겹치는 영향 검사이며 합쳐 전체 테스트 수로 세지 않는다.

닫은 결함: conflict의 일반 ack/retry 전이, mutable 성장 결과·위험 JSON key, 수면 정책 입력의 nested alias, 철회 후 stale grant/envelope, 존재하지 않는 펫의 resolution 기록. 모두 수정→영향 재검증→독립 재검토를 거쳤다. 최종 독립 판정은 **LOCAL PASS / CLOSED**이고, DEC/SDK 이전에 남은 독립 구현은 없다고 재감사했다. 근거: review-wave1.md, review-wave2-growth.md, review-wave2-transactions.md, review-final-ledger.md, reviewer-final-native.md.

## Simulator / physical device / 실제 서비스

- Xcode exit1, simctl exit72, Android SDK/adb/emulator 없음. 환경 점검 재실행에서도 동일.
- native development compile/install: **BLOCKED_ENV**.
- simulator/emulator 앱 실행: **NOT_RUN**.
- physical iOS/Android 앱 실행, Expo SQLite/GL/OS lifecycle, 영상/가독성/FPS/배터리/접근성: **NOT_RUN**.
- 실제 건강정보·계정/외부 프로젝트·실결제·알림 발송·스토어/운영 배포: 수행하지 않음.
- native entitlement/manifest에서 Health/audio/location 권한을 활성화하지 않았다. external-storage 문자열은 `tools:node="remove"` 지시문이다. 실제 merged release manifest와 dev local-network/dev-launcher 설정은 build 가능한 호스트의 출시 전 확인 대상이다.

재개 절차는 [장치 검증표](mobile/docs/DEVICE-VALIDATION.md)에 있다. 정지 이미지·합성 데이터·Node SQLite·JS 번들로 장치 검증을 대신하지 않았다.

## 모델별 위임

| 요청 역할 | 담당 작업 | 실제 라우팅 한계 |
|---|---|---|
| 루트 Astra | 30항목 분해, Hard Stop, 교차 모듈 통합·검증·Git | backend model ID 미노출 |
| arucon_explorer / Terra | SRS/코드 대량 탐색, gap 및 잔여 독립 작업 감사 | ID 미노출 |
| arucon_builder / Sol (`mvp_storage`) | storage/sync·구매·회복·schema5 | ID 미노출 |
| arucon_builder / Sol (`mvp_native`) | native/privacy/auth/tone·의존성/prebuild | ID 미노출 |
| arucon_builder / Sol (`rebuild_app04` 재사용) | registry·성장/RNG·영속 ledger·경계 회귀 | ID 미노출 |
| 독립 reviewer | 기존 Terra 읽기 전용 explorer를 reviewer 지침으로 재사용 | 전용 reviewer 추가 할당은 thread limit으로 불가 |
| Luna | 좁은 테스트 위임 시도 | thread limit으로 생성 실패, 기존 구현 역할에 재배정 |
| Spark | 호출 안 함 | 실제 지원 확인 없음 |

따라서 **ROUTING_UNVERIFIED**다. 요청 모델이 실제 backend 모델이었다고 단정하지 않는다. 작성자는 자기 구현을 최종 독립 승인하지 않았다.

## 남은 Hard Stop / 결정 대기열

[DECISION-QUEUE.md](DECISION-QUEUE.md)에 필요한 결정·이유·2~3개 선택지·기술 영향·선행 완료 범위·첫 재검증을 10개 묶음으로 누적했다. 운영 밸런스/날짜·수면·성장·상점/시설·활동 지원·동의/계정·서버/복구·위젯/알림·SDK/기기·최종 출시 판단이다. OPEN/PROPOSED를 승인으로 바꾸지 않았다. 시스템/관리자 설치도 하지 않았다.

## Git / 외부 반영

현재 작업 브랜치는 `feature/arucon-mobile-autonomous`이며 mobile은 루트 Git 일반 디렉터리다. 중첩 `.git`/160000 gitlink는 없다. 이번 장기 작업의 로컬 commit과 이 feature의 일반 push는 사용자 승인 범위다. main push/merge, PR merge, force/history rewrite, tag/release, 배포는 하지 않는다.

이 추적 문서는 자기 자신의 checkpoint commit 직전에 작성했다. 실제 최종 commit hash와 push 후 HEAD/추적 ref/live origin의 일치·깨끗한 status는 작업 종료 응답 및 `mobile/evidence/mvp-engineering/publication.json`에 기록한다. 시작 기준 c99a4c0과 최종 publication을 혼동하지 않는다. staging 전/후에는 secret·DB·node_modules·.expo·generated native·build·영상/ZIP 제외 및 검증 소스 hash 일치를 확인한다.

## 재개 프롬프트

> feature/arucon-mobile-autonomous의 현재 HEAD에서 AGENTS.md, AUTONOMOUS-STATUS.json, AUTONOMOUS-RUN-REPORT.md, MVP-GAP-MATRIX.md, DECISION-QUEUE.md, NEXT-RESUME.md를 읽고 SRS14/14-1 기준으로 이어가라. 새로 승인된 DQ 항목과 실제 준비된 SDK/기기만 활성화하고 기존 로컬 계약을 재구현하지 마라. 모델 라우팅과 구현→영향 검사→독립 검토→수정→재검증을 유지하라. 미정 결정은 계속 격리하고 실제 건강/계정/결제/배포/관리자 설치 경계를 지켜라. 현재 feature의 로컬 commit·일반 push만 허용하며 main/merge/force/tag/release/배포는 금지한다. simulator와 physical device를 구분하고 과거 숫자나 미실행을 PASS로 쓰지 마라.

## SRS14 / 14-1 전체 최종 gap matrix


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

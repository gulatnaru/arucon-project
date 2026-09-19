# 아루콘 결정 재감사 실행 보고

2026-09-19 · 시작 `a8aa900aa148f7824305db458dc24250e0920802` · `feature/arucon-mobile-autonomous`

## 범위와 종료 판정

사용자는 기존 DQ10개 중 가역적 기술 선택을 Astra가 직접 결정·구현하고 실제 제품/외부 승인만 남기도록 위임했다. 기술 선택은 ADR-001~004로 채택하고 제품 DEC의 OPEN/PROPOSED는 유지했다. 현재 상태는 **WAITING_FOR_HUMAN_DECISIONS / MVP_NOT_COMPLETE**다. 이 보고서의 최종 QA와 검증은 아래 기록을 기준으로 한다.

[DECISION-SUMMARY](DECISION-SUMMARY.md)에 원래10개→자동 결정→사람 잔여의 전체 매핑, [DECISION-QUEUE](DECISION-QUEUE.md)에 각 잔여의 2~3안·경험/경제/복잡도/철학·추천·승인 후 검증을 기록했다. 각 묶음에 실제 사람 판단이 남아 있어 제목 수10개는 보존했다. 기술 하위 선택은 대기열에서 제거했다.

## AUTO_DECIDE와 실제 구현

1. **동기화** — 고정 간격/지수 backoff/OS 전용 scheduler를 비교하고 durable capped exponential equal jitter를 선택. base1s/cap5m는 내부 설정이다. SQLite schema6가 due/attempt/policy version을 보존하고 stream 선행 실패·conflict가 후속 전송을 막는다. single-flight/offline scheduler를 추가했다. 횟수 초과 drop·자동 conflict 병합·보상 소멸은 없다.
2. **네이티브 통합** — 외부 wrapper/generated 폴더 직접 수정/local Expo Module+CNG plugin 중 마지막 선택. local Swift/Kotlin 모듈·autolinking·TS bridge·plugin 기본 OFF를 구현했다. 모듈은 disabled 계약만 제공하고 실제 Health import/query/prompt가 없다. 개발 위젯 식별자·read-only 저장·WidgetKit/AppWidget 템플릿과 generation plan을 준비했다. 실제 target 활성화는 명시적으로 차단한다.
3. **알림** — 합성 순수 planner/idempotent port를 선택. DEV 명시 정책만 주입하고 duplicate/retry/payload conflict/cancel/revoke/quiet hours를 검증한다. 기본 disabled, 실제 OS 전달·서버 push 없음. in-memory fake는 프로세스 재시작을 견디는 exactly-once 구현이 아니다.
4. **기존 기술 기반 채택** — RN/Expo/TypeScript+SQLite, 도메인/service/repository/adapter 경계, atomic ledger·additive migration·versioned config·주입 테스트 전략을 유지했다. 이를 사람에게 다시 고르게 하지 않는다.
5. **추천안 준비** — bonus-only 수면 커브 family를 기존 config로 주입 가능함을 새 TEST_ONLY 검사로 입증했다. 테스트의 1.0/1.25는 임의 fixture이며 추천 운영 수치가 아니다. 기존 원문 DEV curve와 not_configured 경계는 바꾸지 않았다.

개발 위젯 식별자는 실제 App Group 등록/서명이나 제품 지원 범위 승인이 아니다. source template·parse·autolinking·prebuild 성공은 실제 native build 성공이 아니다.

## 이번에 실제 실행한 검증

CWD는 별도 표시 없으면 `/Users/heung/projects/arucon-project/mobile`. Node26.7.0/npm11.19.0. 원시 로그/생성물은 ignored `mobile/evidence/decision-audit/`다. 이전147/147·APP-06 77/77·APP-04 13/13은 역사 기록이며 이번 결과로 재사용하지 않았다.

| 명령/검사 | 실제 결과 | 증거 |
|---|---|---|
| `npm test` | 179/179 PASS, fail/skipped0, P1 수정 후 전체 재검증 | final-tests.log |
| `npm run lint` | PASS, warnings0 | final-lint.log |
| `npm run typecheck` | PASS | final-typecheck.log |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo export --platform all --max-workers 2 --output-dir evidence/decision-audit/metro` | Android/iOS JS bundle PASS | final-bundle.log |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` | clean project generation PASS | final-prebuild.log |
| `node scripts/check-native-generation.mjs --output evidence/decision-audit/final-native-generation.json` | 기본 OFF/무건강권한 static gate PASS | final-native-generation.json |
| Expo autolinking search/resolve + Apple provider generation | local module 발견/등록, native compile 아님 | native-final-validation.json |
| Swift `-parse`, podspec `ruby -c`, Android template XML `xmllint --noout` | syntax만 PASS, SDK typecheck/link/런타임 아님 | native-final-validation.json |
| `npm audit --json` | 온라인 재실행 exit0, 취약점0 | dependency-audit.json |
| repo root Python3.12 `validation/check_workflow.py` | 38/38 PASS | workflow.log |
| workflow validator regression 함수 실행 | PASS | workflow-regression.log |
| `node scripts/check-native-environment.mjs --output evidence/decision-audit/native-environment.json` | inventory 성공, Xcode/Android SDK/adb/simctl 없음 | native-environment.json |

실패/한계도 보존한다: 최초 npm audit는 sandbox DNS 실패 후 허용된 온라인 재실행으로 통과했다. Android autolinking provider-generation CLI는 해당 명령 미지원으로 exit1; Android는 resolve까지 확인했고 실제 provider native compile은 미실행이다. 테스트 작성 중 발견한 타입 narrowing 오류는 수정 후 typecheck를 재실행했다. workflow 검사기의 generated JSON 순서만 바뀐 부분은 내용 동등성을 확인하고 원래 bytes로 복원했다.

## 독립 reviewer → 수정 → 재검증

읽기 전용 기존 Terra 역할을 reviewer 지침으로 재사용했다. 작성자와 검토자는 다르다. 전용 reviewer 할당은 현재 thread limit 때문에 불가했고 실제 모델/추론 metadata는 노출되지 않아 ROUTING_UNVERIFIED다.

- 1차 sync/notification/native/SQLite 영향 검사61/61, typecheck/lint 및 generated scan PASS.
- 문서/추천 격리 검사: 원래10개 매핑·추천≠승인·ENG-04 경계 PASS, bonus-only 격리4/4 PASS.
- P2: ADR-002의 예전 duplicate-import lint warning 문구 제거. 실제 이번 lint는 경고0.
- 추가 위젯 검토에서 P1: Kotlin JSONObject의 문자열/정수 coercion이 strict TS snapshot 계약과 달랐다. Kotlin/Swift의 실제 타입·safe integer 검사를 맞추고 malformed fixture를 추가했다. 독립 재검토22/22 PASS로 P1을 닫았고, 최종 전체179/179를 재실행했다. 남은 코드 blocker는 없다(정적 native 소스 범위).

리뷰 raw 증거: `review-wave1.md`, `review-native-widget.md`, `review-recommended-policy.log`; 최종 review/재검증 결과는 `results.json`과 함께 보존한다.

## Simulator / physical device / 실제 서비스

| 대상 | 상태 |
|---|---|
| Swift/Kotlin SDK compile·native module 호출 | BLOCKED_ENV / NOT_RUN |
| iOS simulator / Android emulator app 실행 | NOT_RUN |
| physical device app 실행·권한·강제종료·재부팅·FPS | NOT_RUN |
| native widget target wiring/설치·실제 렌더 | BLOCKED_ENV / NOT_RUN; tracked 소스 template만 준비 |
| 실제 HealthKit/Health Connect 기록 | NOT_RUN, 읽기/권한 요청 OFF |
| 실제 계정·외부 프로젝트·결제·배포 | 수행하지 않음 |

보유 SDK/기기가 없어 실제 화면·모션/FPS·OS 저장 복구 게이트를 통과시킬 수 없다. 건강 접근은 SDK 준비와 별도의 민감정보 승인이다.

## 모델별 위임

| 역할 요청 | 수행 범위 | 실제 라우팅 증거/한계 |
|---|---|---|
| root Astra | 권한 재감사, 교차 모듈 통합, DQ 추천/ADR-004, 최종 검증·Git | 오케스트레이터 역할; 제품 구현을 전부 직접 작성하지 않음 |
| arucon_explorer / Terra | SRS/DEC10개 읽기, 이후 read-only 독립 QA fallback | reviewer TOML 기준 적용, 실제 backend model ID 미노출 |
| arucon_builder / Sol, mvp_storage | retry/scheduler/schema6/저장 tests/ADR-001 | 역할 요청 기준 |
| arucon_builder / Sol, mvp_native | module/plugin/autolinking/widget sources/ADR-002 | 역할 요청 기준 |
| arucon_builder / Sol, rebuild_app04 | synthetic 알림/ADR-003, 좁은 수면 격리 tests | Luna용 좁은 추가 작업도 기존 builder로 fallback |
| Luna/Spark | 전용 실행 없음 | slot 제한으로 Luna 신규 배정 불가; Spark 지원 확인되지 않아 미호출 |

모델별 실제 사용을 단정하지 않는다: **ROUTING_UNVERIFIED**.

## SRS14/14-1 전체 gap matrix

[전체30행 matrix](MVP-GAP-MATRIX.md)는 완료된 로컬 범위와 남은 제품/외부/환경 gate를 각각 표시한다. 정산·성장·수면·가격·동의·플랫폼 지원·복구·알림 정책, 실제 native/device/health/backend/payment 게이트는 남아 있다. 기술 ADR 채택만으로 이 행들을 PASS로 바꾸지 않았다.

## Git / 외부 반영

feature branch 안의 commit/normal push만 승인됐다. 루트 Git의 일반 mobile 디렉터리를 유지하고 `mobile/.git`/mode160000을 만들지 않는다. stage 전후에 secret/DB/node_modules/.expo/generated root native/build/영상ZIP을 검사한다. nested `mobile/native/**`는 작성한 소스이며 생성 루트 `mobile/ios`, `mobile/android`와 구별한다.

이 tracked 보고서는 자기 commit 이전에 작성된다. 실제 최종 HEAD/remote tracking/live origin 동일 해시·clean status는 push 후 `mobile/evidence/decision-audit/publication.json`과 종료 응답에 기록한다. main/merge/force/tag/release/deploy는 수행하지 않는다.

## 재개 프롬프트

“DECISION-SUMMARY.md, DECISION-QUEUE.md, MVP-GAP-MATRIX.md와 최신 Git/상태를 읽고 다음 승인/환경 변경만 반영해 재개해라: [정확한 항목·수치/예시·허용 외부 범위]. AUTO_DECIDE 기술 선택은 재승인 없이 이어 쓰고, OPEN 제품 기본값은 승인 전 활성화하지 마라. SDK가 준비되면 건강 읽기 OFF로 native 개발 빌드와 synthetic 기기 QA부터 수행해라. 각 변경을 구현→영향 검사→독립 reviewer→수정→재검증하고 SRS14/14-1 전체 기준을 갱신해라.”

# 승인된 MVP 정책 구현·통합 실행 보고서

2026-09-19 · 시작 `34ab069dc874947a0f71ff7b70c3be2b14065e00` · `feature/arucon-mobile-autonomous`

## 판정

**WAITING_FOR_HUMAN_DECISIONS / MVP_NOT_COMPLETE**. 승인된 여섯 방향과 그 안에서 독립적으로 할 수 있는 로컬 구현·자동검증을 완료했다. 남은 일은 법률 / 실제 건강정보 / 외부 계정 / 실결제·출시 / 시스템 환경이다. 제품 계수·케어표·코인 가격·기술 선택을 다시 사람 결정 대기 상태로 돌리지 않는다.

SRS §14의19행과 §14-1의11행 판정은 [MVP-GAP-MATRIX](MVP-GAP-MATRIX.md), 승인 범위·원래10개 DQ 처리와 재개는 [DECISION-SUMMARY](DECISION-SUMMARY.md), 외부 작업은 [DECISION-QUEUE](DECISION-QUEUE.md)를 따른다. 전체 MVP 완료나 출시 준비 완료를 주장하지 않는다.

## 완료한 구현

- 승인 config와 기존 DEV fixture를 분리했다. 기존 food/coin/EXP를 회수하지 않고 기본 화장실을 무료 이행한다. 식탁 자동급식과 직접급식은 공통 원자 식사 규칙을 사용한다.
- 개인 게임 기준과 유효 합성 세션 합집합 scorer를 연결했다. 의료 판정 없이 1.0~1.25 보너스를 주며, UTC 기록D/혜택D+1·만료·무기록·날짜 경계·기존 식사 비소급을 처리한다. 펫의 자격 있는 wake 회복은 날짜당 단회이고, 무기록/0점 목표65에서 최대100이며 현재 체력을 낮추지 않는다.
- 성장 비용·Lv6 단회 성별·Lv16 및 확정 기록7일의 케어 결정표를 앱 서비스/원장/snapshot에 연결했다. 활동→피코, 휴식→몽글, 교감→말루, 혼합/동률→모노이며 personality/급식 모드는 분기에서 제외한다.
- 코인 약50·식탁60·공30·쿠션40의 원자 구매/효과·소유/재시도를 연결했다. 공·쿠션은 로컬 방의 무료 놀이/휴식 경로를 제공한다. 현금 코스메틱은 비활성 경계다.
- schema7의 durable writer 등록, 한 writer epoch, 명시 이전, 충돌 보존, 서버 확인분 복구 계약과 원자 저장을 구현했다. App의 LOCAL SYNTHETIC flush/handoff로 실제 서비스 경로를 검증하며, 재시작으로 fake authority를 재생성해 쓰기 권한을 되살리지 않는다. 이 fake는 실제 계정/서버가 아니다.
- 위젯 strict6필드·시각·open_app bridge와 iOS WidgetKit extension/Android receiver 생성, 앱의 read-only snapshot 게시 경로를 연결했다. 건강 권한·읽기는 OFF, 위젯은 경제 명령을 실행하지 않는다.
- 앱 안 안내를 우선하고 실제 건강/계정/서버 연결이 아님을 표시한다. 합성 동의/scope/철회·실결제 비활성·원본/비밀 outbound 차단 경계를 유지했다.

## 실제 실행한 최종 검사

| 명령/검사 | 결과 | 범위 |
|---|---|---|
| `npm test` | **236/236 PASS**, fail0 | 이번 최종 소스의 Node/SQLite/contract 자동 검사 |
| `npm run lint` | PASS | 앱/소스 정적 검사 |
| `npm run typecheck` | PASS | TypeScript |
| `expo export --platform all --max-workers 2` | Android/iOS PASS | JavaScript bundle, 네이티브 build 아님 |
| `expo prebuild --clean --no-install --platform all --skip-dependency-update react,react-native` | PASS | ignored native project generation, compile 아님 |
| native generation/autolinking/Swift parse/XML/podspec | PASS | source/build graph/syntax 검사 |
| `validation/check_workflow.py` | 38/38 PASS | 필수 문서/작업 구조 검사 |
| workflow regression | PASS | 현재 workflow 검사 회귀 |
| `git diff --check` | PASS | whitespace 검사 |

명령 인수·시각·exit·로그는 `mobile/evidence/approved-mvp/results.json`과 `native-final-validation.json`에 있다. evidence/build/로컬 DB/테스트 영상은 Git에서 제외한다. 의존성 manifest/lock의 변경이 없어 이번 요청에서 dependency audit를 새 실행 결과로 주장하지 않는다. 과거179/147/77/13 결과는 Git 이력이며 위 fresh 실행 숫자로 재사용하지 않았다.

## 독립 리뷰와 수정 루프

- 게임 정책: fresh focused19/19, 날짜 만료/모든 clock path·wake 실패 후 복구·무기록·단회 성장/비회수 검사. 발견된 `firstEvolutionLevel=6` 명명 결함은 성별6/외형16 config와 소비 코드·검사로 수정 후 재검증했다.
- 저장/동기화: focused source/SQLite 검토. 복구 snapshot/conflict와 writer registration 분리 저장 P1을 발견해 원자 경계·실패 주입/재시도 검증을 보강했다. 최종 저장 영향91/91, 독립 복구 원자성14/14·정확 checkpoint2/2 재검증으로 두 P1을 닫았다. `review-storage-final.md`와 `storage-sync-evidence.md`를 따른다.
- 네이티브 phase1: independent28/28 PASS(source/CNG 한정).
- 앱 통합: 미래 자정으로 시계를 전진시키던 수면 fixture를 완료된 전일 기록과 현재 적용 시각으로 수정했다. formId→renderer 계약 및 명시적인 공통 GLB fallback을 연결하고 fresh19/19 독립 재검증을 했다. approved service·합성 sync controller·소유 가구·위젯/상태 안내를 source/계약 검사로 검토했다. 실제 렌더/모션 실행을 대신하지 않는다. 최종 review 기록은 `review-app*.md/log`다.
- 중간 WIP typecheck 실패와 최초 native 환경 실패는 숨기지 않고 해당 로그에 보존했다. 최종 소스의 정적 검사와 자동 테스트는 위 표 기준이다.

## 환경·simulator·physical device 구분

macOS에 Command Line Tools/Swift와 Java21이 있다. full Xcode/iOS Simulator SDK/simctl/CocoaPods 및 Android SDK/platform/build-tools/adb/emulator가 없다. 시스템 설치·관리자 작업·계정 인증은 수행하지 않았다.

| 대상 | 결과 |
|---|---|
| iOS native compile | BLOCKED_ENV — xcodebuild가 full Xcode 필요 오류 |
| Android native compile | BLOCKED_ENV — SDK 미설치. 첫 Gradle 시도는 cache lock sandbox 실패이며 SDK compile 도달 증거가 아님 |
| iOS Simulator / Android emulator | NOT_RUN |
| physical device (iOS/Android) | NOT_RUN |
| 실제 화면·터치·모션·FPS·OS 위젯 실행 | NOT_RUN |
| 실제 건강 읽기/permission prompt | OFF / NOT_RUN |
| 실제 계정·클라우드·결제·스토어/운영 배포 | 수행 안 함 |

CNG 생성/Swift parse/JS bundle을 실기기 통과로 표현하지 않는다. 빌드 파일의 최소 버전 값은 최종 지원 OS 선언이 아니다. 승인 2D 진화 참고 시트는 존재하지만 네 전용 rigged/animated runtime asset은 없다. 현재 form selector는 이를 명시적인 공통 GLB fallback으로 표시한다. 새 외형 결정을 요구하지 않으며 최종 1차 진화 아트 납품/기기 렌더 PASS라고 표현하지 않는다.

## 모델별 위임

- 루트: 요청된 Astra 역할로 승인 범위·SRS/DEC·교차 모듈 날짜/복구 판단·최종 통합/검증/Git을 담당했다.
- `rebuild_app04`: arucon_builder/Sol 요청 — 승인 policy/scorer/evolution/shop/앱 façade·게임 회귀.
- `mvp_storage`: arucon_builder/Sol 요청 — writer/sync/recovery/schema/원자 거래·합성 App controller.
- `mvp_native`: arucon_builder/Sol 요청 — native/CNG/widget bridge·환경 조사·App/presentation/가구 연결.
- `mvp_gap_explore`: arucon_explorer/Terra 요청 — SRS/DEC 대량 읽기 및 코드 작성과 분리된 초기 독립 QA.
- `approved_final_review`: arucon_reviewer/Terra High 요청 — 구현 작업 종료로 슬롯이 확보된 뒤 앱의 교차 모듈 연결과 최종 변경을 독립 검토했다.
- `approved_readme`: arucon_luna_worker/Luna 요청 — 모바일 README의 현재 진입점·승인 범위·환경 한계를 좁게 갱신했다. Spark는 지원 확인이 없어 호출하지 않았다.
- 실제 backend 모델/추론 metadata는 노출되지 않아 **ROUTING_UNVERIFIED**다. 요청한 역할을 실제 모델 ID 증명으로 표시하지 않는다.

## Git·외부 반영

현재 feature 브랜치의 논리적 checkpoint commit과 일반 origin push만 승인 범위다. root Git의 일반 `mobile/` 파일이며 `mobile/.git`이나 mode160000 gitlink를 만들지 않는다. stage 전후 제외 경로/secret 패턴/파일목록/package modes와 최종 테스트를 검사한다.

이 문서는 자신의 checkpoint commit 이전에 작성된다. 이 문서를 포함하는 HEAD/원격 추적/live origin의 최종 비교와 clean status는 `mobile/evidence/approved-mvp/publication.json` 및 최종 응답에 기록한다. main push/merge, force/history rewrite, tag/release, 배포는 수행하지 않는다.

## 다음 작업

[DECISION-QUEUE](DECISION-QUEUE.md)의 준비된 외부/환경 가지부터 재개한다. SDK 준비만 되면 실제 건강 읽기 OFF 상태로 native compile/simulator 및 별도 physical device 검증을 먼저 수행할 수 있다. 건강/실계정/법적 정책/결제·출시는 명시된 추가 승인 범위에서만 수행한다. 승인된 여섯 제품 방향은 다시 승인 요청하지 않는다.

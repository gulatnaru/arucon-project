# SRS MVP gap matrix — fresh iOS validation

## 현재 SOL_DIRECT 제품 관찰 — PRODUCT_REVIEW_READY

같은6c76c9b/설치facaf830… iOS Simulator를 실제 조작했다. 관찰한 새 명백한 결함이 없어 앱 소스/규칙/아트를 바꾸지 않았으며 과거 수면·동면 CLOSED는 보존한다. 현재 user-facing 결과는 검토 가능한 설치판이며 출시/MVP 전체 완료가 아니다.

| 구분 | 현재 SELF_REVIEW |
|---|---|
| 기능 품질 | 정상 무입력 생활5계열·직접 교감/복귀·기록 닫기/이동, 격리 자동 식사15EXP/Lv5→6 및 WC/청결을 실제 확인 |
| 표현 품질 | 몸·시선·말풍선·식사/성장/WC 연결 확인. 소품/작은 표정/캐릭터 최종 만족도는 사용자 검토 대상 |
| 게임 재미/최종 아트 | USER_REVIEW_PENDING, 자동 테스트/동작 성공으로 승인하지 않음 |
| 원본 보존 | Sim/arucon/reserved, 먹이0/코인15/EXP25.125, meal3/recovery0·profile original |
| 성능/실기기 | 실기기/GPU/물리 입력 NOT_RUN, 이번 새 benchmark 없음 |

현재 증거는 `evidence/product-hardening-sol-unlocked-2026-10-04/`. 중간 재잠금과 복구 기록도 보존했다. 실제 건강/결제/계정/출시/권한 경계는 그대로다. [현재 결과](AUTONOMOUS-RUN-REPORT.md), [실행/비교 안내](NEXT-RESUME.md).

## Historical SOL_DIRECT 제품 관찰 — 2026-10-04 잠금 중

**BLOCKED — 현재 Mac locked, 새 실제 플레이 NOT_RUN**. 요청 GPT-6.1 Sol Max / effective ROUTING_UNVERIFIED. 소스6c76c9b·설치facaf830…·착수HEAD/원격1d234d8 일치, 저장/앱 코드 보존. 운영 정합성42/42를 제품 완료로 보지 않는다.

| SELF_REVIEW 항목 | 현재 판정 |
|---|---|
| 기능 품질 | 현재 제품 관찰 NOT_RUN/BLOCKED; 아래 실제 수면·동면 CLOSED는 보존 |
| 표현 품질 | 현재 제품 관찰 NOT_RUN/BLOCKED; 과거 영상으로 새 PASS를 만들지 않음 |
| 게임 재미/최종 아트 | USER_REVIEW_PENDING |
| 실기기/GPU/물리 입력 | NOT_RUN 유지 |

잠금 해제 후 현 설치본의 자율생활·정상 교감·기존 격리 식사/성장을 관찰하고 실제 결함에 한해 기술 수정을 진행한다. 새 기능 확대·성장/경제/진화 자가 변경·권한 확대 없음. [재개](NEXT-RESUME.md).

## 현재 수면·동면·입력 회귀 종료 — 2026-10-04 잠금 해제

**CLOSED — 실제 iOS Simulator 범위**. 최신 소스6c76c9b/두 설치 동일facaf830… Release. 원본 초기화/되감기 없이 정상 입력과 원본 백업의 별도 Simulator 복제 경로를 구분했다. [최신 상세 증거](LIFE-00-REPORT.md).

| 범위 | 이번 판정 |
|---|---|
| 수정 전 일반 저장/UI/입력 | 실제 원본에서 sleeping=false/hibernating=true, 식사 awake/sleep 버튼 및 패널 닫은 이동/접촉 거절 재현 |
| 최종 명시적 동면 복귀 | PASS_ACTUAL_SIMULATOR: 별도 exact DB 복제, 정확한 동면 UI와 정상 다시 함께하기 버튼 |
| 이동·직접 교감·자율생활·잠자기/깨우기 | PASS_ACTUAL_SIMULATOR: 같은 최종 Release에서 실제 장면·입력·clip/flags 대조 |
| 메뉴/기록 닫기·앱 전환·재실행 | PASS_ACTUAL_SIMULATOR: 복제 전체12경로, 원본 manual sleep 보존/wake와 입력도 확인 |
| 저장/경제 | PASS: 원본/복제 이름·먹이0·코인15·EXP25.125 동일, 섭취3/회복0 보존 |
| 자동/빌드 | 새362/362·영향29/29·lint/typecheck·iOS Release compile/install/runtime·Android JS bundle PASS |
| 성능/실기기/출시 | 실제 GPU/물리 입력/실기기/새 benchmark NOT_RUN; SRS MVP·출시 전체 완료 아님 |
| 재미/아트/외부 경계 | USER_REVIEW_PENDING; 건강 OFF·법률/계정/실결제/출시 경계 유지 |

## Historical 새 수면·동면·입력 회귀 — 2026-10-04 잠금 중

**PARTIAL_WITH_BLOCKERS / 결함 OPEN**. 수정 소스cf26058, 실제 원본 설치6cf015c는 재현 보존. 아래 과거 READY는 현재 새 결함의 검증 결과가 아니다. [최신 상세 결과](LIFE-00-REPORT.md).

| 범위 | 이번 판정 |
|---|---|
| 원본 상태/호출 원인 | 저장 sleeping=false/hibernating=true; 전경 advance2881회 후24h 동면, UI/renderer 해석 불일치 확인 |
| 연속 전경/부재/일반 수면/회복 중복 | PASS 격리 SQLite; 새 공통 상태·서비스·취소 처리 구현 |
| 실제 원본 저장의 정상 복귀 | 복제 DB PASS; 원래 앱은 미실행, 이름·재화·설치 상태 보존 |
| 메뉴 닫은 방의 이동·접촉, 최신 Release 복귀·수면/깨우기·재실행 | BLOCKED_ENV: 현재 Mac locked, 새 설치/정상 화면 입력 NOT_RUN |
| 자동 검사/컴파일 | 새360/360·영향27/27·lint/typecheck·workflow40/40, iOS Release compile·Android JS bundle PASS |
| 실제 화면/성능/실기기 | 이번 시각·입력·모션·proxy NOT_RUN, GPU/물리/실기기 NOT_RUN |
| 재미·최종 아트·외부 경계 | USER_REVIEW_PENDING, 건강 OFF 및 출시/법률/계정/결제 경계 유지 |

## Historical LIFE-01 검토 환경 판정 — 2026-10-02

**READY_FOR_AUTONOMOUS_LIFE_REVIEW — iOS Simulator**. [최신 실제 증거](LIFE-00-REPORT.md), 소스6cf015c/설치6edaf991…. SRS 출시/MVP 전체 완료와 구분한다.

| 범위 | 현재 상태 |
|---|---|
| 피코 기지개/귀 | PASS_SIMULATOR_VISUAL: 기존 저장의 일반 자율 기지개, 별도3방향 시작/변형/복원 QA; 분리/찢어짐 없음 |
| 최신 식사 취소 | PASS:623ms cancel 후 생활·접촉, stale growth 없음, 실제 섭취1회/15EXP 보존 |
| 홈 위젯 탭 | PASS_ACTUAL_WIDGET_TAP: 앱 아이콘과 구분, 체험 중 일반snapshot 유지 |
| 성능 | PASS_PROXY:4×60초, 고정33.34ms/30Hz/100ms/500ms gate 유지. GPU 실제표시·물리 지연은 NOT_RUN |
| 자동/빌드 | 새352/352·영향78/78·lint/typecheck·iOS Release·Android JS bundle·CNG23/23 PASS |
| 기존 네 진화/성장/저장 | 완료 이력 유지, 수정 영향 없이 전체 재실행하지 않음 |
| 실기기/출시/재미/아트 | 실기기/GPU/발열/배터리 NOT_RUN; 출시/법률/실건강/계정/결제 경계 유지, 재미/최종아트 USER_REVIEW_PENDING |

## Historical LIFE-01 회귀 범위 — 2026-09-30 검증 재개

**PARTIAL_WITH_BLOCKERS — 피코 기지개 추가 실제 확인 중 호스트 재잠금**. SRS 출시/MVP 전체 게이트는 미완료다. 소스70cab57, 설치 번들784428d…, [빌드별 상세 증거](LIFE-00-REPORT.md).

| 구분 | 현재 판정 |
|---|---|
| 승인 경제/저장/성장 회귀 | PASS: 새350/350, 정책·DB schema 유지 |
| 일반 방 자율 생활 | PASS_SIMULATOR: 최신3분 무입력, 5계열·접촉·복귀; 이름/재화 보존 |
| 자동 성장/진화 | PASS_SIMULATOR: 별도Lv5→6, 별도Lv15→16 네 전용 형태, 실제 섭취 경로 |
| 귀/식사/글자/시설 잘림 | 실제 재현→직접 수정→Release 재검증. 최신 입 좌표·네 형태 식사 확인. 피코 기지개 귀 부착은 BLOCKED_HOST_LOCKED |
| 수면/화장실/취소 | B 실제15/18.75 EXP, 자동 청결, meal742ms cancel 확인. C에서 해당 정책/취소 코드 불변·회귀 통과 |
| 복원 | 최신24개 저장×7필드 차이0, 실제 앱 재실행 |
| 성능 | MIXED_PROXY: 녹화ON RAF p9534.31 FAIL / OFF29.07 PASS. 실제 표시FPS/물리 입력은 NOT_RUN |
| iOS/Android | iOS Release 실제 실행 PASS; 양 플랫폼 bundle PASS; Android native 최신 수정/physical NOT_RUN |
| 외부/출시/아트 | 기존 법률·실건강·실계정·실결제·출시 경계 유지. 재미/최종 아트 USER_REVIEW_PENDING |

이하 표는 과거 각 checkpoint의 결과이며 최신 PASS로 재사용하지 않는다.

## Historical LIFE-01 재잠금 범위 — 2026-09-30


**PARTIAL_WITH_BLOCKERS**. 현재 기준은 [LIFE-01](tasks/LIFE-01-autonomous-growth-resume.md)의 화면 복구·자율 생활·성장 실제 경로다. [현재 상세 판정](LIFE-00-REPORT.md)을 따른다. 중간1464db2에서 일반 방3분 이상 무입력과 짧은 교감, 자동 Lv5→6 및 피코 진화를 실제로 확인했고 귀 분리 결함도 기록했다. 최신 코드에서 이를 수정했으나 Mac 재잠금으로 같은 빌드의 재검증이 남았다.

| 구분 | 현재 상태 |
|---|---|
| 경제·허기·섭취·시간·진화 계산/저장 | 기존 승인 정책 유지, 최신 자동 검사348/348 PASS |
| 자율 생활·자동 성장 연결 | 구현/자동 검사 PASS, 중간 실제 관찰. 최신 시각은 NEEDS_DEVICE_VALIDATION |
| 화면·귀·식사/성장 연출 | 원인 재현/수정/빌드 완료. 최신 확인 BLOCKED_ENV (HOST_LOCKED) |
| 네 진화·수면 보너스·화장실 경계 | 자동 검사 PASS. 중간 피코 외 실제 화면 NOT_RUN |
| 네이티브 표시 성능 | 중간 약60Hz submit proxy. 입력 p95 표본 부족, native Hitches unsupported; 실제 표시/실기기 NOT_RUN |
| 실행 환경 | iOS compile/install/launch PASS, Android JS bundle PASS. adb/설정된 SDK 없음으로 Android native/runtime BLOCKED_ENV, physical NOT_RUN |
| 법률·실건강·실계정·실결제·출시 | 기존 외부 승인 경계 유지. 건강 읽기 OFF, 배포 없음 |

최신 설치 번들 `148bf6332654301ba6a666492eaf6ff323e016a9813ff303b3021c461991218d`. 재미·최종 아트 USER_REVIEW_PENDING. 기존 SRS §14/14-1의 출시 게이트를 이 결과로 통과시키지 않는다.

## Historical LIFE-00 회귀 범위 — 2026-09-29

**PARTIAL_WITH_BLOCKERS**. LIFE-00가 FUN 관련 UX/행동/대사/아트 범위를 갱신해 실제 플레이 게이트를 재오픈했다. [L01~L22 전체 표](LIFE-00-REPORT.md#l01l22--소스-검사와-실제-실행-분리)가 현재 개편의 판정이다. 자동336/336·lint/typecheck·양 플랫폼 bundle·iOS Release/install/launch·CNG23/23·운영40/40 PASS. CUA의 Mac locked 때문에 새 화면/입력/모션/성능은 BLOCKED/NOT_RUN이다. 기존 SRS 경제/저장 회귀는 유지하지만 과거 Simulator/Android 검증을 새 화면에 재사용하지 않는다.

아기v3와 1차4형태는 이제 별도 편집 가능 초안 GLB가 소스에 연결되어 있다. 아래 과거 기록의 “4형태 자산 없음”은 이 소스 상태를 설명하지 않으며 **실제 렌더·최종 아트 승인은 여전히 미완료**다. 성능 목표는 LIFE-00의 30fps 최소 개발 목표로 갱신했고 과거20/22Hz proxy로 통과하지 않는다. 실기기·법률·실건강·실계정/결제·출시 경계는 기존 상태를 유지한다.

## Historical 품질 복구 범위 — 2026-09-28

ASTRA_DIRECT / SELF_REVIEW. 보고된 말풍선 겹침·저장 깜빡임·반응 반복·텍스트뿐인 교감·소프트웨어 렌더 누적을 직접 수정했다. 정상 흐름을 같은 a4b3fad Release에서 관찰했고, 최종69bd2ae의 마지막 앱 전환 재확인은 `BLOCKED_HOST_LOCKED`다. 현재 종료 상태는 `BLOCKED`, 재미·최종 아트는 USER_REVIEW_PENDING. 자동 검사는 324/324, lint/typecheck, 양 플랫폼 JS bundle, iOS Release, CNG23/23, 운영40/40 PASS. 이 결과는 전체 SRS 출시 완료나 실제 기기 성능 통과가 아니다. [보고된 결함별 증거](FUN-FIRST-REPORT.md)와 아래의 과거 §14/14-1 이력을 구분한다.

## Historical FUN-00 status — 2026-09-27

`BLOCKED_WITH_CHECKPOINT`: Mac locked during latest CUA; async unlock pending. Latest source/build checks are 319/319, lint/typecheck PASS, iOS/Android bundles PASS, iOS Release build/install/launch Metro OFF, CNG 23/23, workflow 38/38. Final fixed Release post-fix visual/angle/motion comparison remains pending. Android runtime and physical runtime are `NOT_RUN`; four evolved assets remain missing; fun/art `USER_REVIEW_PENDING`. See [FUN-FIRST-REPORT](FUN-FIRST-REPORT.md).

## Historical physical gate — 2026-09-26 / baseline `b6aee5b`

Physical gate is `BLOCKED_ENV`: iOS has no observed USB device (`devicectl` devices=[]; `xctrace` only Mac/Simulators), zero signing identities/profiles, and only unsigned iphoneos compile evidence (`BUILD SUCCEEDED`). Android physical device count is **UNKNOWN** because adb/SDK are absent and wireless discovery was not verified. All physical runtime, motion, input-to-photon, FPS, thermal and battery validation is **NOT_RUN**. iOS CNG `23/23` is PASS only for generation. Evidence is `mobile/evidence/physical-b6aee5b/`; read-only readiness tooling and the physical runbook are implemented, with final source checks in the current run report. These preparations close no physical runtime or performance gate. Health OFF; DEC31 performance budget OPEN.

## 2026-09-26 unlock resume appendix — c0719ea

Installed Release (`fixed-bundle-sha256.txt` 기준 `main.jsbundle` SHA = DerivedData SHA, Metro 8081 absent)에서 상세 화면, 바닥 이동/연속 retarget, AX touch 응답, 휴식 pose, feed 거절과 wake 후 성공, reduced motion ON/OFF 복원을 실제 확인했다. `mobile/evidence/ios-release-c0719ea/`에 기록했다. UI notice 잔존은 `App.tsx` 한 줄 수정 후 대상 lint/typecheck와 Release rebuild `BUILD SUCCEEDED`로 확인했다. restart 비교와 widget before/after diff는 각각 상태 동일·diff0이며, 08 거절→09 wake/feed 성공에서 낡은 notice가 없다.

현재 host-lock 차단은 없고 Release 기능 관찰 gate는 완료됐다. 333ms software-renderer 모션 부드러움/FPS와 physical-device 수용은 계속 `PARTIAL/NOT_RUN`; product MVP는 `MVP_NOT_COMPLETE`다. 과거 82/25/CNG27/workflow38은 기존 실행 이력이며 이번 rerun이 아니다.

Historical pre-unlock record — 2026-09-26 baseline: `5da0048`. macOS 15.6/Xcode 26.3/iOS 26.3 iPhone16e Simulator Release cold-render validation passed within host-lock and motion limits. Release compile/install/launch passed with Metro OFF; final GLB/cache/storage evidence passes and CPU sample is 46.4%. Focused source tests 82/82, scene25/25 separate, lint/typecheck, CNG27/27 and workflow38/38 passed. Final Release input rechecks are blocked by Mac lock; motion quality and physical FPS remain unapproved. Prior Windows 254/254 and old 99.7% stall records are historical.

2026-09-19 · 시작 `34ab069` · SRS v1.9 §14 전체19행 + §14-1 전체11행. PASS는 표에 명시한 로컬 코드/자동 검증 범위다. native generation/parse/JS bundle은 네이티브 compile·simulator·physical device 검증이 아니다.

## Historical 2026-09-20 SDK55 migration environment

Expo55.0.31/RN0.83.10/React19.2.0으로 정렬해 macOS15.6/Xcode26.3에서 native compile과 Simulator 설치·프로세스 시작을 통과했다. iOS26.3 runtime도 있다. `expo run:ios` 전체는 마지막 Simulator 창 활성화의 System Events 권한 부족으로 exit1이며 별도 xcodebuild exit0와 구분한다. 실제 GLB·터치/모션·OS 위젯 UI는 권한 대기로 NOT_EVALUATED, physical device NOT_RUN, Android SDK 부재다. 최신 전체239개/lint/typecheck/doctor20개/두 JS bundle/CNG25개 검사는 이번 실행이다. 2026-09-19의236개와 SDK57 빌드 실패는 역사적 증거로 보존한다.

### Historical 2026-09-25 Windows Android observation

앞 문단의 Android SDK 부재는 2026-09-20 macOS 이력이다. Windows에서 project-local SDK36/NDK27.1로 AVD synthetic runtime, source254/254/lint/typecheck, targeted17/17, CNG16/16, current x86_64 debug/release builds, Font130 runtime, widget footer/tap/rest를 기록했다. Balanced-renderer A/B is PARTIAL/NOT_PASS, not GL FPS/physical proof. Windows scoped engineering is complete; iOS current execution은 Windows에서 NOT_RUN이고 전체 product status는 `MVP_NOT_COMPLETE`다.

## §14 MVP Definition of Done

| ID | 요구 | 분류 | 현재 구현/잔여 |
|---|---|---|---|
| M01 | 가입·연령·이름 | HARD_STOP_EXTERNAL | 로컬 합성 온보딩/명명·scope·철회 계약. 실제 미성년 동의·가입은 EXT-LEGAL/ACCOUNT. |
| M02 | 활동→먹이·코인·상한·폴백 | HARD_STOP_EXTERNAL | 승인 config·중복/분수/상한/과거 수정·불완전 집계 보류·fake/오류 처리. 실제 건강 읽기 OFF, 지원 OS 최종 선언 전 EXT-HEALTH/ENV/RELEASE. |
| M03 | 직접/자동 식사·부재 정산 | PASS | 로컬 승인 서비스 공통 reducer·실제 섭취만 EXP·원자 원장/재시도. OS 강제 종료 검증은 V03으로 분리. |
| M04 | 기본 화장실 | PASS | 신규 시작 설치·레거시 비회수 이행·자동 처리·무유지비. 실제 렌더는 M13. |
| M05 | 성격·무료 교감 독립 | NEEDS_DEVICE_VALIDATION | 성격/외형/경제 독립과 무료 교감 자동 검사. 실제 반응·표현은 EXT-ENV. |
| M06 | 가구 생활·일지·자동화 동등 | NEEDS_DEVICE_VALIDATION | 코인 소유/설치·생활 UI·확정 일지와 직접/자동 동등 검사. 실제 화면/행동 검토는 EXT-ENV. |
| M07 | 레벨·성별·외형 | PASS | 승인 비용·Lv6 단회 성별·Lv16/확정7일 케어표·personality 독립·결과 영속/snapshot. 최종 아트/모션은 M13 및 출시 검토. |
| M08 | 수면 배율·회복 | HARD_STOP_EXTERNAL | 개인 기준 세션 scorer·bonus-only·날짜/무기록·wake 단회 로컬 검사. 실제 기록 연동은 EXT-HEALTH/ENV, V05. |
| M09 | 체력 경계 | PASS | 시간/소화·승인 행동 경계와 무료 교감·실제 걷기 비소모·저체력 허용 자동 검사. |
| M10 | 청결·청소·기분 | PASS | 승인 config·청결 상태/분할·기존 상태 보존 자동 검사. 실제 화면은 M13. |
| M11 | 청결만 기운 없음·자연 회복 | PASS | 청결 단일 원인·약 없는 회복·선택 약 코인50 원자 처리 검사. |
| M12 | 배회·표정·터치 | PARTIAL_DEVICE_VALIDATION | iOS Simulator에서 normal input/arrival/reduced-motion을 관찰하고 touch deformation은 PARTIAL; Release 입력 재검증 완료, FPS/physical 미승인. Windows AVD evidence는 historical. |
| M13 | 방·가독성·말캉 실제 검토 | PARTIAL_DEVICE_VALIDATION | iOS Release final GLB room visible with cache fallback; CPU sample 46.4%. 3Hz motion texture/FPS/physical acceptance remain unapproved. Windows renderer evidence is historical. |
| M14 | 상점·현금 경계 | HARD_STOP_EXTERNAL | 초기 코인 약/식탁/공/쿠션과 구매 원자성 구현. cash disabled. 실제 결제 gate는 EXT-RELEASE/V08. |
| M15 | 두 OS 위젯 | PARTIAL_DEVICE_VALIDATION | iOS widget image/time and tap/return observed; Android footer/home/tap/rest remains historical Windows evidence. Economic commands absent. |
| M16 | 동면 부정 진행 정지 | PASS | 승인 로컬 config·경계/복귀·정지 자동 검사. OS lifecycle는 V03/V06. |
| M17 | 단일 config | PASS | APPROVED_MVP_POLICY/APPROVED_GAME_CONFIG와 역사적 DEV fixture 분리, SRS9-4/ADR005 연결. |
| M18 | 건강 원본 미전송 | PASS | 현재 local/fake/nativeOFF 경로 allowlist·원본/비밀 차단 검사. 실제 연결 후 재검증 의무 유지. |
| M19 | 비난 없는 안내 | PASS | 앱 안 상태 안내 우선·중립 문구·합성 알림 중복/철회 검사. 실제 발송 비활성. |

## §14-1 검증 게이트

| ID | 요구 | 분류 | 현재 구현/잔여 |
|---|---|---|---|
| V01 | 승인·SRS/config/tests 일치 | HARD_STOP_EXTERNAL | 여섯 제품 방향과 가역 config 승인 반영. 출시 전체에 필요한 법률·실서비스·지원 OS 승인은 잔여. |
| V02 | 중복·상한·분수·과거·날짜 | PASS | 승인 로컬 정책의 합성 경계/재시도/분할 검사. 실제 공급자 데이터는 V05/V06. |
| V03 | 식사 OS 종료·재시작 | PARTIAL_DEVICE_VALIDATION | iOS synthetic before/after restart matched food1/coin10/EXP8812500/meals1/registry1/integrityOK; Release 재검증에서도 food0/coin15/EXP25125000/meals3/registry1/integrityOK 보존. Windows AVD result historical. |
| V04 | 시각/RNG·분할·복합 상태 | PASS | 주입 시간/난수·단회 결과·시간 경계·복합 상태 자동 검사. |
| V05 | 수면 승인 예시+실제 기록 | HARD_STOP_EXTERNAL | 승인 산식과 합성 예시/분할/무기록 검사 완료. 실제 플랫폼 기록은 EXT-HEALTH/ENV. |
| V06 | 두 OS 권한/철회/재부팅 | BLOCKED_ENV | fake 오류/철회·권한 OFF·native scaffold. SDK/기기와 실제 건강 접근 승인 필요. |
| V07 | 오프라인/이전/복구/migration | HARD_STOP_EXTERNAL | schema7 additive migration·재시도/HOL·단일 writer/fence·명시 이전·확인분 복구 한계 합성 검사. 실제 계정/서버는 EXT-ACCOUNT. |
| V08 | 실결제 실패/중복/복원/환불 | HARD_STOP_EXTERNAL | 현금 비활성 port/catalog 경계. 실결제 및 플랫폼 sandbox는 EXT-RELEASE/ACCOUNT. |
| V09 | 동의/정책·접근 통제 | HARD_STOP_EXTERNAL | fake scope/철회·privacy allowlist 검사. 법적 정책과 실제 backend 접근 검증 필요. |
| V10 | 실제 환경/명령/증거 | PARTIAL_DEVICE_VALIDATION | Current iOS focused82/82, scene25/25 separate, lint/typecheck/CNG27/27/workflow38/38, Release compile/install/launch and GLB/cache/storage PASS; Release 입력 차단은 해소됐으며 물리 기기/FPS 수용은 남음. Windows Android evidence is historical. |
| V11 | 차단 결함·인간 출시 판단 | HARD_STOP_EXTERNAL | 독립 로컬 코드 QA와 외부/실기기 미검증 구분. 최종 출시 판단은 EXT-RELEASE. |


## 종료 판단

Windows scoped engineering remains complete in its recorded 2026-09-25 scope. The current macOS result is `IOS_RELEASE_SIMULATOR_INPUT_VALIDATED_WITH_MOTION_LIMITS`: Debug interaction and widget observations plus Release cold rendering/cache/storage passed at their recorded scope. Release input was verified after Mac unlock; motion quality and physical-device performance remain unapproved. The overall product is `MVP_NOT_COMPLETE`. 법률/실제 건강/계정/결제·출시의 외부 경계는 유지한다.

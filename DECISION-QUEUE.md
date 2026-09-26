# 외부 승인·환경 대기열 — fresh iOS validation

## Current physical-device gate — 2026-09-26 / baseline `b6aee5b`

- 상태: iOS와 Android 모두 `BLOCKED_ENV`. iOS `devicectl` devices=[]이고 `xctrace`는 Mac/Simulator만 관찰했으며 USB iPhone은 없음. signing identity 0, provisioning profile 0. iOS CNG `23/23`와 unsigned iphoneos Release compile(`BUILD SUCCEEDED`)은 설치·실기기 실행 PASS가 아니다.
- Android adb/SDK가 없어 실기기 수는 **UNKNOWN**이며 0으로 추정하지 않는다. wireless discovery도 확인하지 않았다. 모든 physical runtime/motion/input-to-photon/FPS/thermal/battery는 `NOT_RUN`이다. Health OFF, DEC31 numeric budget OPEN.
- 증거: `mobile/evidence/physical-b6aee5b/readiness.json`, `ios-generation.json`, `iphoneos-unsigned-build.log`. 준비 script/docs와 parser tests를 추가했다. 최종 자동 검사 결과는 현재 run report에 기록하며, 실기기 기능/모션/성능 PASS는 없다.
- 재개 조건: iPhone USB 연결·Trust/unlock·Developer Mode, 기존 authorized Apple signing/team 및 host/widget App Group provisioning, 기존 Android adb/platform-tools와 USB debugging 승인. 외부 계정 생성·보안 우회·설치는 수행하지 않는다.

## 2026-09-26 unlock resume update — c0719ea

Mac host-lock은 해제됐다. Metro 8081 없이 설치된 Release의 `fixed-bundle-sha256.txt` 기준 `main.jsbundle`/DerivedData SHA 일치와 실제 Release 입력·휴식·급식·reduced motion ON/OFF 흐름을 확인했다. restart 비교 상태는 동일했고 widget before/after diff는 0이었다. 증거: `mobile/evidence/ios-release-c0719ea/`. UI notice 잔존은 `App.tsx` 한 줄 수정, 대상 lint/typecheck, Release rebuild `BUILD SUCCEEDED`로 닫았으며 08 거절 후 09 wake/feed 성공에서 낡은 notice가 없다.

현재 host-lock 차단은 없고 Release 기능 관찰 gate는 완료됐다. 남은 환경 게이트는 333ms software-renderer 모션 부드러움/FPS와 physical-device 성능·수용이며 `PARTIAL/NOT_RUN`이다. 제품은 `MVP_NOT_COMPLETE`로 유지한다. 과거 82/25/CNG27/workflow38은 이번 rerun이 아니다.

Historical pre-unlock baseline `5da0048`: iOS Release compile/install/launch and GLB/cache/storage validation passed with Metro OFF. Final CPU sample is 46.4%; motion quality and physical FPS remain unapproved. Final Release input and normal/reduced rechecks were blocked by Mac lock at that time. Independent source and scoped-runtime reviews passed; this record precedes its own authorized feature publication.

2026-09-19 · 기준34ab069 이후 사용자 승인. 기존 여섯 제품 방향과 그 안의 가역 config/ADR 세부값은 승인됐다. 수면 계수·케어 결정표·작은 코인 카탈로그·SQLite/재시도·단일 쓰기/이전·위젯/앱 안 안내를 다시 제품 질문으로 반환하지 않는다. 구현/검증 결과는 DECISION-SUMMARY와 실행 보고서에서 확인한다.

## EXT-LEGAL — 법률·동의·명칭

- 남은 사람 작업: 서비스 지역, 실제 연령/법정대리인 동의 검증, 수집 목적·보존/삭제·철회·접근 통제의 검토된 법적 정책. 명칭/캐릭터 상표의 사용·등록 검토.
- 이유: 합성 pending/verified/revoked와 체크박스는 법적 동의 증명이 아니다. 실제 미성년 계정 정책은 활성화하지 않는다.
- 준비 범위: fake consent/계정 scope·철회·오류·outbound allowlist, 문구·정책 interface. 원본 건강정보 서버/로그 금지.
- 선택지: 검토된 정책+명시 테스트 범위를 제공 / 정책만 확정하고 실가입은 보류. **추천: 정책 검토 후 별도 테스트 권한 제공.**
- 이후 첫 검증: 승인 policy state matrix → fake 격리/철회/삭제 검사 → 별도 허용 실제 auth/backend 검사. 법적 검토 결과를 구현자가 임의 대체하지 않는다.

## EXT-HEALTH — 실제 건강정보

- 남은 사람 작업: 실제 HealthKit/Health Connect/센서 접근의 참가자 동의, 기기, 기간, 허용 데이터 범위, 로그/삭제 원칙을 명시한 승인.
- 이유: 이번 승인은 게임용 개인 기준 scorer와 합성 입력 구현만 허용한다. 실제 건강정보 읽기는 계속 OFF.
- 준비 범위: 설명 가능한 scorer/config, 유효 세션/겹침/분할/no_data/error tests, native adapter/entitlement scaffold, 읽기 없는 기본 모듈.
- 선택지: 기기 준비 뒤 최소 범위 실제 기록 테스트를 명시 승인 / 실제 기록 검증 보류. **추천: SDK synthetic 검증을 먼저 끝낸 뒤 최소 범위 승인.**
- 이후 첫 검증: 데이터 없이 권한/상태 경계 → 승인 범위 실제 기록/철회/지연 처리. 원본은 로그·서버·외부 도구로 내보내지 않는다.

## EXT-ACCOUNT — 외부 계정·프로젝트

- 남은 사람 작업: 사용할 테스트 계정/프로젝트와 허용 리소스·작업 범위 제공 또는 생성 승인. 실제 Apple App Group/서명·Firebase/Google 프로젝트/OAuth/API key도 포함한다.
- 이유: 단일 writer/handoff가 승인됐어도 외부 프로젝트 생성이나 실계정 접속 권한은 아니다.
- 준비 범위: fake authority·epoch fence·idempotent handoff·복구 설명·계정/기기 scope·실제 source/build config scaffold. 비밀은 Git에 저장하지 않는다.
- 선택지: 기존 테스트 프로젝트를 제한 권한으로 제공 / 생성할 서비스와 작업을 명시 승인 / 외부 연결 보류. **추천: 준비된 테스트 리소스의 최소 권한 사용.**
- 이후 첫 검증: 프로젝트/계정 격리와 동의 scope → fake와 동일한 이전/충돌/복구 시나리오. 서버 원본 건강 저장 금지.

## EXT-RELEASE — 실결제·출시

- 남은 사람 작업: 현금 코스메틱의 실제 상품/결제·환불/복원 범위, 지원 OS/최소버전의 검증 후 최종 선언, 명칭·법적 정책·기기 gate 및 최종 runtime 아트 납품/시각 수용 후 출시 판단. 승인 2D 진화 참고형은 이미 있으며 새 외형 방향 결정을 요구하는 항목이 아니다.
- 이유: 현재 현금 코스메틱은 catalog/interface만 있고 효율 상품은 코인 전용이다. 실제 상품 생성·결제·TestFlight/App Store/Play/운영 배포는 금지다.
- 준비 범위: disabled cash port, source/catalog 경계·코인 원자 처리·오류·release 검사 목록. 공개 지원 OS는 build minimum과 구분한다. formId→renderer selector와 명시적 common GLB fallback을 준비했으며 네 전용 rigged/animated runtime asset을 납품·실기기 검토한 것으로 주장하지 않는다.
- 선택지: 기기/법적 검증 뒤 별도 결제·출시 범위를 승인 / 로컬 MVP 개발만 유지. **추천: 각 gate의 실제 증거를 확인한 뒤 별도 승인.**
- 이후 첫 검증: 승인된 상품의 테스트 검증/중복/복원/환불 → 실제 제출은 별도 명시 권한. feature push가 main merge/push·tag/release·배포 승인은 아니다.

## EXT-ENV — 시스템 환경·기기·UI 검증

- Historical Simulator record: fresh macOS iOS Simulator에서 source GLB/input/widget image-time/tap return/reduced motion/SQLite restart equality를 관찰했다. 정확한 iOS Apple Software Renderer에만 Debug/Release 공통 333ms 제출 제한을 적용했다. Visual smoothness/FPS is not approved. Windows Android and old Mac host-lock results remain historical. Health OFF와 외부 경계는 유지한다. Current next gate is physical readiness above.
- c0719ea 소스 검사 이력: focused82/82, lint/typecheck, final scene25/25, checker27/27, workflow38/38; Release compile/install/launch and GLB/cache/storage PASS. Physical device remains NOT_RUN; Release input recheck passed after unlock.
- 남은 external/environment gates: 333ms 모션의 최종 품질 수용, physical-device performance and supported-OS acceptance, plus the existing legal/Health/account/payment/release decisions. CNG, native compilation, Release cold rendering and observed Debug/WidgetKit checks are already recorded. Windows software-host instability remains historical.
- 다음 준비: 이 Mac에 iPhone과 기존 development signing을 준비하거나, Android SDK/adb가 이미 있는 Windows 호스트에 실제 Android를 연결한다. **추천: 준비되는 실제 기기부터 시작하고 완료된 Simulator/emulator 검증은 반복하지 않는다.**
- 이후 첫 검증: `mobile/docs/PHYSICAL-VALIDATION.md`에 따라 연결 상태 재탐색→실제 기기 Release 설치/콜드 시작→입력·저장·위젯·성능 측정. 실제 Health 접근은 계속 OFF다. 프로세스 시작을 실제 화면/모션 PASS로 사용하지 않는다.

## 재개 규칙

승인된 여섯 방향은 재승인을 묻지 않고 이어 구현한다. 위 항목 중 준비된 가지부터 구현→영향 테스트→독립 reviewer→수정→재검증한다. 승인·실행 없는 외부/기기 gate를 PASS로 바꾸지 않는다. 최종 기준은 SRS14/14-1 전체다.

## EXT-GIT-AUTH — feature checkpoint publication

Normal push to `feature/arucon-mobile-autonomous` is authorized. The baseline remote check returned `5da0048`; the historical Windows authentication failure was not reproduced by that read. Current scoped code/runtime reviews passed. Final publication results belong to `mobile/evidence/ios-5da0048/git-audit.json` and the final response, written after this checkpoint. Main/merge/force/tag/release remain prohibited.

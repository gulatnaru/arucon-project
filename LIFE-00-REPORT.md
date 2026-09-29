# LIFE-00/01 생활 개편 검증 기록

## 현재 LIFE-01 검증 재개 — 2026-09-30

**PARTIAL_WITH_BLOCKERS — 최신 시각 검증 대부분 완료, 피코 기지개 추가 확인 차단** · ASTRA_DIRECT · SELF_REVIEW · 재미/최종 아트 **USER_REVIEW_PENDING**. 성능은 아래의 녹화 ON/OFF 차이와 계측 한계를 포함한 제한 판정이며 출시/MVP 전체 완료가 아니다.

마지막 증거 대조에서 **피코 기지개 중 귀 연결의 실제 영상 확인이 충분하지 않아** 추가 조작을 시작했으나 CUA가 다시 `The Mac is locked`를 반환했다. `52-host-relocked.json`에 실제 실패를 기록했고 보안 우회를 하지 않았다. `51-piko-stretch-and-cancel.mp4`는 이 중단 시도이며 통과 증거가 아니다. 잠금 해제 후 이 한 항목부터 이어간다. 따라서 READY로 승격하지 않는다.

### 이번에 실제로 확인한 생활

일반 `Sim` 방은 먹이0·식탁/공 없음 상태에서 사용자가 놀아주지 않아도 살피기, 기지개, 곁에 앉기, 꾸벅임, 자리 선택을 이어갔다. 짧은 손길에는 몸 눌림과 서로 다른 말풍선이 나왔고 다시 생활로 돌아갔다. 이름·코인15·EXP25.125·먹이0을 보존했으며 일반 방에 체험 자원을 지급하지 않았다.

**자동 Lv.5→6 성장**과 **7일 합성 이력을 갖춘 자동 Lv.15→16→1차 진화**를 별도 petId에서 시험했다. 피코·몽글·말루·모노 모두 실제 식사 서비스와 진화 결정표를 통과해 전용 모델로 바뀌었다. 강제 아트 선택기는 사용하지 않았다. 말루의 솔직한 성격, 다른 사례의 새침한 성격을 보존했다. 식사 뒤 새 자세/성장 안내가 연결되며, 표현·교감으로 EXP를 만들지 않는다.

### 발견한 결함과 직접 수정

1. **실행 중 큰 글자 전환 시 이름/하단 글자 잘림**: `useWindowDimensions().fontScale` 변경 때 텍스트 UI만 재측정한다. 방·GL 컨트롤러·저장은 재생성하지 않는다. 최대 접근성 글자, 기록 닫기/재접촉을 실제 확인하고 `large`로 복원했다.
2. **화장실 이용 중 왼쪽 화면 밖으로 잘림**: 시설/장애물/가림막을 같은 위치로 옮기고, 회전된 부모의 좌표를 역변환해 시설 진입 위치를 맞췄다. 쿠션 진입도 같은 좌표 오류를 보정했다. 수정 영상에서 시설 진입→가림→나오기 전체가 화면 안에 있다. 자동 청결과 경제 정산은 그대로다.
3. **식사 먹이가 몸 뒤에 가리고 실제 입과 맞지 않음**: 그릇 옆으로 접근하며, GLB `Mouth`의 base/morph 중심을 한 번 준비해 현재 변형/크기/회전에 맞는 입 위치로 먹이가 이동한다. 매 프레임 전체 geometry를 탐색하지 않는다. 최신 설치본에서 네 형태의 그릇→먹이→입 이동을 실제로 관찰했다.

기존 귀 고정 수리는 보존했다. 시작 시 저장된 피코를 초기화하지 않고 정면/측면/뒷면·보행·접촉·복원을 확인했다. 최신 설치본에서도 피코의 귀와 몸이 함께 변형됐다. 원본/초안 GLB, DB schema, 경제·성장·진화 조건은 변경하지 않았다.

### 빌드 식별 — 서로 다른 증거를 합치지 않음

- 시작 HEAD `110421b`, feature 브랜치 clean. 앱 소스는 `6eb1c91`과 같고 HEAD까지 차이는 인계 문서3개였다.
- 시작 설치 번들 `148bf6332654301ba6a666492eaf6ff323e016a9813ff303b3021c461991218d`.
- 글자/시설 수정 번들 **B** `d9b584d13c48f399e144160e3849f64f6fc34a93b7fcbc134258d1d98b03c89b`.
- 입 좌표/식사 접근까지 수정한 최신 번들 **C** `784428d1ebc53c72fd0826c68a90406adbd226b42a508524982d1702da24b73b`. 설치 앱과 DerivedData 해시 동일. 검증 소스 checkpoint **`70cab57`**. 빌드 당시 diff/new-file 해시는 로컬 `latest-source-identity.json`에 보존했다. 이후 보고서 commit은 앱 소스를 바꾸지 않는다.
- macOS15.6 / Xcode26.3 / Expo55 / iPhone16e iOS26.3 / **Release**, 390×844pt, 1170×2532px. Metro를 사용하지 않았다.

### 검증 범위와 증거

모든 파일은 `evidence/life-01-resume-2026-09-30/`에 있다. 대형 영상·DB·trace·빌드는 Git/외부 업로드에서 제외한다.

| 항목 | 실제 실행 결과/범위 |
|---|---|
| 저장된 피코와 귀 | 시작 설치본 및 C의 실제 앞/뒤/측면 이동·접촉 확인. **기지개 실제 확인은 BLOCKED_HOST_LOCKED**. `01-current-piko-continuous.mp4`, `39-latest-continuous-play.mp4` |
| 일반 방 자율 생활 | **C 3분 이상 무입력**, look/seat/company/drowsy/stretch 완료·직접 접촉/다양한 발화. `45-latest-general-arucon-life-trace.json`, 최신 영상 |
| 자동 Lv.5→6 | **C 실제 자동 섭취/성장/입 연결**. 별도 진화 시험과 구분. `46-latest-before-restart-states.json`, 최신 영상 약14분50초 |
| 네 계열 실제 진화 | **C 실제 자동 식사/모델 전환 확인**, `40`~`43` 상태 스냅샷·최신 영상. 모두 EXP3,764.999999, 한 번 섭취. 이전 run 보존 |
| 수면 비교 | B의 격리 실제 섭취: 무기록×1=15 EXP / 합성 보너스×1.25=18.75 EXP. `24-toilet-before-states.json`. C에서는 계산/저장 코드 불변·전체 회귀 |
| 식사 취소 | B에서 실제 meal perform 후742ms에 cancel, 이후 inspect/touch/solo 진행, 낡은 growth 없음. `28-real-meal-cancel-arucon-life-trace.json`. 앞선 늦은 취소 시도는 PASS에서 제외 |
| 화장실/자동 청결 | B의 실제 시간 경계→시설 이용→복귀, poop0 유지. 영상 `18`의 약614~617초 및 `35-final-frames/`. C의 시설 코드는 동일 |
| 큰 글자/기록/대화 닫기 | B의 최대 접근성 글자 읽기·닫기·재접촉 PASS. `19-large-font-fixed.png`. `large` 복원. C의 UI 코드는 동일 |
| 앱 전환/복귀/재실행 | B 실제 Home→앱 아이콘 복귀, 낡은 대사 폐기. **C 24개 저장×7필드 재실행 차이0** (`48-latest-restart-comparison.json`), 실제 성장한 앱 복원 |
| 동작 줄이기 | B의 on 이동/접촉 확인 후 off 복원. 일반 모드 성능을 대신하지 않음 |
| 최신 자동 검사 | **350/350 PASS**, fail/skip0 (`latest-tests.log`), lint/typecheck PASS. 기존348을 복사하지 않음 |
| 네이티브 | C iOS Release `BUILD SUCCEEDED`, 설치/launch/해시 대조 PASS (`37-mouth-build.log`, `38-latest-installed-sha.json`) |
| JS export / CNG | C iOS/Android export PASS (`latest-*-bundle.log`), iOS CNG23/23 PASS. Android native 실행 결과가 아님 |
| 운영 문서 검사 | 40/40 PASS (`latest-workflow.log`), 자동 생성된 과거 보고 파일은 stage하지 않음 |

최신 연속 영상 **`39-latest-continuous-play.mp4` 15분31.99초**, 정상 속도·무편집이다. C의 네 실제 진화, 식사 먹이 이동, 피코 접촉/뒷면 이동, 일반 방 무입력3분, Lv.5→6, 재실행을 포함한다. `50-latest-video-timeline.json`의 완료 시각 기준으로 피코식사 약77초, 몽글202초, 말루297초, 모노375초, 별도 Lv.6식사891초다. 프레임은 `50-latest-frames/`에 있다. 이전 `01`(10분2.64초)과 B `18`(28분34.92초)은 각 빌드의 결함 발견/영향 검사 증거이며 C의 통과 영상으로 바꾸어 부르지 않는다.

### 성능과 미실행 경계

B 일반 방에서 정상 UI 접촉5개 표본: 입력→제출 proxy p95 **39.06ms**, RAF p95 **20.53ms**/max46.69ms, 제출57.24Hz/4.19초 창, 500ms초과 RAF gap0. morph p95 8.83ms / draw0.78ms / queue drain13.82ms. `21-final-general-arucon-fun01-performance-summary.json`의 결과이며 **GPU 표시 FPS·물리 touch-to-photon·장시간 전체 구간 계측이 아니다**. C에 이 숫자를 복사하지 않는다.

**C 새 측정**: 녹화 ON(`45`) 입력5개 p95 **56.17ms**, 제출46.31Hz, RAF p95 **34.31ms — 33.34ms 기준 FAIL**, max80.52ms. 녹화 OFF(`49`) 동일 일반 방/Release에서 입력5개 p95 **44.47ms**, 제출52.92Hz, RAF p95 **29.07ms PASS**, max67.74ms; morph p957.34ms / draw1.13ms / queue drain23.98ms. 후자는4.53초 프레임 창·60초 입력 창이다. 당시 다른 빌드 작업은 없었고 Simulator/WindowServer/녹화가 주요 호스트 부하였다. 녹화를 끈 뒤 개선됐지만 단일 비교로 녹화만 원인이라고 단정하지 않는다. **성능 전체 PASS/안정적 실제60fps라고 보고하지 않는다.** 고정 기준은 유지했고 실패 창도 보존했다. 추가 효과 삭제나 reduced motion 강제 적용은 하지 않았다.

현재 Simulator에서 지원되지 않는 Animation Hitches/실제 표시 FPS·물리 지연/발열·배터리와 iPhone/Android 실기기는 **NOT_RUN/BLOCKED_ENV**다. Android native/runtime는 이 Mac의 adb/SDK 부재로 이번 실행 미검증이다. 홈 위젯 표시를 관찰했지만 이번 탭으로 앱 진입은 확인되지 않았고, 앱 아이콘 복귀만 확인했다. 이를 위젯 진입 PASS로 쓰지 않는다. 새로운 OS/보안 설정·건강 읽기·외부 계정·결제·배포는 수행하지 않았다.

새 subagent **0**, 요청 역할 Astra 직접 개발, effective model **ROUTING_UNVERIFIED**. SELF_REVIEW를 독립 리뷰로 기록하지 않는다. 출시/MVP 전체 완료와 본 iOS 검토판 준비를 구분한다.

### 바로 실행 / 남은 범위

`open -a Simulator` 후 `xcrun simctl launch booted com.arucon.dev`. 현재 일반 `Sim` 방을 열어 두었다. 그대로 관찰하거나 짧게 쓰다듬는다. 메뉴→설정→자동 식사·성장 새 체험은 Lv.6, 각 이력·진화 새 체험은 Lv.16의 별도 시험이다. 설정의 수면 두 사례도 각각 새 격리 저장이다. 시작 때 선택돼 있던 피코 run과 일반 DB는 삭제하지 않았다.

남은 범위: **잠금 해제 후 피코 기지개 실제 확인**, C에서의 추가 식사 취소 표본(기존 B 취소는 확인됨), 물리 iPhone/Android·실제 표시 FPS/터치 지연/발열/배터리, Android native 최신 수정 검증, 녹화 부하가 있는 장시간 성능 안정성, 이번 홈 위젯 탭 진입 재확인. 새 놀이/아트 개편은 시작하지 않았다. 재미·최종 캐릭터 승인, 법률/실건강/실계정/결제/출시 승인도 부여하지 않았다.

## Historical LIFE-01 결과 — 2026-09-29~30 (재잠금 인계)

**PARTIAL_WITH_BLOCKERS** · ASTRA_DIRECT · SELF_REVIEW. 재미/최종 아트 **USER_REVIEW_PENDING**.

### 실제로 무엇을 확인했는가

일반 방 `Sim`은 공이나 식탁 없이도 입력 없이 곁에 앉기, 꾸벅임, 기지개, 주변 살피기, 자리 고르기를 이어갔다. 3분 이상 무입력 구간 뒤 짧게 손을 대자 눌림과 말풍선이 나왔고 다시 이동했다. 일반 저장은 허기100/먹이0/식탁없음 상태였으며 이 상태를 위해 새 보상을 지급하지 않았다.

격리 체험에서는 **먹이 버튼이나 미니게임 없이** 합성 활동으로 받은 먹이가 정상 허기 경계에서 자동 섭취되어 **Lv.5→6**이 됐다. 별도의 7일 합성 활동 이력 체험도 같은 서비스로 **Lv.15→16, 아루콘→피코**가 됐고, 실제 화면의 귀/실루엣이 전환됐다. 이후 재실행 데이터 비교에서 이름·성격·EXP·형태·먹이가 같았다. 일반 위젯은 `dev-local-pet-1`을 유지했다.

**위 실제 관찰은 중간 코드 `1464db2`의 빌드 범위다.** 피코의 귀가 변형 중 몸과 떨어져 보이는 결함도 발견해 그대로 영상에 남겼다. 귀 연결부·식사 위치/먹이·취소 토큰·성장 패널을 추가 수정한 최신 빌드를 설치한 뒤 Mac이 다시 잠겼다. 따라서 최신 시각/입력, 나머지 진화 계열, 화장실, 수면 보너스 화면 비교는 완료로 올리지 않았다. 이전 잠금 보고를 복사한 것이 아니라 이번 실행 중 접근 가능→재잠금을 각각 확인했다.

### 재현한 원인과 수정

| 문제/누락 | 확인한 사실과 처리 |
|---|---|
| 거친 화면 | 기존 렌더 표면292×633을 1170×2532 화면에 확대. 585×1266으로 올리고 고정 조명/sRGB 계산을 소프트웨어 전용 vertex shader로 이동. 원본 geometry/얼굴/모션 유지, Expo 내부 패치 없음 |
| 프레임 비용 | 낮은 해상도 약28.7Hz 제출 proxy → 높은 해상도 Lambert 약9.9Hz로 실패 → vertex 프로필 약60Hz. 무관한 morph/normal 갱신을 생략하고 원래 가중합 검사 유지 |
| 말풍선 크기 | 큰 빈 닫기 행 제거, 폭230pt/닫기44pt로 축소. 실제 일반 방에서 읽기·교감·이동 확인 |
| 자동 식사 연출 누락 | 식사 임계 시각이 30초 갱신 종료 시각과 달라도 구간 안의 실제 MealConsumed를 찾도록 수정 |
| 진화가 진단 버튼에 묶임 | 새 실제 EXP 뒤 기존 승인 resolver를 일반 경로에서 호출. 저장된 판정은 재추첨하지 않음 |
| 성장 체감 | 단계별 몸 크기·기지개/앞발 정돈·곁에 기대기·자세·실제 모델 선택을 연결. 계산 정책/보상은 변경하지 않음 |
| 귀 분리 | 회전한 귀의 base/morph 연결부를 몸의 변형에 맞춰 고정. 5자산×5클립×5시각×2귀의 연결부 검사 PASS. **수정 후 실제 화면 재검증은 잠금으로 미완료** |
| 식사/후속 동작 | 접근 목표와 그릇 위치를 공유하고 먹이 한 입이 입 쪽으로 이동하도록 연결. 시선 회전 중복을 정리하고 취소된 식사 토큰이 다음 성장 반응을 깨우지 않게 함. **최신 실행 화면은 미검증** |
| 기억 저장 | 실제 화면에서 일시적 기억 저장 실패 안내를 확인. 경제 원장과 별도인 기억 쓰기도 기존 exclusive transaction/SQLite busy 재시도 경로 사용. 실패를 정상 저장으로 숨기지 않음 |

현재 실제 허기/배설/수면/성장 값과 호출 경로는 [구현 계약의 LIFE-01 표](docs/living-pet-design.md)에 있다. 일반 주기를 단축하지 않았다. 경계 체험만 초기 상태를 임계값 가까이에 준비한다. 새 체험은 별도 runKey를 쓰며 이전 체험/일반 저장을 삭제하지 않는다. 자동 행동은 사용자 교감 일수로 기록하지 않는다.

### 이번 실행 결과와 한계

| 범위 | 실제 결과 |
|---|---|
| 최신 전체 테스트 | **348/348 PASS**, 실패/skip0 |
| 최신 lint / typecheck | **PASS** |
| 최신 iOS / Android JS bundle | **PASS** |
| 최신 iOS Release compile / install / launch | **PASS**, xcodebuild exit0 / 프로세스 시작만 확인 |
| CNG / 운영 정적 검사 | **23/23 / 40/40 PASS** |
| 일반 방 무입력 생활 | **중간1464db2에서 실제 관찰**, trace와 영상 프레임 대조; 최신 자산 변경 후 재검증 대기 |
| 자동 성장 / 피코 진화 | **중간1464db2 실제 경로 관찰**, 강제 모델 선택을 쓰지 않음 |
| 네 진화 / 수면 혜택 비교 | 자동 검사 PASS; 실제 화면은 피코만 중간 관찰. 다른 3계열과 수면15/18.75 EXP 화면 비교 **NOT_RUN** |
| 최신 저장 복원 | 데이터 비교 PASS: 자동 성장764999999 EXP/먹이0, 피코3764999999 EXP/먹이7, 이름·성격·형태 동일. UI 복원은 **BLOCKED_HOST_LOCKED** |
| 성능 | 중간1464db2 일반 방 녹화 중 제출 proxy59.99Hz, RAF p9516.75ms/max17.24ms. **실제 표시 FPS/GPU 시간/물리 touch-to-photon 아님** |
| 입력 지연 | 표본5개 미달로 **insufficient_data**, p95100ms 통과 주장 안 함 |
| Instruments Animation Hitches | **BLOCKED_ENV**: “Hitches is not supported on this platform.” exit2. 관리자/보안 변경 안 함 |
| 최신 화면·모션·큰 글자·화장실·앱 전환 | **BLOCKED_HOST_LOCKED / NOT_RUN**, 수정 전 결과로 대체하지 않음 |
| Android native/runtime | **BLOCKED_ENV / NOT_RUN**: adb/ANDROID_HOME/ANDROID_SDK_ROOT와 기본 Mac SDK 경로를 찾지 못함. 시스템 설치하지 않음 |
| physical device | **NOT_RUN_THIS_CHANGE** |

### 빌드와 증거

- 시작 HEAD `c79f158`, 중간 코드 체크포인트 `1464db2`.
- 최신 수정 코드: **`6eb1c91`**. 문서 인계 commit은 앱 소스와 별도로 식별한다.
- 최신 설치/DerivedData `main.jsbundle` SHA256 일치: `148bf6332654301ba6a666492eaf6ff323e016a9813ff303b3021c461991218d`.
- 중간 관찰 빌드 SHA256: `65beda2960417d4608104f4ded5183d6c888d2544acbfe195f9512501a89f3ce`.
- macOS15.6 / Xcode26.3 / Expo55 / iPhone16e iOS26.3 / Release / 390×844pt / content size large. 접근성 초대형 글자와 다른 화면 크기는 미검증. 실제 건강 읽기 OFF.
- 로컬 폴더: `evidence/life-01/`. 화면 `01-before-trial.png`, `15-after-general.png`, `24-piko-before.png`, `25-piko-unanchored.png`.
- 연속 영상 `21-autonomous-growth-continuous.mp4` **20분31.52초, 정상 속도/무편집**. 일반 생활·교감·자동 성장·피코 전환과 귀 결함을 포함한다. 최신 수정본의 통과 영상이 아니다. 탐색 영상 `16-graphics-normal-input-and-idle.mp4`도 별도 보존했다.
- `23-general-trace.json`과 `21-general-frames/`의 37.5/56.6/68.7/132.8초 프레임은 곁에 앉기/꾸벅임/기지개/살피기 관찰을 대응한다. 정지 프레임만으로 FPS를 판정하지 않았다.
- `25-grown-snapshots.json`↔`29-restored-snapshots.json` 비교 동일. `30-widget-projection.json`은 일반 펫의 6필드 투영 유지.
- `final-tests.log`, `final-lint.log`, `final-typecheck.log`, `final-*-bundle.log`, `32-final-build.log`, `final-cng.json`, `final-workflow.log`. 실패한 중간 고해상도 Lambert/계측 결과도 삭제하지 않았다.
- DB·사적 로그·trace·영상·번들·generated native 폴더는 Git/외부 업로드에서 제외한다.

### 다음 한 작업과 실행법

Mac 잠금을 해제하고 `open -a Simulator`, `xcrun simctl launch booted com.arucon.dev`로 **현재 저장된 피코의 귀 연결/눌림/복원부터** 확인한다. 현재 선택된 격리 저장을 초기화하지 않는다. 이후 최신 같은 빌드에서 일반 방3분 관찰 → 짧은 손길 → 자동 성장 새 체험 → 4계열 실제 진화 → 수면 보너스 비교 → 화장실 → 기록/대화 닫기·앱 전환/재실행을 검증한다. 메뉴→설정의 “새 체험”은 기존 것을 삭제하지 않고 새 run을 만든다.

새 subagent **0**. 요청 root 역할 Astra, effective model **ROUTING_UNVERIFIED**. 구현·디버깅·앱 조작·검토는 직접 수행했으며 SELF_REVIEW를 독립 리뷰로 부르지 않는다. 최종 재미와 아트는 사용자 검토를 기다린다.

## 이하 LIFE-00 체크포인트 이력 (현재 LIFE-01 판정 아님)

2026-09-29 · **PARTIAL_WITH_BLOCKERS** · ASTRA_DIRECT / SELF_REVIEW.
재미·최종 아트: **USER_REVIEW_PENDING**. 실제 플레이 품질: **확인 불가**.

## 이번에 연결한 장면과 현재 한계

새 코드는 펫이 주변을 살피고 몸을 풀며 자리를 고르다가 공을 살펴보고 먼저 건네는 경로를 갖는다. 사용자는 바닥 방향으로 공을 굴리거나 좌/우 까꿍, 하이파이브/갸우뚱을 고를 수 있다. 공의 이동·감속과 접근·앞발 접촉·반환을 연결했고, 쓰다듬기 뒤 복원·후속 반응, 공을 옆으로 보내고 쿠션에 정착하는 흐름을 만들었다. 실제 완료한 공놀이만 다음 제안에서 언급하고, 다양한 경험 이후 약한 사물 선호가 자율 선택에 반영된다. 확정 식사로 성장하면 이후 앞발 응답이 달라진다.

**위 내용은 구현·자동 검사 범위다. 이번 빌드의 화면에서 이 장면을 직접 관찰한 증거는 아직 없다.** Simulator CUA가 “Mac is locked”를 반환했고 잠금 해제를 요청했다. 보안 설정을 바꾸거나 입력 도구를 우회하지 않았다. 따라서 대표 플레이 §3, 8~10분 연속 영상, L01~L22의 실제 화면/입력 판정과 재미/아트 평가는 미완료다. 이전 FUN·Simulator 영상이나 Android 결과를 이번 PASS로 옮기지 않았다.

## 바로 실행하기

이 Mac의 iPhone 16e / iOS 26.3 Simulator에 새 Release를 설치해 두었다. Metro가 필요 없다.

```sh
open -a Simulator
xcrun simctl launch booted com.arucon.dev
```

1. Mac 잠금 해제 후 앱 우측 메뉴 → **별도 생활 체험 시작 / 이어 하기**. 이름은 비워 두면 아루콘이다. 기존 방의 이름은 그대로 표시한다.
2. 새 체험의 공·쿠션·화장실·식탁과 체험 먹이를 사용한다. 처음 2분은 관찰하고, 제안의 ‘굴려 주기’ 또는 놀기 메뉴를 이용한다. 공놀이 중 바닥을 누르면 공을 굴리고, ‘그만 놀기’ 후 다시 이동한다.
3. 펫 누름·유지·놓기 → 몸 반응/말풍선 → 같이 쉬기 → 기록 열기/닫기 → 다시 접촉을 연속 확인한다.
4. 메뉴 → 설정에서 **솔직한 성격 / 성장 직전 / 화장실 생활 / 잔여 청소 체험**을 선택할 수 있다. 모두 별도 petId이며 최초 준비 뒤 잔량/진행을 유지한다. 성장 체험은 정상 먹이 주기, 화장실 체험은 정상 전경 시간 정산으로 확인한다.
5. 설정 → 체험 도구와 빌드 진단 → 반응/아트 비교에서 원본/v3와 말루·모노·피코·몽글의 정면·측면·후면을 비교한다. 진단 모드의 강제 재생은 일반 경로 통과 증거가 아니다.

체험 DB는 `arucon-life-experience.db`; 일반 DB `arucon-dev.db`는 자원 지급/이름 변경/삭제 대상이 아니다. 체험은 위젯의 기존 일반 펫 snapshot도 덮어쓰지 않는다. 실제 건강 연결·실결제는 OFF다.

## 실제 실행한 검사

| 검사 | 이번 실행 결과 |
|---|---|
| 전체 Node 테스트 | **336/336 PASS**, 실패/skip 0 |
| lint / typecheck | **PASS** |
| Android / iOS JS export | **PASS**, `dist-life-android` / `dist-life-ios` |
| iOS Release xcodebuild | **exit 0 / BUILD SUCCEEDED** |
| Simulator 설치 / launch | **PASS_PROCESS_START**, PID 67967(기록 시점) |
| iOS CNG 정합성 | **23/23 PASS**; 실제 widget UI는 별도 NOT_RUN |
| 운영 정적 검사 | **40/40 PASS** |
| 원본/초안 자산 | 원본 SHA 보존, 초안 5종 재생성 일치·15 clips·18 morph bindings·유한 geometry PASS |
| 정상 사용자 연속 입력/영상 | **BLOCKED_HOST_LOCKED / NOT_RUN** |
| Android native/emulator 이번 개편 | **NOT_RUN** |
| iPhone / Android 실기기 | **NOT_RUN** |

첫 회귀는 330개 중 328개 통과했다. 실패 2개는 이전 UI 구조/원본 기본 후보를 고정한 정적 검사였다. LIFE-00 §4/§11에 맞춰 세 동작 묶음·새 후보·더 엄격한 패널 입력 차단을 검사하도록 변경했고, 경제/저장 기대값은 완화하지 않았다. 이후 생활/아트/성능 회귀를 추가해 현재 336개를 모두 재실행했다. CNG 첫 시도는 잘못된 cwd로 실패했으며 `mobile/`에서 재실행한 23개 결과만 PASS다.

### 빌드 식별과 증거 위치

- 작업 기준: `e7af01f`(LIFE-00 원문), 검증한 코드 commit **`22f8249`**. 이후 보고서 해시 기록 commit은 앱 소스를 바꾸지 않는다.
- macOS 15.6 (24G84), Xcode 26.3 (17C529), Expo SDK55, iOS 26.3, iPhone 16e `2170BD93-715C-482E-AD9C-DD7479970003`.
- Simulator 화면 1170×2532px / 390×844pt, content size `large` 확인. 작은 화면·접근성 큰 글자 실조작은 NOT_RUN.
- Release bundle SHA256: `c2a26400cc88b76e8e0ef648caca8435104794ad95a5c1ccb485fcbf21fa3938`. DerivedData와 설치 앱의 해시가 동일하다. CFBundleVersion 1. 초기 설치 해시 fe6c19ad는 중간 빌드이며 현재 검증용 설치본이 아니다.
- 8081에는 Java 프로세스가 있었다. Metro라고 간주하거나 종료하지 않았다. 이번 Release는 내장 번들로 실행했다.
- 로컬 증거: `evidence/life-00/2026-09-29/`의 `tests-final.log`, `build-final.log`, `bundle-ios.log`, `bundle-android.log`, `lint.log`, `typecheck.log`, `cng-ios.json`, `workflow.log`.
- 기존 Simulator DB는 같은 제외 폴더의 `private-original-backup/`에 보존했다. DB·영상·로그·빌드는 Git/외부 업로드 대상이 아니다. **이번 실제 플레이 영상/화면 캡처 없음.**

## L01~L22 — 소스 검사와 실제 실행 분리

| ID | 구현/자동 검사 상태 | 이번 실제 앱 판정 |
|---|---|---|
| L01 | 전체 방·작은 헤더·3동작·스크롤/키보드 대응 연결 | BLOCKED: 작은 화면/큰 글자/콜드 화면 |
| L02 | 저장 이름 불변·중복 콘 접미사 제거·체험 이름/분리 저장 | BLOCKED: 화면/새 이름 입력 |
| L03 | 의도 유지·2분 순수 로직 검사 3계열 이상 | BLOCKED: 2분 실제 관찰 |
| L04 | 실제 공·유한 기다림·무응답 복귀 | BLOCKED: 제안 수락/무응답 시각 |
| L05 | 직접/버튼 동일 경제 중립 경로·눌림/복원·후속 표현 | BLOCKED: hold/release/연속 입력 |
| L06 | 공 바닥 입력·좌우 까꿍·앞발/기울기·취소 | BLOCKED: 놀이 3종 실제 입력 |
| L07 | 말풍선과 idle 공존·타이머 취소·background 정리 | BLOCKED: 대화 중 화면 freeze/복귀 |
| L08 | 최근3 제외·20회 혼합 director 입력·5계열 도달 검사 | BLOCKED: 정상 앱 20회 혼합 |
| L09 | stable personality·거리/시선/타이밍/말투·별도 프로필 | BLOCKED: 이름 숨긴 시각 비교 |
| L10 | 실제 완료/표시 분리·bounded SQLite 기억·약한 선호 | BLOCKED: 실제 입력 후 재실행 |
| L11 | 기존 직접/자동급식 회귀 PASS·commit 뒤 식사 장면 | BLOCKED: 접근/섭취/중단 시각 |
| L12 | 실제 전경 timer/식사 projection·revision 중복 억제·격리 체험 | BLOCKED: 시설 이용 장면 |
| L13 | 기존 청소 service·실제 잔여물 target·없음/자동 안내 | BLOCKED: 대상 터치/자동 처리 |
| L14 | 성장 직전 격리 상태→정상 실제 식사·앞발 응답 변화 | BLOCKED: 성장 전후 시각 |
| L15 | 4계열 전용 초안 GLB·실루엣/귀 차이 자동 검사 | BLOCKED: 실제 렌더·최종 아트 미승인 |
| L16 | Modal close/backdrop/back·방 입력 gating 검사 | BLOCKED: 정상 기록→재접촉 |
| L17 | 측정된 bubble bounds·safe-area 제한 유지 | BLOCKED: 가장자리/큰 글자 |
| L18 | 지원 상황에 새 대사 데이터 추가→같은 selector 도달 검사 | BLOCKED: 실제 일반 경로 |
| L19 | 원본 보존·v3 생성기/geometry/morph 검사 | BLOCKED: 앞/옆/뒤·걷기·눌림 |
| L20 | 30Hz/100ms 목표·phase 계측·고정 draw 병합 | PERFORMANCE_BLOCKED: 같은 Release 전후 비교 |
| L21 | 저장/DB 실패·손상 보존·중복 지급 방지·기존 경제 회귀 PASS | 앱의 오류 안내/복구 화면 NOT_RUN |
| L22 | 양 플랫폼 bundle·iOS Release 설치·추적 가능한 source/lockfile | iOS 화면 BLOCKED / Android runtime·실기기 NOT_RUN |

## SELF_REVIEW 및 남은 품질 작업

직접 검토 중 이전 life command의 재실행, 정상 프로필로 체험 자원 유입, 위젯 덮어쓰기, 중복 공 시작, 줄인 대사 설정이 수동 응답까지 숨기는 문제, 반복 실패 안내 지워짐을 점검하고 수정했다. 독립 reviewer를 실행했다고 기록하지 않는다. 새 subagent는 0이며 과거 agent는 모두 완료 상태였다. 요청 root 역할은 Astra이고 backend effective model 메타데이터는 확인 불가(**ROUTING_UNVERIFIED**).

원래 보고된 화면 깨짐·대화 freeze·두 문장 반복·저장 깜빡임·텍스트뿐인 접촉은 이번 화면 개편으로 재오픈한 실제 플레이 검증 항목이다. 자동 PASS만으로 해결 판정을 하지 않는다. 특히 공/앞발의 접촉 위치, 쿠션/화장실 진입 실루엣, 12개 비언어 장면의 실제 구분, 1차 초안의 인상은 영상 확인 후 수정해야 한다.

성능 예산은 과거 20Hz를 그대로 통과시키지 않도록 30Hz 최소 목표로 올렸다. 기존 22Hz proxy는 이번 통과 근거가 아니다. 고정 geometry batching과 morph/draw/queue drain 계측을 추가했으나, 표시 FPS·touch-to-photon·GPU·발열/배터리·동작 줄이기 비교는 미측정이다. 성능 때문에 얼굴·GLB·말캉함·모션 기능을 삭제하지 않았다.

## 다음 한 작업

Mac 잠금 해제 후 위 해시의 설치 Release에서 **메뉴→별도 생활 체험→공 제안/공 굴리기→펫 누름/놓기→쿠션→기록 닫기→다시 이동**을 먼저 촬영·확인한다. 실제 결함이 보이면 소스/config/template에서 고치고 같은 빌드로 재검증한다. 이 대표 연결이 통과한 뒤 L01~L22와 정상 속도 8~10분 영상, 두 성격/성장/화장실/자산/성능 비교를 마친다.

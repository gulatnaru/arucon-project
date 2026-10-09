# REBOOT-03.2 — GLOBAL VISUAL QUALITY / VISUAL_QUALITY_REVIEW_READY

2026-10-10 · SOL_DIRECT / SELF_REVIEW. 좁은 **iOS Simulator 전체 렌더 비교판** 준비 상태이며 전체 MVP/출시/실기기 완료가 아니다. 최종 렌더 채택·A/B/C·크기·아트·재미는 **USER_REVIEW_PENDING**.

## 화면에서 달라진 것

러그의 긴 직선 조각 같은 외곽을 곡선으로 다듬고, 쿠션·식물·시설의 곡면도 같은 방 디자인 안에서 세분화했다. 같은 2.25× 원본에서 이전 곡면과 개선 곡면의 차이가 보인다. 해상도를 높이면 방·창문·쿠션·캐릭터 몸/얼굴의 큰 픽셀 계단이 함께 줄어든다. A/B/C 각각 다섯 해상도의 실제 native 원본을 확보했으며 모델 원본은 바꾸지 않았다.

기본 idle에 비대칭 Curious 눈 변형이 상시 적용되던 경로를 수정했다. 실제 행동이 없으면 기본 눈으로 돌아오고, 명시적 호기심·장난·윙크의 비대칭은 유지한다. 같은 Release의 A/B/C 장난 화면과 실제 입력 영상으로 확인했다. 자연스러운 blink·시선/호흡의 위상 차이를 아트 변경 효과로 세지 않는다.

**기본 A는 유지**한다. 고해상도·AA 선택은 검토 메뉴의 임시 설정이며, 실제 결과를 제시한 뒤 사용자가 최종 채택을 판단한다. 최종 검토 창은 **A/+35·3×AA0/일반 모션/말풍선ON/awake/비교종료·정상입력**이다. 영구 채택값은null이며 cold 재실행에서는 기존 자동1.5×MSAA0/임시+25로 돌아오는 것을 검증했다. 원래 30개 저장과 같은 아루1, 이름·경제·EXP·섭취·소유·모자/쿠션을 보존했다.

## 바로 실행 / 원본 증거

현재 아루 방 **☰ → 설정 → 렌더 품질 비교**에서 1.5/2/2.25/2.5/3×, MSAA 요청2/4, FXAA, 이전 곡면을 선택한다. **우리 아이 → A/B/C → +25/+35 → 정면/기본 자세**로 동일 조건을 비교한다. ‘비교 끝’은 정상 입력으로 복귀한다. 현재 자료의 비교 크기는 +35이며 최종 크기 승인과 다르다.

모든 미디어는 외부 업로드 없이 로컬 `evidence/reboot-03-2-2026-10-10/`에 보존했다. original PNG는 모두 **1170×2532**, 확대/축소/보정/샤픈을 하지 않았다. 파생 비교는 **원본 픽셀 crop/paste/라벨만** 사용했다. 앱/문서 뷰어의 화면 맞춤 축소를 native 품질 증거로 사용하지 않는다.

- `A35-quality_150-native.png`, `...200...`, `...225...`, `...250...`, `...300...`: 같은 최종 v5의 실제 전체 방 원본.
- 같은 `B35-...`, `C35-...` 10개: 같은 방/카메라/조명/크기에서 모델별 공통 적용 확인.
- `five-dpr-{rug,cushion,plant,window,face}-native-pixels.png`: 같은 native 픽셀의 부분 비교.
- `geometry-room-face-native-pixels.png`: 같은 2.25×/AA0의 legacy24 vs refined 곡면. **legacy frame은 blink 중이므로 이 쌍으로 얼굴 개선을 주장하지 않고 방 외곽만 비교한다.**
- `ABC-five-dpr-face-native-pixels.png`: 세 모델의 기본 얼굴·몸 원본 crop. 최초 B1.5 blink는 별도 `B35-quality_150-blink-native.png`로 보존하고 열린 눈 프레임도 실제 다시 캡처했다.
- `ABC-AA-face-native-pixels.png`, `AA-room-face-native-pixels.png`: 실제 AA 적용 비교. MSAA는 작은 눈/윤곽이 매끄럽고 catchlight가 남는다. FXAA는 눈/입의 작은 디테일이 더 부드러워 보이고 이 Simulator에서 비용도 크므로 추천하지 않는다.
- `A35/B35/C35-playful-quality_200-native.png`: 의도된 윙크 비대칭 보존. 강제 비교 장면이며 자율생활/정상 입력의 증거와 구분한다.
- `v5-ABC-expression-input-rest-lifecycle.mp4` **119.62초**, `v5-rest-reduced-lifecycle.mp4` **99.645초**: 무편집 정상 속도 실제 앱 기록. 첫 영상은 세 모델의 통제 장난 비교와 정상 입력을 포함하고, 둘째는 별도 정상 수면/깨우기·reduced·Home/일반위젯탭/cold 복원이다. 구간은 `.dense-frames/metadata.json`의 실제 PTS로 확인한다. 인코딩 FPS를 앱/GPU FPS로 사용하지 않는다.

## 원인 분리와 구현

| 원인 | 실제 확인 / 조치 |
|---|---|
| 내부 해상도/확대 | 기존 585×1266 GL buffer를 1170×2532 native에 2배 확대. Three pixelRatio는1로 유지해야 Expo physical buffer를 중복 계산하지 않는다. 실제 GLView surface 크기를 바꾸는5후보로 비교 |
| AA 부족 | 기본 MSAA0. Expo55 GLView 공식 iOS msaaSamples와 설치55.0.18 native color/depth resolve 경로를 확인. JS contextAttributes.antialias=false는 native MSAA 미적용의 증거가 아님 |
| geometry | 기존24-longitude 구면을 큰 러그96/쿠션64/작은 잎32/시설48만 세분화. 크기/배치/색/설치/충돌 정책 동일, 다른 작은 소품24 유지. 기본 방에 새 소품 없음 |
| normal | 방 구면의 analytic smooth normal·길이/finite/경계 크기 확인. 큰 normal 파손의 증거는 없었고 분할 chord와 raster 계단이 구별됨. 기존 A/B/C normal/GLB 재작성 없음 |
| material | 비교 내 vertex_lit 색/빛/재질 경로 고정. 기존 소프트웨어용 per-vertex lighting/sRGB/RGBA8 한계는 유지. PBR·새 조명·보정으로 비교를 바꾸지 않음; 모든 색/아트 완성을 주장하지 않음 |
| 기본 눈 | 행동 없는 idle의 Curious target을 비움. A/B/C neutral 기본 눈의 raw 높이/폭 정합성 검사, 명시적 wink left .92/right0 유지. 자연스러운 시선/호흡·빛·픽셀 위상에 따른 작은 차이는 최종 아트 판단과 구별 |
| 입력 비용 | 기존 계측은 pet만 포함. 실제 floor handler부터 raycast/navigation→제출을 계측하도록 확대. 느린 closest-node 전수 선분검사를 거리순/동일 index tie로 바꿈. 수정 전 장애물 경로12개 결과가 정확히 동일 |
| FXAA 호환 | Three의 default BACK 요청과 Expo iOS의 managed nonzero view FBO(COLOR_ATTACHMENT0) 차이로 v4 GL1282. **프로젝트 소유 facade**에서 iOS FXAA public drawBuffers만 매핑, 다른 모드는 원래 gl 참조 그대로. v5 실제 GL error0/FBO complete. vendor 코드/바이너리/SDK 패치 없음 |

공식 [Expo55 GLView 문서](https://docs.expo.dev/versions/v55.0.0/sdk/gl-view/)와 [Three r166 FXAA 소스](https://github.com/mrdoob/three.js/blob/r166/examples/jsm/shaders/FXAAShader.js), 설치된 `expo-gl/ios/GLView.swift`, `EXGLNativeApi.h`, `EXWebGLMethods.cpp`, `Three/WebGLState.js`를 대조했다. 새 패키지/SDK/엔진 설치·교체 없음.

## 실제 해상도와 AA

같은 논리390×844pt/기기DPR3/native1170×2532이다. GLView의 정수 pixel 배치 때문에2× height는 이론1688과 달리 실제1687이었다. 숫자는 실제 context에서 읽었다.

| DPR | 실제 GL buffer | native 표시까지 배율 | AA |
|---|---|---:|---|
| 1.5 | 585×1266 | 2× | 0 |
| 2.0 | 780×1687 | 약1.5× | 0 |
| 2.25 | 878×1899 | 약1.333× | 0 |
| 2.5 | 975×2110 | 1.2× | 0 |
| 3.0 | 1170×2532 | 1× | 0 |

이 Apple Software Renderer에서 MAX_SAMPLES9, 요청2와4는 모두 **실제 SAMPLES4/SAMPLE_BUFFERS1**이었다. 두 개의 다른 native 품질 단계라고 보고하지 않는다. 두 request 원본/지원 trace를 보존하며, 최종 비용은 실제4샘플 모드로 한 번 측정했다. FXAA는 실제 offscreen color/depth target→공식 edge-aware fullscreen pass이며 blur/upscale 필터가 아니다. FBO 완전성과 GL0/실제화면을 확인한 뒤 성능을 별도 판정했다. B/C에도 MSAA/FXAA 원본·실제 loaded asset/GL0 trace가 있다.

## 최종 v5 fresh 성능 — 녹화 OFF, 각60000ms

Source **a6218d4**, 동일 Release/앱/같은 아루 Lv1·A/+35/방/카메라/조명/일반모션/개선 곡면. 각 창에 같은 정상 floor 입력8회와 pet, 후반 floor2회와pet 절차를 수행했고 실제 수락·제출 샘플은각9개다. 자연 생활/반응은 정상 입력 경로이며 숨긴 진단 재생으로 측정하지 않았다. 최종 순서 FXAA→3→2.5→2.25→2→1.5→MSAA4. 모두 현재 context의 profile/size/model·완료60000ms·GL0를 검사했다.

| 설정 | 제출 Hz proxy | RAF p95 / max ms | morph p95 ms | draw p95 ms | GL queue p95 ms | 입력→제출 p95 ms | 기준 |
|---|---:|---:|---:|---:|---:|---:|---|
| 1.5 AA0 | 59.99 | 16.72 /32.77 | .594 | .749 | 7.67 | 31.43 | PASS_PROXY |
| 2.0 AA0 | 59.88 | 16.68 /49.87 | .518 | .743 | 9.78 | 21.80 | PASS_PROXY |
| 2.25 AA0 | 59.98 | 16.74 /48.89 | .562 | .771 | 11.47 | 21.85 | PASS_PROXY |
| 2.5 AA0 | 59.93 | 16.74 /50.50 | .479 | .791 | 13.27 | 30.45 | PASS_PROXY |
| 3.0 AA0 | 51.87 | 21.37 /85.22 | .448 | .756 | 19.64 | 27.05 | PASS_PROXY |
| 2.25 native4 | 27.92 | 39.64 /146.82 | .529 | .706 | 38.15 | 64.59 | FRAME/RAF FAIL / input PASS |
| 2.25 FXAA | 7.76 | 133.88 /205.32 | .538 | .965 | 130.48 | 198.02 | FRAME/RAF/INPUT FAIL |

기존 LIFE-00 예산(제출30Hz·RAF p9533.34ms·입력p95100ms·긴 RAF gap500ms)을 유지했다. 최종7창에서 gap≥500은0이다. avg FPS만으로 통과시키지 않았고 AA 실패는 PASS와 분리한다. 모두 JS RAF/CPU submission/queue barrier proxy이며 **실제 GPU 실행·화면 표시 FPS·물리 터치 지연이 아니다**. 실제 입력은 CUA가 보낸 Simulator 사용자 이벤트다. CUA 관찰 비용과 호스트 상태도 포함되며 실험실 GPU 측정으로 주장하지 않는다.

호스트 load average 첫 값3.58~5.69(각파일에3값), 동일 Apple Software Renderer/GLES3.0 APPLE-23.0.2. 소스 차이를 과장하지 않는다: 앞선 v4의3×32.56Hz/RAF37.22 FAIL과 최종51.87Hz PASS 차이는 FXAA 외 동일 경로의 호스트/워밍업 변동이다. `sweep-v4/` 이력과 분리하고 최신 표에 합치지 않았다. v1 새profile CPU 경로 누락은 유효 비교에서 제외, v2 입력109.31ms 실패→거리순 탐색 후 실제정상입력 검증을 보존했다. 지지하기 어려운 최고해상도 보장이나 iPhone 불가능 선언 없음.

**권장 검토 출발점은 이 Simulator에서2.0~2.25×/AA0**다. 3×는 native 선명도가 가장 높고 최종창은 통과했으나 앞선 변동도 있다. MSAA는 예쁘지만 비용이 크고 FXAA는 작은 얼굴이 더 부드럽고 지나치게 느리므로 이 환경에서 자동 채택하지 않는다. 설정/렌더 품질의 최종 채택은 미확정이다.

GL 지원/오류 값은 context의 첫 제출 뒤 읽은 초기화 계측이며 연속 GPU 오류 모니터가 아니다. 실제 loaded model과 화면은 별도로 확인했다.

성능 표는 명시적으로 시작한 `perf-A-*.json`7개만 사용한다. 지원/모델확인용 `*-state.json`의 자동 재생성/중단 capture는 메타데이터일 뿐 비용·PASS 증거에 재사용하지 않는다. 영상은 녹화ON이라 이 표와 분리한다.

## 같은 최신 빌드의 정상 회귀 / 보존

실제 바닥 이동/목적지 변경/직접 접촉·후속 생활/메뉴닫기, 정상 수면→깨우기→다시이동/접촉, reducedON→OFF, Home→**실제 일반 위젯 탭**→복귀/입력, 같은DB cold→동일아루/기본A/자동설정/awake/입력 확인. UI·sleep clip·작은게임표현을 관찰했으며 장기동면·식사/성장 전체를 수정 영향 없이 다시 만들지 않았다. 표정 강제 비교는 정상 생활 검증과 구분했다.

최종 읽기전용 감사: **48개 원본 asset/editor/script SHA 동일**, 일반1+생활29+같은아루1 보존. 모든 petId/이름/형태/personality/food/coin/EXP/시설/opt-in/활동/carry 동일, meal3→3/1155→1155/0→0. 3DB integrity=ok. 같은아루 모자true·쿠션(-.9399684,3)/rev4·previewbaby·bounded memory64 유지. 실제 최근 교감만 정상 저장했고 정산/보상/진화 중복 없음. 원본 DB/시간 초기화·일반재화 지급/회수 없음.

작업 중 실제 환경 예외: 디스크127MiB에서 CUA/native PNG 실패, 뒤이어 UPDATE pet_snapshot Code14 CANTOPEN. 오류화면/DB를 보존하고3DBok 확인, 정상 재시도는즉시복구하지못했다. 같은앱 terminate/launch 뒤 actual snapshot revision13215→13227과오류없는 새접촉으로 쓰기 복귀 확인. DB복원/초기화/저장코드수정 없음. 정확한 OS/SQLite 내부 최초 원인은 확정하지 않는다. 빌드로그만무손실gzip, 여유회복/실제화면재성공 기록. SDK/보안/다른앱설정 변경 없음.

## 검사·범위·Git

- 문서/운영 게이트 **42/42 fresh PASS**. 생성된 정적 결과 파일은 원래 tracked 상태로 복원하고 이번 증거에만 보존했다.
- 최신v5 **428/428 fresh**, fail0/skip0, 영향(scene+reboot) **109/109**, lint/typecheck PASS.
- iOS Release xcodebuild exit0, sameDB install/hash/process/actual UI PASS. 설치 `reboot-03-2-visual-v5`, main.jsbundle SHA **d177cca9d46e279503a0ce6eb3d9a5ab4661386ac05bd1db14d0b88939395de9**.
- 209개 빌드 입력/source fingerprint **a92f3e4bb05b846e916caea8d5e9883c91c5e9b7edeaa38d333adf4cc56e501d** 및 커밋 소스 대응 감사. 소스 체크포인트 **a6218d4c056ed43dcded7a64adbbfaa3288e7554**.
- Android JS bundle PASS / CNG **27/27 static PASS**. 이번 Android native/UI는NOT_RUN. 과거Android결과를 새GL증거로 쓰지 않음.
- macOS15.6/Xcode26.3/arm64/iPhone16e Simulator iOS26.3.1(label26.3)/Expo55.0.31/expo-gl55.0.18/React19.2/RN0.83.10/Three0.166.1. 새로운SDK/패키지/계정/엔진 설치 없음.
- 실제 `devicectl list devices`: **No devices found**. 현재실행 범위는Mac/iOSSimulator이며 실기기·GPU·물리입력/발열배터리 NOT_RUN. OS출시최소버전·실건강/결제/배포 경계 유지.
- SOL_DIRECT/SELF_REVIEW/subagent0 / requested GPT-6.1 Sol Max/effective **ROUTING_UNVERIFIED**. 이번모델/블렌더원본재제작·Figma/Maestro/AI B 없음. 자동검사·기능·시각SELF_REVIEW와사용자최종아트/재미승인 별개.

feature 소스/보고서 체크포인트와 일반push만 사용한다. 원본/소스/lockfile은 보존하며 node_modules/.tools/.expo/generated ios/android/DB/영상/빌드/개인로그는 stage하지 않는다. local HEAD/tracking/live-origin 일치·clean은 로컬 `git-final-audit.json`과 최종 응답에 기록한다. main/merge/force/tag/release/배포/실건강/실결제/보안설정 변경·미디어외부업로드 없음.

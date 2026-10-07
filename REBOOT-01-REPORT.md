# REBOOT-01 — 첫 교감·외형·기억 검토판

## PARTIAL_WITH_BLOCKERS

한 뿔 계열의 **아기·성장기·진화 후 제작 후보**, 손을 내밀고 거두는 교감, 모자 착용 경험과 이동한 쿠션의 기억을 기존 앱의 별도 검토 화면에 구현했다. 성장에 따라 접근·몸의 기대기·앞발·손을 놓은 뒤의 몸짓이 달라지도록 연결했다. **새 화면을 실제로 조작·관찰한 증거는 아직 없다.** Mac이 작업 도중 다시 잠겨 실제 비교와 정상 속도 플레이 검증이 막혔다. 과거 LIFE-02 기능 PASS는 보존하지만 사용자의 재미·성격·외형 불충족 평가를 덮어쓰지 않는다.

### 문서·기준·보존

- 첨부 ZIP의 `arucon_reboot_01.md` 전체 19,224 bytes를 [실행 지시](tasks/REBOOT-01-core-experience-and-memory.md)에 원문 그대로 저장했다. 원문과 바이트 비교 일치, SHA256 `46e2daf3f7a3687d5fe85fa4a37ca56d15d045c0e4a0bbbaf817a352c8c3807e`.
- 착수 HEAD/추적/live origin은 `3a7a6c1bd7a28f3fa42b82430a54ff20a4fc0ddf`, clean이었다. 과거 reset·앱 삭제·DB 초기화 없이 진행했다.
- `reboot_review` / `arucon-reboot-review.db`를 분리하고 같은 `ApprovedMvpService`, SQLite 공통 파일 대기열, 시간·수면·동면·정산 중복 방지 계약을 재사용한다. 검토 아이템은 코인 구매로 표시하지 않는다.
- v3 설치 후 두 기존 DB의 30개 펫 이름·성격·형태·먹이·코인·EXP·섭취 수·식탁/화장실 상태를 착수 값과 읽기 전용으로 대조해 일치했고, DB integrity도 각각 `ok`였다. 원본 GLB SHA `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`도 동일하다.
- 기존 소유권·경제·성장/진화 조건은 변경하지 않았다. 검토의 세 모습 전환은 제작 후보 프리뷰이며 실제 레벨/EXP/진화 진행이 아니다. 실제 건강/결제는 OFF다.

### 첫 범위 구현과 아직 필요한 실제 검증

| 범위 | 구현·검사 결과 | 새 앱 실제 화면/입력 |
|---|---|---|
| 세 성장 모습 | 새 몸 표면·비율·귀·얼굴·자세, 진주빛 작은 나선 뿔 하나. 편집 `source.json`/생성 스크립트/세 GLB. 원본과 별도, 단계별 전체 스케일 .53/.48/.43 | BLOCKED: 같은 카메라에서 전·옆·뒤, 작은 얼굴·실루엣·발·그림자·귀 연결 확인 필요 |
| 손 내밀기/거두기 | 유지되는 look→approach→contact→recover actor. 접근 전에 접촉하지 않고, 조기 취소는 완료 기억을 만들지 않는다. 몸의 체중 이동·앞발·얼굴 morph와 단계별 마무리 | BLOCKED: 정상 속도·말풍선 가린 비교·직접 쓰다듬기·복귀 확인 필요 |
| 자율 생활/최소 UI | 탐색·짧은 달리기·기지개·곁에 있기·쿠션 휴식. 이름/실제 Lv/현재 EXP/메뉴 중심, 공/수동 미니게임/미발견 예고 제외 | BLOCKED: 행동 리듬·읽기성·큰 글자·화면 끝/메뉴 닫기 확인 필요 |
| 모자 경험 | 착용 확정 후 첫 확인/익숙한 착용/다른 행동 중 짧은 확인과 복귀를 구분. 모자와 뿔은 별도 장착 공간 | BLOCKED: 첫/재/행동 중 착용, 관통·접촉·실제 반응 차이 확인 필요 |
| 쿠션 이동/기억 | 현재 좌표와 item revision이 권위. 옛 좌표는 완료 경험으로만 보존. petId/사건 ID/완료/64개·32KiB 제한, 실패 원본 보존 | BLOCKED: 정상 바닥 입력 이동·새 위치 접근·재실행 후 동일 개체 기억 확인 필요 |
| 입력/취소/저장 | 바닥 이동 시 옛 actor 취소, 모자 제거 시 미완료 연출 취소, 오래된 ML/명령 결과 폐기. 실패 안내·재시도 유지 | BLOCKED: 최신 같은 빌드에서 메뉴/교감/앱 전환/수면·동면/복원과 저장 경합 확인 필요 |

새 소스 SELF_REVIEW에서 바닥 이동이 리부트 의도를 취소하지 않는 경로, 손을 놓을 때 접촉 자세가 즉시 사라지는 경로를 발견해 수정했다. 회복 progress를 단계별 실제 지속시간으로 정규화하고 직전 접촉 자세를 부드럽게 줄인다. 새 영향 검사에서 성장기 앞발의 잔여 offset 실패가 1건 검출되어 수정한 뒤 통과했다. 이는 수학/상태 검증이며 실제 자연스러운 연기 PASS가 아니다.

### 최신 Release와 실제 실행 범위

- 앱 소스 checkpoint **`8e012eb6f37a6af3021e461fc5a283768eab1a1a`**. 이후 보고서 checkpoint는 앱 소스를 변경하지 않는다.

- 설치: **REBOOT-01 v3 Release**, arm64 iOS Simulator. bundle SHA256 `1b380d85c43002d58e4ae4cc19401204494affd91fee5dbcf37fc658f06fcf09`.
- 같은 앱 install로 기존 DB를 유지했고 `simctl launch`가 프로세스를 시작했다. compile/install/process launch 성공은 실제 화면/입력 PASS가 아니다.
- manifest: `evidence/reboot-01-2026-10-07/release-v3-manifest.json`. 빌드 시 HEAD3a7a6c1 + dirty source 각 파일 해시, 이후 checkpoint와 설치 대응은 `git-final-audit.json`에 남긴다.
- 호스트: macOS15.6 / Xcode26.3 / iPhone16e Simulator26.3.1, device `2170BD93-715C-482E-AD9C-DD7479970003`. Expo55.0.31 / expo-sqlite55.0.20 / RN0.83.10 / React19.2.0. Metro 없는 embedded Release다. SDK57 재상향·Expo 내부 패치·전역 설치 없음.
- 이번 최종 실행: **387/387, fail0/skip0**, 리부트 영향11/11, lint/typecheck PASS, Android JS bundle PASS, iOS CNG23/23, 운영 정합성42/42. v1의384/384·v2의385/385와 v1/v2 번들은 중간 이력이다.
- 실제 접근: 착수 CUA는 기존 앱 화면 접근 성공. 첫 새 Release 이후 CUA가 Mac locked를 반환했고, 마지막 접근도 실제 잠금이었다. 잠금 해제를 요청했으며 보안/TCC 우회 없음.
- **새 모션 영상/시각/정상 메뉴 입력/프레임·입력 proxy 성능: BLOCKED/NOT_RUN**. 옛 LIFE-02 영상을 현재 통과 증거로 사용하지 않았다.
- Android 최신 native/UI, 실기기, GPU 표시 FPS, 물리 입력 지연, 발열·배터리: NOT_RUN. 재미·최종 아트: USER_REVIEW_PENDING.

### 온디바이스 AI — 호스트 실제 추론과 native 실패 분리

| 항목 | 실제 결과 |
|---|---|
| 호스트 모델 | `google/embeddinggemma-2`, revision `914f7f89142e33e77833254d9c9b90c3cef7303b`, 공개 ungated/Apache-2.0. 실제 weights SHA `197a32965d4b1105faf060417baa899e193fb73cd401f42ec9295234d5553d79` |
| 호스트 런타임 | 프로젝트 로컬 Python3.12 환경, Transformers5.19.0 / Torch2.14.1, CPU/Float32. 공식 text-only AutoTokenizer/AutoModel + mask-aware mean/L2. 카메라·마이크·건강 입력 없음 |
| 한국어 첫 추론 | 실제768차원·유한·정규화. 새 모자 query vs 모자/쿠션 문장의 cosine0.8227147/0.7052426. 첫 로드7,622ms/첫 쌍181.38ms/warm query28.94ms/프로세스 maxRSS1851.09MiB. Mac 수치이며 폰 성능이 아님 |
| 동일 24개 A/B | 실제 호스트 검색: A/B Recall@2 모두1.0, 불필요 기억0/허용 범위 위반0. 공유 구조 gate가 다른 펫·취소·부정·수면/오래된 상태를 제외하며 모델 혼자 이 사실을 판정한 것은 아님. 이 작은 평가에서 B 우월성이나 재미 개선이 입증되지 않음 |
| native 모델 | 공식 MediaPipe 안내 연결 `litert-community/embeddinggemma-2-text-270m-litert-lm`, revision `9be6e8b90982095dc05c2bd162e4b954ee4dbac7`, Apache-2.0. 164,626,432bytes, SHA `2d079ee2f6f066b1f368e8d7c819f55214eaef1d0513b312321901f30ab286fb` |
| native SDK/빌드 | MediaPipe1.1.0, package source `f46269cdd44896b0801c113470eee212a050e0d3`. 실제 검증된 XCFramework/arm64 Simulator interface typecheck와 Release 링크 성공. graph archive는 자체 podspec에서 정확한 이름으로 연결, generated iOS 임시 패치 없음 |
| 실제 native 추론 | **AI_ADAPTER_BLOCKED**: v2의 실제 합성 probe 초기화에서 `tf_lite_vision_encoder not found in the model`. 공개 iOS/CPP 원본은 text/vision/audio backend를 모두 전달하며 공개 Swift 옵션에 text-only tower 선택 경로가 없다. v3의 동일 native adapter/SDK·모델은 변경하지 않았고 성공으로 재표기하지 않음 |
| native A/B·AI ON/OFF 성능 | 초기화 실패로 NOT_RUN. 기본 **A**를 유지한다. 가짜 벡터/고정 응답을 실제 AI라고 보고하지 않는다 |

A는 구조화된 완료 경험과 현재 상태로 반응을 선택한다. B가 준비되면 같은 허용 intent와 확인된 기억에만 로컬 의미 검색을 추가한다. 모델은 EXP/코인/소유/현재 좌표를 바꾸지 못한다. 별도 큐·취소·250ms 제한·상태 revision 검증·오래된 결과 폐기·A fallback을 갖추고 렌더 tick/SQL transaction에서 추론하지 않는다. Node 벡터 더블 검사는 **TEST_DOUBLE**이다.

첫 모델 실행과 AB24는 별도 실행이다. AB24 프로세스의 load3,103ms/첫 쌍293.72ms/warm35.20ms/maxRSS1503.92MiB도 그대로 `real-host-ab24.json`에 남겼다. 서로 다른 실행을 섞어 성능 개선으로 주장하지 않는다.

공식 근거: [Google 개요](https://ai.google.dev/gemma/docs/embeddinggemma), [Google 모델 카드](https://huggingface.co/google/embeddinggemma-2), [Transformers 구현](https://huggingface.co/docs/transformers/model_doc/embedding_gemma2), [MediaPipe iOS](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker/ios). 텍스트 전용 공식 호환경로라는 새 근거가 생겼을 때만 native AI 가지를 재검토하며 무한 변환/다운로드·내부 바이너리 패치는 하지 않는다.

### 실제 도구·검토

| 도구/역할 | 수행과 산출물 |
|---|---|
| Context7 | Expo resolve1회 + SDK55 query1회 성공. `/expo/expo/__branch__sdk-55`의 local module/autolinking 문서와 Expo sdk-55 원문 대조 |
| Blender/Maestro | 호출 도구와 로컬 실행 파일 없음. NOT_USED, 새 설치 없음 |
| Figma | 도구 노출, whoami가 필수 link_id 미제공 오류. 연결 성공/작업 수행으로 기록하지 않음, 외부 업로드 없음 |
| Three/Node | 새 parametric editable geometry·morph·clip·GLB 실제 생성, 원본 보존, deterministic `--check` 통과 |
| 게임/시각 검증 skill | 이번 관련 저장·경제 회귀와 시각 증거 기준 적용. 실제 접근 실패는 BLOCKED로 기록 |
| 직접 개발 | SOL_DIRECT, 요청 GPT-6.1 Sol Max / effective ROUTING_UNVERIFIED. 새 subagent0, **SELF_REVIEW**이며 독립 reviewer로 기록하지 않음 |

### 다음 한 작업 / 사용자가 실행하는 경로

Mac을 해제한 뒤 현재 앱의 정상 메뉴→설정→**리부트 첫 검토판**을 연다. 우리 아이에서 세 제작 모습을 바꾸고 방의 **손 내밀기→거두기**, 상점·꾸미기에서 **모자 쓰기/벗기·쿠션 옮기기**를 비교한다. 원래 방으로 돌아가면 기존 일반 저장을 사용한다. 아직 실제 검토를 완료한 완성판이라고 소개하지 않는다.

이어 같은 v3에서 정상 속도 영상과 아래를 확인한다: 세 성장 모습의 교감/직접 접촉/생활 복귀, 첫·재·행동 중 모자, 쿠션 이동/옛 기억/현재 위치, 메뉴 닫기·큰 글자·동작 줄이기, 앱 전환/콜드 재실행/동일 개체 기억, 수면·깨우기·격리 동면 복귀, 기존 저장·일반 위젯 보존, 현재 Release 성능. 각 소스 변경이 필요하면 영향 검사→Release→해당 최신 설치 검증으로 이어간다. 새 전계열·1~20 전체 콘텐츠·상점/가격/변기 이전으로 확대하지 않는다.

### 증거·Git

로컬 증거: `evidence/reboot-01-2026-10-07/`의 `release-v3-manifest.json`, `installed-v3-audit.json`, `host-access-latest.json`, `full-tests-v3.log`, `impact-v3-fixed.log`, `ios-release-v3-build.log`, `android-v3-bundle.log`, `cng-v3.log`, `workflow-current.json`, `real-host-embedding.json`, `real-host-ab24.json`, `real-native-ab24.json`, `native-model-receipt.json`. 현재 영상은 없으며 미실행을 빈 증거로 덮지 않는다.

Feature checkpoint/일반 push만 허용하며 최종 HEAD·원격 추적·실제 origin·clean은 `git-final-audit.json`과 최종 응답에 기록한다. 모델/SDK/DB/node_modules/generated native/빌드/영상/비밀은 stage하지 않는다. 원격 main/merge/force/tag/release/배포, 실건강/실결제/전역 설치/보안 변경/외부 업로드 없음.

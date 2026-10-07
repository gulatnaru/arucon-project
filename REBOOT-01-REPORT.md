# REBOOT-01 — 첫 교감·외형·기억 검토판

## 현재 첫 범위 — v7 / READY_FOR_CORE_EXPERIENCE_REVIEW / 2026-10-08

같은 **아루**가 모자를 처음 받으면 살펴보고 몇 걸음 움직여 확인하고, 완료 경험이 있는 재착용에서는 짧게 앞발·몸을 정돈한다. 자율 기지개/달리기 중에는 짧게 반응하고 같은 행동 계열로 돌아간다. 쿠션을 옮기면 기억한 옛 위치를 먼저 바라본 뒤 **현재 쿠션**으로 접근해 몸을 얹고 복원한다. 실제 홈 위젯 탭으로 cold restart한 뒤에도 같은 개체·모자·현재 쿠션·완료 경험이 남았다. 기본 **A의 구조화된 실제 경험**에 따른 결과이며 AI가 게임을 실행한 것이 아니다.

이 판정은 iPhone16e Simulator의 **첫 검토 범위**다. 세 성장 모습은 제작 후보 프리뷰이고 실제 Lv/EXP/진화를 바꾼 시험이 아니다. 재미·최종 아트 **USER_REVIEW_PENDING**, 사용자의 LIFE-02 재미 불충족 평가를 보존한다. 전 계열·상점·새 Lv.1~20 제작으로 확대하지 않는다.

### 소스·설치·환경

착수 HEAD/추적/live origin `b006a51`, 앱 소스 `6fbfaea`와 설치 v5 SHA 일치, 작업 트리 clean 확인. 실제 CUA 화면/입력 접근 성공. 과거 reset·DB 초기화 없음. 현재 앱 소스 **`cf1d57fa9a3d2838279a98e5adbd5dbf05532ded`**, 설치 **REBOOT-01 v7 Release**, bundle SHA **`6d5cc5f315529d16d1dad6eabd6b34cbf3de47ad09dac6f7da7afaba1b208e61`**. dirty build의135개 runtime 파일 해시를 이후 source commit/index와 모두 대조했다. 후속 보고서 HEAD와 앱 소스를 구분한다.

manifest `evidence/reboot-01-memory-2026-10-07/43-release-v7-manifest.json`, 실제 설치/저장 감사 `51-final-native-v7-audit.json`. macOS15.6/Xcode26.3, iOS runtime26.3.1(화면26.3), iPhone16e `2170BD93-715C-482E-AD9C-DD7479970003`, Expo55.0.31/RN0.83.10/React19.2. Embedded Release라 Metro 불필요. 동일 `software_balanced`/1.5DPR, draw surface585×1266/원본 화면1170×2532. 원본 GLB·애니메이션 클립·경제·성장·건강 OFF·package/lock·native plugin/template 변경 없음.

### 재현·수정·SELF_REVIEW

| 실제 결함 | 수정과 현재 근거 |
|---|---|
| v5 쿠션의 옛 위치 시선 누락·이동한 쿠션 옆에 떠서 쉼 | 완료 기억의 좌표는 look 시선에만 사용. 접근/접지/collider는 현재 snapshot 좌표 사용. 회전된 부모 좌표를 변환해 현재 쿠션 중심에 정착. v6/v7 정상 이동 영상·원본 프레임·trace로 확인 |
| 이동/취소 때 stale 쿠션 연출·잔여 offset 위험 | cushion revision이 달라진 rest/cushion cue 취소. 잔여 offset은 월드 좌표에서 부드럽게 정리하고 수면/전경 전환 시 초기화. 관련 자동 회귀·최신 수면/깨우기·접촉/이동 확인 |
| 오랜 자율 휴식이 최근64개를 채워 모자 경험을 밀어냄 | 실제 v6 저장에서 이전 모자 기록이 줄어듦 확인. v7은 같은64개/32KiB 예산 안에 물건별 최초 **남아 있는** 완료 경험과 최신 경험 보존. 이미 버려진 사실은 재구성하지 않음. 격리 자동검사90회 휴식/cold와 실제 native64→65 경계 쓰기·재실행에서 가용 모자ID 유지 |
| 검토 저장 안내가 펫 말풍선처럼 표시됨 | 설정의 조용한 완료 안내로 이동. 실제 실패 안내 유지 |

새 subagent0. 직접 구현·정상 입력·원본 영상/프레임 대조·**SELF_REVIEW**, 독립 reviewer라고 부르지 않는다. 요청 GPT-6.1 Sol Max / effective **ROUTING_UNVERIFIED**.

### 실제 입력·기억의 인과 — 빌드 출처 구분

| 장면 | 증거와 판정 범위 |
|---|---|
| 첫 모자 착용 | 같은 아루의 **v5 최초 경험** `02-hat-first-v5.mp4`/`03-hat-first-state.json`. 모자 기억0→hat_first→살피기/짧은 접근/접촉3817ms/복원/실제 완료ID. 기존 아루를 초기화해 최초 장면을 재연하지 않음 |
| 제거·재착용 | v5 `04/05`, 최신v7 `44/45`. 이전 완료ID→hat_again, 접근 생략·접촉 약1717ms. ‘이제 잘 맞네.’와 짧은 몸/앞발 반응. 문장 개수만 늘린 결과 아님 |
| 다른 실제 행동 중 착용 | v5 `08/10/11` 자연 달리기, v6 `35/37/38` 자연 기지개 도중 정상 메뉴 착용→hat_busy 접촉1116/1117ms→복원→동일 행동 계열 재개. v5 `06/07`의 타이밍을 놓친 시도는 busy PASS가 아님. **목적지 그대로가 아니라 행동 계열을 재개**하는 현재 계약 |
| 한 뿔·모자·세 모습 | 정상 영상과 v6 `32-three-stage-minimum-regression-v6.mp4`의 착용 상태 세 모습 손 교감/복원 최소 회귀. 관찰 구간에 눈에 띄는 모자 관통/얼굴·뿔 가림 미관찰. v7은 기억 보존만 후속 변경, 자산/pose 동일. 모든 각도/미세 접지·최종 아트 승인은 아님 |
| 쿠션 이동 | 최신v7 `44-memory-cushion-cold-latest-v7.mp4` 약64.6~73.9초. 옛 좌표(-1.31596,1.88809) 시선→현재(1.56303,1.54199,rev3) 접근/접촉/복원. `45` rememberedPosition/currentTarget, 원본 `52-current-cushion-original-v7.png` 대조. v6 반대 방향 이동 `19/20/22` 보존 |
| cold·기억·복귀 | 같은v7 원본 영상에 Home→프로세스 종료→**실제 홈 위젯 탭**→같은 아루/모자/오른쪽 쿠션→우리 아이 기억64개→수면/깨우기·직접 접촉·바닥 이동. `48/49/50` 같은 petId/이름/형태/성격/EXP/coin/food와 가용 모자ID3개 보존. DB 읽기/프로세스 시작만으로 화면 PASS를 대신하지 않음 |

최초v5/busy v5·v6/최신v7 재착용·쿠션·cold·입력 증거를 구분한다. 변경하지 않은 최초/성장 연기를 v7에서 새로 수행했다고 표시하지 않는다. 완료될 때만 기억하며 취소/다른 개체/오래된 revision은 거부한다. trace/저장은 로컬만 사용하고 일반 저장 시간·재화·소유를 조작하지 않았다.

### AI — A 유지, B 효과 별도

기존 공식 **LiteRT-LM Swift0.18 EmbeddingEngine/text270m**의 Mac·arm64 Simulator 한국어768차원 실제 추론 성공 보존. 별도예제이며 게임 MediaPipe adapter를 Swift 경로로 통합한 것이 아니다. [공식 Embedding Models](https://developers.google.com/edge/litert-lm/embedding_models), `mobile/scripts/reboot-litert-probe/README.md`와 이전 `ai-swift` receipt에 근거/재현이 있다. SDK 내부 패치·추가 설치·대형 모델 교체 없음.

모자·쿠션 실제 검증 **후** 같은 아루 완료 모자 후보5개로 실제 Mac Swift 추론 비교 (`27/28/31`). 익숙함/행동중 사례는 A/B 모두 관련 경험을 찾았고 첫 경험 회상에서는 최근2개 A가 놓친 오래된 경험을 B가 찾았다(질의34.76~40.16ms). 작은 구조화 데이터는 별도의 타입/상황 조회로도 같은 경험을 찾을 수 있으며 이 대조 조회를 현재 A 결과와 구분했다. **게임 B의 연기/자연스러움·native A/B24·AI ON/OFF 성능 NOT_RUN, 제품B NOT_INTEGRATED**. 우월성 미확인으로 **A / NOT_ADOPTED_AFTER_COMPARISON** 유지. 이전 host24개를 이번 새 실행 숫자로 재사용하지 않는다.

### 최신 검사·성능·보존

- v7 새 **392/392**, 영향 **30/30**(기억/현재좌표/SQLite lane·BUSY retry), lint/typecheck PASS. iOS Release compile exit0·DB유지 설치·실제 실행, AndroidJS bundle PASS. iOS CNG **23/23**, asset generator `--check`, 운영검사 **42/42** PASS. 이전v6 391/391·영향38/38은 중간 이력.
- 같은v7/방/정상renderer/A/동작줄이기OFF/녹화ON의60초 (`47-v7-pet-input-performance.json`): 정상 펫 입력8개, 입력→다음RAF p95 **10.81ms**, 입력→제출 p95 **16.97ms**, RAF interval p95 **16.75ms**/max59.27ms, >500gap0, 제출 **59.92Hz**. 기존100ms/33.34ms/500ms/30Hz gate **PASS_PROXY**. draw p95.782ms/morph.0409ms/queueDrain5.747ms.
- 예비v6 `30`/v7 `46` 입력0은 **INSUFFICIENT_DATA**. 바닥 이동은 실제 작동하지만 기존 probe는 펫 접촉만 기록하므로 이동 지연으로 해석하지 않는다. 최종 창은 CUA 정상 펫 입력8개로 확인. EncodingFPS/이 proxy는 실제 표시FPS·GPU·물리 touch-to-photon이 아니다. 게임B가 없어 AI ON/OFF 미실행.
- 원본30개 이름·형태·성격·food·coin·EXP·meal·시설 및 전체 소유 행 **모두 일치**,3DB integrity `ok` (`51`). 일반 위젯은 `dev-local-pet-1` snapshot이며 아루가 덮어쓰지 않았다. 착수의 정상 일반방 전경에 따른 합법적 갱신과 최초snapshot byte동일 보존을 혼동하지 않는다.
- 장기동면의 최신v7 GUI 재시험·Android 최신native/UI·실기기·GPU·물리입력·발열/배터리 **NOT_RUN_THIS_SCOPE**. 수면/동면 경계·경제·중복정산은 이번 자동 회귀, 이전 실제 동면CLOSED는 별도 이력이다.

도구: CUA 실제 조작·화면, simctl 로컬 영상·설치, Node 기존 자산 `--check`, Apple AVFoundation 원본 디코딩, bundled Python 비교 배치, Swift 실제 host 검색 사용. Blender/Maestro 호출 도구 없음·새 설치 없음. Context7 도구는 노출되지만 이번 좁은 수정에서 새 문서 호출하지 않음(이전 성공과 구분). Figma/이미지생성/외부 업로드 미사용. 정지 시안을 앱 실행으로 납품하지 않았다.

### 바로 평가·Git

현재 Simulator 아루 방에서 **☰→우리 아이**로 세 후보, 하단 **손 내밀기/거두기**로 같은 교감. **☰→상점·꾸미기**의 모자 벗기/쓰기·쿠션 옮기기→빈 바닥. 일반 방이면 메뉴→설정→**리부트 첫 검토판**. 지금 같은 아루는 모자를 경험했으므로 최초 장면은 위 v5 원본으로 비교하고 저장을 되감지 않는다.

최신 연속 원본 `evidence/reboot-01-memory-2026-10-07/44-memory-cushion-cold-latest-v7.mp4` **10:27.695**, 관찰/대기 구간도 남긴 정상 속도 영상. cue 시각 `45`, cold 감사 `48/49/50`을 함께 읽는다. 영상·DB·모델·SDK·build/generated native·개인 로그는 stage/업로드하지 않는다. 앱 소스cf1d57f와 후속 보고서 HEAD 구분; 최종 feature HEAD/추적/live origin/clean은 동일 증거 폴더 `git-final-audit.json`과 최종 응답에 기록한다. 다음은 사용자 핵심 경험 평가이며 승인 없이 다음 제작 범위로 진행하지 않는다.

## Historical — v5 / PARTIAL_WITH_BLOCKERS / 2026-10-07

아기·성장기·진화 후를 정상 ‘우리 아이’ 메뉴로 전환하고, **대사를 가린 동일 손 내밀기→접근→접촉→손 거두기→복원→자율생활 복귀**를 실제 Simulator에서 확인했다. 아기는 둥근 몸과 조심스러운 반응, 성장기는 앞발과 기울어진 기대기, 진화 후는 안정된 기대기와 손을 놓은 뒤의 시선/앞발·윙크를 비교할 수 있다. 이는 같은 아이의 제작 후보 프리뷰이며 실제 레벨/EXP/진화를 진행한 시험이 아니다. 재미·최종 아트는 USER_REVIEW_PENDING이다.

### 직접 관찰한 결함과 최신 설치본

앱 소스 checkpoint **`6fbfaea9dcdc145d57afc3cd098f1bd32259ecfc`**. 이후 보고서 commit은 앱 코드를 바꾸지 않는다.

착수 HEAD/추적/live origin은 `da7e869`, 앱 소스8e012eb/설치v3 SHA1b380d85…가 일치하고 clean이었다. 기존30개와 소유 테이블을 온라인 백업·읽기 전용 대조했고, 코드가 같아 처음에는 재빌드/재설치하지 않았다.

실제 v3 성장기/진화 후에서 **경로의 마지막 방향이 접촉에 남아 손 옆을 바라봄**을 발견했다. `RebootDirector`가 손의 실제 target을 pose에 유지하고 `rebootFacing`이 최단 각도/3.6rad/s 제한으로 시선과 접촉 방향을 맞추도록 수정했다. v4에서 방향 수정은 확인했지만 **높이 .48의 손 표식이 입을 가림**을 관찰해, `.14`의 앞발 높이로 조정했다. 실제 표식·몸짓을 유지하며 얼굴/앞발을 함께 볼 수 있게 했다. 원본 자산과 경제·성장·저장 서비스는 변경하지 않았다.

최신 **v5 Release SHA `5d4668402b41d1043840df1113cb076f28960830e0d4abea7866d3a004591dde`**, manifest `evidence/reboot-01-resume-2026-10-07/18-release-v5-manifest.json`. v3/v4 영상은 수정 전/중간 이력이다. 새 기본 시각 결함 두 가지는 **v5 관찰 구간에서 CLOSED**이며 첫 범위 전체 완료와 구분한다. 실제 같은 v5의 모자·쿠션·기억/수면·동면·정상 재실행/입력·성능 검증 직전 Mac이 다시 잠겼고 CUA가 실제 실패했다. 새 영상이 없는 항목을 과거 PASS로 닫지 않았다.

### 실제 세 성장 비교 증거

| 최신 v5 증거 | 실제 구간·길이 | 판정 범위 |
|---|---|---|
| `19-baby-hand-v5.mp4` | 무편집 정상 속도150.58초. 완료 기억 기준 약126.89~128.29초가 손 해제/복원 | 접근·손 접촉·몸 반응·해제·생활 복귀 실제 관찰 |
| `21-growing-hand-v5.mp4` | 무편집 정상 속도138.27초. 약124.47~126.67초 복원 | 같은 카메라에서 성장기 앞발·기대기·시선·복원 비교 |
| `23-evolved-hand-v5.mp4` | 무편집 정상 속도117.72초. 약73.62~75.82초 복원 | 진화 후의 실루엣·앞발·마무리 표정/시선·생활 복귀 비교 |
| `20/22/24-*-contact-v5.png` 및 `25-same-camera-three-stages-v5.png` | 원본1170×2532. 비교는 각 원본을 같은390×844로 축소 배치, 카메라/설정 동일 | 한 뿔·몸 비율/귀 차이·눈/입 가독성·얼굴 가림 수정 확인. 확대 시안을 게임 크기 PASS로 대체하지 않음 |
| `31-contact-recovery-sequences-v5.png` | 원본 영상의0.1초 간격 복원 프레임/동일 crop; 원본 full frame도 보존 | SELF_REVIEW: 관찰 구간에서 귀 분리/몸·얼굴 찢어짐·급격한 복원 미관찰. 미세 접지/전체 보행 품질을 모든 상황에서 보장한 것은 아님 |

완료 시각은 실제 기억 UTC와 녹화 파일 생성시각을 대조한 근사 구간이다. 저장 대기열 지연/영상 인코딩 FPS를 물리 입력 지연이나 실제 표시 FPS로 부르지 않는다. 최신 프레임 제출 proxy 측정·GPU·물리 입력·실기기·발열·배터리는 NOT_RUN이다.

### 기억·신뢰성 — 완료와 미실행

기존 두 DB의30개 이름·형태·성격·재화·EXP·식사·시설 및 전체 소유 행이 착수 값과 동일하다. 새 리부트 pet `reboot-01:main`/아루, 실제 EXP0/coin0/Lv1와47개의 완료 경험을 읽었다. 세 모습 비교와 손 교감은 클릭 EXP를 만들지 않았다. 같은 저장/최근 모습은 필요한 기술 설치 과정에서도 보존했고 DB 초기화 없음.

**모자 첫/재/행동 중 착용·쿠션 이동·정상 메뉴를 통한 cold 기억 복원은 BLOCKED_HOST_RELOCKED**다. 당시 hatWorn=false이고 hat 경험도 없으며 쿠션은 초기 위치다. 정상 입력으로 시험하지 않은 A 기억 반응을 실제 모델 효과 또는 실제 PASS로 표시하지 않는다. 이동한 쿠션의 접근/접지·옛 좌표 vs 현재 좌표와 일반 위젯 보존도 다음 실제 입력에서 확인해야 한다. 아직 원격·출시/MVP 완성이나 READY_FOR_CORE_EXPERIENCE_REVIEW가 아니다.

### 공식 Swift 임베딩 — 새 실제 결과

[공식 LiteRT-LM embedding guide](https://developers.google.com/edge/litert-lm/embedding_models)와 [핀된 Swift options](https://github.com/google-ai-edge/LiteRT-LM/blob/b2f686e2ed4718fb84ec398a61dd59ca0f0aff27/swift/EmbeddingEngineConfig.swift)를 대조했다. **0.18.0 / b2f686e2ed4718fb84ec398a61dd59ca0f0aff27**의 `EmbeddingEngine`은 `visionBackend=nil / audioBackend=nil`로 해당 encoder 초기화를 생략한다. 일반 채팅 `Engine`/conversation을 호출하지 않았다. 기존 MediaPipe 내부 바이너리·게임 SDK/Expo55·package/lockfile은 변경하지 않았다.

공식 배포 XCFramework ZIP checksum: iOS `d765b99592d4ec3d0c9e2bd69469454af06c834861340672da1891c0c121c347`, Mac `5f6ee68d95eeccb084c6e66d5ee47255e3020fa0fb29696dd0301ae26d6cfb4f`. iOS archive의 arm64 Simulator slice와 실제 Mach-O platform7/minOS15.1/SDK26.2를 확인했고, 현재 Xcode26.3에서 별도 예제 compile/sign/install/실제 추론까지 성공했다. 이것은 최종 출시 최소 OS 선언·x86/실기기 지원 검증이 아니다.

모델은 기존 **text270m/164,626,432bytes**, revision9be6e8b… / 실제 SHA2d079ee2… / Apache-2.0. 모델을 크게 바꾸거나 새로 외부로 입력을 보내지 않았다. 같은 한국어 query/모자·쿠션 문장으로 **Mac과 iOS arm64 Simulator 각각 실제768차원·유한·정규화**를 확인했다. cosine은 둘 다 **0.8132188 / 0.7273953**, 첫5개 값도 동일했다.

| 현재 재현 스크립트 실행 | SDK init ms | 첫3개 추론 ms | warm query ms |
|---|---:|---:|---:|
| Mac CPU2threads | 68.60 | 291.84 | 32.79 |
| iOS arm64 Simulator CPU2threads | 96.52 | 332.33 | 42.06 |

해시 검증이 먼저 파일 페이지를 읽은 뒤 SDK init을 측정했다. 따라서 위 init은 cold 앱 시작/기기 성능이 아니며, 이전 별도 첫 실행422.78/414.04ms와 성능 개선으로 섞지 않는다. 신규24개 native A/B·B 우월성/게임 효과는 미검증이다. 이전 호스트 AB24(A/B Recall@2 모두1.0)는 아래 이력으로 보존한다.

**게임의 A는 규칙/구조화된 기억이고 B 실제 모델 사용으로 표시하지 않는다.** 현재 게임의 MediaPipe adapter는 변경하지 않았으며 별도 SDK 예제 성공과 통합된 B를 구분한다. [재현 소스/명령](mobile/scripts/reboot-litert-probe/README.md), `ai-swift/real-swift-host.json`, `real-swift-simulator-current.json`, `cross-platform-inference-audit.json`, `receipt.json`에 actual 결과와 checksum/source hash가 있다. 실제 SDK는 ignored 로컬에만 있다.

### 현재 자동 검사·도구·남은 한 작업

이번 새 **388/388 fail0/skip0, 영향12/12, lint/typecheck, v5 iOS Release compile/install/launch, Android JS bundle, CNG23/23, 운영42/42 PASS**. 실제 화면·성능 미실행을 숫자로 대신하지 않는다. SOL_DIRECT/SELF_REVIEW, 새 subagent0, effective ROUTING_UNVERIFIED.

실제로 사용한 도구: CUA 정상 앱 조작, 현재 Three renderer/기존 편집 자산, Swift/AVFoundation 영상 디코딩, Pillow 비교 이미지, 공식 Swift/C SDK의 별도 예제. 자산을 새로 전 계열 제작하지 않았다. Context7은 callable이며 앞 작업의 Expo 조회는 이력; 이번 SDK 확인은 공식 URL/핀 원문/실제 binary/API 호출이다. Blender/Maestro는 callable/local 실행이 없으며 새 설치 없음. Figma는 이번 쓰기/업로드 없음, 과거 link_id 오류를 성공으로 바꾸지 않는다.

다음 한 작업은 **Mac 실제 접근→현재v5/source manifest→정상 설정/검토판→처음 모자 쓰기/완료→벗기/재착용→다른 실제 행동 중 착용**이다. 이어 쿠션 이동·옛/현재 좌표·동일개체 cold 기억, 메뉴/수면·동면/저장·일반위젯, 현재 performance를 확인한다. 필요한 결함만 수정하며 다음 계열/상점/전체1~20으로 확대하지 않는다. 현재 완성된 세 모습/교감은 아래 이력 영상으로 덮어쓰지 않고 다음 최신 빌드에서도 변경 영향을 구분한다.

현재 로컬 증거 `evidence/reboot-01-resume-2026-10-07/`. 모델/SDK/DB/빌드/영상/개인 로그는 Git 제외, source/checkpoint·일반feature push만. main/merge/force/tag/release/배포/실건강/실결제/보안/전역 설치/외부 업로드 없음.

## Historical — 초기 구현 v1~v3 / PARTIAL_WITH_BLOCKERS

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

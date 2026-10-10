# STORAGE-01 재개 결과 — 진단 보존 수정 확인 / 원사건 OPEN

2026-10-10 · SOL_DIRECT / SELF_REVIEW · subagent0 · effective ROUTING_UNVERIFIED.

최신 실제 앱에서도 같은 아루가 생활하고 정상 바닥 이동·직접 접촉·말풍선·메뉴 닫기·cold 복원이 이어졌다. 이번 작업은 새 개편이 아닌 **오류 진단의 보존 결함 수정**이다. A/B/C·아트·경제·성장·수면/동면·SQLite schema/lane/재시도 정책은 보존했다. 렌더는Simulator우선검토2.5/AA0·3고품질·2.25여유옵션 그대로이며 실기기전최종기본값은미확정이다.

## 실제 원인과 수정 범위

출발Git/추적/원격 b58967e, clean. 설치followup-v2 SHA b132…32941/212입력 일치. 실제Mac접근성/스크린샷/정상입력 성공. 디스크캐시4건인데같은cold프로세스live진단0건을실제로확인했다. 캐시를읽지않고새오류에서그파일을덮는경로였다. **DIAG_RESTART_HISTORY_LOSS / INTERRUPTED_DIAGNOSTIC_WRITE는수정검증완료**이며과거CANTOPEN의인과원인이아니다.

최신유효checkpoint를읽어복원하고generation과두cache슬롯을사용한다. 쓰기실패/짧은쓰기/손상된한파일이마지막정상본을덮지않게하고readback으로검증한다. 불러온과거기록은봉인해재실행시connection/transaction/trace번호가재사용돼도새복구로오인하지않는다. 최대8건/cleanup4·파일읽기한계/엄격한타입·필드검사. 게임DB수정/스키마변경/보상재생/삭제/SDK패치/재시도연장없음. OS캐시삭제·power-loss/fsync까지영구보존을보장하지않는다. [ADR-015 추가절](docs/adr/ADR-015-sqlite-access-and-growth-playthrough.md).

## 같은 최종 설치본의 증거

소스 **53b9061445a405a691d318e446245f66292aa480** / 설치 **REBOOT-03.2 storage-v4 Release** SHA `f63d79852b811c9c6d8971bcf7c6ea06de24e76b768ac66082e0822bc6b086f6`,213입력fingerprint `85e7a73fb528d61b8416ce2e26b89384c5e6eec9b71483e4f235ffcf1d28b4b5`. v3는선행수정본이며그성능값/영상을v4로표기하지않는다. 데이터초기화없이같은앱에업데이트설치했다. Mac15.6/Xcode26.3/iPhone16e Simulator26.3.1/native1170×2532/Expo55.0.31/SQLite55.0.20/FileSystem55.0.26.

1. v4가v3에서보존된기존6건을정확히복원.
2. 별도DB에서실제nativeUPDATEexecute14/finalize14,별도pagequotaINSERTexecute13/finalize13. 각실패snapshot전체동일/각동일command20회→meal1/EXP15/integrityok. 원본DB나호스트디스크를손상시키지않음.
3. 같은검사에서별도retained파일에 **합성incident/합성중단·짧은쓰기**와실제nativeFileIO를사용. 마지막정상checkpoint/첫기록보존, silently짧은쓰기검증거부. 이것을실제기기의디스크Full사건이라고하지않음.
4. 진단8건→cold재실행→새session/8건전체내용정확히같음. 같은reboot-01:main/아루/Lv1/EXP0/food0/coin0/awake 복원. 실제 이동·목적지변경·직접접촉/메뉴복귀. 일반저장의새로운SQL실패는관찰되지않음.
5. 최종검토A/+35·2.5/AA0·일반모션·말풍선ON·정상생활로복원. 영구선택null/cold자동1.5-AA0/+25 유지. 수면/동면의장시간GUI전수검사나네진화재시험을새로했다고기록하지않음.

로컬 `evidence/storage-01-resume-2026-10-10/`: 최초v2live0/디스크4, `warm-v4.json`(6)/`native-v4-reliability.json`/`before-cold-v4.json`/`after-cold-v4.json`(8정확히동일),`after-preservation-audit.json`,releasemanifest와실행로그. 최종 **`v4-native-cold-and-input.mp4` 147.975초**,무편집정상속도동일v4의격리검사→cold→정상입력/메뉴저장. 원본PTS/프레임은 `v4-frames/metadata.json`. cold 전환의120초 부근에는 GL 방이 아직 나오지 않은 시작 프레임도 보존했고121초 원본프레임에서방과펫복원을확인했다. `v4-cold-detail/`의밀집프레임과정상복원후입력을구분하며즉시렌더/실제표시지연을측정했다고하지않는다. 앞선v3영상189.520초/84.473초는선행v3증거로보존.

## 성능·자동 검사·보존

439/439(fail0/skip0),영향46/46,lint/typecheck PASS. v4xcodebuild exit0/설치bundlehash/213runtime입력일치. 최종AndroidJS bundle PASS,CNG27/27 STATIC·운영42/42 확인. 실제Androidnative/UI는환경미설치로NOT_RUN.

**이번v3의선행60초영향**: A/+35·2.5/AA0·녹화ON·입력9,제출41.79Hz/RAFp9529.20ms/max55.39ms/입력→제출p9548.94ms/500ms초과0,기존proxy기준PASS. 호스트load5.72→6.97. v4는진단metadata타입검사만추가보강했으며v4fresh성능계측은NOT_RUN. 과거v2의4×180초결과와합산하거나원인비교하지않는다. 실제GPU/표시FPS/물리터치/실기기/발열배터리NOT_RUN. 자동검사/정지화면을실제모션이나GPU측정으로대체하지않음.

원본일반1+기존체험29+같은아루1,48개제작원본,이름·형태·personality·재화·EXP·시설·소유·섭취원장/3DBintegrityok 보존. 일반meal3/체험1155/검토0 그대로. 기존사용자원본/영상/DB 삭제없음. 현재약25.6GiB여유/4GiB사전검사PASS;개발build/cache증가는읽기전용목록으로기록. 실제Health읽기OFF.

Context7은현재**plugin형실제resolve+query성공**,SDK55공식URL/설치55.0.26을대조했다. 공개라이브러리질문만전송했고프로젝트데이터외부전송/중복등록/설치없음. [공식FileSystem55](https://docs.expo.dev/versions/v55.0.0/sdk/filesystem/)와설치iOS string-write의atomically:false를확인했고publicwrite의원자성을가정하지않았다. 별도의호스트감사명령은처음상대출력경로로실패해정정했고실제앱SQLite재현으로세지않음.

## 남은 것

- **[STORAGE-01](docs/defects/STORAGE-01-cantopen.md) 원사건OPEN**:127MiB때의실제VFS파일/extendederrno가없다. 이번진단보존수정/합성재현으로원인을확정하거나CLOSED하지않음. 재발하면오류화면/현재저장/두진단슬롯부터보존하고원본DB를초기화하지않는다.
- 실제iPhone0개,AndroidSDK/adb미설치.실기기검증 **BLOCKED_ENV_NO_CONNECTED_DEVICE / NOT_RUN**. 데이터USB로iPhone연결/잠금해제/신뢰와개발가능상태확인이필요하다. 실제계정/서명/관리자권한이필요하면그경계는별도로멈춘다.
- 최종렌더설정·실기기성능·재미·최종아트/크기는사용자검토대기. 다음아트/계열/상점/AI/성장확대없음.

feature의소스/인계checkpoint와일반push만진행하고실제local/tracking/origin일치/clean을 `git-final-audit.json`에보존한다. main/merge/force/tag/deploy/실건강/실결제/보안설정변경없음. 아래는과거완료증거이며최신v4검사횟수/시각검증으로재사용하지않는다.

---

## Historical — REBOOT-03.2 followup-v2

# REBOOT-03.2 후속 마무리 — VISUAL_QUALITY_REVIEW_READY / STORAGE-01 OPEN

2026-10-10 · SOL_DIRECT / SELF_REVIEW · subagent0 · 요청GPT-6.1 Sol Max / effective **ROUTING_UNVERIFIED**.

## 실제 플레이 결과

같은 아루·A/+35에서 주변을 살피고, 조심스럽게 다가가고, 장난스러운 몸짓 뒤 쿠션에서 쉬는 생활이 이어졌다. 정상 바닥 입력으로 연속 목적지를 바꾸고 펫을 직접 누르면 말캉한 접촉·표정·말풍선 뒤 다시 생활로 돌아왔다.2.5/3.0 모두 메뉴/입력 잠금이나 저장 오류를 관찰하지 않았다. 숨긴 강제 장면이나 상태값만으로 생활 통과를 표시하지 않았다.

사용자의 **화면 전체 선명도 개선** 평가를 보존한다. **iOS Simulator 우선 검토2.5/AA0**,3.0은 고품질 비교,2.25는 성능 여유 비교다. 제품/실기기 기본값은 미확정이다. 현재 창은A/+35·2.5/AA0·일반모션·말풍선ON·awake·정상생활이고 영구선택null. 실제 cold 실행에서 기존 automatic1.5/AA0/+25로 돌아온 뒤 입력이 작동하는 것을 확인했다. 기존A/B/C/아트/경제/성장/수면/동면은 변경하지 않았다.

## 같은 최종 Release의 실제 증거

출발 HEAD/추적/실제origin **6ce22c0**, clean; 소스 **d714e24e0d880740ac579cb3432a6a986ca30842**. 설치 **REBOOT-03.2 followup-v2 Release SHA `b132a81e013c61e4bad7033f48d51e660ce73099d95691f36541f58975232941`**, 212빌드입력 fingerprint `b9851582316199faad077a43c0d139720dc966eacfa7ca307863b1b663887df0`과 실제 설치해시가 일치한다. 문서만 저장한 최종 인계 SHA는 `git-final-audit.json`과 현재 Git에서 읽는다. 수정한 diagnostics/격리QA/180초계측 때문에 새 Release를 같은DB에 업데이트했다. UI QA의 초기 오류8을 고친 뒤 이 v2에서 모든 최종 네이티브/플레이/성능 증거를 다시 확보했다.

환경: macOS15.6/Xcode26.3/arm64, iPhone16e Simulator26.3.1,390×844pt/native1170×2532, Apple Software Renderer/GLES3.0 APPLE-23.0.2. Expo55.0.31/SQLite55.0.20/GL55.0.18. 실제 Mac 접근은 성공했다. 과거잠금/BLOCKED를 복사하지 않았다.

로컬 `evidence/reboot-03-2-followup-2026-10-10/`:

- `A35-250-play-v2.mp4` **214.583초**, `A35-300-play-v2.mp4` **214.628초**: 무편집 정상속도 실제 앱. 초반 설정 진입 뒤 무입력 생활, 후반 연속 이동8회+직접접촉1회, 창이 끝난 뒤 추가 이동/접촉/메뉴 저장. 녹화 인코딩FPS를 앱FPS로 사용하지 않는다.
- 2.5 영상 약13~22초 장난,38~48초 살금살금 접근,53~63초 두리번거림,68~76초 쿠션쉼,120~127초 탐색,161~163초 직접접촉,166~176초 자율쉼.3.0 영상 약21~28초 관심대상탐색,35~44초 장난,49~56초 주변확인,75~85초 쉼,147~149초 접촉과복원,152~163초 다시접근. 시각은 record요청 시계와 trace를 대응한 근사 구간이며 실제PTS는 `250-frames/metadata.json`/`300-frames/metadata.json`로 별도 제공한다.
- `250-video-trace.json`, `300-video-trace.json`: 같은 일반 경로의 start/complete/cancel/발화/실제완료기억을 연결한다. 두 영상의 자연 생활 순서가 완전히 같은 대본이라고 주장하지 않는다.
- `A35-250-matched-native.png`, `A35-300-matched-native.png`: 같은 방/카메라/빛/위치/크기의 정면idle **통제비교**. 생활 영상과 구별. 원본1170×2532를 축소/보정하지 않았다. `250-vs-300-*-native-pixels.png`는 crop/paste/라벨만; 샤픈·blur·리사이즈없음. 눈blink위상은다르므로 이쌍으로눈매/표정디자인변화를주장하지않고 몸·방 외곽의 raster차이를 본다.
- `250/300-play-samples.png`는 영상의 원본pixel 장면crop이며 전체 정상속도 움직임은 원본영상으로 확인한다. 이번에 새 캐릭터/모델 제작은 하지 않았다.
- `sleep-v2-native.png`, `cold-state-v2.json`, `after-preservation-audit.json`, `final-250-native.png`: 정상수면/깨우기→이동접촉, 메뉴복귀, Home/실제일반위젯탭, cold동일아루/원본보존. 긴동면시간 경계의 GUI 전수검사를 새로 했다고 쓰지 않는다. 기존 일반Sim의 동면은 그대로였다.

## fresh180초 성능 / 녹화ON/OFF 순서 교차

모든 창은같은v2 Release/A/+35/방/카메라/빛/AA0/일반모션/현재아루다. 순서 **ON2.5→ON3→OFF3→OFF2.5**,각180000ms완료/누락버퍼없음, 각9개 실제 touch입력/GL0. 초반무입력,후반같은8바닥+1접촉 절차. 인코딩 시작·저장 패널 등은 측정창과 구별한다. 비교 중 build/전체suite는 실행하지 않았다. 호스트 첫load값은 각before/after JSON에 기록됐고 자연생활·호스트부하·워밍업 변동이 남아 있다. 통계적 인과 실험이나GPU측정으로 주장하지 않는다.

| DPR / 녹화 | 제출 Hz | RAF p95 / max ms | morph / draw / GL대기 p95 ms | 입력→제출 p95 ms | 기준 |
|---|---:|---:|---:|---:|---|
| 2.5 / ON | 58.40 | 19.98 / 56.64 | 0.748 / 0.988 / 17.52 | 28.44 | PASS_PROXY |
| 3 / ON | 40.84 | 30.78 / 121.54 | 0.762 / 1.094 / 28.14 | 49.00 | PASS_PROXY |
| 3 / OFF | 43.17 | 29.14 / 108.34 | 0.780 / 1.004 / 25.33 | 36.56 | PASS_PROXY |
| 2.5 / OFF | 56.42 | 22.36 / 80.76 | 0.806 / 1.057 / 19.57 | 36.18 | PASS_PROXY |

네 창 모두RAF500ms초과0. 기존최소제출30Hz/RAFp9533.34ms/입력p95100ms/긴gap500ms 기준유지. 실제버퍼2.5=975×2110/3=1170×2532, 양쪽MSAA0/FXAA없음.3의pixel부하는2.5보다44%많다.2.5는58.40/56.42Hz,3는40.84/43.17Hz로 이번환경에서2.5여유가더크다.3이최소기준을통과했어도60Hz를지속했다고하지않는다. ON/OFF차이가일관된방향이아니므로녹화만성능원인으로확정하지않는다. 과거7×60초와합산하지않았다.

원본pixel비교에서3은 쿠션/러그/몸 외곽의 작은계단이더줄고2.5는방과얼굴이선명하면서이번proxy여유가더크다. 전체화면시각/입력 **PASS_SIMULATOR_VISUAL / ACTUAL_INPUT**과계측 **PASS_PROXY**를분리한다. 실제GPU실행/화면표시FPS/물리터치지연/실기기/발열배터리 **NOT_RUN**. Simulator결과로iPhone의최종DPR을정하지않는다.

## 저장 신뢰성 / 디스크

별도 결함 **[STORAGE-01](docs/defects/STORAGE-01-cantopen.md) — OPEN_ORIGINAL_VFS_CAUSE_UNCONFIRMED**. 원사건의최초관찰SQL은UPDATEpet_snapshot/execute14지만실제VFS xOpen파일·extended code/errno가보존되지않았다.127MiB만으로FULL13과같은원인이라단정하지않는다. 이번착수부터약32GiB였고현재약30GiB이며이번삭제/정리없음.

같은v2의독립격리DB에서실제14execute→finalize14,실제13execute→finalize13을발생시켰다. 실패snapshot전체동일/같은요청20회복구→meal1/EXP15씩/integrityok. FULL시험은snapshot·meal변경뒤commandledger삽입을실패시켜원자성을확인했다. 별도150개경합/직접30재요청→meal1/자동meal1/깨우기replay동일/EXP30도확인했다. 처음부모이동실험은READONLY8이었고실패로보존,원본파일을옮기거나호스트디스크를채우지않는저널blocker방식으로정정했다.

추가한로컬진단은최초file/phase/connection/transaction/availableBytes/본체·부모·저널·WAL·tmp상태와cleanup/후속transaction완료를분리한다. VFS실제시도경로는NOT_EXPOSED_BY_EXPO. bind/건강원본/snapshot을외부로그로보내지않고 진단쓰기실패가SQL실패를덮지않는다. txn쿼리/공통per-file lane/statement정리/기존BUSY재시도시간을유지했다. 자동 DB초기화·삭제·보상재생 없음. **원사건원인 CLOSED가 아니다.**

원본일반1+기존체험29+같은아루1, 이름/형태/personality/재화/EXP/시설/소유/섭취원장,48개제작원본 보존.3DB integrityok/DELETE. 일반meal3·기존체험1155·검토아루0 그대로. 정상생활기억/시간revision은진행하며DB바이트전체가정지했다고주장하지않는다.

읽기전용점유감사: evidence7.52GiB/프로젝트Blender도구1.21GiB/node_modules.48GiB/ios.37GiB/앱DerivedData1.08GiB. 모델/venv·DB백업·영상이큰부분이다. 생성build/cache와보존할원본/영상/DB를분류했고임의삭제없음. 파일논리크기와du/APFS할당량은다르다. 향후큰작업전 `python validation/audit_local_artifacts.py --require-free-gib 4` 실행;공간부족이면반복생성하지않고정리대상을구체적으로검토한다.4GiB는가역개발사전검사값이며앱경제정책이아니다.

## 자동 검사 / 종료 범위

새최종432/432(fail0/skip0), 영향39/39,lint/typecheck PASS, v2xcodebuild exit0/동일DB설치/실제hash확인,AndroidJS bundle PASS,CNG27/27 STATIC,운영42/42 PASS. 기본python은tomllib없는버전이어서초기운영검사실패를남겼고,설치된번들Python으로42/42를확인했다. 영상원본decode도sandbox의AVFoundation권한제한실패를보존하고정상승인된로컬읽기로원본PTS/frame을확인했다. 환경도구의실패를앱실패로꾸미지않았다. 이번Androidnative/UI와실기기/GPU는NOT_RUN.

이번6항목후속실행은완료했다. 전체렌더비교판준비상태는유지하되 **저장원사건의정확한VFS원인은OPEN**이다. 최종렌더/실기기출시성능·재미·아트·모델·크기는미승인. 새아트/성장기/진화형/상점/AI/가격개발없음. source와최종인계를feature논리체크포인트에보존하고일반push후localHEAD/tracking/live일치와clean을 `git-final-audit.json`에남긴다. main/merge/force/tag/배포/실건강/결제/보안변경/미디어외부업로드없음.

---

## Historical — visual-v5 첫 전체 비교

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

# Arucon — 새 개발자 인수인계

2026-10-14 기준. **소스·저장·원본을 이어받는 안내이며, 제품 출시나 재미 승인 보고가 아니다.** 현재 운영은 SOL_DIRECT / SELF_REVIEW다. 과거 Astra·멀티모델 검증 이력은 보존하며 새 강제 분업을 요구하지 않는다.

## 1. 처음 읽을 곳과 현재 기준

1. [루트 AGENTS](../AGENTS.md): 작업·저장·권한 경계.
2. 이 문서 → [NEXT-RESUME](../NEXT-RESUME.md): 다음 한 작업.
3. [REBOOT-04 최신 보고](../REBOOT-04-REPORT.md)의 **상단 v17**: 현재 실제 화면·입력·영상 증거. 아래 v15 등은 당시 이력이다.
4. 변경할 영역의 [SRS v1.9](arucon-SRS.md), [DEC](decisions.md), [ADR](adr/README.md), [검증 정책](validation-policy.md)만 추가로 읽는다.

| 항목 | 확인된 기준 |
|---|---|
| 저장소 | `https://github.com/gulatnaru/arucon-project.git` |
| 작업 브랜치 | `feature/arucon-mobile-autonomous` — main/merge/force push/배포 금지 |
| 인수 착수 HEAD | `0e40524c5e1b021a7047dbd56a95576040e111eb` — 로컬·추적·실제 origin 동일, clean |
| 최신 앱 소스 | `7256e98fe3a566990abaaeedd9e741e0167bbb28`; 이후 0e40524는 보고 문서 체크포인트 |
| 설치본 | `reboot-04-expression-v17`, iOS Simulator Release, 내장 JS/Metro 불필요 |
| 이번 재확인 | 설치 JS SHA256 `ff2c53ef096244dd4bd382d3e791a1ad406801081b56fd9d9425909dd19350d9`, 실행파일 `64de2495113961a038f8821903052364340d3ab09c33e4fcd34ea51cf47f418d`가 v17 manifest와 동일. 241개 제작/앱 입력도 동일 |
| 범위 판정 | `CELEBRATION_EXPRESSION_REVIEW_READY`는 v17 축하 표현 검토 범위만. 전체 MVP 완료·출시·사용자 만족을 뜻하지 않음 |

이 문서가 포함된 후속 커밋은 Git 로그로 확인한다. 과거 앱 소스 SHA로 reset하지 않는다. 이번 인수인계는 문서만 변경하므로 앱 재빌드·재설치·DB 초기화를 하지 않았다.

## 2. 제품 목표와 바꾸면 안 되는 규칙

걷기·달리기·수면의 결과로 성장하고, 혼자 먹고 쉬고 주변을 살피며 개성과 버릇을 드러내는 **AI형 가상 펫 육성 게임**이다. 장기 목표는 16가지 MBTI형 게임 성격이며, 인간 MBTI 판정 기능이나 16종 완성을 뜻하지 않는다. **개체명 / 외형 계열 / 성격은 독립**이다. 공통형 아루콘 → 말루·모노·피코·몽글의 방향은 성격을 강제하지 않는다.

- 현재는 실제 건강 읽기 OFF, 합성 활동·수면만 사용한다. 기록 없음과 활동 부족을 구별한다.
- EXP는 확정된 섭취에서만 발생한다. 쓰다듬기·대화·관찰로 EXP/코인/애정 점수를 파밍하지 않는다.
- 직접/opt-in 자동급식은 같은 경제 계약, 수면은 보너스 중심, 이미 얻은 재화는 과거 수정·상한 때문에 회수하지 않는다.
- 기본 화장실은 시작부터 무료·자동 청결이다. 유지비·청소 숙제·기존 시설 회수로 바꾸지 않는다.
- 수면/동면/단순 휴식 표현을 구별한다. 동면은 정상 복귀 서비스로 처리하며 플래그를 직접 지우지 않는다.
- 최종 재미·아트·성격 표현·크기·구도·방·성장 디자인은 **USER_REVIEW_PENDING**이다.

## 3. 구현 / 검토판 / 미완료 구분

| 영역 | 실제 있는 것 | 남은 것·한계 |
|---|---|---|
| 일반 게임 기반 | 활동 공급→섭취→EXP/코인 원장, 자동급식·시간 정산·수면 보너스·동면 복귀·1차 케어 분기, 작은 코인 카탈로그 | 합성 로컬 MVP. 실제 건강·계정·결제·클라우드 서비스 미활성 |
| 저장·복구 | SQLite schema7 이행, DB 파일별 공통 접근 대기열, 트랜잭션 executor/정리 수명, 요청 중복 방지, 별도 제한된 표현 기억·오류 보관 | `database is locked` 경합 개선과 native 재검증 이력 있음. 모든 저장 결함 해결 아님; CANTOPEN 원래 VFS 원인 OPEN |
| 생활·성장 | 생활 의도/사물 접근/수행/취소, 식사·화장실 연출, 실제 경험 기억, 같은 petId의 Lv.1→20 합성 성장 체험 | LIFE-02 v5 실제 374회 섭취·Lv.16 모노·Lv.20 복원 이력. **v17에서 전체를 재실행한 증거가 아님**. 성장 재미/완성 아트는 미승인 |
| 성격 검토 | 네 연속 게임 성격 축과 장난·다정·도도/호기심 대표3종. 동일 상태·경험 비교, 손 교감·자율생활·최근 기억에 따른 후속 행동 | 16유형 전체 및 성장에 따른 성격 형성 완료 아님. 비교 fixture의 프로필 선택을 일반 저장에 소급 적용하지 않음 |
| 생활 맥락·대사 | 합성 걷기/활동/수면·기록 없음·쉬기 선택을 구별. 대사/눈/귀/시선/몸 연결, 반복 억제, 내용 폭/높이 말풍선·X 없이 닫기 | v17은 같은 목표 축하의 시작/행동/발화/마무리를 세 성격별로 개선. 감정 전달 만족도는 사용자 재평가 대기 |
| 아트·방 | 아기 두 발 공통 후보, A/B/C 보존, 표정 Shape Key·리깅·CPU morph·보행/접지, 기존 방 A와 Blender 햇살 방 B 실제 렌더 | 아기 두 발 방향 승인. 성장기·진화형 네 발은 **디자인 방향**이며 완성 제작·전환 시점 아님. 기존 1차 GLB는 비교 초안 |
| 화면·조작 | 이동/목적지 변경·직접 접촉·손 거두기·패널 취소/복귀·reduced motion, +12%와 새 구도 비교 | +12%·`face_floor`·방 B는 후보. cold 시작 기본 방 A/기존 구도/+12% OFF. ‘손 내밀기’는 검토 도구 |
| 위젯·동기화 | native 위젯 template/bridge, read-only snapshot·갱신 시각·앱 진입, 단일 쓰기/명시 이전·복구 구조 | 위젯 과거 Simulator/emulator 증거와 이번 v17 검증은 별개. sync는 fake authority/합성 서버; 실제 운영 동기화 미완료 |
| 온디바이스 AI | A=실제 구조화 기억+규칙. B 포트/취소·타임아웃·fallback, 별도 Swift EmbeddingEngine 한국어 추론 예제 | Mac/iOS Simulator 별도 예제 성공 이력. **게임 B 통합·자연스러움 우위 미완료**. 임베딩은 자유 대화 모델이 아님 |

일반 저장은 `arucon-dev.db`, LIFE 체험은 `arucon-life-experience.db`, REBOOT 검토는 `arucon-reboot-review.db`로 분리된다. 개체별 기억·가구 위치도 유지한다. 최신 v17 보고 당시 총88개 저장이며, **새 클론에 이 개인 DB를 가져오는 것이 실행 전제는 아니다**. 이 Mac의 기존 저장은 삭제/초기화하지 않는다. 검토 자원·가상 시계는 격리 프로필에만 적용하고 일반 재화·위젯을 덮어쓰지 않는다.

## 4. 소스·자산 지도

| 책임 | 기준 경로 |
|---|---|
| 앱·프로필/메뉴 연결 | `mobile/App.tsx`, `mobile/src/presentation/`, `mobile/src/reboot/RebootReviewScreen.tsx` |
| 경제·시간·성장 | `mobile/src/domain/`, `config/`, `application/approvedMvpService.ts`, `progression/`, `sleep/`, `shop/` (모두 `mobile/src/` 아래) |
| 저장·기억 | `mobile/src/storage/` (`sqliteAccess.ts`, `sqlite.ts`, `appDatabase.ts`, `storageDiagnosticArchive.ts`), `living/memory.ts`, `reboot/memory.ts` |
| 생활·성격·표현 | `mobile/src/living/`, `reactions/`, `reboot/` (`personality.ts`, `autonomy.ts`, `director.ts`, `lifeContext.ts`, `celebration.ts`, `handActing.ts`, `babyGait.ts`, `babyPose.ts`) |
| 렌더·입력·방 | `mobile/src/scene/` (`RoomController.ts`, `gltfRuntime.ts`, `cpuMorph.ts`, `rendererConfig.ts`, `sunlitRoom.ts`, `reviewFraming.ts`) |
| 네이티브 원본 | `mobile/app.json`, `mobile/plugins/withAruconNativeIntegration.js`, `mobile/native/`의 Swift/Kotlin·podspec·위젯 templates |
| 의존성·검사 | `mobile/package.json` + `package-lock.json`, `mobile/tests/`, `mobile/scripts/`, `validation/` |
| 승인·설계 | `docs/decisions.md`, `docs/adr/`, `docs/personality-foundation.md`, `docs/living-pet-design.md`, `tasks/` |

### 편집 원본과 런타임 자산

| 후보 | 편집/생성 원본 | 게임 자산 |
|---|---|---|
| 원래 캐릭터 | `references/current-art/`, 기존 원본 보존 | `mobile/assets/arucon_tsundere_motion.glb` |
| A v8 | `mobile/scripts/generate-reboot-baby-gait.mjs` | `mobile/assets/reboot-02/baby-gait.glb` |
| Blender B | `art/reboot-03/arucon_baby_B.blend`, `build_baby.py` | `mobile/assets/reboot-03/blender-baby.glb` |
| Hybrid C | `art/reboot-03-1/arucon_baby_C.blend`, `build_hybrid_baby.py` | `mobile/assets/reboot-03-1/hybrid-baby.glb` |
| 현재 공통 두 발 아기 | `art/reboot-04/baby_two_paws.blend`, `build_baby_two_paws.py` | `mobile/assets/reboot-04/baby-two-paws.glb` |
| 보존 네 발 후보 | `art/reboot-04/common_quad.blend`, `build_common_quad.py` | `mobile/assets/reboot-04/common-quad.glb` |
| 햇살 방 B | `art/reboot-05/sunlit-room.blend`, `build_sunlit_room.py` | `mobile/assets/reboot-05/sunlit-room.glb` |
| 이전 성장/진화 초안 | `mobile/scripts/generate-living-characters.mjs`, `generate-reboot-characters.mjs` | `mobile/assets/living-characters/`, `reboot-characters/` |

5개 `.blend`와19개 `.glb`가 일반 Git blob으로 추적된다. Git LFS 다운로드나 외부 texture가 필요한 placeholder가 아니다. Blender5.2 LTS 프로젝트 로컬 제작 이력과 실행법은 각 `art/` README에 있다. 앱 실행에 Blender는 필요 없다. 생성 스크립트는 출력 자산을 다시 쓰므로 단순 설치 때 실행하지 않는다. 과거 정지 방 시안은 `art/reboot-04/room_concept.py`로 재생성 가능하며 현재 게임 방 B와 구분한다. `.blend1` 백업·렌더 시안·검토 영상은 로컬 보존, 자동 삭제하지 않는다.

## 5. 처음 실행하기

### 새 체크아웃

Node22.13+와 npm을 준비하고 **lockfile을 사용**한다. 이번 인수 감사의 설치 Node는26.7.0이며 새 버전으로 올리는 작업을 하지 않았다. native는 해당 플랫폼 SDK가 필요하다. 프로젝트 로컬 의존성 설치 외 관리자/OS 설치·계정 인증은 별도 승인 범위다.

```sh
git clone --branch feature/arucon-mobile-autonomous https://github.com/gulatnaru/arucon-project.git
cd arucon-project
git status --short --branch
cd mobile
npm ci
npm run typecheck
npm run lint
npm test
```

기존 체크아웃이면 먼저 dirty/작업 세션을 확인한다. 깨끗하고 fast-forward 가능한 경우에만 `git pull --ff-only origin feature/arucon-mobile-autonomous`; 충돌/분기는 강제 해결하지 않는다. `mobile/`은 루트 Git의 **일반 디렉터리**이며 `mobile/.git`을 만들지 않는다.

### iOS / Android

최근 정상 실행은 **macOS15.6 + Xcode26.3 + iPhone16e Simulator(iOS26.3.1)**, Expo55.0.31 / React Native0.83.10 / React19.2.0 / expo-sqlite55.0.20 / expo-gl55.0.18이다. 최종 출시 지원 OS 선언이 아니다. Windows Android native/emulator 검증은 [ADR-010](adr/ADR-010-windows-portable-android-toolchain.md)·[ADR-011](adr/ADR-011-android-runtime-evidence-classification.md)의 **당시 소스** 증거다.

`mobile/`에서, SDK가 준비된 플랫폼 하나를 선택한다:

```sh
# 개발 빌드: 필요한 CNG 생성/네이티브 빌드와 Metro
npm run ios
# 또는 Android SDK·Java·emulator가 준비된 환경
npm run android
# 이미 개발 빌드가 설치되어 있을 때만 Metro를 별도로 시작
npm start
```

제품 시각/성능 검토는 Debug/Expo Go/웹 대신 Release로 한다:

```sh
# mobile/에서, 사용 가능한 Simulator를 CLI에서 선택
npx expo run:ios --configuration Release
```

`mobile/ios`·`android`는 CNG 산출물이며 Git에 없다. 원본은 app config/plugin/native template이다. 기존 generated 디렉터리를 근거 없이 `--clean`하거나 직접 고치지 않는다. CNG 재생성이 필요하면 수작업 변경을 먼저 확인·보호한다. 생성 후 `node scripts/check-native-generation.mjs --platform ios`(또는 `android`)는 **정적 검사**이며 native compile/실제 화면 검증을 대신하지 않는다.

Simulator 창 활성화 권한만 실패했다면 build 결과와 구별한다. 이미 설치된 앱은 `xcrun simctl list devices booted` 후 `xcrun simctl launch <UDID> com.arucon.dev`로 실행할 수 있다. TCC/보안 설정을 변경하지 않는다. 설치본이 이미 v17이면 이번 인수 목적만으로 재빌드할 필요 없다.

### 바로 볼 검토 경로

일반 방 → 설정 → **REBOOT-04 성격 검토** → 우리 아이 → 동일조건 합성 비교. 장난/다정/도도에서 같은 합성 목표를 선택하고 대사 OFF/ON을 비교한다. 기존 개체의 기억을 초기화하지 않는다. 방 A/B, 기존/`face_floor` 구도, +12%는 검토 옵션이다. 단순 준비 자세/강제 clip 비교를 정상 자율생활 증거로 기록하지 않는다.

### 선택적 도구

- 기본 게임 A는 AI 가중치나 MediaPipe vendor 없이 시작하도록 fallback을 갖고 있다. `prepare-reboot-native.py`는 **과거 선택적 MediaPipe 실험**이며 기본 설치 절차가 아니다. 자동 실행·대형 다운로드하지 않는다.
- 별도 실제 임베딩 예제: [Swift probe README](../mobile/scripts/reboot-litert-probe/README.md). pinned SDK/모델·라이선스·한국어 결과·Simulator 범위를 확인한다. 이 예제의 성공을 게임 B 성공으로 바꾸지 않는다.
- 문서 운영 검사: Python3.11+ 및 `validation/requirements.txt`의 PyYAML이 있는 환경에서 `python3 validation/check_workflow.py`. 신규 환경에서 필요하면 프로젝트 venv에만 의존성을 준비한다. 현재 호스트의 시스템 Python3.9는 이 검사에 부족하며 기존 Codex 번들 Python으로 실행했다.

## 6. 검증 상태와 OPEN 문제

| 구분 | 보존할 근거와 다음 기준 |
|---|---|
| v17 기존 실행 결과 | 498/498, lint/typecheck, iOS Release exit0, Android JS bundle, CNG27 정적 검사. OFF3+ON3 실제 축하·복원·이동/접촉·수면/깨우기·앱 전환/취소·cold 기본값 확인. **이번 문서 작업의 새 게임 테스트 결과로 재사용하지 않음** |
| 이번 인수 감사 | 착수 추적551파일의 금지 산출물 검사, 로컬 import/require837경로, GLB19개 구조/외부 URI, package/lock 정합성, 설치 해시/241입력 재대조. 변경 문서 링크127개 누락0, 운영 검사42/42 + 직접 self-test1 PASS, `git diff --check` PASS. 앱/자산 변경 없이 재빌드·재설치·게임 전체 재시험은 하지 않음 |
| PERF-01 OPEN | v17 녹화OFF60초 A/B 조합 proxy는 RAF p95 26.37/22.98ms, 제출49.53/49.27Hz. 단일 순서·방+구도 동시 변경이며 역순 반복/장기/충분한 입력 표본 없음. GPU FPS·물리 입력 지연으로 부르지 않음 |
| STORAGE-01 OPEN | 127MiB 여유/CANTOPEN 사건의 정확한 VFS 원인 미확정. 오류 이력 cold 복원/진단 보존 개선은 전체 저장 원인 해결 아님. DB 삭제/재설치로 증거를 지우지 않음 |
| 실제 하드웨어 | 실제 iPhone/Android·GPU·물리 입력/발열/배터리 NOT_RUN. 최신 v17 Android native/화면도 NOT_RUN; 과거 emulator PASS를 전용하지 않음 |
| 제품 평가 | 감정 차이·재미·최종 아트/크기/구도/방/성격·성장 디자인 USER_REVIEW_PENDING. 이모지 대체 글리프 등 기존 환경 미완료는 최신 보고 참조 |

## 7. 다음 우선 작업과 후속 범위

1. **먼저 v17 사용자 재평가**: 말풍선을 가린 세 축하와 ON 생활, 크기/구도/방 후보를 함께 본다. 같은 설치본에서 재현되는 결함만 고치고 SELF_REVIEW한다. 표현 만족을 테스트 숫자로 대체하지 않는다.
2. PERF-01은 같은 Release·방·가구·해상도·워밍업·측정 길이·입력 절차로 순서를 바꿔 반복한다. 확인한 병목만 수정하며 해상도/표정/기준을 낮춰 통과시키지 않는다.
3. STORAGE-01은 최초 오류·여유 공간·연결/트랜잭션 수명을 추적한다. 격리 DB로 복구/중복 정산을 검증하고 일반 원본과 오류 기록을 보존한다.
4. 이후 사용자 검토를 거쳐 성장기/진화형의 뚜렷한 실루엣·네 발 전환, 성장에 따른 성격 형성/16유형을 개발한다. 현재 대표3종 프로필을 16종 완성으로 세지 않는다.
5. 코인 착용 아이템·방 꾸미기·성장 먹이·화장실 관련 확장은 후속 제품 범위다. 기존 소형 카탈로그와 구별하고, **성장 먹이 가격/효과·화장실 구매 전환은 미확정**으로 둔다. 기본 무료 화장실 회수나 승인 경제 규칙 변경 금지.
6. 실제 건강 연동·법적 동의·실계정/출시, 온디바이스 B 채택, 실기기 최적화는 각각 별도 게이트다. 기능 scaffold가 실제 연결 승인인 것은 아니다.

## 8. Git·개인 데이터·검토 영상

이번 감사에서 필요한 소스·원본·테스트·config는 이미 origin에 있었다. 새 인수인계와 문서 진입점만 커밋한다. 활성 동일 경로 Codex task는 이 작업 하나, 추가 worktree/소스 writer/Git lock은 확인되지 않았다. 이것은 감사 시점 결과이며 다음 작업 시작 때 다시 확인한다.

- `.gitignore`의 DB/WAL/백업·비밀·건강정보·영상/캡처·`evidence/`·`node_modules`·CNG/DerivedData·`.tools`·모델 가중치/vendor 제외를 유지한다. 파일별 stage와 `git diff --cached --stat`/내용 검토 후 일반 feature push만 한다.
- DB·원본 영상·오류 기록은 Mac 로컬에 보존한다. 새 개발자에게 자동 업로드하거나 Git에 넣지 않는다. `.blend`/GLB/제작 스크립트는 소스 자산으로 추적하며 최대 현재 blob은 약4.72MiB다.
- 개인 iCloud `Arucon/Reviews`는 사용자 검토 MP4+짧은 장면 안내만 승인된 경로다. 다른 팀원에게 폴더 공유하거나 계정 접근 권한을 부여한 것이 아니다.
- 최신 전달본: `2026-10-14_arucon_REBOOT04_expression_v17_7256e98_review.mp4`(2:19, 1170×2532, 정상속도 발췌). 전송/업로드 확인됨, 새 영상의 휴대폰 재생 **MOBILE_NOT_VERIFIED**. [영상 전달 규칙](remote-video-delivery.md)을 따른다.
- 로컬 원본 `evidence/reboot-04-expression-v16-2026-10-14/`는 최초 후보 이름이며 최종 파일은 v17이다. Git에는 요약/검증 코드가 있고 원본 영상·DB는 없다. 이 문서 작업으로 영상을 재촬영·재전송하지 않았다.

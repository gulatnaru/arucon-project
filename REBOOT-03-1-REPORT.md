# REBOOT-03.1 — Hybrid Baby C / HYBRID_C_REVIEW_READY

2026-10-09 · SOL_DIRECT / SELF_REVIEW · 사용자 재미·최종 아트·크기·C 채택 **USER_REVIEW_PENDING**.

## 실제 비교 결과

사용자가 선호한 **A +35의 낮고 둥근 몸, 얼굴 인상, 큰 앞발**을 C의 기준으로 삼았다. C는 A의 몸/앞발 표면을 보존하고 Blender에서 얼굴 곡면·열린 눈꺼풀 테두리·표정 Shape Key·스킨/리깅·몸/머리/앞발의 체중 연기·정지 복원을 별도로 제작한 후보다. B의 세로형 체형을 축으로 눌러 만든 모델이 아니다. 기존 A/B 파일을 덮어쓰지 않았고 **기본 캐릭터는 A**다.

같은 최신 Release에서 A/B/C를 정상 메뉴로 선택해 +25/+35, 정면·측면·후면, 기본/호기심/장난/놀람/걷기·정지/도약·착지/접촉/손 놓기·복원을 비교했다. C는 A의 둥근 실루엣과 노출된 큰 앞발을 유지하고 B보다 적은 메시·변형 버퍼로 실제 렌더된다. SELF_REVIEW에서 귀·한 뿔·앞발이 떨어지는 큰 결함, 지속적인 입력 잠금, 복원 실패는 관찰하지 않았다. 미세 접지와 얼굴 취향은 정상 속도 영상으로 사용자가 비교해야 하며 **C가 A보다 귀엽거나 더 좋다는 결론을 내리지 않는다**.

## 바로 실행

현재 Simulator의 **아루 방 → ☰ → 우리 아이 → A/B/C → +25/+35**. 기본/정면/측면/후면 또는 전체 장면 비교를 고르고 패널을 닫는다. ‘비교 끝’은 실제 방 입력과 자율생활로 복귀한다. 일반 방이라면 설정에서 아기 매력/리부트 검토판을 연다. 비교 재생은 읽기 전용 표현 도구이며 경험·보상을 만들지 않는다. 같은 개체 아루의 실제 접촉·이동·수면/깨우기·앱 복귀는 아래 별도 영상으로 확인했다.

최종 실행 상태는 **A / 임시 +25 / DPR1.5 / MSAA0 / 일반 모션 / 말풍선 표시 / 비교 종료**, `finalSize=null`이다. 사용자 A+35 선호는 보존했으나 프로젝트 최종 크기로 승인 처리하지 않았다. C를 기본값으로 교체하지 않았다.

## 소스·설치·환경

- 시작 HEAD/원격: `a607cd5233c78ca0066c21ddcee93fc199f36de7`, 깨끗한 feature 브랜치. 과거 reset 없음.
- 검증 앱 소스 체크포인트: **`d5591958a0009c725b959383b189ddf82d92d51d`**. 먼저 dirty 소스로 빌드한 뒤 해당 내용을 그대로 커밋했고 206개 빌드 입력의 SHA를 대조했다.
- 설치: **REBOOT-03.1 Hybrid C v1 / Release / embedded bundle**, Metro 불필요.
- 실제 설치 main.jsbundle SHA256: **`7c1d9e6e4ee61dbaaff872a115340e0cce47d1114b89e063b8ddcee93fdb0f40`**.
- source fingerprint: `e8a1ed2b7337e02db0bf1336fa9b3cae5c673fd6c39a3652de77363770ce858b`.
- macOS15.6 / Xcode26.3 / arm64 iPhone16e Simulator iOS26.3.1(label26.3), 390×844pt, native viewport585×1266, DPR1.5, MSAA0, 같은 방·카메라·조명.
- Expo55.0.31 / React19.2 / RN0.83.10 / Three0.166.1. package/lock/SDK 변경 없음.
- 이전 REBOOT-03 v5 설치 SHA188a9c…를 시작 시 실제 확인했다. 새 C 코드가 필요해 Release를 한 번 빌드하고 같은 DB로 설치했다. 검증 중 불필요한 재설치/초기화 없음.

## Blender 산출물과 구현

- 편집 원본: `art/reboot-03-1/arucon_baby_C.blend` (354,464bytes).
- 제작 소스: `art/reboot-03-1/build_hybrid_baby.py` / 재현 안내 README.
- 게임 자산: `mobile/assets/reboot-03-1/hybrid-baby.glb` (435,016bytes), SHA256 `20c4a5f902619406a7526698ba66a446b6409397eafd6e16ab162ed9641d7cf8`.
- 실제 프로젝트 내부 **Blender5.2.0 LTS / fbe6228777e7**의 `bpy`를 실행했다. 단순 재수출이 아니라 새 얼굴/눈꺼풀 조형, Shape Key, 8bone rig/normalized weight, idle/walk/hop/stop/pet/release/sleep 곡선을 제작했다. Blender GUI 손조형·Blender MCP를 사용했다고 기록하지 않는다.
- A의 몸/큰 앞발 표면 샘플 보존, 중복 seam/pole만 weld. 같은 불투명 재질의 body/ear/paw와 호환 accent를 합치고 전체 몸은 CPU 얼굴 morph 버퍼에 넣지 않았다. 얼굴 윤곽은 유지하고 불필요한 안쪽 ring/unused UV/상수 bone track은 공식 exporter 옵션으로 줄였다.
- 기존 world navigation/지지발/그림자를 사용하고 C의 body/head/toe/0.32초 stop 곡선으로 국소 체중 연기를 연결했다. 희소 C ear track은 매 frame rest quaternion에서 delta를 적용해 누적 변형을 막는다. B 기존 경로는 유지한다.
- 앱 변경은 C 자산 선택과 기존 비교 메뉴 확장뿐이다. 경제/저장/성장/수면·동면/AI 서비스는 변경하지 않았다. ADR-017에 가역 선택과 한계를 남겼다.

| 자산 | GLB bytes | meshes | vertices | triangles | CPU morph vertices |
|---|---:|---:|---:|---:|---:|
| A v8 | 353160 | 22 | 6475 | 11396 | 485 |
| B Blender | 830980 | 21 | 10465 | 19168 | 1161 |
| C Hybrid | 435016 | 16 | 5988 | 10596 | 549 |

C는 B보다 가벼우나 A보다 GLB와 얼굴 morph 버퍼가 조금 크다. 작업량 감소를 아트 우월성으로 해석하지 않는다.

## 동일 빌드의 이미지·정상 속도 영상

모든 원본은 외부 업로드 없이 프로젝트 로컬 **`evidence/reboot-03-1-2026-10-09/`**에 있다. 아래 PNG는 실제 Simulator 영상 프레임의 동일 crop/배치이며 새 합성 그림이 아니다. 확대 detail은 결함 분석용이고 전체 방 이미지가 실제 게임 점유율 비교다.

- `ABC-front-sizes-v1.png`: A/B/C +25/+35 같은 전체 방.
- `ABC-size25-v1-full.png`, `ABC-size35-v1-full.png`: 정면·측면·후면.
- `ABC-face-25-v1-detail.png`, `ABC-face-35-v1-detail.png`: 기본·호기심·장난·놀람 실제 얼굴 crop.
- `ABC-side-motion-v1-detail.png`: 실제 걷기·정지·도약·착지·복원 단계.
- `C-v1-normal-input.mp4`: 150초 정상 접촉·이동/목적지 변경·손 교감·수면/깨우기·reduced ON→OFF.
- `C-lifecycle-v1.mp4`: 100초 정상 접촉/이동→Home→**실제 일반 위젯 탭**→C 복귀/입력→동일 앱 terminate/launch→A 기본/같은 아루 복원·입력. 녹화 시작/끝 시간이 따로 기록돼 있다.

| 원본 영상 | 실제 길이(초) | 비교 시작 offset 약(초) | 범위 |
|---|---:|---:|---|
| A-size25-v1.mp4 | 107.63 | 10.81 | 96초 3방향·8장면 |
| A-size35-v1.mp4 | 107.62 | 14.34 | 앞/옆·후면 release 대부분; 마지막 hold 짧음 |
| B-size25-v1.mp4 | 121.64 | 11.81 | 96초 전체 |
| B-size35-v1.mp4 | 121.60 | 10.34 | 96초 전체 |
| C-size25-v1.mp4 | 107.67 | 12.20 | 후면 full release 복원까지, 마지막 hold 짧음 |
| C-size35-v1.mp4 | 107.67 | 10.95 | 96초 전체 |

**A35 후면 마지막 복원은 별도 `A35-back-release-supplement.mp4` 22초와 실제 A/+35/back/release 상태 기록으로 보완**했다. 원본 하나가 전체96초를 담았다고 과장하지 않는다. `.dense-frames/metadata.json`의 실제 PTS와 타임라인을 함께 둔다. 인코딩60fps를 앱 표시FPS로 사용하지 않는다. 최초 A35 메뉴 선택 시도/최초 B35 여유 부족 영상은 실패/준비 기록으로 보존하고 통과 원본에 포함하지 않는다.

## 실제 입력·상태·보존

| 확인 | 현재 최신 Release 결과 |
|---|---|
| C 직접 접촉/바닥 이동/목적지 변경 | 실제 얼굴/몸/말풍선·이동/회전, 입력 유지 |
| 정상 손 내밀기→접근→접촉→거두기→복원 | C 실제 방에서 확인, 통제된 비교 재생과 구분 |
| 수면→깨우기→다시 입력/생활 | 정상 서비스로 C closed-eye/낮은 자세→wake 복원·접촉/이동 관찰 |
| reduced motion | ON 입력/표현→OFF 원래 설정 복원 |
| 메뉴/비교 닫기 | 정상 입력·생활 재개, 기록 export 시 panel 차단은 의도된 상태 |
| background/foreground | 실제 Home→일반 위젯 탭→C 복귀/이동/직접 접촉 |
| cold restart | 같은 설치/DB, 같은 아루 Lv1/EXP0/기억, 기본 A/비교 null/reduced false 복원, 실제 접촉/이동 |
| 원본/저장 | A/B editor/runtime/source 포함25개 SHA 동일. 일반1+생활29+같은아루1, 기존30 보존 |
| 경제·성장·시설·합성 이력 | 모든31개 petId/이름/형태/personality/food/coin/EXP/소유/activity/carry 동일. meal ledger 3→3,1155→1155,0→0 |
| DB/기억 | 3DB integrity_check=ok, 같은 review memory row1. 모자/쿠션 기존 저장 유지, 보존 DB 복제는 읽기 전용 backup |
| 일반 위젯 | 홈에서 일반 ‘아루콘’ 표시·기존 확인시각 유지, review 아루로 덮이지 않음. 이번 범위 새 freshness/장기동면 전경 UI 시험 없음 |

최종 `final-preservation-audit.json`은 현재 설치SHA/206빌드 입력/25원본/31저장/3DB를 실제 대조했다. 시간·care 정산은 정상 서비스의 전경/수면/깨우기로 움직이며 시계를 얼리거나 원본 재화를 조작하지 않았다. 자동 테스트 통과와 현재 시각 판정은 별개다.

## fresh 60초 비용 비교 — 녹화 OFF

같은 Release/방/카메라/조명/DPR1.5/MSAA0/일반모션/동일96초 행동 타임라인의 첫60초. 순서 C35→C25→A25→A35→B35→B25, 각 capture timestamp·실제 loaded asset·size·60000ms를 확인했다. 별도 모션 영상은 녹화 ON이므로 이 비용 표와 섞지 않는다.

| 후보 | 제출 Hz proxy | RAF p95 / max ms | CPU morph p95 ms | draw p95 ms | GL queue p95 ms | calls snapshot |
|---|---:|---:|---:|---:|---:|---:|
| A +25 | 60.00 | 16.72 / 21.25 | .634 | .807 | 6.321 | 25 |
| A +35 | 59.95 | 16.72 / 57.83 | .632 | .800 | 6.283 | 27 |
| B +25 | 59.98 | 16.75 / 27.84 | 1.317 | .852 | 12.399 | 27 |
| B +35 | 59.79 | 16.74 / 73.36 | 1.317 | .868 | 12.591 | 27 |
| C +25 | 59.92 | 16.73 / 57.68 | .694 | .742 | 8.568 | 21 |
| C +35 | 59.70 | 16.78 / 53.02 | .698 | .791 | 9.926 | 21 |

기존 RAF/제출 proxy 게이트는6개 PASS. C는 B 대비 morph p95 약47% 낮고 큐 대기는 +25 약31%,+35 약21% 낮지만 A보다 큐/morph가 높다. 호스트 load average는3.18~3.88의 조건 기록이며 독립 GPU causal benchmark가 아니다. draw/queue는 현재 계측 지점의 CPU 제출/대기이며 실제 GPU 실행 시간이나 화면 표시FPS로 부르지 않는다. 통제 비교는 입력을 막으므로 입력 p95는 **INSUFFICIENT_DATA**, 실제 기능 입력은 별도 영상으로 확인했다.

**실제 GPU/표시FPS/물리 터치 지연/실기기/발열·배터리는 NOT_RUN.** Simulator proxy PASS를 실기기 성능 PASS로 재사용하지 않는다. 품질·해상도·동작을 빼서 기준을 낮추지 않았다.

## 이번 실제 검사·제작 도구

- 새 hybrid 영향5/5, reboot 영향45/45, 전체 **422/422**, fail0/skip0. 과거417 숫자 복사 아님.
- lint/typecheck PASS. iOS native Release **xcodebuild exit0**, 같은DB update install/프로세스/실제 화면·입력 PASS.
- Android JS bundle PASS, CNG **27/27 static PASS**. 이번 Android native/UI·실기기 **NOT_RUN**.
- 문서/운영 게이트 **42/42 fresh PASS**. 시스템 Python의 `tomllib` 부재로 최초 명령은 실패했으며 기존 bundled Python으로 실행했다. 새 설치나 검사 기준 완화 없음.
- 실제 Blender Python 제작/공식 exporter 실행, CUA Mac 화면·입력, simctl 정상 설치/launch/로컬 녹화, AVFoundation 실제 프레임 추출을 사용했다.
- Blender MCP는 실제 도구 노출/호출 없음. Figma/Maestro/Context7로 이번 자산 제작/실행을 했다고 기록하지 않는다. 설치 확대·엔진 변경·AI B 작업 없음.
- 요청 모델 GPT-6.1 Sol Max / effective model **ROUTING_UNVERIFIED**, 새 subagent0, **SELF_REVIEW**. 독립 reviewer라고 부르지 않는다.

## 자체 검토·남은 선택

기능: 최신 C가 정상 접촉/이동/수면 복귀/앱 전환을 수행하고 저장/기본A를 보존한다. 표현: A 디자인을 유지한 별도 C의 피부/얼굴/작은 앞발 보행·체중/복원을 비교할 실제 자료가 있다. 눈·얼굴 edge는 현재1.5× raster에서 여전히 픽셀 계단이 보이며 이를 곡면 파손 또는 GPU 품질 완료라고 단정하지 않는다. 확대 crop의 취향을 실제 게임 크기와 혼동하지 않는다.

재미·최종 아트·크기: 사용자 선택 대기. **C가 무조건 개선이라는 가정 없이 A를 유지**한다. 아기 다음 계열/상점/AI/성장 전체로 자동 진행하지 않는다. 현재 좁은 iOS Simulator 비교 범위 **HYBRID_C_REVIEW_READY**, 전체MVP/출시/실기기 완료 아님.

## Git·외부 경계

앱 소스 d559195와 보고서 인계 HEAD를 구분한다. `mobile/.git` 없음, gitlink 없음, package/lock mode100644. C .blend/.glb/제작소스는 요청 산출물로 추적한다. .tools/node_modules/.expo/ios/android/evidence/DB/계정캐시/영상/빌드/.blend1은 stage하지 않는다. 실제 최종 HEAD/추적/live-origin 일치와 clean 여부는 로컬 `git-final-audit.json` 및 최종 응답에 남긴다.

기존 승인 feature 일반push만 사용한다. main/merge/force/tag/release/deploy/건강읽기/실결제/보안변경/영상 외부업로드 없음.

# REBOOT-03 — Blender 아기와 v8 비교

2026-10-09 KST · SOL_DIRECT · SELF_REVIEW · **BLENDER_AB_REVIEW_READY — iOS Simulator 비교 범위.**

사용자의 v8 외형·표정·움직임 개선 긍정 평가는 보존한다. A는 기존 v8이며 기본값/원본을 교체하지 않았다. B는 Blender에서 별도 제작한 아기 초안이다. 우열·최종 채택·크기·재미·아트는 USER_REVIEW_PENDING이다.

## 실제 제작과 보존

공식 Apple Silicon Blender5.2.0 LTS(build fbe6228777e7)를 사용자의 명시 승인으로 프로젝트 내부 ignored `.tools/blender/Blender.app`에 설치했다. 공식 SHA256, Developer ID Stichting Blender Foundation(68UA947AUU), notarization, CLI 실행을 확인했다. 관리자/전역 설치·보안 우회는 하지 않았다. Blender MCP는 현재 도구 목록에 없었으며 실제 제작은 `bpy`로 실행했다.

- [편집 가능한 Blender 파일](art/reboot-03/arucon_baby_B.blend)
- [실제 제작 소스](art/reboot-03/build_baby.py), [편집·재현 안내](art/reboot-03/README.md)
- [게임 GLB](mobile/assets/reboot-03/blender-baby.glb), [실제 제작 manifest](mobile/assets/reboot-03/manifest.json)
- [가역 rig/렌더 결정](docs/adr/ADR-016-blender-baby-review-rig.md)

A를 import/re-export하지 않고 몸 topology를 조형하고 곡면 투영 얼굴, 눈/눈꺼풀/볼/입 Shape Key, 실제 armature/정규화 weights와 idle/walk/hop/pet/release/sleep actions를 제작했다. 편집용 실제 root trajectory guide는 `.blend`에 보존하고 game은 같은 navigation/접지와 in-place bone curves를 조합한다. 뿔 하나·앞발 두 개·정적인 뒷발 없음. 동일 표정 요청/바닥 접지를 공유하되 B의 torso/head/toe는 실제 Blender bone curves를 사용한다.

원본13 GLB, 기본 A SHA `6ae771875c6da450d3f81b7c76985071568e84c504cd18e50ef15d2adcbedeb1`를 보존한다. 새 아기 한 종류뿐이며 성장기/진화형/상점/AI/경제/EXP/수면 계산/SQLite queue를 재구현하지 않았다.

## 최신 설치 식별

REBOOT-03 비교 v5 Release · iPhone16e / iOS26.3.1 Simulator · macOS15.6 / Xcode26.3 / arm64. Native xcodebuild exit0. 설치 후 실제 `main.jsbundle` SHA가 빌드 산출물과 일치했다.

- 번들 SHA: `188a9c06010f4fde72610381ab2560a4615ab7d6fc2c5cab0556dc7acb68ace7`
- 앱 소스 commit: `5bb0cc363b612f3093c9e877a7ecded8d0c50871`. Dirty Release의 소스/자산 hash가 이 commit과 대응한다.
- 소스 fingerprint: `504d5f02e761168af99fdf73867d45fe557b6174ba394140d59dbc9546b17a13`
- 실제 입력의 DB: 같은 `reboot-01:main` 아루, 기존31개(일반1+생활29+리부트1)를 삭제/초기화하지 않고 업데이트 설치.
- 인계 시작 HEAD7b3e265, A 앱 소스6529e26. 같은 bundle ID com.arucon.dev, Metro 없이 embedded Release 실행.

## SELF_REVIEW에서 수정한 실제 결함

1. 첫 비교 도구의 하단3버튼 잘림: 폭/최소폭을 바로잡아 실제 화면에서 확인했다.
2. Three가 Blender bone 이름의 점을 제거하는 경계: PawL/R·EarL/R에 맞춰 실제 rig 연결했다. 기존 rest transform을 zero로 덮어쓰지 않는다.
3. 공유 bone texture 수명: 모델 교체 때 skeleton별1회 해제. 실제 export/접지·리소스 회귀 검사를 추가했다.
4. B의 뿔 옆면 normal이 안쪽: Blender 원본 face winding을 고쳤다. radial normal dot -0.954~-0.826→+0.826~+0.954. 실제 설치 화면에서 밝은 뿔로 확인했다.
5. B 수면 clip이 idle과 같아 UI는 잠듦인데 눈을 뜬 채 떠 보임: 실제 정상 잠자기에서 재현했다. B의 sleep action/눈 감기/바닥 접지를 고쳤고, 보존된 수면 저장→정상 깨우기→접촉/이동/자율생활을 v5에서 확인했다. 수면·동면·보상 서비스는 그대로다. 비교 중에도 복귀 버튼을 가리지 않는다.

한 정지 프레임에서 좁아 보인 B 놀람 눈은 인접 원본 영상에서 닫힘→열림이 확인된 blink였다. 몸 교차 검사는0이었다. 이 가설은 결함으로 확정하지 않고 유지했다. 중간 v2/v3/v4 영상은 이력이며 최신 v5 증거로 바꿔 부르지 않는다.

## 실제 비교 자료와 읽는 방법

모든 증거는 `evidence/reboot-03-2026-10-09/`의 로컬 파일이며 Git/외부 업로드 제외다. 동일 방·카메라·조명·390×844 viewport·DPR1.5/MSAA0(585×1266 제출 surface), 일반 동작 설정에서 +25/+35를 비교한다. 모자는 화면에서만 가리고 기존 착용/기억 저장은 유지했다.

비교 재생은 **읽기 전용 presentation 검사**다. scene마다4초, 정면32초→측면32초→후면32초. 기본/호기심/장난/놀람/걷기·정지/통통·착지/쓰다듬기/손 놓기 순서이며 동작의 원래 속도는 유지한다. 게임 경험/보상을 기록하거나 실제 자율생활이라고 세지 않는다. 각 영상의 실제 replay 시작은 대응 state의 token timestamp와 record 요청을 대조하며 초기 인코더 지연 때문에 근사값임을 명시한다. 정상 입력 증거는 별도 영상이다.

정지 이미지는 얼굴/실루엣, 원본 정상 속도 영상은 보행/체중/착지/복원을 검토한다. 같은 전체 화면을 동등하게 축소한 비교와 native pixel 확대 detail을 구분한다. 인코딩 FPS는 앱 FPS가 아니다.

### 바로 볼 최신 자료

- [같은 게임 크기의 A/B +25/+35 정면](evidence/reboot-03-2026-10-09/AB-v5-front-sizes.png)
- [정면·측면·후면 +25](evidence/reboot-03-2026-10-09/AB-size25-v5-full.png), [+35](evidence/reboot-03-2026-10-09/AB-size35-v5-full.png)
- [얼굴 native detail](evidence/reboot-03-2026-10-09/AB-v5-face-35-detail.png), [측면 보행/도약/착지 detail](evidence/reboot-03-2026-10-09/AB-v5-side-motion-detail.png). 확대 분석이며 게임 크기 평가와 분리한다.
- 정상 속도 원본: [A +25](evidence/reboot-03-2026-10-09/A-size25-v5.mp4), [B +25](evidence/reboot-03-2026-10-09/B-size25-v5.mp4), [A +35](evidence/reboot-03-2026-10-09/A-size35-v5.mp4), [B +35](evidence/reboot-03-2026-10-09/B-size35-v5.mp4). 각 약108초, 같은 v5 설치본. 해당 state/record/timeline JSON과 dense-frames/metadata-original63.json에 출처·시각을 보존했다. Curiosity는 blink와 구분한 눈을 뜬 추가 원본 프레임으로 detail을 보완했다.
- [B 정상 수면 저장→깨우기→이동/접촉/손/생활/reduced](evidence/reboot-03-2026-10-09/B-v5-normal-recovery.mp4):150초. 진단 강제 clip이 아니다. 첫 예전 좌표 접촉은 움직이는 펫 대신 바닥 입력이었고, 이후 실제 pet hit 영역의 접촉·몸·말풍선을 확인했다.
- [실제 위젯 tap/전경 복귀/cold restart/기본 A 입력](evidence/reboot-03-2026-10-09/v5-lifecycle-default-A.mp4):120초. 일반 위젯은10/7 갱신으로 표시된 기존 snapshot이며 오늘 갱신 성공으로 표현하지 않는다. 리부트 아루로 내용을 덮어쓰지 않았다.

## 검증/비용/남은 판단

| 기능/표현 항목 | 실제 판정/근거 |
|---|---|
| A/B 선택·기본 A 보존 | PASS_SIMULATOR_ACTUAL. A hash 그대로, cold restart에서 실제 v8 복원 |
| +25/+35·정면/측면/후면 | PASS_CURRENT_BUILD_CAPTURE. 실제 같은 viewport/카메라/방 |
| 기본 눈매·호기심/장난/놀람 | SELF_REVIEW_CANDIDATE_READY. 곡면 밀착된 얼굴, wink/open-mouth 등 구분. 최종 예쁨 승인 아님 |
| 보행/앞발 교대/체중·정지/도약·착지 | SELF_REVIEW_SIMULATOR_NORMAL_SPEED. 원본 영상/연속 프레임, supporting paw world endpoint unit 회귀. 물리 접촉/GPU 측정 아님 |
| 손 접촉·말캉 반응·복원·다시 이동 | PASS_SIMULATOR_ACTUAL_INPUT. 실제 normal pet/floor/hand 경로 별도150초 |
| 귀/앞발/뿔 연결·표면 | SELF_REVIEW_CANDIDATE_READY. 큰 분리/관통 없음. 귀여움/품질 우열은 미확정 |
| 수면·깨우기/메뉴/앱 전환/cold restart | PASS_SIMULATOR_ACTUAL. B presentation 수정 후 정상 서비스 복귀. 이번 실제 동면 시간 경계는 NOT_RUN이며 기존 자동 회귀와 구별 |
| 저장·경제·기억 | 3DB native 감사 PASS. 일반1+생활29+아루1의 IDs/이름/성격/형태/food/coin/EXP/설치/동의/활동/carry 유지, meal ledger3/1155/0 그대로. 실제 교감 기억은 제한된 저장·재실행에서 유지 |
| 건강·결제·외부 | OFF/미실행 유지. 엔진·queue·정책/SDK/원본13 GLB 변경 없음 |

기능 품질: PASS_SIMULATOR_CURRENT_BUILD. 표현 품질: SELF_REVIEW 비교 후보 준비. 게임 재미·최종 아트·크기/모델 선택: USER_REVIEW_PENDING. A는 더 낮고 둥근 인상/큰 앞발, B는 더 세로로 포동한 몸/밀착된 얼굴/작은 앞발의 대안이다. B가 반드시 개선이라고 단정하지 않는다. 같은1.5× 렌더의 native 확대에서는 두 후보 모두 계단이 보일 수 있으며 geometry/normal 오류와 구분한다.

새 실행: **전체417/417**, lint/typecheck PASS, iOS Release xcodebuild exit0 + 실제 설치 SHA 일치 + 현재 app/UI, Android JS export PASS, generated-native 경계 검사27/27 PASS. 최초 CNG invocation은 루트 cwd에서 app.json을 못 읽어 실패했으며 mobile cwd 재실행이27/27이다. Static CNG를 native 실행 성공이라고 쓰지 않는다. 이번 Android native/emulator/physical device는 NOT_RUN이다.

### 같은 Release·녹화 OFF 60초 비용

순서 B25→A25→A35→B35. 각 **새** capture가60000ms이고 실제 모델/크기와 일치하는지 대조했다. 일반 state dump의 capture는 이전 후보일 수 있으므로 비용 근거는 perf-*-v5-off.json만 사용한다. Surface585×1266, DPR1.5/MSAA0, 일반 동작 설정.

| 후보 | 제출Hz proxy | RAF p95 / max(ms) | CPU morph p95(ms) | draw p95(ms) | GL 대기 p95(ms) |
|---|---:|---:|---:|---:|---:|
| B +25 | 59.85 | 16.72 / 65.99 | 1.303 | 0.870 | 12.45 |
| A +25 | 59.93 | 16.73 / 52.16 | 0.627 | 0.867 | 6.43 |
| A +35 | 59.95 | 16.74 / 52.36 | 0.618 | 0.840 | 6.46 |
| B +35 | 59.87 | 16.73 / 43.02 | 1.299 | 0.898 | 12.51 |

4개 모두 제출30Hz 지향/RAF p95≤33.34ms/500ms 이상 정지 proxy 없음. 실제 GPU 표시 FPS나 물리 입력 지연이 아니다. 이 창에는 room 직접 입력이 없으므로 입력 p95는 INSUFFICIENT_DATA이며 정상 입력 성공을 물리 지연 PASS로 바꾸지 않는다.

B model triangle11,396→19,168(+68.2%), GLB353,160→830,980 bytes(+135.3%). Frame workload는 표정/눈 sparkle에 따라 A약18.4~18.7k, B약26.0~26.5k triangles(25~27 draw calls). 이 환경에서 B morph p95약2.1배, 대기 p95약1.9배였지만 제출 cadence는 유사했다. 호스트 loadavg는 B25 {4.48,3.94,3.78}, A25 {19.55,13.75,8.50}, A35 {16.70,16.03,11.66}, B35 {11.44,14.10,12.65}로 변했다. 순수 모델 GPU 비용에 대한 엄밀한 인과 결론은 내리지 않는다. [원본 비용 표](evidence/reboot-03-2026-10-09/performance-comparison-v5.json). 기능/얼굴/그림자/해상도를 빼서 통과시키지 않았다.

실기기·실제 GPU·물리 입력 지연·발열/배터리·이번 Android native는 **NOT_RUN**. 재미·예쁨·모션 선호·A/B 채택·크기는 **USER_REVIEW_PENDING**. main/merge/force/tag/deploy/실건강/실결제는 하지 않았다.

요청 모델 GPT-6.1 Sol Max, effective model ROUTING_UNVERIFIED, 새 subagent0. 자체 검토는 SELF_REVIEW다. Blender 실제 CLI/Python 사용, Blender MCP 미사용. 다른 제작 도구를 사용했다고 기록하지 않는다.

## 사용자가 실행하는 방법

현재 설치 앱에서 리부트 메뉴→우리 아이→A 기존v8/B Blender→+25/+35. 정면/측면/후면 또는 전체 방향을 고르고 기본/표정/걷기/통통/교감을 비교한다. 아래의 다시 재생/멈춤/비교 끝 도구를 사용한다. 비교 끝 뒤 방의 바닥과 펫을 직접 누를 수 있다. 일반 방에서는 설정→리부트 첫 검토판으로 들어온다. 앱 재실행의 기본 후보는 A며 같은 아루 저장/기억은 유지한다. 최종 후보와 크기를 확정한 상태가 아니다.

## Git 및 재개

앱/자산 source checkpoint는5bb0cc3이다. 현재 설치 v5가 해당 소스와 SHA로 대응한다. 보고서·상태 인계 commit은 별도로 추가한다. 최종 HEAD는 Git 검증·최종 응답에 기록한다. 설치 도구/native generated/DB/로그/영상/.blend1은 stage하지 않는다. 승인 없는 공개 업로드는 하지 않았다.

다음은 사용자에게 A/B와 +25/+35를 실제 선택받는 제품 검토다. 선택 전 기본 A를 교체하거나 성장기/진화형/상점/AI로 확대하지 않는다. 같은 코드·설치 SHA이면 재빌드/재설치/DB 초기화 없이 현재 앱에서 비교한다. 실기기 성능은 별도 환경 범위에서 확인한다.

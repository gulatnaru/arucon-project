# REBOOT-02 — 아기 매력 검토 준비

## 아기 얼굴·보행 재평가 후보 v8 — REWORK_REQUIRED 유지 / 2026-10-08

사용자의 v4 영상 평가로 **아트·보행 품질을 다시 열었다**. v4의 기능·저장·성능 증거는 아래 이력으로 보존하며 제품 만족 승인으로 쓰지 않는다. 이번에는 아기 후보 하나의 얼굴·실루엣·보행·렌더 비교만 수정했다. **v8의 기술 수정과 Simulator 실행 검토는 완료했으며, 아트·보행의 사용자 판정은 OPEN/USER_REVIEW_PENDING이다.** 최종 크기·재미·아트를 임의 승인하지 않는다.

이전 후보는 네 발 중 뒷발이 정적이고 walk clip은 `AruconRoot.scale`만 바꿨다. 런타임의 시간 기반 앞발 흔들기·몸 튀기가 겹쳐 실제 이동 거리와 발이 맞지 않았다. 새 후보는 뒤쪽 두 발을 제거하고 앞쪽 두 발의 윗부분을 몸 하단에 겹쳐 연결한다. 걷는 동안 지지발은 바닥의 같은 위치에 남고 반대 발이 들려 옮겨진다. 방향전환에 보폭이 반응하고, 멈출 때 들린 발부터 두 번의 짧은 착지로 정돈한다. 통통 도약은 준비 압축→뜀→착지 압축과 발·그림자를 함께 움직인다. 몸 scale은 착지 보조이며 걷기의 주 표현은 아니다.

기본 얼굴은 눈 폭/높이·간격·얇은 눈꺼풀·몸 곡면과의 간격을 조정했다. 몸 단면을 부드럽게 잇고 이음선 normal을 맞췄다. 호기심의 눈매/시선, 놀람의 열린 눈·입과 물러남, 장난의 윙크/입꼬리·앞발을 실제 정상 장면에서 확인했다. 표정 종류나 대사를 늘리지 않았다. **최종적인 예쁨·리듬·촉감 평가는 여전히 사용자에게 있다.**

### 먼저 볼 실제 전후 자료

모두 로컬 `evidence/reboot-02-gait-2026-10-08/`이며 원본 영상·DB·로그는 Git/외부 업로드 제외다. 정지 그림을 모션 통과로 쓰지 않는다.

- [같은 카메라의 기본 얼굴·크기 전후](evidence/reboot-02-gait-2026-10-08/58-before-after-face-sizes.png): v4 +25 / v8 +25 / v8 +35. 전체 화면을 같은390×844로 축소했고 펫만 따로 확대하지 않았다. v8은 영상34의25.5초,36의45초; v4는 이전 동일 위치 영상46의24초다.
- [v8 +25 정상 속도 발췌](evidence/reboot-02-gait-2026-10-08/62-v8-size25-excerpt.mp4), [v8 +35 정상 속도 발췌](evidence/reboot-02-gait-2026-10-08/62-v8-size35-excerpt.mp4): 각각39초. 기본 얼굴·자율 도약·직접 바닥 입력·보행/멈춤을 포함한다. **AVFoundation passthrough 발췌**이며 배속/장면 합성 없음. 전체 원본34(352.033초)/36(111.362초), 원래 구간은61-excerpt-ranges.json에 보존했다.
- [측면 +25](evidence/reboot-02-gait-2026-10-08/62-v8-side25-excerpt.mp4), [측면 +35](evidence/reboot-02-gait-2026-10-08/62-v8-side35-excerpt.mp4): 동일 화면 높이의 바닥을 누른 수평 보행·착지7.5초 발췌. 전체56은215.522초이며 +35→+25 순서다. 정상 사용자 메뉴/바닥 입력이고 강제 clip 재생이 아니다.
- [자연 도약·착지 원본 프레임](evidence/reboot-02-gait-2026-10-08/60-normal-hop-landing-full-frames.png): +35 원본36의50.10/50.28/50.46/50.82초. 몸이 올라갈 때 발도 뜨고, 내려와 눌린 뒤 복원한다. +25의 같은 자연 `tiny_hops`는 원본34의30.258~31.058초다.
- [원본 PNG 해상도 비교](evidence/reboot-02-gait-2026-10-08/59-native-resolution-comparison.png):54/55는 영상에서 추출하지 않은1170×2532 native PNG. **검토용 손 교감의 같은 위치 유지 자세**로 화질만 비교한 진단이며 정상 보행 증거를 대신하지 않는다. 기본 얼굴의 동일 위치 저/고해상도는 실제 영상40의32초/57초 근처와 CUA 화면에도 기록했다. 아래 확대 부분은 native pixel detail이며 작은 게임 크기 평가와 구분한다.

- [작은 게임 화면의 호기심·놀람·장난](evidence/reboot-02-gait-2026-10-08/63-three-expressions-game-size.png): 같은 정상 영상36의73.75/74.2/64.05초. A/B/C만 표기하고 별도63-expression-key.json에 대응했다. 고개 회전이 끝나 실제 얼굴이 보이는 프레임을 사용했다.

### 소스·설치·보존

- 착수 HEAD `bad584c2a688399cad546651fc92c5db170d215a`, clean. 설치 v4 SHA1599ee6e…를 직접 확인하고 **먼저 사용자가 지정한35-size25-v4.mp4(110.605초)와 소스**를 대조했다. 원본 영상 SHA `3ef34331d1a8af1d183c31fdb5906f403675e12fd1ed4d0b7d98ace2f88ddac4`. Mac 실제 pixel/입력 접근 성공; 이전 BLOCKED를 복사하지 않았다.
- 앱 소스 **6529e260fa799269197d1ebd6e77d22b564727d3**, 설치 **reboot-02-baby-v8 / Release**, bundle SHA **6b10525d472662c3b8eaf10462cfe52b69aea7370aa26c654cb4786d82e876a7**.32-v8-manifest.json의153개 입력과 소스 체크포인트 대응은64-source-checkpoint-match.json. 문서 인계 HEAD와 구분한다. 같은 설치 해시면 재빌드/재설치/초기화부터 하지 않는다.
- macOS15.6 / Xcode26.3(17C529) / iPhone16e Simulator `2170BD93-715C-482E-AD9C-DD7479970003` / iOS26.3.1(label26.3) / Expo55.0.31. embedded Release, Metro 불필요.
- 별도 `baby-gait.glb`353160bytes + `gait-source.json` + `generate-reboot-baby-gait.mjs`. **기존 GLB12개 byte일치**(`53`), v4 `baby-charm.glb`/기존 계열/일반 앱 자산 보존. 리부트 babyCharm 아기일 때만 새 자산·gait 적용.
- 원본 일반1+생활29=30개와 같은 아루1개의 이름/형태/personality·food/coin/EXP/시설·meal원장·소유행 일치,3DB integrity ok(`52`). 아루 모자/쿠션rev4/아기preview·bounded64 기억 유지. 정상 시간 경과·수면/깨우기와 실제 교감 기억 외에 DB를 조작하지 않았다. SQLite lane·중복정산·건강OFF·일반 위젯 계약/템플릿은 변경하지 않았다.

### 모델·렌더 원인 구분과 비용

| 구분 | 직접 확인한 것 |
|---|---|
| 모델 구조 | v4 Foot4개/정적 후족, walk에 몸scale track만 존재. 새 후보 Foot2개, 좌/우 발 position track과 실제 이동 거리 기반 support/swing. 걸을 때 세계 좌표의 지지발 고정, 정지0.32초 동안 들린 발부터 교대 착지.30/60/120Hz 검사에서도 지지발 미끄러짐을 금지 |
| geometry/normal | 같은 위치의 중복 seam vertex normal 각도: v4 최대9.631°/평균6.933°, 새 후보0°. body triangles2496→5376. 이 수치는 모델 이음선 진단이며 전체 외형이 예뻐졌다는 증명이 아니다 |
| 발밑 높이/그림자 | 첫 v5에서 그림자가 러그 아래로 가려지는 문제 관찰. 기존 러그/바닥 상면을 따라 접지/그림자 배치. 이후 v6의 약한 그림자도 실제화면에서 확인하고 v7부터 작은 analytic alpha disc3개로 변경. v8은 정지 시 두 발을 바닥에서 끌어 모으던 계산도 실제 착지 arc로 대체 |
| DPR/AA | 같은 모델/재질/카메라·MSAA0에서585×1266(1.5×)와1170×2532(3×) 비교.3×에서 눈/외곽선 계단이 줄고,1.5× 원본PNG에도 계단이 보여 영상 축소만의 문제는 아님. **MSAA ON의 독립 효과는 이번에 측정하지 않았으므로 그 효과를 확정하지 않는다** |
| 영상 축소 | 원본은1170×2532. 보고서의390pt 전체 화면과 native pixel crop을 구분. 인코딩 fps/정지 이미지로 표시 FPS를 추정하지 않음 |

같은 v8·+35·일반 모션·녹화OFF, 컴파일/영상 추출/PNG burst 없이 각60초를 측정했다. 모두 **JS/프레임 제출 proxy**이고 물리 touch-to-photon/GPU time/표시 FPS가 아니다. 실제 정상 접촉은 표본수에 포함된 것만 기록한다.

| 설정 | 입력 표본 | 입력→제출 p95 | RAF 간격 p95 | 제출률 | GL 큐 대기 p95 |
|---|---:|---:|---:|---:|---:|
| 1.5× (`39`) | 8 | 17.30ms | 16.72ms | 59.82Hz | 6.37ms |
| 3× 1차 (`44`) | 4 | **INSUFFICIENT_DATA** | 18.04ms | 59.29Hz | 16.18ms |
| 3× 재측정 (`46`) | 5 | 31.95ms | 17.73ms | 59.52Hz | 15.84ms |

유효 두 구간은 기존100ms/33.34ms/500ms/30Hz proxy 기준을 충족하며500ms 초과 gap0. 순간 RAF 최대는1.5×89.74ms,3×재측정78.72ms다. 3×는4배 픽셀과 약2.5배 큐 대기로 여유가 줄어 **기본1.5×를 유지**하고3×는 검토 설정으로만 둔다. 자동 생활 장면/표정별 draw27~29·약19.1~19.43k triangles 차이와 호스트 부하가 있으므로 단일 하드웨어 인과/출시 사양으로 확대하지 않는다. 실기기·GPU·물리입력·발열/배터리 **NOT_RUN**.

### 실제 검증과 품질 판정

최신 v8의 정상 바닥 입력으로 정면→측면 이동·방향전환·정지와 자율 도약/착지를 확인했다. 같은 빌드에서 메뉴 닫기·잠자기→수면 자세/UI→깨우기→접촉, 동작 줄이기 ON 이동→OFF 복원도 확인(`47`). 마지막은 **임시 +25,1.5×,일반 모션,말풍선ON,손 거둠**, finalSize=null. 긴 동면/일반 위젯 tap/Android native/물리 기기는 이번 아기 보행 범위에서 재시험하지 않았다.

기술적으로 발 교대와 지지/착지의 구분, 뒷발 제거, 몸의 부드러운 이음선, 가독성 비교가 실제로 연결됐다. 작은 화면의 최종 얼굴 매력·보행 리듬/탄성은 사용자의 영상 평가를 다시 받아야 한다. **SELF_REVIEW를 사용자 아트 승인이나 독립 reviewer 통과로 기록하지 않는다.** 앞선 v4 READY를 재인용해 이번 제품 문제를 닫지 않는다.

새 검사:410/410(fail0/skip0), lint/typecheck PASS, 최종 gait 영향5/5, iOS Release xcodebuild exit0/동일DB install/hash/실제입력, Android JS bundle PASS, iOS CNG23/23, 원본/새 후보 generator3개 `--check` PASS. 로그28~32/48~50. 운영검사42/42 PASS(65로그). 수치가 아트 완료 조건을 대신하지 않는다. 중간 v5/v6/v7과 그 영상은 이력이다.24/26의 이전v6 export cache는 최신v7로 쓰지 않고 명시 거부(`26-stale-exports-rejected.json`); 최종35/37/39/44/46은 실제v8·mtime·설정을 확인했다.41/42 PNG burst는 메뉴만 찍혀 화질 비교에 쓰지 않았다.

Blender 실행 파일/PATH/Applications/Spotlight 및 노출 MCP 경로를 찾지 못했고 **이번 Blender/MCP 사용·설치·.blend 제작은 없다**. 실제 사용한 제작 수단은 기존 로컬 Three.js 생성 코드/GLTFExporter, runtime rig, Xcode/Simulator/CUA/AVFoundation이다. 새 sourceJSON+generator+GLB는 **편집 가능한 게임용 후보**, 완성 전문 아트 납품이 아니다. 새 설치·AI B·성장기/진화형 재제작·상점 확장 없음. SOL_DIRECT/SELF_REVIEW/subagent0, 요청 모델과 effective 확인은 구분하며 effective **ROUTING_UNVERIFIED**.

### 사용자가 다시 보는 방법

현재 Simulator의 아루 방에서 **☰→우리 아이→+25/+35**, 빈 바닥을 좌우로 눌러 보고 잠시 두면 도약/놀람/장난이 나온다. 정상 방이면 설정→아기 매력 검토판. 설정의 **렌더 비교**는1.5×/3× 진단이며, 비교 후1.5×로 돌린 상태다. 하단 손 내밀기는 여전히 REBOOT 검토 도구다. 이번에는 **기본 눈매·뒤/옆 실루엣·발 교대/멈춤/착지**를 중심으로 평가하면 된다. 최종 크기/아트/재미와 아트·보행 판정은 사용자 대기.

feature 소스 checkpoint 6529e26; 문서 인계/일반push 최종 local/tracking/live origin·clean은66-git-final-audit.json과 최종 응답에 남긴다. 비밀/DB/영상/native generated/build/log/cache 제외. main/merge/force/tag/release/deploy/실건강/실결제/보안 설정 변경 없음.

## Historical — v4 기술 검토 / BABY_CHARM_REVIEW_READY / 사용자 아트·보행 평가로 재오픈

아루가 쿠션 가장자리를 살피다가 너무 가까워져 물러서고 몸을 털거나, 앞발로 장난친 뒤 민망해하며 정돈하고 다시 통통 움직이는 장면을 관찰했다. 쿠션을 눌러보고 하품하며 쉬는 시간도 섞인다. 최신 v4의 첫 **180초 무입력**에서 완료된 생활 장면은 **13회·6계열**이었다. 단일 동작/표정 ID 수가 아니라 관심·접근·수행·반응·복귀가 연결된 token을 영상과 trace로 대조했다. 아직 짧은 대표 장면의 반복은 남으며 무한 콘텐츠나 최종 재미 승인을 뜻하지 않는다.

이번 판정은 사용자가 좁힌 **세 크기·3분 생활·일곱 표정·직접 교감·말풍선·검토 도구 구분**의 iOS Simulator 검토 준비다. 기존 사용자 제품 불만 이력은 보존한다. **재미·최종 아트·최종 크기 USER_REVIEW_PENDING**, 전체 MVP/출시 완료가 아니다. 성장기/진화형·상점·AI B·새 Lv1~20 제작으로 확대하지 않았다.

### 착수와 같은 최신 설치본

- 실제 Mac 화면·정상 메뉴·펫 입력 접근이 이번에 성공했다. 이전 Mac locked 판정을 현재에 복사하지 않았다.
- 착수 HEAD/추적/live origin 모두 `f8b0e80d2e938536e76353bdf1f7e1bf8c9eed34`, clean. 설치 v2 SHA `5877d697c0e1c43fbc9ffd855bde80d17864f54fa81ee501c801eaf2a99b92e2`와 소스141개가 일치했다. 먼저 v2를 실제 조작·관찰했고 재설치/초기화부터 하지 않았다.
- 실제 발견한 표현 결함을 수정한 앱 소스 **`7bf1031c23e376d6db16bfae4b0381eb21635fd9`**. 현재 **REBOOT-02 baby v4 Release**, bundle SHA **`1599ee6e5cf7ade77e6a23187bd4c6d36b1023debefa24446e710a3841811329`**. 설치 파일/빌드 SHA와141개 runtime 소스를 대조했고 문서 인계 HEAD와 구분한다. `32-v4-manifest.json`, `49-latest-preservation-audit.json`, `52-source-checkpoint-match.json`.
- iPhone16e `2170BD93-715C-482E-AD9C-DD7479970003` / iOS26.3.1(runtime label26.3), 390×844pt·1170×2532 영상 / macOS15.6 / Xcode26.3 / Expo55.0.31 / RN0.83.10 / embedded Release, Metro 불필요. 글자 기본 large, 일반 motion. 같은 software_balanced/1.5DPR, surface585×1266 설정 유지.

### 실제 발견·수정·재검증

| 결함 | 수정과 최신 확인 |
|---|---|
| 크기 선택 뒤 이전 위치/생활 의도가 남아 비교 위치가 다름 | `RoomController`에서 크기 변경 때 표현 의도·접촉·잔여 dock offset만 취소하고 (0,1.8)/정면으로 고정. GL컨텍스트/DB/카메라 재생성 없음. 최신 정상 메뉴 연속 선택 영상46의12/24/34초로 같은 위치 비교 |
| 식물 살피기에서 화장실 뒤로 펫이 가려짐 | baby_sneak 접근 x=-1.9→-.90. 사물·경제·건강 정책 변경 없이 현재 같은 카메라에서 접근/표정/복귀가 보임 |
| 장난/만족/졸림의 작은 얼굴 구분이 약함 | 한쪽 윙크와 입꼬리, 열린 만족 눈과 미소, 내려간 졸린 눈과 하품을 조정. 새 GLB/원본 아트 변경 없이 기존 morph 사용. 실제 최신 얼굴/몸·귀 움직임과 원본 프레임 확인 |
| v3 연속 접촉 후 옆 기대기↔앞발 응답 두 연출 고정 반복 | 최근 두 motor 스타일을 제외하고 현재 touchRegion·중단된 실제 관심·완료 hand ID·burst로 선택. bounded3개 이력, 프레임 random/DB/보상 없음. v4 정상21회에서7스타일, 후반 고정 A-B 반복 없음 |
| 손 내밀기가 기본 게임 동작처럼 보임 | 검토 화면에 `REBOOT 교감 비교 도구` 표시. 하단 손 동작은 review-only이며 일반 게임 UI로 승격하지 않음 |

### 요청한 일곱 항목의 SELF_REVIEW

| 항목 | 최신 v4 실제 결과 |
|---|---|
| +15/+25/+35 | 정상 `☰→우리 아이`에서 같은 방/카메라/위치로 선택. 정지 동일 위치는 영상46/비교이미지51, 이동·빠른 접근·직접 접촉은 후보별 영상34/35/36. 별도 run clip/물리 달리기 시험을 수행했다고 표현하지 않음 |
| +35 vs +25 | +35에서 눈·입의 구분이 조금 더 쉬웠고 넓은 빈 바닥이 남음. 차이는 점진적이며 +15가 가장 작음. `finalSize=null`; 마지막 설정은 **임시 +25 복원**, 어느 것도 최종 선택 아님 |
| 3분 무입력 | 영상37 첫0~180초:13완료/6계열. 예:12.05~21.316 사용자 쪽 살피기·기대기·통통·돌아보기;26.816~33.133 쿠션 가장자리 관찰·가까워 놀람·몸 정리;37.65~44.816 앞발 장난·헛디딤·정돈;61.616~69.6 쿠션 누르기·하품·자리 잡기;84.166~94.266 창 쪽 탐색·접근·놀람·다시 확인;136.5~146.2 식물 쪽 살금살금·통통·복귀. 정해진 시험 순서를 앱에 숨겨 넣지 않음 |
| 7표정 | 표정 이름이 없는 게임 원본을 A~G로 배치한 이미지44와 별도 key. 호기심=비대칭 눈/고개 확인, 신남=두 눈 웃음·통통, 장난=한쪽 윙크·입꼬리/앞발, 놀람=열린 눈/입·몸 물림, 만족=편한 미소/기대기, 민망=눈매/볼·몸 정리, 졸림=눈 내림/하품·쿠션. SELF_REVIEW상 얼굴+몸으로 구분. 정지 한 장만으로 신남/만족을 항상 정확히 읽는다고 주장하지 않으며 최종 표현 만족은 사용자 대기 |
| 머리/몸·이력 | 영상37 정상 입력의 실제 수락21회(머리7/몸14/unknown0), 시작놀람→기대기/간지럼/옆기대기/앞발/몸꼼지락/머리기대기/완료 손길 재인식7스타일. 놓은 뒤 복원/새 생활 관찰. 놓친 화면 클릭은 성공 수에 제외. 중단된 탐색·완료 손길 ID/region을 trace40/41로 대조; 연타 EXP/애정/재화 없음 |
| 말풍선 | 머리 위의 짧은 한 주 말풍선·닫기/사라짐·짧은 문장, 얼굴/뿔과 입력을 가리지 않음. 시스템 저장 안내는 설정에만 있고 제품 대사는 행동 관심/접촉 내용. 영상37 말풍선 숨김 후 실제 몸·얼굴·접촉·이동도 확인, ON 복원. `손 내밀기`는 위 검토 도구와 분리 |
| 최소 영향 회귀 | 최신 실제 잠자기→수면 자세/UI→깨우기→직접 접촉, 메뉴 닫기, reduced motion ON 접촉→OFF 복원 확인. 장기동면·cold·모자/쿠션의 새 착용/이동 전 경로는 이번 좁힌7항목에서 재시험하지 않았으며 과거 v7 증거를 최신 v4로 바꾸지 않음 |

### 정상 속도 증거 — 로컬 전용

모든 파일은 `evidence/reboot-02-review-2026-10-08/`에 있고 Git/외부 업로드 제외다. 영상 인코딩 fps를 앱 표시 fps로 사용하지 않는다.

- **37-latest-v4-normal-play.mp4**:13분50.498초 무편집 원본. 첫180초 무입력, 뒤 정상 메뉴/직접 접촉/말풍선 숨김 포함. 긴 메뉴·관찰 간격도 자르지 않음. `39-v4-scene-index.json`, `41-v4-touch-index.json`이 실제 구간/원인을 연결.
- **34-size15-v4.mp4 / 35-size25-v4.mp4 / 36-size35-v4.mp4**:같은 최신 Release의 크기별 실제 이동·접촉 영상. 첫 프레임은 자율생활이 이미 시작된 경우가 있어 정지 동일위치 비교에는 쓰지 않음.
- **46-v4-exact-size-comparison.mp4**, **51-v4-same-location-size-comparison.png**:정상 메뉴 선택 직후 같은 위치/카메라,12/24/34초. 전체 화면을 동일하게390×844로 축소했으며 펫만 따로 확대하지 않음.
- **44-v4-blind-expression-full-screens.png / 44-v4-expression-key.json**:같은 정상 영상에서 호기심16.6/신남18.6/장난55.9/놀람29.533/민망30.216/만족31.116/졸림64.716초. 순간 blink로 두 눈이 닫힌 장난 프레임 대신 실제 윙크 구간을 사용했으며 원본을 유지.
- v2와 v3 영상·실패/A-B 반복은 중간 이력으로 보존. 최신 v4 통과 증거와 혼용하지 않음. CUA 현재 pixel/input 성공; 실기기 터치가 아닌 Simulator 정상 입력.

### 새 검사와 성능의 범위

- 최신 **405/405**(fail0/skip0), lint/typecheck PASS. 이 실행의 `27/28/29` 로그. 앞선 v3 영향42/42는 중간 이력이고 전체404를 최신값으로 재사용하지 않음.
- v4 iOS Release **xcodebuild exit0**, 같은 DB 유지 설치·실제 실행/정상 입력, 최신 Android JS bundle PASS. `30/32/33`. iOS CNG **23/23**, 두 asset generator `--check` PASS(`47/48`). 운영검사 **42/42 PASS**(`55-final-workflow.log`).
- 최신 녹화OFF **60초**(`50-v4-performance.json`의 **capture.summary**, 수시 rolling summary와 구분):정상 펫 touch8, 입력→다음제출 p95 **16.725ms**, RAF 간격 p95 **16.726ms**/max37.380ms, >500ms gap0, 제출 **59.965Hz**. morph p95.745ms/draw.782ms/queue drain6.095ms. 현행 100ms/33.34ms/500ms/30Hz proxy 기준 PASS. 영상 추출/컴파일을 동시에 돌리지 않은 구간. **GPU 표시 FPS·물리 touch-to-photon 검증이 아니다.** 이번 기록 하나로 녹화 효과의 인과를 확정하지 않음.
- 실제 화면에서 메뉴/교감/대사 중 입력 정지나 정상 저장 알림 깜빡임을 관찰하지 않음. 장기 실기기 발열/배터리, GPU/물리 지연, 최신 Android native/UI는 **NOT_RUN**. 별도 하드웨어 성능/출시 선언은 하지 않음.

### 보존·도구·남은 사용자 평가

착수한 원본 일반1+생활29=30개 저장과 같은 별도 아루1개, identity/이름/형태/personality/food/coin/EXP/facility·meal원장·소유행 모두 전후일치,3DB integrity ok. 아루의 모자/쿠션(-.9399684,3,rev4)/baby preview 유지, 제한64개 완료기억에는 실제 새 경험만 들어간다. DB초기화/다른 펫 생성/운영 시계·재화 조작 없음. 일반 위젯 계약/템플릿 변경 없음, 이번 실제 홈 위젯 탭 재시험은 NOT_RUN. 건강OFF/기본A 유지.

Blender/MCP/.blend와 Figma 성공호출은 이 실행에도 없음. 기존 parametric sourceJSON+generator+GLB 초안과 이전 도구 조사 이력을 유지; 완성 아트/Blender 제작이라고 하지 않는다. 기존 AI 연구는 보존하고 새 통합을 하지 않음. SOL_DIRECT/SELF_REVIEW/subagent0, requested GPT-6.1 Sol Max/effective **ROUTING_UNVERIFIED**.

현재 Simulator 아루 방 **☰→우리 아이→+15/+25/+35**로 비교한다. 정상 방이면 설정→**아기 매력 검토판**. 직접 머리/몸을 누르거나 3분 관찰하고, 설정에서 말풍선을 가릴 수 있다. 하단 손은 검토 도구다. **다음은 사용자 아기 매력·말풍선·크기 평가**이며 승인 없이 성장기/진화형 제작으로 진행하지 않는다.

feature 소스 체크포인트는 위7bf1031. 보고서 인계/일반push의 최종 local/tracking/live origin·clean은 `53-git-final-audit.json`과 최종 응답으로 확인한다. 비밀·DB·native generated·영상·빌드·로그 제외 후 같은 feature만 일반push. main/merge/force/tag/배포/건강/실결제·보안 변경 없음.

## Historical — PARTIAL_WITH_BLOCKERS / v2 최초 인계 / 2026-10-08

이번 feature 일반push는 **성공**했다. 첫 인계e5f3032의로컬/추적/live origin 해시가모두일치했고이전미반영REBOOT01체크포인트도같이반영됐다. source9a09f83와후속문서HEAD를구분한다. 최종HEAD/clean/원격hash는같은폴더git-final-audit와최종응답이기준이다. 과거GitHub서버오류를이번미반영으로복사하지않는다.

새 아기는 쿠션·창·식물을 관심 대상으로 삼고 살피기→접근→짧은 놀람/장난→몸 정리→사용자 쪽 확인→다음 생활을 연결하도록 구현했다. 머리 기대기, 몸 꼼지락, 연속 손길 뒤 옆으로 기대기/앞발 내밀기, 직전 탐색 중 놀람과 실제 완료 손길의 재인식이 서로 다른 표현을 사용한다. **이는 구현·자동 검사 결과이며 최신 정상 3분 플레이의 실제 통과는 아직 아니다.**

사용자 판정 **REWORK_REQUIRED — CHARACTER / MOTION / EXPRESSION은 OPEN**이다. 화면/모션/표정의 품질이 실제 정상 입력에서 검증되기 전 닫지 않는다. 재미·최종 아트·세 크기 선택은 **USER_REVIEW_PENDING**. 아기 한 마리만 제작했고 성장기/진화형의 유사함·크기 문제는 사용자 지시대로 다음 아기 검토 뒤로 미뤘다.

### 소스와 설치

- 착수HEAD603b437, sourcecf1d57f/설치v7 SHA6d5cc5f… 일치, clean/ahead3 확인. 첫 CUA에서 AX 목록은 읽었지만 **실제 메뉴 입력은 Mac locked로 실패**했다. 설치 이후의 실제 screenshot 접근도 다시 Mac locked였다. 과거 BLOCKED를 복사한 판정이 아니다.
- 현재 앱 소스 **`9a09f8382da45816f4882d32ca854e6944148abf`**, 설치 **REBOOT-02 baby v2 Release**. bundle SHA **`5877d697c0e1c43fbc9ffd855bde80d17864f54fa81ee501c801eaf2a99b92e2`**. dirty build의 runtime/source141개 해시를 source checkpoint와 대응했다. 이후 문서HEAD와 구분한다.
- iPhone16e `2170BD93-715C-482E-AD9C-DD7479970003`, macOS15.6/Xcode26.3/iOS26.3.1, Expo55/RN0.83.10. Embedded Release여서 Metro 불필요. 기존 ios/CNG/config/template·경제/성장·수면/동면 엔진을 다시 만들지 않았다.
- 로컬 증거 `evidence/reboot-02-baby-2026-10-08/24-release-v2-manifest.json`, `27-native-preservation-audit.json`. v1 compile/bundle은 중간 이력이며 최신v2로 구분한다.

### 실제 제작과 범위

| 범위 | 현재 결과 |
|---|---|
| 얼굴 | 구체 눈을 제거하고 머리 곡면을 따르는 눈매/눈꺼풀/눈썹/볼/입의 별도 mesh·morph 초안. 한 뿔 유지. 원본v7 세GLB byte일치. SourceJSON+generator+285000-byte runtimeGLB 추적 |
| 실제 제작 도구 | PATH/표준Applications/Spotlight/프로젝트.tools에 Blender 없음, BlenderMCP 호출 도구 없음. 새 설치 없음. **parametric 3D 초안이며 Blender sculpt/완성 아트가 아니다. .blend 납품 없음** |
| 크기 | v7 아기 기준1.15/1.25/1.35 세 후보 메뉴 구현. 같은 camera/room/asset, +25는 임시 초기 비교값. finalSize=null. **+15/+35 실제 메뉴·게임 캡처 미실행**. +25는 native 정지 framebuffer만 확인 |
| 연결된 생활 | 현재 사물의 위치·scene 완료/취소를 유지하는6계열/다단계 행동. scan/sniff/통통 이동/too_close/몸 털기/앞발 장난/살금살금/휴식의 실제 transform 구현. Frame마다 random clip/catalog/DB 선택 없음 |
| 표정 | 호기심/신남/장난/놀람/만족/민망/졸림의 눈매·입·눈썹·볼·귀·몸 조합. 실제 GLB의7종 적용값·geometry finite 검사. **ID/값 검사를 작은 화면 시각 PASS로 부르지 않음** |
| 직접 교감 | 머리/몸·직전 탐색·45분 이내 완료 손길·8초 반복 이력에 따른 다른 motor/face/follow-up. 완료 때만 touchRegion 저장, canceled/다른pet/revision/id 중복 거부. EXP/애정 점수/보상 추가 없음 |
| 말풍선 | 펫 근처164pt 폭/50pt head clearance, 작은 cream bubble/닫기 hitSlop. 자동9초 간격·짧은 cue 읽기 시간·최근3줄 제외·무언 beat. 현재 관심/행동별 대사, 자유LLM 없음. 이 데이터 양을 실제 다양성 PASS로 세지 않음 |
| 모자/쿠션 기억 | 최초·재·행동중의 다른 beat와 얼굴, 재착용은 알아보기/정돈; interrupted activity의 실제 target 재개. 쿠션 옛 좌표 시선/현재 좌표 접근·정착 계약 유지. **새 연출의 정상 입력과 체감은 BLOCKED** |
| AI B | 이번 완료 조건 아님. 기본A/기존온디바이스 연구·실제 standalone 추론 이력 보존. 새모델/SDK/서비스/외부LLM 연결 없음 |

### 현재 실행 증거와 미실행

- 최신v2 전체 **404/404**, 영향 **42/42**, lint PASS, 최종 typecheck PASS. 새 테스트의 배열/Node URL 타입 표기 오류는 정정했고 실패 로그도 보존했다. 기존 기대값/검사를 완화하지 않았다.
- iOS Release xcodebuild exit0, 같은 DB 유지 install/process launch, 설치 SHA 일치. 최신Android JS bundle PASS. iOS CNG23/23, 두 asset generator `--check` PASS, 운영검사42/42.
- `26-v2-native-framebuffer-static.png`는 실제 설치v2의 정지 framebuffer다. 새 얼굴·말풍선이 렌더됐으나 **모션/입력/전체표정/크기비교/3분관찰 PASS가 아니다**. Mac 잠금은 우회하지 않았다. 새 정상 연속 영상 없음.
- 현재 작업 시작 시3DB 온라인 백업과 설치후 identity/economy/EXP/facility·meal원장·소유행 **모두 일치**,3DB integrityok. 같은아루/모자/쿠션/preview 보존. 사용자 평가 중 이미 쿠션이(-.93997,3,rev4)/previewbaby로 변경돼 있었고 이 실제 시작값을 유지했다. 오래된v7 보고의 좌표를 원본으로 덮어쓰지 않았다.
- **3분 정상 무입력/반복 머리·몸 접촉/말풍선 숨김/세 크기 실제 비교/모자·쿠션 체감/메뉴·수면·cold/최신 proxy 성능 BLOCKED_HOST_LOCKED**. 장기동면 최신GUI·Androidnative/UI·실기기/GPU/물리입력/발열·배터리 NOT_RUN. 과거v7 성능 수치를 최신값으로 복사하지 않는다.
- Figma 도구는 노출됐지만 개인/회사2계정의 작성 대상을 확인하는 질문이 미응답. 성공호출·Figma산출물 없음, **NOT_USED_ACCOUNT_CHOICE_PENDING**. 앱 수정은 이에 의존하지 않았다. 이미지생성/외부업로드·새계정·유료서비스·전역설치·보안변경 없음.

### 다음 한 작업과 사용자 실행

Mac 실제 입력 접근→같은v2 SHA 대조→현재 아루의 **☰→우리 아이→+15/+25/+35**를 같은 방에서 비교. 실제 값이 같으면 재빌드/재설치/DB초기화하지 않는다. 일반 방이면 메뉴→설정→**아기 매력 검토판**. 아기 모드가 기본이고 이전 세모습은 설정의 별도 이력 비교로 남았다.

이어 같은v2의3분 정상 무입력 원본영상→서로 다른 실제 관심·몸짓·7표정 관찰→머리/몸/행동중/연속 접촉20회·무언 비교→모자 제거/재착용/자율행동 중 착용·쿠션 이동/기억→메뉴·수면/깨우기·앱전환/cold→최신60초proxy. 결함이면 해당 범위만 수정/영향검사/새Release/실제재검증한다. 자체검토는 SELF_REVIEW, subagent0, effective model ROUTING_UNVERIFIED.

feature checkpoint/일반push만. DB/영상/SDK/cache/generatednative/build는 로컬ignored, source/lock/원본 보존. 실제 Git push 결과·HEAD/추적/live origin/clean은 같은 evidence 폴더git-final-audit와 최종응답에 기록한다. main/merge/force/deploy/실건강/실결제 금지. **잠금 해제 후 이 최초 검증을 이어가며 새 계열·상점·Lv1~20로 확대하지 않는다.**

# REBOOT-05 — 실제 생활·교감 검토판 v13

2026-10-13 · 소스 `8a95a38145319e1a02a08438803ba3b74e8e837d` · SOL_DIRECT / SELF_REVIEW

**REBOOT_05_CHARM_REVIEW_READY — 현재 iOS Simulator 검토 범위.** 재미·최종 아트·성격·방·크기/카메라 채택은 USER_REVIEW_PENDING. 전체 MVP 성능·실기기 게이트는 별도로 미완료다. PERF-01 / STORAGE-01의 정확한 VFS 원인은 OPEN이다.

## 실제로 함께 볼 장면

아루가 창/잎에 관심을 두고 다가가 살펴본 뒤 사용자를 돌아본다. 앞발 장난에 잠깐 놀라 자세를 정리하고, 현재 쿠션이나 빈 바닥에서 쉬었다 다시 다른 관심으로 옮긴다. 목적·과정·결과·다음 관심을 유지하며 조용한 장면은 말하지 않는다. 외부 AI나 실제 의식/감정의 증거로 해석하지 않는다.

장난은 짧게 앞발로 건드리고 반응을 확인한다. 다정은 몸을 맡기고 편히 머문 뒤 복원한다. 도도/호기심은 방향과 시선을 비켜 두고 짧게 닿았다 원래 관심으로 돌아간다. 머리/몸·중단한 행동·실제 최근 손 경험에 따라 말과 후속 연기가 달라진다. 영상에서 성격 이름은 표시하지 않았고 대사는 ON이다.

## 바로 실행 / 영상

현재 설치 앱 `reboot-05-charm-v13`은 재설치할 필요가 없다. 일반 방 설정 → **REBOOT-04 성격 검토판**(기존 메뉴 이름) → 우리 아이에서 3종을 선택한다. 리부트 메뉴 → **방과 시점 비교**에서 A 기존 / B 햇살 후보, +25/+35, 기존/가까운 시점을 비교한다. 손 내밀기는 REBOOT 검토 도구이며 일반 게임 UI로 승격하지 않았다. 일반 저장과 별도 검토 DB를 사용한다.

**iPhone 파일 앱 → iCloud Drive → Arucon → Reviews**

- `2026-10-13_arucon_REBOOT05_charm_v13_8a95a38_review_r2.mp4` — 173초 / 27.92MiB. 무입력 생활 발췌 → 장난 직접 머리/몸 접촉 → 다정 기대기/손 거두기 → 도도 접촉/생활 복귀.
- `2026-10-13_arucon_REBOOT05_charm_v13_8a95a38_room_compare.mp4` — 60초 / 8.08MiB. 같은 아루·기존 카메라에서 A+35 / B+35 / B+25.
- `2026-10-13_arucon_REBOOT05_charm_v13_8a95a38_scenes_r2.txt` — 각 컷의 원본 파일명/시각 안내.

두 영상은 실제 Simulator 원본1170×2532/H.264/정상 속도/무음이며 명시적 발췌다. 생성 장면·배속·해상도 보정 없음. 전체 AVFoundation 디코딩/fast-start PASS. 시작한 모든 원본과 실패 구간도 로컬에 보존했다. 현재 전달은 **DELIVERY_SENT / MOBILE_NOT_VERIFIED**: 두 MP4+안내문만 비덮어쓰기 복사, 원본/복사본 SHA256 일치, 공식 URL 리소스에서 IsUploaded=true/IsShared=false/IsUploading=false/error=null. iPhone 재생은 사용자 확인 전 미확인이다.

## 이번 구현

- 기존 actor를 확장한 6개 관심 목표(window/plant/paws/user/cushion/quiet_floor). 현재 사물·현재 위치·프로필 축·완료한 실제 경험·직전 결과·표현용 활동/휴식 이력으로 점수를 매긴다. 난수는 근접 점수와 짧은 변형에만 사용한다. 의도를 완료/취소까지 유지하고 같은 자리의 앞발 장면은 빈 이동 경로로 취소하지 않는다.
- 목표별 접근→실행→짧은 반응→복원과 휴식 간격. 실제 도메인 허기·식사·배설·수면 시계를 단축하지 않는다. 실제 현재 쿠션 좌표를 사용하며 과거 좌표는 사실로 오인하지 않는다.
- 최근 실제 소유 개체의 손 경험은 접근/표정/기대기/머무름에 사용한다. 미래·타 개체·취소 사건 제외. 기존64개 기억/경제 원장 분리를 유지한다. scene/focus/outcome은 기존 기억의 선택적 필드이며 DB schema/성격 ID 변경 없음.
- 자발/교감 발화 구분, 20초 자동 발화 간격, 최근 의미·최근3문장 제외, 말 없는 변형. 목표별 72개 짧은 후보는 행동의 해당 beat에서만 도달한다. 콘텐츠 숫자를 품질 통과 근거로 쓰지 않는다. v11 합성 생활 맥락과 콘텐츠 폭/X 없는 말풍선을 유지했다.
- 기본 호기심/만족에 도도 스타일의 Mischief가 상시 섞이던 부분을 제한했다. 놀람/민망함/졸림에 미소 스타일이 덮이지 않게 하고 표정 전환·복원을 보간한다. 귀는 관심 상대 방향과 행동 긴장/이완에 연결한다. 원본 눈 geometry나 아기 외형을 다시 제작하지 않았다.
- 실제 Blender Python으로 게임용 방 B의 곡면 창턱/창틀·나무 바닥·러그·잎·쿠션·시설 입구를 제작했다. 기존 A/내비게이션/시설 소유권/이동 피벗은 보존한다. 편집 소스 `art/reboot-05/sunlit-room.blend`, 제작 코드/manifest, runtime `mobile/assets/reboot-05/sunlit-room.glb`를 추적한다. 원래 방은 기본값이며 B는 검토 선택이다.
- B는 load-time batch와 procedural 접촉 그림자를 사용한다. 실제 GPU shadow-map/PBR 납품이라고 부르지 않는다. 크기/시점 비교에 GLView·컨텍스트·저장을 재생성하지 않는다. 가까운 시점은 얼굴을 조금 크게 보이나 창/식물 여백이 줄었다. 채택 대기.

## 실제 발견·수정한 결함

v12 첫 B에서 iOS bundleUri를 asset 경로로 넘겨 기존 bundle→cache 읽기 fallback을 쓰지 못했다. 권한을 변경하지 않고 `Paths.bundle.uri`로 수정했다. 초기 B의 높은 러그가 기존 접지/그림자 계약과 달랐고 시설 입구의 겹친 면도 확인했다. Blender 바닥/러그 높이를 기존 계약에 맞추고 실제 입구를 Boolean으로 제작한 v13에서 재검증했다. 실패 원본 `room-first-v12.mp4`와 첫 B 자산은 로컬 보존했고 v12를 v13 통과 증거로 쓰지 않았다.

## 같은 최신 Release의 증거

| 항목 | 실제 결과 / 구분 |
|---|---|
| 10분 무입력 | `playful-no-input-v13.mp4`,599.563초 원본(녹화 요청은 관찰 시작17.35초 뒤). 정상 선택기 기록600.553초 COMPLETE /29완료 장면/6관심/7발화. 사용자 입력·패널·비활성화 중단0. 강제 장면/게임시간 압축 없음. 시작 구간의 실제 화면/기록과 영상/연속 native 프레임·goal trace를 대조했다. 전체 관찰창을 단일 영상이 모두 덮었다고 보고하지 않는다. 숫자는 재미·GPU 증거가 아니다. |
| 3성격 대사 ON | `playful-contact`, `warm-life`, `poised-life-v13.mp4`와 현재 trace. 공통 두 발 아기/+35/기존 시점/DPR2.5 AA0/B 방/같은 손 상황. 3개 기존 개체의 기억·쿠션 위치를 보존했으므로 새 동일 기억의 반사실 비교로 보고하지 않는다. |
| 접촉·취소·복귀 | 직접 머리/몸 좌표 입력이 head/body trace로 도달. 다른 말·앞발/기대기/시선. 짧음/유지·손 거두기·직접 접촉으로 중단·메뉴 취소 후 생활 복귀. 저장 안내만으로 성공하지 않았고 오래 유지할 때 눈·호흡/귀가 계속 움직였다. |
| 방·크기·시점 | 같은 아루의 A/B 정상 손 위치 native PNG와 실제 영상. B+25/+35 원래 시점, +25 가까운 시점 실제 확인. 가까운 시점은 별도 PNG이며 전달 영상의 가까운 시점 모션 증거로 확대하지 않는다. |
| 수면·복귀 | `rest-lifecycle-v13.mp4`: 정상 잠자기→stored sleeping=true/hibernating=false→잠든 자세/깨우기→정상 깨우기→접촉/바닥 이동→전경 복귀. 오래된 수면 포즈/교감 잠금 관찰 없음. 콜드 뒤 같은 개체/성격/쿠션/생활 맥락 복원. 이번 실제 동면 경계 재현은 NOT_RUN; 기존 시간/동면 자동 회귀와 CLOSED 역사 보존. |
| 저장·경제 | 원래65개 개체/5경제·소유 원장/원본50SHA/3DB integrity ok. 원장/EXP/재화/이름/소유/성격/활동 동일. 완료 기억은 기존64상한에서 정상 정리되며 baseline DB 보존. |
| native 저장 | 기존 격리150작업 PASS_NATIVE_SQLITE: 최초 execute BUSY와 finalize 전달 분리, 공통 lane 이후 실패0, 동일 직접요청meal1+auto1, wake replay 동일. 격리 CANTOPEN/FULL·진단 파일 실제복구 PASS. 원래 사건의 정확한 VFS 원인은 OPEN. |
| 일반 위젯 | preview로 일반 펫 상태를 덮지 않는 기존 계약/원장 보존. 실제 홈에서 일반 위젯/마지막 갱신 표시 관찰. 이번 widget-tap 진입의 새 검증은 NOT_RUN. |
| 자동 회귀 | 이번 fresh490/490, fail0/skip0; lint/typecheck PASS; iOS Release xcodebuild exit0/설치·실행; Android JS export PASS; CNG27/27 STATIC; workflow42/42+직접 self-test1/1. 과거482를 새 결과로 복사하지 않았다. |
| 플랫폼·접근 | Mac 실제 화면/입력 가능. macOS15.6/Xcode26.3/iPhone16e iOS26.3.1 Simulator/Apple Software Renderer. Android native 새 실행·실기기/GPU/물리 지연/열·배터리 NOT_RUN. 전역 큰 글자·VoiceOver 실제 읽기/장기 부재는 이번 추가 NOT_RUN. |

진단 원본8개는 시작 전 `before-arucon-storage-incidents*.json`에 보존했다. 기존8개 ring에 이번 격리 QA 사건2개가 들어가 활성 ring에는 원래6개+신규2개가 있다. 오래된 원래2개(legacy127/354)를 전부 활성 기기에 보존했다고 과장하지 않는다. 기존 사건 원문 전체는 immutable baseline에 남겼으며 원래 DB/로그를 삭제하지 않았다.

## 성능 — 별도 OPEN 유지

DPR2.5/AA0/975×2110/+35/원래 시점/tail/일반 모션/대사ON. 로드 후30초 이상 안정 구간 뒤 fresh60초 OFF, 도도 B→A→A→B 순서 및 장난/다정. 동일 좌표6회 절차는2~6번;1번은 느린 수동 입력으로3표본만 포함됐다. 각 완료창과 호스트 epoch/load/CPU idle/메모리/디스크를 그대로 보존했고 좋은 구간만 고르지 않았다. 측정 중 녹화·build·대규모 검사·영상 인코딩·DB fault 검사는 병행하지 않았다.

| 구간 | 방/성격 | 제출 proxy Hz | RAF p95/max ms | 입력→제출 p95 ms(표본) | GL 대기 p95 ms |
|---|---|---:|---:|---:|---:|
| perf-1-B | sunlit/poised | 39.78 | 33.19/77.77 | 35.16 (3) · 표본부족 | 30.15 |
| perf-2-A | original/poised | 44.54 | 29.34/67.67 | 32.10 (5) | 25.79 |
| perf-3-A | original/poised | 43.63 | 29.56/94.66 | 31.83 (6) | 26.46 |
| perf-4-B | sunlit/poised | 38.77 | 33.26/51.99 | 44.77 (5) | 30.08 |
| perf-5-playful-B | sunlit/playful | 42.74 | 29.33/72.34 | 58.99 (5) | 25.58 |
| perf-6-warm-B | sunlit/warm | 40.34 | 32.83/66.12 | 39.45 (5) | 29.62 |


전6개 RAF 기준≤33.34ms, submit proxy≥30Hz, gap>500ms0. 입력은 첫 B 표본부족, 나머지5~6표본≤100ms. B의 여유는 작고 실제 장면/누적 기억/호스트는 변하므로 원인 개선율·전체 장시간 성능 보장으로 일반화하지 않는다. 판단 p95 .037~.047ms, pose .45~.53, CPU morph .76~.86, draw 호출1.13~1.28보다 GL queue 동기 대기25.58~30.15ms가 지배적이었다. queue drain은 실제 GPU 시간/표시FPS/물리 입력이 아니다. 이전 v11/과거 실패와 합치지 않고 **PERF-01 OPEN**을 유지한다. 해상도·모션·기준을 낮추지 않았다.

## SELF_REVIEW / 남은 범위

- 기능: 현재 검토 환경의 정상 입력/10분 자율 선택/생활·교감 취소/수면 복귀/콜드 저장은 검토 준비. 자동 판정과 실제 화면 증거를 구분한다.
- 표현: 관심/접근/결과·귀/눈·몸·말의 연결과 세 손 스타일이 보인다. 침묵/휴식이 섞이고 표정이 손 유지 내내 고착되지는 않았다. 아트/연기 취향의 최종 평가는 사용자에게 남긴다.
- 재미·관계: 실제 최근 경험이 행위 선택에 영향을 주는 제한된 규칙 기반 A 방식. 장기 관계 만족·성격 형성16종·AI 지능감 완성은 사용자 승인/완료로 기록하지 않는다.
- 남은 경계: 실기기/GPU/물리입력·장기/접근성 검증 NOT_RUN, PERF-01 OPEN, STORAGE-01 원래VFS OPEN, v11 이모지/실제읽기 미검증 이력 보존. 다음 유형/성장형/상점/AI로 확장하지 않는다.
- 실제 도구: 기존 프로젝트 Blender5.2LTS CLI/Python 제작·export, Xcode/simctl, CUA 실제 Simulator, AVFoundation 녹화/발췌/디코딩. 이번 Blender MCP/Figma/Context7/Maestro 성공 호출은 없음; 사용했다고 보고하지 않는다. 신규 설치/외부 AI/실건강/결제/보안 변경 없음.
- 요청 모델 GPT-6.1 Sol Max / effective model ROUTING_UNVERIFIED / subagent0 / SELF_REVIEW. 과거 Astra·독립 리뷰 이력 보존.

## Git / 재개

앱 소스 `8a95a38`은 검증 입력237개·설치 bundle `a07a069dfdf437a9a5eb05e3e05eae184872d1f512fae5a86d48939c9333412d`와 일치하며 feature 일반 push를 확인했다. 종료 보고/재개 문서는 별도 체크포인트로 저장한다. native generated/DB/영상/개인 로그/도구/.env는 stage하지 않았다. source .blend/GLB는 의도한 후보 자산이며 이전 Blender 자동 백업은 ignored 로컬에 보존했다. 최종 HEAD·원격 해시는 종료 조회 결과를 따른다.

다음 한 작업: iPhone의 두 검토 영상을 재생하고 생활 연결·세 성격의 느낌·B 방·크기/시점을 사용자 평가한다. 설치/소스가 같으면 재빌드/재설치/DB 초기화부터 하지 않는다. 사용자 평가 전 유형/성장형/상점으로 확대하지 않는다. 현재 승인된 feature checkpoint/일반push만 유지한다.

로컬 증거: `evidence/reboot-05-2026-10-13/`의 원본/manifest/observer/native trace/6성능창·host/보존 감사/콜드 비교/iCloud receipt. 이 폴더 전체는 외부 업로드하지 않았다.

# REBOOT-04 축하·읽기성 후속 — 2026-10-14 / v15

**CELEBRATION_EXPRESSION_REVIEW_READY — 범위 한정**. 같은 합성 목표에서 장난은 한 번 통통 뛰고 사용자를 확인하고, 다정은 가까운 눈맞춤과 낮은 앞발 동작으로 잠깐 함께 머물며, 도도는 짧은 앞발 인사 뒤 자기 생활로 돌아간다. 실제 이전 쿠션 생활을 중단한 도도는 축하 후 같은 쿠션 장면으로 돌아가 완료했다. 모두 손 내밀기 없이 정상 합성 관찰 입력으로 시작한다. SELF_REVIEW이며 재미·최종 성격 표현·아트·크기는 USER_REVIEW_PENDING이다.

## 볼 파일과 장면

승인된 개인 iCloud Drive → Arucon → Reviews:
`2026-10-14_arucon_REBOOT04_celebration_v15_556725e_review_final.mp4`
같은 이름의 `_scenes.txt`에 컷과 원본 시각을 기재했다. 2:30 / 30.29MiB / 1170×2532 / H.264 8-bit420 / 무음 / fast-start. 10,357프레임 전체 디코딩 PASS. 정상 속도·원본 해상도 passthrough 발췌본이며 무편집 연속 증거라고 부르지 않는다. 합성 데이터만 포함한다.

- 00:00–00:06 현재 크기, 00:06–00:14 현재×1.12 후보. 같은 카메라·위치의 중립 준비 자세다.
- 00:14–00:48 장난 / 00:48–01:19 다정 / 01:19–01:51 도도: 같은 목표 축하와 이어지는 무입력 생활.
- 01:51–02:11 깨우기 뒤 이동·직접 몸 접촉·복원.
- 02:11–02:30 다음 합성 사건의 말풍선을 표시 직후 탭해 닫기. 매우 짧게 나타나며 몸짓과 복원이 계속된다.

**VIDEO_READY / DELIVERY_SENT**. 원본·복사본31,758,999 bytes와SHA256 `e2cf3136bdd02b0c6129a4143450cc0c32876320b1d4fe47a3bdfa3eb5766e7a` 일치. 공식 iCloud URL 메타데이터에서 두 파일 모두 업로드 완료·비공유·오류 없음 확인. 초기4355 오류/업로드 중 상태는 보존하고 정상 재조회에서 해소됐다. 새 영상의 iPhone 재생은 **MOBILE_NOT_VERIFIED**다. 원본·실패 시도·진단·DB는 로컬 `evidence/reboot-04-celebration-2026-10-13/`에 보존하고 Git/iCloud 전달에서 제외했다. 폴더 날짜는 착수일이며 파일명은 실제 KST 촬영 날짜다.

## 기준·구현·원인

ZIP의 MD 한 개 전체를 읽고 [지시서](tasks/REBOOT-04-celebration-readability-followup.md)에 원문 그대로 저장했다(SHA256 f76f0d696f5acd2649cafe30fa7fb85431f85f03aec7b2679c54a2adbd2d3a6f). 보고 기준317ca1e/v11보다 새로운 HEAD376d18c·앱8a95a38/v13을 확인하고 REBOOT-05 자율생활·햇살 방 후보·과거 검증을 보존했다. 초기 작업 트리는 clean, 동시 소스 작성 증거 없음. reset/DB 초기화 없음.

앱 소스 **556725e4e8971d80cf94b7b62e179e0cb93e635f**, 설치 **reboot-04-celebration-v15 Release arm64 Simulator**. 빌드 시 고정한239개 파일이 커밋과 SHA256 전부 일치한다. JS `eddcd664f44023af82683532b86f0903b0b3888493b185959efcdf0fb736bc17`, native `5c289d16117d5f9454b4f624a9d62afd95587c4989878c8ee83fca4ef6ffeebe`. v14는 미설치 중간 빌드이며 최종 증거로 쓰지 않는다.

- 기존 LifeContext→claim→director 경로에서 목표 축하만 조정했다. `celebration.ts`의 가역 시간/진폭으로 눈·귀·시선·몸·앞발을 묶고, 장난의 도약은 기존 두 발 접지/착지 rig를 사용한다. 다정에게 실제 손 없는 기대기 연출을 쓰지 않는다. 공통 기본 얼굴을 복구하고 지속 윙크를 만들지 않는다.
- 도도는 메뉴를 열기 직전 실제 자동 intent를 보존한다. 목표 완료 후 새 토큰·현재 revision으로 이어가며 쿠션 위치가 바뀌면 낡은 위치를 재사용하지 않는다. 새 합성 날 변경/취소가 그 문맥을 지우는 경우 임의의 이전 관심을 꾸미지 않는다.
- 기존 성능 비교 도구에서 메뉴 진입→측정 interrupted 뒤 actor가 영구 정지하던 결함을 v13에서 재현했다. 측정은 계속 INVALID/interrupted로 두고 패널 닫힘 뒤 일반 행동을 허용하도록 수정했다. 이는 비교 도구의 결함이며 v11 일반 목표 반응 전체가 실패했다고 확대하지 않는다.
- 동일조건 검토에는 기존 격리 fixture를 사용하고 `대사 ON · 같은 상황 비교`가 기존 합성 상황 메뉴를 열게 했다. claim을 우회하거나 자동으로 목표를 강제 발생시키지 않는다. 세 비교 petId는 각각 새 개체다(mv6uzg4o1/playful, mv6vcu0a2/warm, mv6vhdzx3/poised). 상태·성장·4개 초기 경험·seed·쿠션 위치는 동일하다. 정상 사건 재선택은 여전히 억제된다.

## 읽기성 후보와 SELF_REVIEW

390×844 논리 viewport / native1170×2532 / iPhone16e Simulator iOS26.3.1 / macOS15.6 / Xcode26.3. Apple Software Renderer, DPR2.5/AA0, 실제 GL975×2110, 기존 방·기존 카메라 verticalSpan13.6이다. 현재 검토 크기1.35에만 ×1.12를 곱했다. View 확대·crop·카메라 변경은 없다. 일반 저장과 기본값은 유지되며 후보를 cold 시작에 기본 활성화하지 않는다. 손 접촉 거리/투영도 같은 실제 모델 scale을 사용한다.

실제 전체 화면에서 후보의 눈·입·뿔 경계가 조금 더 읽기 쉬웠고, 넓은 바닥·이동·메뉴 여백은 남았다. 귀/앞발의 섬세한 차이를 크게 과장하지 않으며 최종 채택은 사용자 판단이다. 정면 중립 PNG와 같은 원본 영상의 전환을 보존했다. 최초75초 크기 영상에는 후보 전환이 늦게 이루어져 후보 비교 증거로 쓰지 않았고, 최종60초 원본에서 두 크기를 확인했다.

장난의 도약·상대 확인은 세 종류 중 가장 빨리 읽혔다. 다정은 웃는 눈맞춤과 짧은 함께 머묾, 도도는 더 높은 앞발 인사/몸 방향/빠른 생활 복귀로 구분했다. 대사를 읽지 않고 몸·얼굴에 집중한 SELF_REVIEW이지 독립 블라인드 사용자 평가가 아니다. 기존 모델·원본·Blender 자산은 수정하지 않았다. 새 Blender/Figma/외부 AI 사용이나 제작을 주장하지 않는다.

## 실제 실행과 제한

- 같은 v15에서 각 목표 complete1/표시1, 이후 자동 생활의 start/complete 확인. 원본3개와 `celebration-comparison.json`.
- `poised-interest-v15.json`: 실제 cushion rest cancel→goal complete→새 resume token의 같은 cushion rest complete. 별도65초 원본이며 동일조건 첫 비교와 구분한다.
- 같은 개체·같은 목표 재선택 ALREADY_ACKNOWLEDGED_EVENT. 기존 `reboot-04:playful`을 cold restart해 동일 petId/context history, EXP·코인·먹이 유지와 재선택 억제를 확인했다. 새 개체를 같은 개체 재실행 증거로 바꾸지 않았다.
- 목표 시작 뒤 Home 전환에서704ms 후 cancel, 복귀 뒤 옛 목표 재생 없음. 첫 메뉴 취소 시도들은 이미 축하가 끝났거나 Modal 전환 중 입력이 닿지 않아 도중 취소 PASS로 세지 않았다. 원본/trace를 보존한다. 메뉴 닫기→생활, 일반 잠자기→깨우기→바닥 이동→body 접촉→복원은 실제 확인했다.
- 정상 목표 말풍선의 실제 접근 요소를 표시 중 찾아 탭: 닫힘, 바닥 이동 링/목적지 전환 없음, 축하 몸짓은 계속. 앞선 느린 탭들은 자연 소멸 뒤 바닥을 누른 시도였으므로 성공 증거에서 제외했다. 최종 `normal-tap-confirm-v15.mp4`로 구분한다.
- 한 줄/긴 한국어·좌측 가장자리·검토용1.6배 글자 표시에서 내용 크기와 얼굴 여백 확인. 긴 경우280×123pt, 축하 도도154×43pt. X 없음. 동작 줄이기에서도 목표 완료/말 표시/생활 복귀, 이후 줄이기 OFF·글자1배 복원. 레이아웃 QA 문장은 기능 검사이며 제품의 자발적 대사로 집계하지 않는다.
- 기존 이모지 대체 글리프는 이번 긴 문장 QA에서도 재현되어 OPEN. OS 전체 큰 글자·VoiceOver 실제 읽기·물리 긴 누르기·작은 다른 기기·실기기/GPU/물리 지연은 NOT_RUN. 동면의 새 강제 시나리오는 하지 않았고 일반 저장의 기존 동면/안내를 보존했다. 실제 건강 OFF.
- **fresh496/496, fail0/skip0**, lint/typecheck PASS, iOS xcodebuild Release exit0, Android JS export PASS, CNG27 STATIC PASS, workflow42 + 직접 self-test1 PASS. shell 기본 Python3.9에서 tomllib 미지원으로 실패한 self-test 호출은 보존하고 기존 bundled Python으로 다시 실행했다. 검사를 삭제/완화하지 않았다. Android native/실기기 빌드는 이번에 실행하지 않았다.

## 성능 — 별도 OPEN

같은 Release·도도 합성 초기 상태/seed·방/쿠션·카메라·DPR2.5/AA0, 30초 warmup/60초 무입력, 녹화 OFF로 현재→후보 순서의 새 창을 측정했다. 입력0이므로 입력→RAF/제출 지연은 INSUFFICIENT_DATA다. 과거 v11 수치를 현재 증거로 합치지 않았다.

| proxy (ms, p95) | 현재 | ×1.12 후보 |
|---|---:|---:|
| RAF 간격 | 25.67 | 25.71 |
| GL queue 대기 | 22.63 | 21.70 |
| 판단 | 0.033 | 0.038 |
| pose | 0.450 | 0.445 |
| CPU morph | 0.803 | 0.768 |
| draw | 1.056 | 1.066 |
| 제출 빈도 Hz | 51.35 | 49.52 |
| 최대 RAF 간격 | 37.06 | 55.52 |

둘 다 이번 창의33.34ms p95/30Hz proxy 기준 이내, >500ms gap0. 호스트 load1/5/15는3.33/3.86/4.69→4.02/3.84/4.52, memory/swap 누적 카운터는 원본에 보존했다. 같은 정상 선택기지만 시간에 따른 실제 motion/호스트 비용은 완전히 같다고 하지 않는다. 앞선 후보의 일반 생활60초(21.78ms/52.54Hz)는 별도 탐색 창이다. 단일 순서의 scoped regression 표본이며 역순 반복/장기·실제GPU 안정성을 보증하지 않는다. **PERF-01 OPEN** 유지, 해상도·표정·행동·기준을 줄이지 않았다.

## 저장·권한·전달

기존65개 모두 존재, SQLite integrity3개 모두ok. 새 비교용9개를 추가해 총74개(일반1/생활29/리부트44). 모든 기존 이름·형태·성격·EXP·재화·시설 유지, 5경제원장 동일(일반 meal3, 생활 meal1155 등). 일반 저장과 두 검토 개체의 revision/정상 시간 정산 값은 전경 처리로 변했으며 모든 byte가 같다고 하지 않는다. 표현 기억은 기존 bounded history 정책대로 갱신된다.

기존 오류8개 목록은 primary/backup 모두 동일. primary는 byte동일, backup은 cold 세션·trace·archive/generation 메타데이터가 바뀌었다. 두 원본 전체를 착수 시 보존했다. 새 fault injection/원본DB 삭제 없음. **STORAGE-01 정확한 최초 VFS 원인 OPEN**을 유지한다.

SOL_DIRECT / SELF_REVIEW / 새 subagent0, 요청 모델 GPT-6.1 Sol Max, effective model은 ROUTING_UNVERIFIED. 실제 도구는 CUA·simctl·xcodebuild·기존 Node/Python 검사·AVFoundation 미디어 처리다. 개인 비공개 경로에는 MP4+안내문만 복사하며 기존 파일/원본은 덮어쓰거나 지우지 않는다. main/merge/force/tag/배포/실건강/실결제/OS 보안 변경 없음.

---

## Historical — REBOOT-05와 v11 이력

# 현재 후속 — REBOOT-05

현재 결과는 [REBOOT-05-REPORT.md](REBOOT-05-REPORT.md)의v13이다. 아래REBOOT-04기술증거·실패·사용자평가·v11이력은보존한다.

---

# REBOOT-04 생활 맥락·말풍선 v11 — 2026-10-13

장난은 합성 목표 달성에 짧게 통통 뛰고 앞발로 축하한다. 다정은 눈맞춤·기대기로 함께 기뻐하고, 도도는 짧은 앞발 인사와 절제된 말을 쓴다. 합성 수면 자기보고와 개인 기준보다 짧은 **기록**을 구분해 배려하며, 기록 없음/지연/권한 불명확을 활동 부족이나 피로로 바꾸지 않는다. 실제 건강정보 연결은 OFF다. 기존 두 발·한 뿔·3종·기억·성장/경제·일반 저장을 다시 만들지 않았다.

이번 기능은 **SCOPED_IMPLEMENTATION_AND_NATIVE_REVIEW_PREPARED**다. 검증 범위는 **PARTIAL_WITH_BLOCKERS**이며 이모지·실제 긴 누르기/VoiceOver 읽기·실기기 미확인을 통과로 표시하지 않는다. 전체 상태의 PERF-01 미달/기존 사용자 표현 재평가는 여전히 REWORK_REQUIRED / USER_REVIEW_PENDING이다. STORAGE-01 CANTOPEN의 정확한 VFS 원인은 OPEN이다.

## 바로 볼 전달 영상

개인 iCloud Drive → **Arucon → Reviews → `2026-10-13_arucon_REBOOT04_context_v11_317ca1e_review.mp4`**. 2:32 / 26.36MiB / native1170×2532 / H.264 8bit420 / fast-start / 무음. 대사 ON, 합성 데이터만 사용. 9,816프레임 전체 디코딩 통과. 정상 속도·원본 해상도 passthrough 발췌 합본이며 컷/원본 시각은 같은 이름의 `_scenes.txt`에 있다. 무편집 연속 통과 영상으로 주장하지 않는다.

**VIDEO_READY / DELIVERY_SENT / MOBILE_NOT_VERIFIED**. 원본/복사본 용량·SHA256 일치, 공식 macOS URL 리소스에서 두 파일 공유 안 됨/업로드 완료/오류 없음. SHA256 `f9d6165837f755e52f9990aaf53d8b8d0d0f26f616852ff3e6be2faf7c1d9174`. 휴대폰 다운로드·재생은 사용자 확인 전이다. 영상·DB·로그는 Git에 넣지 않았고 iCloud에는 이 MP4와 짧은 안내문만 복사했다. 기존 v10 영상도 보존한다.

## 코드·범위·실제 수정

[전체 지시](tasks/REBOOT-04-life-context-dialogue-and-bubbles.md)를 ZIP에서 읽고 원문 저장했다. 시작57368d7, 이전 앱ef32ac3/v10이었으며 해당 요구는 아직 구현되지 않았다. 동시 작성자는 발견하지 않았다. 소스 **317ca1e**, 설치 **reboot-04-context-v11 Release arm64 Simulator ad hoc**, Expo55/RN0.83.10/SQLite55.0.20. 230입력 source fingerprint `7bcdb53f7fede532d947c132b664a03d667709de61584373bc3dabbd83db41ff`, JS `1d5e1871b706202815398620c30a921f94ecdc20fb3d028403b6911bd4959bde`, native `10c905b1d87a395e0ec179d50f3ec0a3bb276c0331bc62e985d4dc64d1075810`. 실패한 글꼴 실험은 제거하고 동일 소스/JS/native 해시로 복원했다. 아래 최종 영상3개와 설치본이 동일하다. 과거/중간 빌드 영상은 최종 통과로 재사용하지 않았다.

- presentation-only `LifeContext`: 합성 사건/기간/조회 시각/품질/개인 비교 기준/자기보고/쉬기. 시간창·유효성·실제 근거 ID를 검사한다. 체중·질병·진짜 권한 추론·실제 reader·외부 LLM은 추가하지 않았다.
- 기존 director에 의도→시선/접근→성격별 BabyPlan→발화→복원을 연결한다. UI에서 합성 **관찰 입력**을 선택하지만 강제 아트 클립을 재생하지 않는다. EXP/수면 정산 시계는 사용하지 않는다.
- 건강 주제 간격10분/부정적 초대 하루 최대1회는 가역 검토 튜닝이다. 개인 목표6000 등은 합성 fixture 수치이며 건강 권장량이 아니다. 명시적 쉬기/잠을 설쳤다는 자기보고는 조용한 배려를 허용한다. 말 줄이기에서 숨긴 유효 수면 고려도 이후 초대를 막되 ‘쉬기를 선택했다’고 꾸미지 않는다.
- 기존 SQLite 대기열/트랜잭션 안에서 표현 사건을 먼저 claim한다. 같은 사건의 새 revision/재실행을 중복 발화로 바꾸지 않으며 취소를 완료 경험/보상으로 저장하지 않는다. raw 관찰을 durable DB에 저장하지 않고 제한된 합성 ID/선호만 남긴다. optional memory 필드이며 DB schema/경제 원장을 변경하지 않았다.
- 폭은 실제 native `onTextLayout`로 측정한다. 테두리2px 누락으로 짧은 대사의 마지막 음절이 밀리는 문제를 실제 v11에서 찾고 수정했다. 여러 줄은 최초 native 줄바꿈 폭을 유지한다. X 없이 탭/접근성 dismiss, 길이별 읽기 시간, 부드러운 소멸, 읽기 hold/오래된 timer 취소를 넣었다. 긴 글자는 잘라내거나 축소하지 않는다. GLView/controller는 말풍선 변경으로 재생성하지 않는다. 실제 저장 오류는 자동으로 숨기지 않는다.
- 긴 검토 메뉴는 활동/수면/기록 그룹으로 정리했다. 앱 관찰 시각과 게임 시간은 분리한다. 일반 펫 이름·자원·위젯을 검토 프로필로 덮어쓰지 않는다.

## 실제 native 확인과 한계

Mac 잠금 해제/Simulator 화면·입력 접근을 직접 확인했다. macOS15.6/Xcode26.3/iPhone16e iOS26.3.1, 390×844pt/1170×2532native, software renderer/DPR2.5/AA0/+35. 기존 개체의 경험·쿠션 위치를 보존한 기능 비교이며 새 통제된 성격 실험은 아니다.

| 항목 | 이번 실제 근거 |
|---|---|
| 3종 합성 초대·축하·배려 | W 합성 달리기 종료도 `run-rest.mp4` 73초 실제 말/표정·앞발/복원으로 보완 확인. 파일명과 달리 이 보완 영상의 새 쉬기 시험은 실행하지 않았다. 긴 관찰로 해당 trace가256한도 밖이어서 영상+저장된claim으로 대조했다. 정상 메뉴 입력→director→실제 대사/귀/눈/몸/복원. `playful-final`, `warm-final`, `poised-final.mp4`와 시점 trace/native 프레임. P/W 자기보고, D 짧은 기록/쉬기. |
| 없는/늦은/불명확한 기록 | D missing/delayed, W permission은 UNKNOWN_NOT_DEFICIT. 일반 생활 말은 계속될 수 있지만 건강 상태로 바꾸지 않음. failed/오전/여러 경계는 자동 검사. |
| 반복·취소·복귀 | 같은 사건 다시 선택 및 W 콜드 복귀 후 ALREADY_ACKNOWLEDGED_EVENT. 메뉴 닫기·직접 접촉·바닥 이동, 정상 잠자기→깨우기→접촉/이동. 일반 수면/동면 규칙은 기존 회귀 유지, 강제 상태 변경 없음. |
| 말풍선 | 짧은 ‘히히!’ 한 줄, 한국어 개행·긴 문장, 1.6배 검토 글자, 가장자리 위/아래 앵커를 실제 화면에서 확인. 이는 OS 전체 큰 글자 설정 시험이 아니다. |
| 읽기 접근성 | 중첩 hold/timeout/stale callback은 자동 검사. 시각 X 없음/탭 닫기는 실제 확인. 긴 누르기 유지·VoiceOver 실제 읽기는 현재 입력 도구로 NOT_RUN. |
| 이모지 | 실제 발바닥 이모지가 대체 글리프. runtime font 존재 및 glyph1051 확인; 명시적 AppleColorEmoji 선택도 효과 없어 제거. 원인 확정/실기기 표시 PASS 아님. [동일 조합 이슈](https://github.com/react/react-native/issues/56183)는 참고 보고이며 우리 환경의 인과 증거를 대신하지 않음. Safari의 개인정보 관련 ‘계속’ 선택은 자동 승인 검토가 거부해 대조 미완료. 보안·runtime·SDK 패치 없음. |

## 성능·저장·검사

새 기능녹화 ON 60초(같은 Release/DPR2.5/AA0/+35), 장난 RAF p95 **35.83ms FAIL**, GL대기31.78/morph1.05/draw1.35/판단.047ms. 다정 RAF p95 **29.58ms PASS**, GL대기26.13/morph1.00/draw1.24/판단.043ms, 실제6입력→제출proxy p95 **47.59ms**. 장난 입력2개는 표본부족. 두 창 모두500ms초과 RAF gap0. 메뉴/입력 순서·쿠션 좌표·호스트 부하가 통제된 ON/OFF 인과 비교가 아니며 도도의 새60초는 NOT_RUN. 좋은 구간만으로 PERF-01을 닫지 않았다. 실제 표시 FPS/GPU/물리 지연/실기기·이번 Android native UI는 NOT_RUN.

이번 최종소스 **482/482 fail0/skip0**, lint/typecheck PASS, iOS Release xcodebuild exit0, Android JS bundle PASS, CNG27STATIC PASS, workflow42/42와 validator 직접 검사1 PASS. unittest 발견으로는0개여서 통과로 세지 않았고 실제 함수를 실행했다. 초기 새 저장 테스트의 초기화 누락은 앱과 같은 load 순서로 고쳤으며 기대값·정책을 낮추지 않았다.

기존 **65 snapshots(1/29/35)** identity/name/form/personality/coin/food/EXP/activity/facilities·5원장 그대로,3DB integrity ok·원본50·오류진단8 보존. 정상 검토 경험이 추가돼 기존64개 한도에 따라 P10/W46/D31개의 오래된 사건이 정리됐고 시작 전 DB 사본에 보존했다. 남아 있는 기존 사건은 내용 동일, 현재 성격/모자/쿠션 사실은 유지됐다. 모든 메모리 byte동일 주장은 하지 않는다. 소스·검증·원본 증거/manifest/DB 사본은 로컬 `evidence/reboot-04-life-context-v11/`에 있다. CANTOPEN VFS 인과는 OPEN.

SOL_DIRECT / SELF_REVIEW / subagent0. 요청 GPT-6.1 Sol Max, effective model **ROUTING_UNVERIFIED**. 최종 재미·감정 전달·아트는 USER_REVIEW_PENDING. 이번 범위의 반응/말풍선 검토와 별도로 PERF-01, 환경별 이모지/접근성/실기기 검증을 남긴다.

---

## Historical — v10 감정·방 후속

# REBOOT-04 후속 — 눈·귀·감정·대사 / v10

> **원격 영상 전달 완료:** [전달 규칙](docs/remote-video-delivery.md)에 따라 사용자가 확인한 개인 iCloud Drive의 `Arucon/Reviews`로 `2026-10-12_arucon_REBOOT04_emotion_v10_ef32ac3_review.mp4`와 짧은 장면 안내문을 복사했다. **VIDEO_READY / DELIVERY_SENT / MOBILE_NOT_VERIFIED**. 124초/18.87MiB/native1170×2532/H.2648bit420/fast-start이며 원본·복사본의 크기와 SHA-256이 일치한다. macOS에서 두 파일의 공유 안 됨·업로드 완료·업로드 중 아님·오류 없음이 확인됐다. iPhone 다운로드·재생 자체는 아직 미확인이다. 앞선 직접 첨부 차단은 승인된 개인 전달 경로로 해소했으며, 원본을 이동·삭제하거나 DB/소스/로그를 보내지 않았다. 컷과 원본 시각은 함께 전달한 안내문에 있다.

사용자의 v9 평가는 **REWORK_REQUIRED — 눈 균형·감정 전달·세 성격·대사·방 디자인**이다. 이전 두 발 기술 PASS가 이 평가를 대신하지 않는다. 첨부 ZIP의 MD 1개를 전체 읽고 [후속 지시](tasks/REBOOT-04-emotion-room-followup.md)에 원문 그대로 저장했다. 이번 v10은 그 평가에 대한 **수정·실제 비교 준비 / SELF_REVIEW**이며 최종 표현·아트·재미 승인은 USER_REVIEW_PENDING이다. 전체 상태는 PERF-01 미달 때문에 REWORK_REQUIRED를 유지한다.

장난은 손을 앞발로 건드린 뒤 옆으로 빼며 확인한다. 다정은 볼/옆구리와 체중을 맡기고 귀의 긴장이 풀린다. 도도는 몸을 세운 채 옆으로 짧게 접촉하고 실제 이전 관심으로 돌아간다. 기본 호기심은 두 눈이 균형 있게 열리고, 윙크는 앞발 장난의 짧은 순간에만 나온다. 표현 개수나 정확한 성격 이름 맞추기를 완료 기준으로 삼지 않았다.

## 먼저 볼 실제 결과

- 같은 초기 상태·합성 경험·외형·가구·카메라·빛·+35·DPR2.5/AA0의 대사/이름 숨김: [장난 28초](evidence/reboot-04-emotion-2026-10-11/playful-hand-short-v10.mp4), [다정 37초](evidence/reboot-04-emotion-2026-10-11/warm-hand-short-v10.mp4), [도도 44초](evidence/reboot-04-emotion-2026-10-11/poised-hand-short-v10.mp4).
- 도도의 [수정 전 v9](evidence/reboot-04-emotion-2026-10-11/before-hand-v9.mp4)와 위 v10을 비교한다. [수정 전 한쪽 눈 유지 프레임](evidence/reboot-04-emotion-2026-10-11/before-frames/076.300.png)은 같은 카메라의 실제 자율 peek/playful 구간이다. 원근·머리 회전과 별도로 아래 코드/변형 원인을 확인했다.
- [대사 ON·쿠션 이동 35초](evidence/reboot-04-emotion-2026-10-11/speech-and-cushion-short-v10.mp4): 정상 꾸미기 입력으로 이동 → 현재 위치 접근/사용 → 짧은 발화. [6분 원본](evidence/reboot-04-emotion-2026-10-11/speech-objects-v10.mp4), [다정 대사 ON 원본](evidence/reboot-04-emotion-2026-10-11/warm-speech-v10.mp4), [도도 대사 ON 원본](evidence/reboot-04-emotion-2026-10-11/poised-speech-v10.mp4).
- [현재 방 native 캡처](evidence/reboot-04-emotion-2026-10-11/playful-frames/001.000.png), [현재 펫을 넣은 방 시안](evidence/reboot-04-emotion-2026-10-11/room-concept/sunlit-nest-concept.png), [편집 가능한 방 시안](evidence/reboot-04-emotion-2026-10-11/room-concept/sunlit-nest-concept.blend). 같은1170×2532 비율/카메라/펫 좌표·배율의 **Blender 오프라인 컨셉**이다. Cycles CPU24/denoise/AgX 조명·재질 제안이며 앱 렌더 품질/성능 증거가 아니다. 기본 방은 교체하지 않았다. PNG/.blend/영상/DB는 로컬에만 있고, Git에는 [재현 제작 소스](art/reboot-04/room_concept.py)만 포함한다.
- 로컬 파일 [검토 플레이어](evidence/reboot-04-emotion-2026-10-11/review.html)는 원본 native 영상을 1배속으로 재생하는 뷰어다. 새로운 브라우저 게임 구현/검증이 아니다.

원본 영상·프레임 PTS·각 발췌 mp4.json을 보존했다. 발췌는 한 연속 구간이며 중간 실패 삭제/배속/확대/색 보정 없이 passthrough다. 실제 펫 입력·메뉴와 정상 director를 사용했고 강제 scene 재생이 아니다. QuickTime 열기는 시간 초과됐으나 Mac/Simulator 접근을 다시 확인했고 로컬 플레이어에서 native1170×2532, playbackRate1, 각 구간 끝까지 재생되는 것을 확인했다. 정상 입력·재생 전중후·원본 프레임 시퀀스를 함께 SELF_REVIEW했다. 영상 encoding FPS는 앱/GPU FPS가 아니다.

## 원인과 수정

1. 보존된 C/two-paw 자산의 Curious eye/lid key가 왼쪽 높이1.18, 오른쪽.90으로 제작돼 있었다. 이를 기본 호기심에 .9로 적용하고, 손 연기 밖의 playful에는 왼쪽 Blink .92를 상태 전체에 적용했다. v9 실제 자율 playful 구간의 지속 비대칭과 코드/원본 shape를 대조했다. 기본 neutral geometry의 양쪽 높이/폭과 blink/표정 혼합은 별도 회귀로 확인했다.
2. 기본 관심은 기존 대칭 Surprised key의 약한 값(.34)+눈썹/입으로 표현한다. Curious 원본 자산은 보존한다. 앞발 장난의 .18~.42초 구간에서만 윙크 envelope를 쓰며 기존 손 연기의 .23초 윙크는 유지한다. 중립·취소·해제·수면 복귀는 양쪽 눈으로 돌아온다. 모든 표정을 대칭화하거나 눈을 새로 교체하지 않았다.
3. 귀의 항상 같은 sin(time*3) 흔들림을 제거했다. 실제 look/approach/curious/excited/surprised/content/embarrassed/sleepy의 준비·이완과 손의 옆 확인에 연결하고 실제 Blender ear rest bone에 보간 적용한다. 몸에 붙은 skin/부모 공간과 reduced22%를 검사했다. 렌더 프레임마다 DB·카탈로그·React 쓰기를 추가하지 않았다.
4. 손의 렌더 sample과 별개였던 legacy babyBeat/표정 trace를 실제 handActing 박자에 맞췄다. 그 박자의 앞발·볼 기대기에 짧은 말을 연결한다. 장난의 발/옆 확인, 다정의 체중, 도도의 세운 방향을 다듬고 기존 style/문맥/최근 이력·familiar hand 선택을 보존했다.
5. 숨김 비교는 발화 사용 이력을 소비하지 않는다. 정상 모드에서 선택/숨김/최근 발화 억제/비언어 이유를 trace로 남긴다. 같은 문장 의미를 alias가 바뀌어도 최근3개에서 제외한다. 자동 몸짓을 실제 손 접촉처럼 말하지 않으며 기술 시연 문구 일부를 자연스러운 짧은 말로 정리했다. 발화 할당량·LLM·대사 큐를 추가하지 않았다.
6. 화면에서 직접 옮긴 쿠션은 witnessed로 현재 위치부터 본다. 기억된 옛 좌표는 증거에 남기되 현재 사실로 경로를 잡지 않는다. 보지 못한 remembered 경로는 옛 위치 glance 후 현재 위치로 접근하는 기존 분기를 유지한다. 실제 witnessed 입력을 확인했고 unseen 시간 조건은 격리 단위 검사다.

## 실제 검증과 판독 한계

| 범위 | 같은 v10 실제 결과 |
|---|---|
| 장난 / 대사 숨김 | 손 유지18.91s, 직접 탭 연기2.41s, 메뉴 취소10.77s. 짧은 앞발·옆 확인 후 편한 두 눈. 정상 대사 ON 별도 개체에서 짧은 유지3.59s도 확인. |
| 다정 / 대사 숨김 | 유지28.36s, 짧은 유지7.42s, 탭 연기2.54s, 취소11.18s. 볼/옆구리와 귀 이완, 해제 뒤 부드러운 복원. |
| 도도 / 대사 숨김 | 유지34.16s, 짧은 유지3.69s, 탭 연기2.64s, 취소14.35s. 세운 몸/옆 시선과 이전 관심 복귀. 취소가180초 원본 끝 밖이어서 [정상 도도 보완 영상](evidence/reboot-04-emotion-2026-10-11/poised-cancel-v10.mp4)에서 실제 취소13.67s를 추가 확인. |
| 대사 ON | 일반 성격 검토 모드의 quiet=false를 확인했다. 장난은 앞발 장난 말, 다정은 기대기 말, 도도는 짧은 접촉 말을 실제 표시했다. 원본과 trace에서 선택 시각을 찾을 수 있다. 긴 다정 ON 유지의 끝은 메뉴 취소이며 완료 기억으로 세지 않았다. |
| 쿠션 | 기존 검토 쿠션의 정상 이동·새 좌표 접근/사용·완료1회. 첫 좌표 입력은 적용되지 않았고 다음 정상 바닥 입력으로 적용됨을 확인했다. 무효 시도를 성공으로 세지 않았다. |
| 취소·기억 | matched3개의 완료 token은 기억1개, 취소 token은0개. 일반 개체와 합성 비교의 기억 소유자를 분리했다. 새 합성4개의 경제는0, 일반 원장도 동일. |
| 복귀 | 기존 장난/다정 검토 개체의 정상 동면 복귀, 장난의 잠자기→깨우기→접촉, 동작 줄이기 ON/OFF, 메뉴 닫기, 같은 설치본 콜드 재실행 후 같은 개체·현 쿠션 좌표/revision/이번 이동 완료 기억을 확인. |

단순 정지 얼굴만으로 세 기질을 확정할 수 있다고 보지 않는다. SELF_REVIEW에서 차이는 손을 다루는 발/체중/방향/복귀에 더 잘 읽혔다. 귀는 작은 보조 단서이며, 귀만 가려/보여 감정을 정확히 맞추는 사용자 시험은 하지 않았다. 기본 호기심의 오류와 길게 고정된 윙크는 수정했지만 최종 감정 판독·대사 매력·방 디자인 만족은 사용자 재평가를 기다린다. 실제 짧은/긴 유지 시간은 도구·접근 지연에 따라 다르며 동일 밀리초 자극이라고 주장하지 않는다.

추가 영향 확인: [모자·귀 v10 원본](evidence/reboot-04-emotion-2026-10-11/hat-ears-v10.mp4). 같은 도도 개체에서 기존 모자를 쓰고 정상 손 교감·귀 반응·해제를 확인했고 모자 미착용으로 복원했다. 관찰 구간에서 귀 분리나 한 뿔을 가리는 새 관통은 보이지 않았다. 모자 자체의 최종 디자인 만족을 승인한 것은 아니다.

## 성능·실행 환경

macOS15.6/Xcode26.3/iPhone16e iOS26.3.1 Simulator/390×844pt/native1170×2532/Apple Software Renderer. 모든 비교는 원래 양면·tail·DPR2.5/AA0/GL975×2110/일반 모션·두 발/+35이며 최종 렌더 채택이 아니다.

이번 기능 녹화 중 완료된60초 RAF p95: v9 도도28.05ms, v10 장난60.80ms(FAIL), 다정37.29ms(FAIL), 도도29.41ms. 같은 도도의 phase p95는 판단 .043→.050ms, pose .462→.517ms, CPU morph .892→.938ms, GL 대기21.66→25.45ms. 호스트/기능 입력 시점이 같지 않은 단일 ON 관찰이며 표준 OFF 순서반전 벤치나 인과 개선율이 아니다. 입력→제출 표본0은 INSUFFICIENT_DATA다. 전체 구간/실패를 [성능 관찰 JSON](evidence/reboot-04-emotion-2026-10-11/performance-observation.json)에 보존했다. **PERF-01 OPEN**, 품질/해상도/행동/판정 기준을 낮추지 않았다. 실제 GPU·화면 표시 FPS·물리 터치·실기기·발열/배터리는 NOT_RUN이다.

소스 **ef32ac3**, 설치 **reboot-04-emotion-v10 Release arm64 Simulator ad hoc**. 시작 clean0eb1156/v9의227 입력/JS/native 해시를 직접 대조했다. 수정 후 같은DB 설치와227입력 일치를 확인했다. v10 JS `13468021d564af51f4a6fadd9284aa4772780428736daa77e1a7d3664a5c9bb7`, native `aa2bbafad29819da70a6271959fb742d70ea5bb87778a4c5b3904883d311ffd2`, source fingerprint `eb87ef1fd1983a566c4adcbc947ad202e2e40abef27718184887617a134992e4`. 실제 컨테이너 이동 후 새 경로를 조회했으며 재설치/초기화로 저장을 만들지 않았다.

최종 운영 정적42/42·validator 직접 회귀1/1 PASS. 이번 실제 자동검사 **473/473 fail0/skip0**, 새 눈/귀/발화/관찰 원인 검사 포함 영향17/17, lint/typecheck PASS, iOS Release xcodebuild exit0, Android JS bundle PASS, CNG 27 STATIC PASS. 기존 검사1개가 지속 playful wink .92를 요구해 처음 실패했다. 새 사용자 요구에 맞춰 ‘상태만으로 윙크 금지/짧은 장면 허용/복원’을 더 구체적으로 검사했으며 수면·저장·성능 기대값을 완화하지 않았다. 이번 Android native/UI는 NOT_RUN이다.

## 보존·운영·다음 경계

기존61개 snapshot의 이름/형태/성격/coin/food/EXP/시설/활동, 최종 sleeping/hibernating과5경제 원장이 동일. 총65개이며 새 합성4개만 추가했다. 원본50파일 hash/진단8건/3DB integrity ok. 정상 검토에서 기존 장난/다정/도도에 완료 경험이 추가됐고, 장난31건·도도16건의 오래된 기억은 기존64개 보관 규칙으로 정리됐다. 이를 ‘모든 기억이 byte동일’이라고 하지 않는다. 남은 원래 사건은 정확히 동일하고 전체 착수 전 DB 백업을 보존했다. 이번 쿠션 이동 사실은 콜드 복귀 후 그대로 있다. 원본 자산·DB·영상의 수동 삭제/reset/초기화 없음. **CANTOPEN 정확한 VFS 원인은 OPEN**이다.

실제 사용: CUA native 정상 입력, simctl 영상/Release, AVFoundation 원본 프레임/무변환 발췌, 로컬 Blender5.2.0 bpy 오프라인 방 렌더, 로컬 영상 플레이어. Blender MCP/Figma/새 AI/외부 전송·새 설치는 하지 않았다. SOL_DIRECT/SELF_REVIEW/subagent0, 요청 GPT-6.1 Sol Max / effective ROUTING_UNVERIFIED.

다음은 이 비교의 사용자 감정·성격·대사 평가와 방 시안 한 개의 검토다. 방 기본 교체/귀 형태 재디자인/성장형/진화형/16유형/상점/AI B/경제로 확대하지 않는다. 기본 모델·크기·최종 아트·재미 USER_REVIEW_PENDING. source+검사+문서만 feature checkpoint/일반push하며 실제 원격 해시/clean은 최종 git-final-audit.json과 응답으로 확인한다. main/merge/force/tag/release/deploy/실건강/실결제/보안 변경/미디어 외부전송 없음.


---

## Historical — 아기 두 발 v9

# REBOOT-04 — 아기 두 발 추가 결정 반영 / v9

낮고 둥근 모찌 몸과 작은 두 발의 공통 아기 후보를 장난·다정·도도에 적용했다. 실제 방에서 두 발의 교대 이동·정지, 정상 생활 중 도약·착지와 세 성격의 손 기대기·접촉·복원을 확인했다. 기존 윙크·문맥·최근 이력·메뉴 취소 개선을 유지했다.

**두 발 아기 검토판: PREPARED / PASS_SIMULATOR_SCOPED / SELF_REVIEW.** 발 수 방향은 사용자 승인 범위이며 최종 아트·재미는 USER_REVIEW_PENDING이다. 성장기·진화형의 네발은 디자인 방향으로만 남고 이번에 제작하거나 전환 시점을 정하지 않았다. PERF-01과 CANTOPEN 원인은 별도 OPEN이다.

## 바로 보기

현재 v9에서 기존 성격 검토판→우리 아이→합성 동일조건 비교→3종 선택→시작을 사용한다. 본래3종 저장도 같은 두 발 아기를 표시하며 일반/다른 검토 저장의 성격·재화를 바꾸지 않는다. +35/DPR2.5-AA0/같은 방·카메라·조명·원래양면/tail/일반 모션·이름/말풍선 숨김을 유지했다. 새3개 합성 비교는 같은 상태/4개 경험/RNG/가구로 시작했다.

| 실제 장면 | 정상 속도 증거 |
|---|---|
| 정면·측면·후면의 실제 바닥 이동/정지 | [75초 발췌](evidence/reboot-04-two-paws-2026-10-11/two-paw-movement-short.mp4) / [300초 원본](evidence/reboot-04-two-paws-2026-10-11/two-paw-playful-v9.mp4) |
| 장난 손 교감/두 발 지지/복원 | [26초](evidence/reboot-04-two-paws-2026-10-11/two-paw-playful-hand-short.mp4) / [110초 보완 원본](evidence/reboot-04-two-paws-2026-10-11/two-hand-playful-v9.mp4) |
| 다정 기대기/복원 | [27초](evidence/reboot-04-two-paws-2026-10-11/two-paw-warm-hand-short.mp4) / [180초 원본](evidence/reboot-04-two-paws-2026-10-11/two-hand-warm-v9.mp4) |
| 도도 세운 접촉/원래 관심 복귀 | [26초](evidence/reboot-04-two-paws-2026-10-11/two-paw-poised-hand-short.mp4) / [180초 원본](evidence/reboot-04-two-paws-2026-10-11/two-hand-poised-v9.mp4) |

첫 장난300초의 손 교감은 촬영 끝에 걸려 전체 복원이 담기지 않아 같은 빌드·같은 개체의110초 영상으로 보완했다. 이를 원본 안의 완전한 손 검증으로 기록하지 않는다. 짧은 영상은 한 연속 구간 발췌이며 배속/색 보정/축소/실패 이어붙이기 없음. 각 mp4.json/프레임 metadata가 실제 source/PTS를 남긴다. 실제 조작 시간·직전 생활은 유형마다 다르며 고정 장면 재생을 정상 선택으로 대체하지 않았다.

정상 자율생활의 tiny_hops를 실제로 포착했다. [도약140.36s](evidence/reboot-04-two-paws-2026-10-11/movement-hop-frames/140.360.png)와 [착지140.83s](evidence/reboot-04-two-paws-2026-10-11/movement-hop-frames/140.830.png)는 native1170×2532 원본이며 두 발과 그림자/압축이 함께 변한다. 정지 PNG만으로 모션/FPS를 승인하지 않는다. 실제 바닥4방향 클릭과 자연스러운 생활/도약은300초 원본에 있다.

## 메시·리그·움직임을 함께 수정

- 실제 프로젝트 로컬 Blender5.2.0 LTS/Python 호출로 별도 [편집 .blend](art/reboot-04/baby_two_paws.blend), [제작 소스](art/reboot-04/build_baby_two_paws.py), [게임 GLB](mobile/assets/reboot-04/baby-two-paws.glb)를 만들었다. 기존 C/A-v8 표면을 그대로 참고했고 A-v8 몸·두 발 좌표의99.5% 이상을 실제 geometry 검사로 대조했다. 사람이 직립하는 몸/긴 다리/새 몸통을 추가하지 않았다.
- 아기 GLB는 실제8bone/2paw다. 뒷발 geometry/bone/weight/track가 없으며 숨김 처리로 끝내지 않았다. 기존 네발 .blend/GLB와 A/B/C는 byte일치한다. face/horn/귀와 성격 구조를 새로 만들지 않았다.
- 두 발의 반대 위상·세계 좌표 접지·지지 쪽으로 체중 이동·정지 때 부드러운 중심 복귀를 연결했다. 두 발 동시 도약/착지와 압축·그림자를 확인했다. 기존 네발 runtime/reference는 그대로 사용할 수 있다.
- 한 발로 장난할 때 두 발 아기에만 지지 쪽 체중 이동을 적용한다. 다정/도도의 본래 손 연기와 실제 release sample의 smooth 복원을 유지한다. 없는 뒷발을 지지점으로 만들지 않고 실제두발만 사용한다.
- runtime은 REBOOT-04 아기 후보/대표3종에 적용한다. 기존 성장기/진화형 자산·성장 조건·Lv전환·경제·저장 schema·SQLite 대기열·시간/수면/동면 정책·일반 위젯/건강OFF는 변경하지 않았다. 성격을 과거 코드로 reset하지 않았다.

## 실제 검증과 보존

최신 v9 3종의 정상 손 제안/유지→해제→생활 복귀, 직접 몸 탭, 메뉴 중간 취소를 확인했다. 같은 실제 token의 완료 기억1개, 취소0개, 새개체coin/food/EXP/meal0. two-paw-runtime-summary.json과 각 native trace를 제공한다. 두발 지지/체중/연결에 심한 찢어짐·귀/뿔 분리·뒷발 출현은 SELF_REVIEW에서 보이지 않았다. 고속 실기기 접지/GPU 계측은 NOT_RUN이며 사용자 최종 품질 판독은 대기한다.

기존56개 snapshot의 이름/형태/성격/재화/EXP/시설/활동/수면·동면/5원장 정확히 동일. 기존 모든 기억도 exact(착수 전에 정상 메뉴로 생활을 멈춤), 원본48파일·진단8건·3DB integrity ok. 새 합성3개만 추가했고 일반 저장에 먹이/가구/보상을 지급하지 않았다. DB 초기화·원본/영상 삭제 없음.

최신 전체468/468 fail0/skip0·두발/기존손/보행/네발 원본 영향18/18, lint/typecheck PASS. v9 iOS Release arm64 xcodebuild exit0/동일DB 설치/실제 화면 입력, Android JS bundle PASS/CNG27 STATIC PASS. 최종 운영 정적42/42·validator 직접 회귀1/1 PASS. 이번 Android native/UI/실기기·GPU·물리 입력·발열/배터리는 NOT_RUN이다.

처음 새 테스트 파일의 cwd 오류는 새 검사를 실행한 성공으로 세지 않았고 올바른 경로에서 재실행했다. -0 endpoint는 코드에서 실제0으로 정규화했으며 기존 기대값/성능 기준을 낮추지 않았다. 기존 static Metro asset require의 lint 지시 위치를 유지했다. 새 시스템 설치·SDK 내부 패치·보안 변경·외부 업로드 없음. Blender MCP/GUI 손조형을 했다고 기록하지 않으며 실제 사용은 로컬 bpy와 실제 native/CUA/AVFoundation이다.

앱 소스 **a269f88** / 설치 **reboot-04-two-paws-v9 Release arm64 Simulator ad hoc**. 227입력 fingerprint `1e3bc5aff7bfa65f741bfb73220a85abe1cf4167af338c6d35c97dc8fc945263`, JS `edb2ffbf9500c5599b79cf66b06b28c9c181ea90a6d2633c45576fe5e33830da`, native `d06ae8a31ab6fbeb0cd8a2ad1ac5bc25bd267379d2f39c99e3e483cc3f6a6ee7`를 실제 설치/현재 소스와 대조했다. 아기 .blend343004bytes / GLB434492bytes / body3858vertices / GLB SHA `9749b490b5be5c56ee184da8c417931110a1ead3a0da17b64496a1f160c5fd30`. macOS15.6/Xcode26.3/iPhone16e iOS26.3.1/390×844pt/native1170×2532/Apple Software Renderer, Metro 없이 같은 embedded Release다.

## 남은 범위와 Git

PERF-01은 OPEN이고 새 표준 녹화OFF 벤치를 하지 않았다. 발 수가 줄어 구조 비용이 달라진 사실을 성능 통과로 해석하지 않는다. 해상도/표정/성격/기준은 유지했다. CANTOPEN VFS 인과도 OPEN, 실제기기/GPU/물리 지연은 NOT_RUN. 성장형/진화형 네발 제작과 전환 시점은 NOT_IMPLEMENTED/NOT_DECIDED_THIS_SCOPE. 아기 최종 아트·재미·성격 표현·크기는 USER_REVIEW_PENDING이다.

발 수의 최신 승인 범위는 AGENTS/SRS/decisions/작업 지시에 반영했고 과거 네발 증거는 아래에 보존한다. 소스·.blend/GLB·검사·문서만 feature 체크포인트/일반push, DB/영상/build/generated native/비밀은 제외한다. 최종 HEAD/tracking/live-origin/clean은 git-final-audit.json과 최종 응답에서 확인한다. SOL_DIRECT/SELF_REVIEW/subagent0/요청GPT-6.1 Sol Max/effective ROUTING_UNVERIFIED. main/merge/force/tag/release/deploy/건강읽기/실결제/보안 변경 없음.

---

## Historical — 네발 기반 손 표현 v8

# REBOOT-04 손 교감 제품 리뷰 반영 — v8

장난은 짧게 앞발을 내밀고 옆으로 몸을 빼 손 쪽을 확인한 뒤 편하게 머무른다. 다정은 볼/옆구리 방향으로 몸을 기울여 무게를 맡기고, 손을 떼면 그 자세에서 부드럽게 몸을 세운다. 도도는 크게 기울이지 않고 몸을 세운 채 방향·시선을 옆으로 두며, 실제로 보던 대상이 있으면 해제 뒤 그쪽으로 돌아간다. 이름과 말풍선을 숨긴 같은 게임 크기의 최신 Release에서 비교했다.

**손 표현 검토판: PREPARED / PASS_SIMULATOR_SCOPED / SELF_REVIEW. 최종 매력·성격 표현 채택: USER_REVIEW_PENDING. PERF-01: 별도 OPEN.** 이번 표현 개선을 전체 게임 재미·성장에 따른 성격 형성·성능 통과로 기록하지 않는다.

## 짧은 전후 비교 — 같은 손 제안→접촉→유지→복원

| 성격 | 기존 v6 | 수정 v8 |
|---|---|---|
| 장난 | [29초 발췌](evidence/reboot-04-hand-2026-10-11/before-playful-v6.mp4) | [30초 발췌](evidence/reboot-04-hand-2026-10-11/after-playful-v8.mp4) |
| 다정 | [29초 발췌](evidence/reboot-04-hand-2026-10-11/before-warm-v6.mp4) | [31초 발췌](evidence/reboot-04-hand-2026-10-11/after-warm-v8.mp4) |
| 도도 | [32초 발췌](evidence/reboot-04-hand-2026-10-11/before-poised-v6.mp4) | [32초 발췌](evidence/reboot-04-hand-2026-10-11/after-poised-v8.mp4) |

원본 v6 matched 영상3개와 최신 v8 [장난160초](evidence/reboot-04-hand-2026-10-11/playful-v8.mp4)/[다정180초](evidence/reboot-04-hand-2026-10-11/warm-v8.mp4)/[도도180초](evidence/reboot-04-hand-2026-10-11/poised-v8.mp4)를 그대로 보존했다. 위 짧은 영상은 각각 하나의 연속 구간 발췌이며 중간 실패를 이어 붙여 숨기거나 배속·축소·색 보정을 하지 않았다. 정확한 source/start/end는 각 mp4.json에 있다.

같은 방·카메라·조명·quad/+35·DPR2.5/AA0/975×2110·원래 양면/tail·일반 모션. 새 합성 개체3개는 같은 초기 상태·4개 경험·RNG·쿠션을 갖는다. 정상 자율 선택 뒤 같은 손 위치로 접근한다. 버전별 실제 직전 활동·접근 시간·유지 시간은 다르므로 같은 밀리초 자극/같은 강제 장면이라고 주장하지 않는다. 실제 문맥과 최근 접촉이 선택한 style/context는 hand-matrix.json에 있다.

기존 v6가 마지막 beat 끝 프레임과 playful 윙크를 계속 유지하던 원인을 수정했다. 첫 장난 표현 뒤에는 두 눈을 뜨고 쉬며 가끔 손/주변을 확인한다. 설정된 짧은 윙크 envelope는 .23초이며 실제 영상에서도 짧게 나온다. 이 설정값을 실제 GPU 표시 시간/물리 반응 측정값으로 부르지 않는다. 앞발이 실제 손 표면에 닿았다는 정량 접촉 판정은 없으며, 앞발 제스처와 옆 확인의 의도 읽기성을 SELF_REVIEW했다.

## 네 상황의 같은 최신 빌드 검증

| 성격 | 직접 짧은 탭 | 잠깐 유지(실제 접촉) | 오래 유지(실제 접촉) | 메뉴 중간 취소 |
|---|---|---|---|---|
| 장난 | 2.44s 반응 후 완료 | 1.13s | 24.30s | cancel / 완료 기억0 |
| 다정 | 2.53s 반응 후 완료 | 4.21s | 23.14s | cancel / 완료 기억0 |
| 도도 | 2.65s 반응 후 완료 | 3.04s | 25.57s | cancel / 완료 기억0 |

직접 탭은 native 펫의 몸 영역 입력이다. 반응 시간은 터치가 눌린 길이가 아니라 완료 전 접촉 연출 구간이다. 잠깐/오래 유지는 정상 손 내밀기·거두기 검토 도구를 사용했다. 실제 iPhone의 손가락을 오래 누르는 시험은 NOT_RUN이다. 각 완료 token의 기억은 정확히1개, 취소 token은0개이며 coin/food/EXP0/meal0. 취소 뒤 이동·생활 복귀와 취소한 반응이 되살아나지 않는 것을 실제로 확인했다. 진단 버튼의 강제 장면 재생을 사용하지 않았다.

v7에서 메뉴를 열면 교감이 정지됐다가 닫을 때 recover→complete가 되는 실제 결함을 찾았다. v8은 해당 세 성격 손 교감의 입력 gate가 닫힐 때 cancel하고 접촉·이전 의도 참조를 정리한다. 잘못 완료된 v7 합성 시험 기록/영상도 그대로 남겼고 최신 통과로 사용하지 않는다. 초기 장난 v7 촬영의 조작 지연·오래 유지/짧은 유지 목표 불일치도 원본과 보완 영상으로 보존했다.

부가 영향 확인: 같은 도도 개체에서 동작 줄이기 입력·접촉, Home→앱 아이콘 복귀 중 cancel/완료 기억0, 오래된 손 포즈/입력 잠금 없음. 일반 위젯은 Home에서 기존 일반 상태를 표시했고 검토 개체로 덮지 않았다. 앱 아이콘 복귀를 위젯 탭이라고 기록하지 않는다. 첫 OFF 조작은 실제 적용되지 않아 다시 UI를 확인하고 최종 OFF를 확인했다. final-motion-off-v8.png와 poised-final-v8.json에 최종 상태가 있다. reduced-background-v8.mp4의100초 부가 영상과 최종 확인은 별도이며 정량 reduced/full 성능 비교는 아니다.

## 구현 범위와 검사

- handActing.ts: 기존 style·실제 문맥·최근 스타일·같은 개체의 손 기억으로 접촉 연기를 준비한다. 처음의 짧은 동작 뒤 쉬는 유지로 넘어가며 가끔 작은 시선 변화만 한다. 매 프레임 전체 카탈로그/DB/난수 재생은 없다.
- director.ts: 실제 손을 뗀 순간의 sample에서 복원하고, 알려진 원래 관심 대상으로 새 token의 정상 행동을 재개한다. 메뉴/배경 취소는 완료 경험을 만들지 않는다.
- babyPose/pose/babyGait/RoomController: 기존 공통 기울기·끝 clip 고정 대신 해당 손 연기를 적용하고 지지하는 발은 제자리에 두며 동작 중 앞발은 자유롭게 둔다. 기존 몸·귀·뿔·얼굴 자산과 다른 생활 동작은 그대로다.
- personality.ts/축/유형 수/외형/GLB/성장/경제/수면·동면/SQLite schema·공통 대기열·정산/일반 이름과 위젯·package/lock/config 변경 없음.
- 새 hand 영향7개, 관련 hand/personality15개 PASS. 최종 전체463/463 fail0/skip0, lint/typecheck PASS. v8 iOS Release arm64 xcodebuild exit0/동일DB 설치/실제 조작. Android JS bundle PASS/CNG27 STATIC PASS. 이번 Android native/UI/실기기/GPU/물리 지연 NOT_RUN. 최종 운영 정적42/42·validator 직접 회귀1/1 PASS.
- 잘못된 루트 cwd의 tsx 실행, 버전 문자열 수정 경로 오류, 최초 내보내기/설정 조작 확인 부족은 성공으로 숨기지 않고 올바른 cwd/최신 hash/실제 UI·파일로 확인했다. 새 설치·SDK 내부 패치·보안 변경·외부 업로드 없음.

앱 소스 **6ad0ecd**, 설치 **reboot-04-hand-v8 Release arm64 Simulator ad hoc**. 222개 입력 fingerprint `f19a4baee0f4b118cb39100ecd2250dbb5ca89e381353ac3593592fd93ca4c91`, JS `862b56c4c0303770e03a6d312880690313299ace2d27639606160234620e600e`, native `91df946e6080203bca461075dbe2376799fdb6dc332c1bd699d61193f94c55af`와 실제 설치를 대조했다. macOS15.6/Xcode26.3/iPhone16e iOS26.3.1/390×844pt/native1170×2532/Apple Software Renderer, Metro 없이 같은 embedded Release다.

## 보존·성능·다음 검토

기존52개 저장의 이름/형태/성격/coin/food/EXP/시설/활동/sleeping/hibernating과5경제 원장 정확히 동일, 3DB integrity ok, 원본48파일/진단8건 보존. 기존 main과 본래 대표3종의 기억도 exact다. 착수 당시 실행 중이던 옛 합성 도도만 정상 자율 완료36건/RNG/revision과 기존64한계 정리가 있었고 beforeDB도 보존했다. 이번에 새로 만든 합성4개(v7 1개/v8 3개)는 경제0이며 일반 저장에 보상을 지급하지 않았다.

**PERF-01 OPEN**: 이번은 표현 검증이고 새 표준 녹화OFF 벤치를 하지 않았다. 기존 RAF 실패와 호스트 변동 이력을 유지하며 새 녹화 capture/live 숫자로 이를 닫지 않는다. 해상도·표정·행동·판정 기준을 줄이지 않았다. CANTOPEN 원래 VFS 원인도 OPEN. 재미·최종 아트·성격 표현 채택 USER_REVIEW_PENDING.

SOL_DIRECT / SELF_REVIEW / subagent0 / 요청GPT-6.1 Sol Max / effective ROUTING_UNVERIFIED. 검토 절차는 기존 성격 검토판→우리 아이→합성 동일조건 비교→3종 선택→시작→손 내밀기/거두기다. 다음은 이 손 표현의 사용자 평가와 별도 PERF-01 추적이며 유형·성장형·상점으로 확대하지 않는다. 코드·보고만 기존 feature 브랜치에 일반 push하고 DB/영상/generated native/비밀은 제외한다. 최종 remote/clean은 git-final-audit.json과 최종 응답을 따른다.

---

## Historical — 2026-10-11 동일 조건 v6

# REBOOT-04 후속 — 동일 조건 비교 준비 / 성능 OPEN

세 아이는 같은 방과 경험으로 시작해 서로 다른 살핌·손 접근·발짓/기대기·시선·생활 복귀를 보여준다. 장난은 빼꼼 보고 앞발 장난과 윙크, 다정은 손 쪽에 몸을 낮추고 기대기, 도도는 오래 살피고 한 번 놀란 뒤 시선을 돌린다. 이름과 말풍선을 가린 같은 최신 Release의 정상 입력 영상3개를 준비했다. 정지 얼굴만으로 성격을 맞추는 차이는 약하며 사용자 성격 평가·재미·아트·크기는 USER_REVIEW_PENDING이다.

**성격 비교 준비: PREPARED / PASS_SIMULATOR_SCOPED. 성능: OPEN / 기존 기준 미충족.** 성능 실험을 기본 렌더 수정으로 채택하지 않았다. 전체 MVP/기기/출시 READY 판정은 아니다. 8/16유형·성장형·상점·AI·새 아트는 이번에 만들지 않았다.

## 실행과 실제 비교

기존 성격 검토 방 **☰ → 우리 아이 → 합성 동일조건 성격 비교 → 장난/다정/도도 선택 → 동일 조건 비교 시작**. 준비30초 뒤 정상 생활이 시작된다. 말풍선/성격명은 방에서 숨겨지고 제목은 모두 아루다. 하단 손 도구는 검토 전용이며 기본 게임 메뉴로 승격하지 않았다. 기존 세 아이는 원래 선택 메뉴에서 그대로 다시 만난다.

새 합성 개체의 상태·4개 명시된 합성 경험·RNG·가구·성장 단계·외형을 맞췄고 initialState에서 petId만 제외한 값과 baseline이 세 영상에서 정확히 같았다. 경제 시계만 고정한 비교이며 기존 일반 시간을 바꾸지 않았다. 새 완료 경험은 새 petId에만 남는다. 이 비교를 성장에 따른 성격 형성 완료로 보고하지 않는다.

| 영상 | 실제 손 흐름 / 원본 영상의 대략 시각 | SELF_REVIEW |
|---|---|---|
| [장난](evidence/reboot-04-followup-2026-10-11/matched-playful-v6.mp4) | 제안78s→접근→접촉81~85s→손 거둠102s→완료103s→생활108s | 빼꼼·앞발·윙크, 해제 뒤 다른 관심으로 돌아감 |
| [다정](evidence/reboot-04-followup-2026-10-11/matched-warm-v6.mp4) | 제안69s→접촉71~74s→거둠91s→완료93s→생활99s/쿠션111s | 손 쪽 head/side lean, 낮춘 몸과 편한 눈매, 쿠션 복귀 |
| [도도](evidence/reboot-04-followup-2026-10-11/matched-poised-v6.mp4) | 제안75s→접촉79~82s→거둠100s→완료102s→생활108s | 긴 살핌→작은 놀람/기대기→시선 돌림, 자기 생활 복귀 |

각 약130초 정상 속도 원본이며 실패 구간 삭제/배속/외부 업로드 없음. 같은 방/카메라/조명/+35/2.5AA0/원래 양면/tail/일반모션. 준비30초→무입력25초 목표→같은 손 제안→12초 목표→거두기→15초 목표 관찰 절차다. 도구 round-trip/화면 획득 지연 때문에 입력의 절대 시각과 실제 hold 시간은 서로 다르다. 이를 동일 밀리초 자극이라고 주장하지 않고 전체 trace/원본 PTS를 제공한다. 각 아이가 선택한 생활로 위치가 달라진 뒤 같은 손 위치로 접근한다. forced 장면·아트 자세 검사를 정상 선택으로 대신하지 않았다.

원본 native1170×2532: [장난 접촉84.5s](evidence/reboot-04-followup-2026-10-11/P-frames/084.500.png), [다정73.5s](evidence/reboot-04-followup-2026-10-11/W-frames/073.500.png), [도도82s](evidence/reboot-04-followup-2026-10-11/D-frames/082.000.png). 각 폴더 metadata에 실제 PTS/영상 길이가 있다. PNG로 모션/FPS를 통과시키지 않는다. matched-flow-summary.json과 *-full-v6.json의 완료/취소/후속 기록을 함께 본다. 장난 full trace는 영상 종료 뒤 일반 생활도 포함하고 초기 일부는 이력 한계로 정리돼, 영상 구간은 별도60초 auto export로 보완했다.

## 성능 수정 여부

[PERF-01](docs/defects/PERF-01-personality-raf.md)에12개 전 구간·실패·변동·host 조건과 원본 경로를 남겼다. 원래 렌더 v5의 P→W→D→D→W→P, 모두30초 준비/60초 OFF/6입력: RAF p95 **36.64/41.87/41.57/44.27/42.23/43.41ms**, 기준33.34ms 모두 FAIL. 다정도 미달했다. 입력 p95는 모두100ms 이내, 500ms 초과 gap0. 큰 멈춤 기준 통과를 프레임 안정성 전체 통과로 바꾸지 않는다.

행동 판단 p95 약.04ms·CPU morph 약1ms보다 **GL 동기 대기32~40ms**가 지배적이었다. 닫힌 불투명 body의 뒷면 제외를 같은 v6에서 제한적으로 시험했으나 장난은 개선/도도는 원본도 통과/다정은 악화했다. **이득 미확정 → 기본은 원래 양면/tail 유지.** 진단 옵션만 분리했다. CPU 판단/예약을 근거 없이 다시 만들거나 해상도·표정·행동·기준을 줄이지 않았다.

호스트 부하/압축메모리 변동도 기록했지만 특정 프로세스·GPU 드라이버 인과나 실제 기기 한계를 단정하지 않았다. v5/v6/녹화영상/과거 숫자는 별도이며 완료60초 summary만 표에 썼다. 실제 GPU/표시FPS/물리 입력 지연/실기기/발열·배터리는 NOT_RUN이다.

## 설치·보존·검사

- 시작 clean b5ea76d, 앱 소스 **ecd62de**, 설치 **reboot-04-comparison-v6 Release arm64 Simulator ad hoc**. 220개 manifest 입력과 현재 파일, 설치된 JS/native hash를 직접 대조했다. 소스 fingerprint `89ddabb443be94a050a05fc908dcfe6b741fde8f59ee377352dd075763a0fdf7`.
- JS `76c65a6aab58e73cf40c48f2e8471a8811dce3c69a490880ab9a51a754bf82e8`, native `8d9eb22e3d9d59d220c2694a6797fae537dcc398747113634b82169052ccec38`. 같은 DB를 유지하며 필요한 instrumentation 빌드v5/v6만 설치했다. 과거 reset/DB 초기화 없음.
- macOS15.6/Xcode26.3/iPhone16e iOS26.3.1/390×844pt/native1170×2532/Apple Software Renderer/975×2110 GL buffer/DPR2.5/AA0. 정상 화면 입력 접근 성공. Expo55.0.31/SQLite55.0.20/RN0.83.10, package/lock/config/art 변경 없음.
- 이번 새 전체456/456 fail0/skip0, 영향78/78, lint/typecheck PASS. v6 xcodebuild exit0/실제 설치·화면 조작. Android JS bundle PASS/CNG27 STATIC PASS. 이번 Android native/UI/실기기는 NOT_RUN. 최종 운영 정적42/42·validator 직접 회귀1/1 PASS.
- 기존34개 저장의 이름/형태/성격/재화/EXP/소유/활동/sleeping/hibernating과 경제5원장 동일. dev1·life29·원래review4 + 새합성18. 새18은coin/food/EXP0/meal0. 3DB integrity ok. 원본48파일 hash를 이번에 다시 대조했다.
- 원래 main/playful/warm 기억은 완전히 동일. 기존 도도는 착수 당시 정상 자율 완료4건으로 revision900→904/RNG갱신/기존64한계4건 정리, 겹친 사건 정확히 동일. 이후 합성 seed/다른 pet 경험이 섞이지 않았다. 착수 전/후 DB 백업을 로컬에 보존했다.
- 기존 진단8개 정확히 보존, **CANTOPEN 원래 VFS 인과 OPEN**. 이번 정상 저장/회귀로 전체 저장 결함 해결을 주장하지 않는다. 일반 위젯에 검토 pet을 게시하는 경로 없음; App Group 포함 기존 ad hoc 빌드를 유지한다. 이번 실제 위젯 탭은 다시 실행하지 않았고 v4 이력을 v6 fresh PASS로 복사하지 않았다.
- 수면/동면·시간·중복 정산 자동 회귀는 새456 검사에 포함된다. 본래 정책/서비스/SQLite 대기열/statement/진단 구현은 바꾸지 않았다. 이번 새 native 수면/동면 장기 경계 실험은 NOT_RUN이며 이전 증거를 보존했다.
- 개발 산출물은 읽기 전용으로 조사했고 현재 디스크 여유24.58GiB/4GiB 사전 검사 PASS다. 원본·영상·DB·다른 앱 파일 삭제 없음. 점유 목록의 logical bytes를 APFS 실제 점유 인과로 단정하지 않는다.
- 실제 사용: CUA Simulator 정상 입력·simctl 원본 캡처/녹화·AVFoundation 원본 frame/PTS·Node/native 빌드·공식RN 문서/설치소스 대조. 새 Blender/Figma/Maestro/Context7/AI 호출·새 설치 없음. SOL_DIRECT/SELF_REVIEW/subagent0/요청GPT-6.1 Sol Max/effective ROUTING_UNVERIFIED.

## Git와 남은 한 작업

소스 체크포인트와 이 후속 보고를 기존 feature 브랜치에 일반 push한다. 제외 파일·비밀·DB·영상·generated native·gitlink를 검사한다. 최종 local/tracking/live-origin과 clean은 git-final-audit.json 및 최종 응답에서 확인한다. main/merge/force/tag/release/deploy/실건강/실결제/보안 변경 없음.

다음은 **이 동일 조건3종의 사용자 성격 평가와 PERF-01의 근거 기반 성능 추적**이다. 승인 없이8/16유형·성장/진화·상점·AI로 넘어가지 않는다. 사용자 최종 성격/재미/아트 승인 대기와 성능 OPEN을 각각 유지한다.

---

## Historical — 2026-10-10 대표 3종 v4

# REBOOT-04 — 대표 3종 실제 검토 결과

## 같은 상황에서 달라진 것

장난꾸러기는 주변 확인 뒤 통통 뛰고 앞발로 장난친 다음 사용자를 돌아본다. 다정은 눈을 맞추고 앞발을 건네며 손 쪽으로 몸을 조금 오래 기댄다. 도도·호기심은 대상을 먼저 오래 살핀 뒤 자기 템포로 접근하고, 몸은 가까이 두면서 시선을 옆으로 돌린다. 모두 같은 아기 네발 모델·방·카메라·+35 크기·DPR2.5/AA0이며 일반 저장과 분리된 개체다.

**성격 비교 범위: PERSONALITY_3_REVIEW_READY.** 실제 조작·생활·기억 복원은 확인했다. **성능: 일부 RAF 기준 미달 / 추가 검증 필요.** 실기기·GPU·물리 지연은 NOT_RUN이다. 재미·최종 아트·크기·성격 표현 채택은 USER_REVIEW_PENDING이며 전체 MVP/출시 검증은 미완료다.

정지 기본 얼굴만으로 세 성격을 맞추는 차이는 약하다. 차이는 시간에 따른 살핌·접근·몸짓·기대기·복귀에서 더 읽힌다는 SELF_REVIEW다. 사용자에게도 충분히 느껴지는지는 아직 승인받지 않았다.

## 바로 실행

현재 Simulator의 아루콘 개발 셀을 연다. 일반 방에서 **☰ → 설정 → REBOOT-04 성격 검토판**, 검토 방에서 **☰ → 우리 아이 → 장난꾸러기 / 다정 / 도도·호기심**을 선택한다. 기존 아이를 다시 열며 DB를 초기화하지 않는다. **설정 → 말풍선 가리기**로 비언어 비교가 가능하다. 하단 손 내밀기는 검토 도구다. 직접 머리·몸 접촉과 빈 바닥 이동도 정상 경로다.

각각 2분 관찰한 뒤 같은 손 제안과 접촉을 비교한다. 쿠션은 상점·꾸미기 메뉴의 기존 이동 도구로 옮긴다. 코인 상점이나 새 미니게임을 추가한 것이 아니다. 일반 방 복귀는 설정의 원래 방으로 돌아가기다. 일반 Sim의 이름·동면·재화는 보존했으며 임의로 깨우지 않았다.

## 소스·설치·조건

- 시작: f707c465885f8be370fbb457c2d311153277c3e7, clean feature/arucon-mobile-autonomous. 당시 설치 storage-v4를 먼저 보존했다.
- 앱 소스: **8f0602a**. 후속 변경은 도달성 검사와 보고/SRS 범위 설명이며 앱 코드는 동일하다.
- 설치: **reboot-04-personality-v4 Release / arm64 / Simulator ad hoc 서명**.
- JS SHA256: `88f355ddaaced224a7d90aec870d57332e59aeaff0632f691ef0a50da40c9951`.
- 216개 보존 입력 fingerprint: `fd6c7fce800a9838421717b690baa21684df6e0c9dd9b72de39d98769c205757`.
- 최종 native 실행 파일 SHA256: `6667f8a8309beb7830d670103cc1c7aec596c5a80078d454bc77dc098c2a424e`.
- macOS15.6 / Xcode26.3 / iPhone16e iOS26.3.1 Simulator, 390×844pt / native1170×2532. 글자 배율은 기본값이다. 이번 큰 글자·실기기 검사는 NOT_RUN.
- Expo55.0.31 / SQLite55.0.20 / RN0.83.10. 실제 건강정보·결제·외부 AI는 OFF.
- 공통 후보: Blender .blend386145bytes / GLB504552bytes, body4996vertices / 10bones. GLB SHA `ce26ac9cd08eb3a0363542ce21cdb5ccfbbf43d78430ad35324586a62c843bce`.
- Apple Software Renderer / CPU morph / 975×2110 내부 buffer / DPR2.5 / 실제MSAA0 / GL error0 / framebuffer complete. 최종 제품 렌더 설정·아트 채택은 미확정이다. A/B/C와 일반 기본 모델은 유지했다.

## 구현과 실제 검증

[설계·도달표](docs/personality-foundation.md)에 네 연속축, version1, 안정된 잠재 기질, 완료 경험의 작은 표현 힌트, 성장 interface, 제한된 기억과 취소 계약을 정리했다. 16조합 주소는 확장 기반이며 완성 16종이나 인간 MBTI 코드가 아니다.

| 항목 | 실제 결과와 범위 |
|---|---|
| 공통 네발 후보 | 실제 Blender Python으로 뒤발 topology·bone·skin·상단 연결·발 track 제작. 정상 이동·정지·접촉에서 사용. A/B/C 원본 보존. 최종 아트 승인 대기 |
| 자율생활 | v4 첫120초: 장난5계열9회, 다정6계열8회, 도도6계열9회 완료. 수동 재생이나 숨긴 고정 시나리오 없이 기존 director 정상 선택 |
| 표현·접촉 | 각 프로필6개 인과 recipe·6접촉 후보·6이상 표정 경로 지원. 고정 seed의 정상 문맥/머리·몸/최근 이력 조합으로 모든 접촉 후보 선택 확인. 실제 화면에서는 머리·몸·진행 중 접촉·해제·메뉴 취소와 생활 복귀를 확인. 모든 후보의 전 방향 시각 검사를 했다고 주장하지 않음 |
| 짧은 탭 | 초기v1에서 첫 beat만 보이고 후속 동작을 건너뛰는 문제 재현. 성격 검토 경로에서 짧은 접촉 뒤 문맥 동작을 완료하도록 수정. 이동·메뉴·수면 취소는 유지 |
| 쿠션·기억 | 기존 위치 확인 → 현재 위치 접근 → 사용/복귀. trace의 rememberedPosition과 currentTarget 구분. 세 petId의 완료 사건만 저장, 취소·외부 사건을 기억으로 만들지 않음 |
| 배치 경합 | v3에서 큐 앞의 생활 기억 갱신으로 배치 입력이 오래된 revision에 막히는 사례 재현. v4는 큐 실행 시 최신 기억을 읽고 epoch/저장 가드를 유지. 정상 배치·완료·새 위치 저장 재검증 |
| cold restore | 실제 terminate/launch 직후 세 개체의 모든 기억 snapshot·축·RNG·쿠션 정확히 동일. 복원된 도도에서 실제 접촉·이동·생활 확인. 재설치/초기화로 시험하지 않음 |
| 수면 | 같은v4 다정에서 정상 잠자기. sleeping=true/hibernating=false/restMode=sleeping/clip=sleep/생활의도없음 일치. 정상 깨우기 후 이동·접촉. 동면 시간 경계는 자동 회귀로 보존, 일반 Sim의 동면 저장은 변경하지 않음 |
| lifecycle/reduced | 메뉴 열기/닫기·접촉 취소·앱 Home/위젯 복귀·cold 재실행. 동작 줄이기 ON→접촉→OFF와 일반 모션 복원 확인 |
| 일반 위젯 | unsigned v4에서 fallback 발견. 설치 Mach-O의 simulated App Group 없음 확인 → 기존 ad hoc 서명 복원 → 같은JS/DB에서 일반 상태·마지막 확인 시각 및 실제 위젯 탭 진입 확인. 검토 개체를 일반 위젯 상태로 게시하지 않음 |
| 저장/경제 | 원본31개 + 새검토3개. 기존 이름/형태/성격/재화/EXP/소유/활동과 모든 경제 원장 동일. 새3종 모두 EXP0/coin0/food0/meal0. 3DB integrity ok, 기존 오류진단8건 정확히 보존 |

3종은 동일한 초기 아기 상태·기본 시설·빈 완료 기억으로 생성했다. 반복 개발 검증으로 누적 경험량은 달라졌다. 마지막 비교를 동일한 빈 이력으로 꾸미거나 초기화하지 않았다. 자유 관찰의 쿠션은 같은 왼쪽 영역이며 도도의 정상 재배치 좌표는 (-1.6866,.3972), 다른 두 시작 좌표는 (-1.6,.2)다. 이후 손 비교/60초 측정에서는 모두 같은 현재 좌표(1.5630,3)를 사용했다. 실제 이력·좌표 차이로 인한 변화를 성격만의 효과로 단정하지 않는다.

기존 reboot-01:main 기억은 준비 중 기존 앱이 완료한 rest19건으로 revision2956→2975가 됐다. 기존64개 한계로 오래된19건이 정리됐고 남은 사건은 정확히 동일하며 처음/최근 사물 경험·모자·쿠션·단계는 보존됐다. 이전 DB 전체도 로컬 before 백업에 남겼다. 새3종 기억이 기존 아이에 섞인 것이 아니다.

## 증거 — 전부 로컬, 외부 업로드 없음

기본 위치는 `evidence/reboot-04-2026-10-10/`다. 원본 영상은 정상 속도이며 실패 구간을 삭제/편집하지 않았다. native PNG를 축소·보정해 개선 증거로 사용하지 않았다.

- [장난 v4 자유생활·접촉·쿠션](evidence/reboot-04-2026-10-10/playful-v4.mp4), [다정 v4](evidence/reboot-04-2026-10-10/warm-v4.mp4), [도도 v4](evidence/reboot-04-2026-10-10/poised-v4.mp4): 각 첫120초 무입력. 다정/도도는 말풍선 가림 적용을 확인했다. 장난 자유 영상은 말풍선ON이다.
- [대사 없는 장난/다정 손 비교](evidence/reboot-04-2026-10-10/paired-touch-lifecycle-v4.mp4): 장난21~49초, 다정128~164초. [도도 손/복원](evidence/reboot-04-2026-10-10/poised-cold-restore-v4.mp4): 손118~142초. 도도 자유 영상 뒤의 직접 접촉을 이 별도 영상으로 보완했다. 모든 lifecycle 동작이 한 영상 안에 있다고 주장하지 않는다.
- 같은 카메라 원본: [장난22.195s](evidence/reboot-04-2026-10-10/paired-frames-v4/022.200.png), [다정129.675s](evidence/reboot-04-2026-10-10/paired-frames-v4/129.700.png), [도도119.697s](evidence/reboot-04-2026-10-10/poised-paired-frames-v4/119.700.png). 정확한 PTS와 native 크기는 각 metadata.json을 따른다. 정지 이미지로 모션/FPS를 승인하지 않는다.
- [최종 서명 설치·일반 위젯·정상 진입](evidence/reboot-04-2026-10-10/final-signed-entry-v4.mp4), [홈 위젯 원본](evidence/reboot-04-2026-10-10/widget-final-signed-v4.png). 긴 비교 영상은 서명 수정 전v4이며 최종 ad hoc 빌드와 JS·GLB·앱 소스가 정확히 같다. 최종 wrapper에서는 위젯과 세 프로필 최소 입력 회귀를 다시 실행했다.
- comparison-summary.json / 각 v4.json: 실제 장면·문맥·region·beat·표정·완료/취소·기억·대사 표시 여부. cold-immediate-equality.json / preservation-audit.json: 저장·원본·진단·경제 대조.
- v1 짧은 탭 실패, v2 뒤발 연결 부족, v3 배치 실패와 이전 proxy 실패는 별도 파일에 보존했다. 최종 통과 증거로 재사용하지 않는다.

## 성능 — Simulator proxy, 판정 기준 유지

| v4 조건 | 제출 proxy Hz | RAF p95 ms | 입력→제출 p95 ms | 판정 |
|---|---:|---:|---:|---|
| 장난180초 녹화ON | 41.92 | 29.04 | 샘플0 | frame PASS / input INSUFFICIENT_DATA |
| 다정180초 녹화ON | 42.14 | 29.25 | 샘플0 | frame PASS / input INSUFFICIENT_DATA |
| 도도180초 녹화ON | 43.48 | 28.72 | 샘플0 | frame PASS / input INSUFFICIENT_DATA |
| 장난60초 녹화OFF | 35.29 | 37.07 | 38.20 / 샘플6 | 제출·입력 PASS / RAF FAIL |
| 다정60초 녹화OFF | 38.40 | 33.18 | 53.13 / 샘플6 | proxy PASS |
| 도도60초 녹화OFF | 32.14 | 47.18 | 47.75 / 샘플6 | 제출·입력 PASS / RAF FAIL |

기준은 RAF p95≤33.34ms, 제출≥30Hz, 입력 p95≤100ms, gap500ms초과 없음이다. 6구간 모두 gap500ms초과0이며 같은 방/모델/렌더다. OFF는 실제 접촉6회를 포함한다. CPU morph p95 약1.2ms, draw 약1.6~1.7ms보다 GL 대기 비용이 컸다. 구간 길이/입력/호스트 부하가 달라 ON/OFF 인과 결론이나 코드 개선율을 계산하지 않는다. RAF·endFrameEXP는 실제 GPU 표시 FPS/물리 터치 지연이 아니다. RAF 꼬리 실패는 해결됐다고 처리하지 않았고 전체 성능 sign-off는 대기한다. 해상도·모션·표정을 낮춰 숫자를 통과시키지 않았다.

## 실제 실행한 검사·도구

- 최신 소스 자동 검사448/448, fail0/skip0. 정상 문맥600회 선택 도달성 보강8/8, 기존 Reboot 영향54/54. lint/typecheck PASS.
- iOS Release arm64 xcodebuild exit0, 기존 DB 설치/실제 조작. 계정 없는 기존 Simulator ad hoc 서명으로 App Group 복원. CNG27/27 STATIC PASS, Android JS bundle PASS. 이번 Android native/emulator와 양 플랫폼 실기기는 NOT_RUN. 운영 정적42/42와 validator 직접 회귀1/1 PASS. 시스템 Python3.9의 tomllib 부재와 unittest0회 실행은 실패/미실행으로 보존하고, 기존 bundled Python3.12로 검사했다.
- 공통 자산 제작은 실제 프로젝트 로컬 Blender5.2.0 Python/bpy 호출과 편집 .blend/GLB 산출물이다. Blender MCP·GUI 손조형·Figma·Maestro를 사용했다고 기록하지 않는다.
- Context7 plugin MCP 공개 SDK55 조회 성공. 일부 main 소스 URL이 섞여 [공식 SDK55 문서](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/)와 설치 SQLite55.0.20을 대조했다. 프로젝트/건강/비밀 데이터는 조회에 보내지 않았다.
- SOL_DIRECT / SELF_REVIEW / subagent0. 요청 GPT-6.1 Sol Max, effective model ROUTING_UNVERIFIED. 자체 검토를 독립 리뷰로 부르지 않는다.
- 최초 Blender sandbox139, 잘못된 cwd의 CNG 실패, 전 아키텍처 빌드 중단75, entitlement 출력 형식 검사 실패를 로그에 남겼다. 올바른 환경·형식·cwd/arm64로 재검증한 결과와 구분한다. SDK 내부 임시 패치·새 설치·보안 설정 변경·원본 삭제 없음.

## 남은 항목과 Git

**STORAGE-01 정확한 CANTOPEN VFS 원인은 OPEN**이다. 이번 성격 검토나 위젯 서명 복원을 전체 저장 결함 해결로 처리하지 않는다. 실제 기기/GPU/물리 지연/발열·배터리, 프레임 꼬리 기준 재검증, 큰 글자 검증, 사용자 재미·최종 아트·성격 선택이 남는다. 성장 연결은 interface/설계까지만이며 8/16유형·새 성장/진화 자산·상점·AI B·미니게임은 만들지 않았다.

소스 checkpoint8f0602a와 이 결과/도달성 감사 checkpoint를 승인된 feature 브랜치에 저장한다. push 직전 제외 파일·비밀·mode160000·검사 상태를 다시 확인한다. 최종 HEAD/원격추적/live origin의 동일 hash와 clean 상태는 로컬 git-final-audit.json 및 최종 응답에서 확인한다. main/merge/force/tag/release/deploy/실건강/실결제/외부 영상 업로드는 하지 않는다.

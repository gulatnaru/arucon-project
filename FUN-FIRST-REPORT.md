# FUN-00 fun-first current report

## 현재 결과 — 2026-09-28 ASTRA_DIRECT

**BLOCKED** — 보고된 기본 결함은 직접 수정했고 정상 플레이 증거를 확보했다. 마지막 앱 전환 포인터 정리 후의 최종 재확인 도중 Mac 잠금이 확인되어, 이 남은 항목은 `BLOCKED_HOST_LOCKED`다. 재미·최종 캐릭터 만족도는 `USER_REVIEW_PENDING`이다.

### 운영과 검증 대상

- 기존 에이전트는 시작 시 모두 완료 상태였다. 새 서브에이전트 생성 0회, 병렬 작성 없음. 설계·구현·디버깅·화면 조작·검토를 직접 수행했다. 검토 방식은 **SELF_REVIEW**이며 이번 독립 리뷰는 없다.
- 프로젝트의 `.codex/config.toml`에서 subagents를 비활성화했다. 과거 역할 파일과 결정 이력, 제품 테스트 기대값, 보안 권한은 보존했고 사용자 전역 설정은 변경하지 않았다.
- 출발 소스 `39767d7`; 정상 전체 흐름 검증 소스 `a4b3fad`; 최종 소스 `69bd2ae180c5f5222e7d0a4577b58e8e2265272c`.
- macOS 15.6 / Xcode 26.3 / iPhone 16e iOS 26.3 **Simulator**, Expo SDK 55, Release 내장 번들. Metro로 장면을 주입하지 않았다.
- 최종 설치/DerivedData 번들 SHA-256 모두 `8c41466a5c7505bef57ce4d36db29a71ec59b2970a536d19900a5e5a776be73b`.

### 사용자 보고별 수정과 실제 확인

| 보고 | 직접 수정 | 관찰/증거 |
|---|---|---|
| 화면 겹침·잘림 | 실제 상·하단 조작부 높이를 측정하고, 말풍선을 움직이는 펫 위치에 고정·경계 안 배치. 선택지/긴 글은 스크롤 가능. 비교 종료의 남은 합성 성장 표시 제거 | 기본 portrait에서 방/펫/말풍선/조작부 가림 없음, 기록 닫기와 비교 종료 후 복원 관찰 |
| 대화 중 몸·표정·입력 멈춤 | Apple Software Renderer에서 morph를 동일 가중합의 CPU 경로로 처리하고 Expo `flushEXP`로 오래된 GL 명령 누적을 제한. SDK 내부 파일 수정 없음. 실제 animated root로 히트/말풍선 추적 | 대화 대기→선택→몸/표정 반응→종료→다시 이동 관찰. 모델/모션 속도·원본 GLB 유지 |
| 두 문장 반복 | 최근 가족/동작을 피하고 cooldown 소진 시 가장 오래된 상황 적합 가족을 선택. 정상 교감에 기대기/눈맞춤/곁에 있기 선택 장면 연결 | 개발 재생 없이 정상 버튼 반복에서 “보고 있었어”, “여기 기대 있을게”, “손이 있던 곳”, “거긴 괜찮네”, “조금만 더 있다 가” 및 후속 선택을 관찰 |
| 쓰다듬기 버튼 저장 깜빡임 | 교감 저장은 quiet 표시로 처리. 실제 저장 실패/재시도 경로 유지 | 정상 버튼에서 저장 문구 대신 몸 반응·말풍선이 이어짐. 경제 값 동일 |
| 직접 눌러도 안내 문구만 | 텍스트 성공 알림 제거, 버튼과 직접 터치 모두 표정/몸 spring pulse를 재생하고 사용자를 향해 반응 | 직접 누름/드래그 해제에서도 몸 변형·복원과 다음 장면을 관찰 |

### 실제 실행과 한계

- 같은 Release `a4b3fad`에서 기록 열기/닫기 → 버튼·펫 직접 교감 → 정상 입력으로 열린 대화 선택/종료 → 이동 → Home → 앱 아이콘 복귀 → 다시 교감을 연속 확인했다.
- 최종 `69bd2ae`에서도 기록/직접 입력/여러 반응/선택 후 행동을 확인했다. 마지막 Home/복귀 재확인은 화면 조작 연결 오류 뒤 Mac 잠금이 확인되어 완료하지 못했다. 이전 빌드의 관찰을 이 항목의 PASS로 옮기지 않는다.
- 정상 속도 원본 영상: `mobile/evidence/astra-direct/10-verified-normal-flow.mp4` (a4b3fad 전체 흐름), `12-accepted-normal-sequence.mp4` (69bd2ae 잠금 전 부분 흐름). `03`/`04`는 앞선 정상 입력 관찰이다. 영상 속도를 변경하거나 개발 메뉴 장면 재생으로 기본 결함을 통과시키지 않았다.
- 3개 체형 정면과 도톰형 측면/3/4 방향, 합성 성장 말풍선은 8eefbc3에서 수행한 별도 보조 비교다 (`06`~`09` PNG와 화면 관찰). 원본과 두 후보 파일은 변경하지 않았다. 전체 아트/모션 매트릭스나 사용자 만족도 통과를 뜻하지 않는다.
- 정상 조작·재실행 전후 먹이 0, 코인 15, EXP units 25,125,000, 식사 원장 3행, 형태/성격 동일; SQLite integrity OK. 실제 건강정보 읽기 OFF.

### 자동 검사와 성능

- 최종 소스: 전체 **324/324**, lint/typecheck PASS, 양 플랫폼 JS bundle PASS, iOS Release build/install/launch PASS. iOS CNG **23/23**, 운영 규칙 검사 **40/40**. 운영 모드 검사만 사용자 지시에 맞춰 바꾸고 기존 제품 테스트 기대값은 완화하지 않았다.
- CPU morph 검사는 합성 기준식과 원본/두 후보의 실제 애니메이션 가중합을 대조했다. 실패했던 콘텐츠 동작 다양성 검사도 실제 다른 동작을 선택하도록 고쳐 통과시켰다.
- 8eefbc3의 정상 입력 8회: 다음 RAF 프록시 p95 **16.50ms**, GL 대기 포함 다음 제출 프록시 p95 **43.83ms**. RAF p95 **36.37ms**, 표본 최대 **44.11ms**, >500ms 표본 0. 약 10초 제출 221표본, **22.07Hz 프록시**. 이후 변경은 비교 표시 정리와 background 포인터 취소이며 렌더 계산은 같다. 기존 예산 유지. 이는 실제 화면 FPS·touch-to-photon·실기기 성능이 아니다.
- 소프트웨어 프로필은 0.75 DPR/Lambert 화질 절충이 남는다. 실제 Android 실행, 물리기기 지연/발열/배터리, 모든 글자 크기·기기, 전 장면·최종 아트 평가는 이번 관찰 범위 밖이다.

### 바로 실행 / 다음 작업

Mac 잠금 해제 후 `open -a Simulator`와 `xcrun simctl launch booted com.arucon.dev`로 현재 설치된 Release를 실행한다. 우선 일반 방에서 기록·교감·선택·이동·Home/복귀를 확인한다. 체형/성장 보조 비교는 `합성 도구 → 반응/아트 비교`에서 따로 본다. 남은 작업은 최신 빌드의 앱 전환 재확인과 사용자 평가이며, 이미 끝난 구현을 다시 만들지 않는다. Git 최종 해시는 최종 응답과 ignored `mobile/evidence/astra-direct/git-audit.json`에 기록한다.

## 이전 실행 — 2026-09-27

Status is `BLOCKED_WITH_CHECKPOINT`: CUA reported a locked Mac during the final post-fix inspection. Independent implementation and source gates are complete. An unconnected frame-marker experiment is kept only in ignored local evidence; no speculative CPU morph optimization was shipped. Fun/art remains `USER_REVIEW_PENDING`.

- Baseline: `55c03ec`, branch `feature/arucon-mobile-autonomous`. The user-authored FUN specification is preserved and included in the scoped checkpoint.
- Implemented: journal close/back/cancel, pet multitouch, clean feedback; 27 offline reaction definitions; event selector; personality/context/family/memory/dialogue choices; no auto expiry; low-dialogue preference.
- Storage: separate `arucon-reactions.db`, 32 active memory rows, v1 quarantine preserved; evaluation fixture DB isolated.
- Growth: meal commit awards EXP only on actual consumption; level/stage growth cue is connected.
- Art: original assets plus two GLB candidates (moderate 10.3% depth, plump 22%); form/economy unchanged. Four evolved runtime assets remain missing.
- Runtime observed before the latest input-priority/camera fixes: Release journal close twice, retarget, clean auto, bottom-pet dialogue, and ball-choice wait → “옆에서 쉬기” follow-up bubble and pose. Later fixes cover short-press ordering, rapid-input free-expression commit, and camera yaw/geometry. The final fixed Release exists, but post-fix visual/angle/motion inspection is blocked by the locked Mac. Earlier videos 05/06 are not upgraded to latest PASS.
- Release identity: `fixed-release-bundle-sha256.txt` and `fixed-source-manifest.json`. User game SQLite release before/after evaluation matched all 12 tables and rows.

## Verification recorded

| Check | Result |
|---|---|
| Full final test | `319/319`, failures 0, skips 0 (`checkpoint-tests.log`) |
| Lint | PASS (`reverified` log) |
| Typecheck | PASS (`reverified` log) |
| Reaction checker | `27` reachable |
| CNG iOS | `23/23` |
| JS bundles | iOS/Android PASS (`reverified-bundles.log`) |
| iOS Release | build exit 0, install/launch Metro OFF |
| Workflow | `38/38` |
| Physical device / Android runtime | NOT_RUN; Android SDK environment block |

## §11 acceptance matrix

| # | Requirement (FUN-00 §11) | Evidence | Runtime status |
|---:|---|---|---|
| 1 | Journal repeated open/close leaves no lock or click-through | lifecycle tests; Release close observed | pre-fix runtime evidence; post-fix CUA blocked |
| 2 | Pet touch start/hold/release/cancel/multitouch restores | interaction tests; short-press fix tested | post-fix visual blocked |
| 3 | Clean empty/auto/real target outcomes match state | clean tests; auto-clean observed | final visual blocked |
| 4 | Same input reveals context/personality in acting | selector/reaction tests; ball choice observed | latest comparison blocked |
| 5 | Repeat suppression and safe fallback | content checker 27 reachable | source PASS; runtime latest blocked |
| 6 | Dialogue choice/no-response/close/screen switch has no stuck follow-up | dialogue tests; “옆에서 쉬기” observed | latest matrix blocked |
| 7 | Memory start/complete/interrupt and restart retention | reaction DB/storage tests; 32 active rows | restart latest blocked |
| 8 | Free interaction is resource-neutral; direct/auto meal parity preserved | game tests and meal reducer tests | source PASS |
| 9 | Growth/unlock feedback follows confirmed events without duplicate reward | meal/growth tests | fixture runtime pending |
| 10 | Dev growth/emotion scenarios isolated; migration/recovery preserved | isolated fixture DB; SQLite 12-table equality | source PASS; relaunch latest blocked |
| 11 | New supported reaction data plays without selector code changes | checker 27 reachable | source PASS |
| 12 | Representative input-to-follow-up scene runs in app | Release observations above | partial; post-fix CUA blocked |
| 13 | Body eyes/contact/furniture approach/press/restore/scale compared equally | 3 GLB candidates; geometry tests | 3 bodies × 4 angles blocked |
| 14 | Performance uses actual path/environment; proxies are not FPS | intermediate 0.75 DPR/Lambert 33 ms, GL aggregate 30.125 Hz, RAF p95 16.68 ms | proxy only; no smoothness approval |
| 15 | iOS Simulator/Android Emulator/physical results stay distinct | iOS Release PASS scope; Android/physical NOT_RUN | environment blocked |

## Remaining gate

User route when the Mac unlocks: open installed simulator app “아루콘 개발 셸” → synthetic tool → `SOURCE_SYNTHETIC` reaction/art comparison; run the 10-minute panel/touch/clean, personality/ball choice, growth, 3 bodies × 4 angles, relaunch route. Optional shell: `open -a Simulator`; launch existing build with `xcrun simctl launch booted com.arucon.dev`. No Metro or system install is required.

### 바로 실행하는 방법과 약 10분 비교

현재 Mac의 iPhone 16e Simulator에 Release 평가판이 설치되어 있다. 잠금 해제 후 다음을 실행한다.

```sh
open -a Simulator
xcrun simctl launch booted com.arucon.dev
```

| 시간 | 비교 장면 |
|---|---|
| 0–2분 | 일반 방의 이동·연속 목적지 변경, 기록 열기/닫기, 펫 누르기/놓기, 청소 안내를 확인한다. |
| 2–4분 | `합성 도구` → `SOURCE_SYNTHETIC · 반응/아트 비교`. 같은 기존형으로 시크한/솔직한 표현, 쓰다듬기·공놀이·휴식을 비교한다. `같이 놀기`/`옆에서 쉬기` 선택, 무응답, 닫기와 다른 입력으로 취소도 확인한다. |
| 4–6분 | `성장 전/후`, 수면, 청소 없음/자동/성공을 실행한다. 모두 별도 합성 시연이며 일반 저장이나 실제 성장 속도를 바꾸지 않는다. |
| 6–8분 | 기존형/볼륨+/도톰형을 정면·측면·후면·3/4에서 비교한다. 고정 캡처 전 각도를 전환해 위치를 맞추고, 걷기·눌림·복원도 따로 본다. |
| 8–10분 | `비교 종료`, 앱 background/foreground 및 종료/재실행으로 복원을 확인한다. 눈매·말캉함·반응 다양성·읽기 속도에 대한 사용자 의견을 남긴다. |

### 성능 증거의 범위

| 실험 | 실제 수집 값 | 판정 한계 |
|---|---|---|
| 기존 software profile | GL 제출 간격 중앙값 333.34ms, 약 3회/s 프록시 | 모션 시간 배속이 아니라 제출 제한이었다. |
| 첫 0.5 DPR / 50ms 후보 | 제출 간격 중앙값 66.25ms, 약 15.09회/s 프록시 | 고정 20회/s 목표 실패. |
| 0.75 DPR / Lambert / 33ms 후보 | 약 7.97초 제출 표본 241개, aggregate 30.125Hz; RAF p95 16.68ms | 제출 목표는 통과. 입력 1표본은 insufficient_data. 실제 표시 FPS나 터치→광자 지연은 아니다. |

정적 방과 GLB를 유지하면서 소프트웨어 렌더러에서만 해상도·재질·예약 간격을 조정했다. 낮아진 해상도/재질 차이는 비교 가능한 기술 절충이며 최종 시각 승인이 아니다. 원본 GLB/18 morph/15 clips는 보존했다. 녹화 픽셀 변화 분석은 정지 구간·작은 변형·압축 영향을 받으므로 앱 FPS로 쓰지 않는다. native GL CPU 점유 샘플도 장기 발열/배터리 통과 근거가 아니다. 새 입력 우선순위/각도 수정 이후의 전체 실제 모션 매트릭스는 host lock 때문에 미검증이다.

## Git checkpoint

검토된 소스·필수 후보 자산·지시서·문서만 기존 feature 브랜치에 저장한다. 로그·영상·실제 SQLite·generated native·빌드 결과는 ignored local evidence로 남긴다. 이 문서 자체의 커밋 해시는 최종 응답과 `mobile/evidence/fun-00/git-audit.json`에서 확인한다. main/merge/force/tag/release/배포는 수행하지 않는다.

## Routing record

| Agents actually requested | Role / requested model | Effective model | Work |
|---|---|---|---|
| `fun_input_explore`, `fun_system_explore` | explorer / GPT-5.6 Terra | ROUTING_UNVERIFIED | Failure paths and reusable domain/storage APIs |
| `fun_room_implementation`, `fun_resume_app`, `fun_resume_renderer` | builder / GPT-5.6 Sol | ROUTING_UNVERIFIED | Input, rendering, App integration and runtime fixes |
| `fun_reaction_system`, `fun_resume_reactions` | builder / GPT-5.6 Sol | ROUTING_UNVERIFIED | Selector/dialogue/memory/fixtures and recovery |
| `fun_art_candidates` | builder / GPT-5.6 Sol | ROUTING_UNVERIFIED | Deterministic non-destructive GLB candidates |
| `fun_life_content`, `fun_report_docs` | worker / GPT-5.6 Luna | ROUTING_UNVERIFIED | Bounded content and documentation |
| `fun_independent_review` (interrupted), `fun_resume_review` | reviewer / GPT-5.6 Terra high | ROUTING_UNVERIFIED | Independent source/content/storage/evidence review |

The root coordinated integration, native builds, actual UI observations and checkpoint audit. Spark was not invoked. Role configuration is not proof of the backend model ID.

## Explicit non-results

No final FUN visual/motion matrix PASS, FPS, touch-to-photon, physical-device, Android runtime, or four-evolved-asset completion is claimed. No product rule, economy, public API meaning, library choice, or approval state was changed by this report.

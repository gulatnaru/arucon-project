# FUN-00 fun-first current report

## Current state — 2026-09-27 (latest)

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

# Growth playthrough and native save stability — 2026-10-06

## Current execution: PARTIAL_WITH_BLOCKERS / latest-v5 actual input pending

루미 한 마리가 합성 활동으로 받은 먹이를 자동으로374회 섭취해 Lv.1→20/6,150EXP가 됐다. Lv.16에서 기존 케어 조건으로 모노가 됐고 이름·reserved 성격은 그대로다. 앞발 인사→작은 튀기/방향 장난→번갈아 발 인사/균형/두 박자→새 형태의 자세와 나만의 인사를 연결했다. Growth/reveal은 정상 속도이며 원장과 실제 native 영상으로 확인했다. **이 전체 연속 성장 증거는 v4**이며 최종 재미·아트 승인은 사용자 대기다.

이후 일반 방에서 동일한 저장을 다시 선택하는 **‘최근 성장 체험 이어보기’**를 추가한 v5를 설치했다. 앱 삭제/DB 초기화 없이 v5의 읽기 전용 저장도 같은 petId/name/form/6,150EXP/374meal을 보존했다. **현재 실제 CUA는 Mac locked**를 반환하므로 v5 정상 메뉴/입력/경합 재확인과 현재60초 성능 측정은 BLOCKED/NOT_RUN이다. v4를 v5 실제 조작 통과로 바꾸어 기록하지 않는다. 보고서의 아래 중간 결과는 이력을 유지한다.

최신 **growth-v5 Release SHA `92452f2aad011ba3096dd89ffb56b1545eb8ef6653d00c725bd5bbaaa71d6c12`**, iPhone16e/iOS26.3 Simulator, macOS15.6/Xcode26.3, SDK55/RN0.83.10/React19.2.0. Prepare/compile/install/launch PASS; native SDK 보유 환경이며 입력은 호스트 잠금으로 막혔다. 최신 source374/374·lint/typecheck PASS, Android JS bundle PASS, generated iOS static CNG23/23·workflow42/42 PASS. Android 최신 native/UI, 물리 기기, GPU 표시 타이밍·물리 입력 지연·발열/배터리는 NOT_RUN이다.

| 확인 | 실제 결과/범위 |
|---|---|
| 사용자 원래 오류 | 최초 구형 설치본에서 그대로는 재현 못함. 첫 SQL trace가 없어 당시 문장/콜백은 특정 불가 |
| 잠금 원인/정리 | native 격리 재현: write execute가 code5 BUSY로 실패, finalize가 같은 앞선 오류 반환. 서로 다른 queue/raw settings + 새 exclusive connection 경합을 제거 |
| 같은 요청 | v4 native150개 요청 실패0, 직접 동일 요청30회→meal1, 별도 자동meal1, wake replay full state 동일 |
| 단일 성장 | v4 `life-experience-v1:growth_playthrough:1791218209615` / 루미 / reserved /374meals /6150EXP /20단계 /mono /합성 관찰49일 |
| 표현/자산 | v4 actual video·trace에 level11~19 perform→complete 포함,16 실제 new_stance/form reload; 숫자/스케일만으로 구현한 경로가 아님. V5 같은 motion/assets source 유지 |
| pause/compare | v2 실제 메뉴·이전 모습 비교·touch/move에서 EXP/meal/widget/original 동일. v5 실제 재확인 대기 |
| 저장 보존 | 원본 Sim/food0/coin15/EXP25.125/arucon/reserved, 기존 모든 trials 보존. v5 설치 뒤 읽기 전용 수치 동일 |
| 최신 실제 입력/성능 | v5 CUA 두 번 Mac locked. 현재 proxy/GPU/물리 지연 NOT_RUN; 과거 FPS PASS 재사용 없음 |

### 사용자에게 보이는 실행 방법

잠금 해제 후 Simulator의 아루콘을 열고 메뉴→설정→**최근 성장 체험 이어보기**로 루미를 보거나, **Lv.1부터 키워보기**로 새 격리 개체를 만든다. ‘계속 키우기’를 한 번 누르면 자동 공급/섭취로 성장하고 각 레벨에서20초간 정상 속도의 새 동작을 볼 수 있다. ‘성장 일시정지’, ‘이번 몸짓 보기’, ‘전후 비교’는 보상을 추가하지 않는다. 일반 방으로 돌아가기와 앱 재실행은 저장을 삭제하지 않는다. 최종 v5의 이 실제 입력 경로는 아직 환경 차단으로 미검증이다.

### 다음 한 작업

Mac actual access→현재v5 설치 bundle hash→최근 성장 이어보기로 동일 루미20 선택/원본 복귀→새 같은-build1→20 영상(중간 영상 대체 없음)→native150 경합 재실행→기록/직접 head·body 접촉/이동/background/cold/큰 글자/동작 줄이기→현재60초 proxy gate. 실패 시 해당 원인만 수정/Release/재검증. 실제 화면/최신 저장 안정성이 확인되기 전 READY_FOR_GROWTH_PLAYTHROUGH로 바꾸지 않는다.

SOL_DIRECT / SELF_REVIEW, no subagents. Requested GPT-6.1 Sol Max; effective model ROUTING_UNVERIFIED. The previous PRODUCT_REVIEW_READY, Astra evidence and sleep/input CLOSED remain historical results. This new user-reported save/growth defect supersedes the readiness claim.

Baseline Git HEAD/tracking/live origin `cdb73256ad74b81f9a083e033c322a5d6c98e32d`, feature/arucon-mobile-autonomous, clean. Current installed old app is preserved before replacement. CUA screen/input access succeeded. Original and experience DBs backed up with read-only online backup; integrity ok. No reset/reinstall/rewind used to erase the initial state.

The current selected old profile was `auto_growth#1791213446116`. Normal original pet was Sim/reserved/arucon, food0/coin15/EXP25.125, sleepingfalse/hibernatingfalse. Current old-app touch attempts did not reproduce the user's visible error. Do not attribute the user's exact event without its missing first SQL trace. Code audit found independent game/life-memory queues and raw same-file settings writes; the new isolated native probe must distinguish execute from finalize and exercise the corrected common lane.

## Implemented, pending actual latest Release verification

- Per-file SQL lane for transactions/reads/memory/profile settings, retained retry bounds; statement lifecycle and primary/cleanup error separation. No Expo internal patch, original DB reset or schema downgrade.
- New Lv1→20 separate saved one-pet experience: synthetic activity/sleep/virtual time → existing automatic meals → EXP → existing evolution. No level/EXP/form direct edits after creation. Pause, normal-speed level reveals, reached-level before/after preview, persisted target and pending plans.
- Twenty expression recipes, learned autonomous acts, active exploration/pranks/tricks, contact location/current intent/level/recent experience and fair eligible-line rotation. No click EXP or personality-ID swap.
- The latest-sleep lookup fetches only the matching latest command in SQL, avoiding JS parsing of the complete economic history on each benefit-day check.

## Tool availability

Both repository verification skills were read and applied. Figma connector tools are available, but this native UI/renderer change needs no external design write/upload. No callable Blender/Context7/Maestro tool appeared in this session; local blender/maestro commands were absent. A VS Code Context7 prompt file is not a connected Context7 service. No installation, paid service, external upload or engine switch was performed. Existing GLBs and attachment hierarchy are reused.

## Current executed evidence (still IN_PROGRESS)

Latest Release variant **growth-v4**, embedded bundle SHA `003d451ad1c69a34b19a69bb3689aea85462d976bc7a6c9602b9e394beb89504`. Compile/install/launch succeeded, original DB retained. Intermediate v2 completed a distinct 374-meal/6150EXP/49 synthetic observed-day/mono path; its video is intermediate evidence, not final-v4 PASS.

Final v4 native checker was invoked through the actual settings/diagnostic UI. Its isolated uncoordinated case failed first at execute (`runAsync`, SQLite code5/database is locked) and then at finalize (same code5). Corrected adapter:150 concurrent game/memory/settings/foreground requests, failures0, the same direct-meal request30 times produced exactly one meal, a separate auto meal produced one, wake replay left the full state unchanged, integrityok. This confirms the failure mechanism, not the missing first SQL of the user's original occurrence. Final result `native-contention-v4.json`.

Final normal-menu new profile `growth_playthrough#1791218209615`, petId `life-experience-v1:growth_playthrough:1791218209615`, givenName **루미**, reserved, EXP0/food0/arucon at creation. Current normal automatic growth verification continues from Lv.1. No direct EXP/form/level edits are used. V4 also fixed single-candidate `slice(-0)` history exclusion and connected learned motions to matching content/surprise/playful facial morphs. Actual repeat-growth bubble ‘이게 내 방식이야.’ was visible in the restored intermediate pet on v4 before starting the new run.

Current source checks: **373/373 full tests**, lint/typecheck PASS; Android JS bundle PASS; iOS Release compile PASS. Final actual 1→20/video/input/save/performance evidence will be reconciled after execution. No old 348/360/362 counts were reused.

## Evidence and remaining gates

Local ignored evidence: `evidence/growth-playthrough-2026-10-06/`, including before DB backups/summary and `01-before-storage.mp4`. Final actual build/hash, native checks, all20 levels, touch/menu/profile/background/restart, original/widget preservation and performance will be appended only after execution. Physical-device/GPU/physical-input performance NOT_RUN; fun/final art USER_REVIEW_PENDING.

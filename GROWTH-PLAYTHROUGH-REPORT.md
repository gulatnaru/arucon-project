# Growth playthrough and native save stability — 2026-10-07

## LIFE-02 최신 v5 — READY_FOR_GROWTH_PLAYTHROUGH

같은 모리 한 마리가 EXP 0/Lv.1에서 시작해 합성 활동으로 얻은 먹이를 **자동으로 374회 섭취**, 6,150 EXP/Lv.20에 도달했다. Lv.16에서 기존 케어 조건으로 모노가 됐으며 이름·reserved 성격·petId를 유지했다. 눈맞춤→방향 장난→작은 인사→두 박자→새 형태의 자세→돌아보고 인사하는 몸짓을 실제 앱에 연결한 최신 **growth-v5** 영상이다. 정상 자율 생활에서도 Lv.10의 작은 튀기, Lv.12의 방향 장난 시작(다음 식사로 중단), Lv.16의 Lv.15 두 박자 몸짓, Lv.20의 가까이 기대기와 공놀이를 관찰했다. 진단용 개인기/강제 모델 선택으로 이를 대신하지 않았다. 작은 앞발·표정의 읽기성과 계속 보고 싶은 재미, 최종 아트는 **USER_REVIEW_PENDING**이다.

이번에는 실제 Mac 화면·입력 접근이 성공했다. 착수 HEAD `31a307fbaffda9bc5dba3bdf912d25c9084e26df`, 앱 소스 `6155b22a56d9cf81b33b356cdecb0737f669a61c`, 설치/manifest SHA `92452f2aad011ba3096dd89ffb56b1545eb8ef6653d00c725bd5bbaaa71d6c12`를 대조했다. App/src/package/lockfile 해시가 같아 **앱 변경·재빌드·재설치·DB 초기화·과거 commit reset을 하지 않았다**. macOS15.6/Xcode26.3, iPhone16e/iOS26.3(label)/26.3.1 runtime, Release 내장 번들/Metro 불필요, SDK55/Expo55.0.31/expo-sqlite55.0.20/RN0.83.10/React19.2.0이다.

### 같은 최신 설치본에서 실제 확인한 경로

| 확인 | 이번 실행 결과 |
|---|---|
| 요청한 첫 이어보기 | 일반 Sim→정상 메뉴/설정→최근 성장 이어보기→기존 루미20→직접 head/body 접촉·자율 생활→일반 방→앱 종료/재실행→동일 루미20. PASS_ACTUAL_SIMULATOR |
| 격리 native 경합/재시도 | 최신 v5의 정상 설정/진단 메뉴에서 150 요청, 수정 경로 실패0. 같은 직접 식사 요청30회→섭취1, 별도 자동섭취1, wake replay full state 동일, integrity ok |
| 최초/정리 오류 구분 | 격리된 무조정 비교에서 runAsync execute code5가 먼저, finalizeAsync code5가 뒤. 최초 사용자 사건의 정확한 SQL/콜백은 당시 trace 부재로 특정 불가. 그 SQL을 찾았다고 주장하지 않음 |
| 새 연속 성장 | 모리 / `life-experience-v1:growth_playthrough:1791298466103`, 시작 EXP0/food0/arucon,20개 순차 checkpoint/374개 고유 meal ID/합성49일/진화1회. 모든 EXP는 MealConsumed 합계와 일치 |
| 일반 서비스·저장 | 체험의 실제 공급·자동 식사·수면/wake·진화, 원래 방의 전경 정산·직접 교감·설정 ON/OFF·프로필 전환·cold restore에서 오류/영구 입력 잠금 미재현. 격리 검사와 일반 앱 조작을 구분 |
| 일시정지/전후 비교 | Lv.10→읽기 전용 Lv.1 비교→현재 모습→직접 교감. EXP1,950/meal118 그대로, 보상·레벨·진화 되감기 없음 |
| 최신 성장 저장 복원 | 모리20→일반 방→앱 종료/재실행→정상 최근 성장 이어보기→같은 모리20→직접 접촉·대화 닫기·이동. PASS_ACTUAL_SIMULATOR |
| UI/입력 | 기록 열기/닫기, 직접 손길·후속 생활, 연속 목적지 변경, 실제 Home/앱 아이콘 background/foreground, 동작 줄이기 ON 이동/OFF 복원, 큰 글자·방 가장자리 말풍선/닫기 확인 |
| 원본·기존 루미·위젯 | Sim/arucon/reserved/food0/coin15/EXP25.125/meal3 및 루미/mono/reserved/coin2140/EXP6150/meal374 보존. 체험 중 일반 위젯 전체 snapshot 동일, petId=dev-local-pet-1. 이번 홈 복귀는 앱 아이콘 입력이며 위젯 탭으로 재표기하지 않음 |

일반 원본 시간을 조작하지 않았다. 새 체험만 기존 가상 시계와 정상 서비스를 사용했으며 시작 후 pet의 레벨/EXP/형태 직접 수정은 없다. 최종 두 DB schema7/integrity ok, 새 체험 pending command0·pending plan null·target null·양수 수면 회복의 중복 일자0, EvolutionFormApplied1. 실제 건강 읽기/실결제 OFF, 외부 서비스·권한·OS 보안 설정 변경 없음.

### 최신 영상과 장면 찾기

로컬 ignored 위치: `/Users/heung/projects/arucon-project/evidence/life-02-unlocked-2026-10-06/`. 두 영상은 현재 v5의 **무편집·정상 속도 native 화면 녹화**이며 실제 AVFoundation 디코딩/시각 대조를 했다. `01-v5-rumi-resume-native.mp4` **19분48.177초**(루미 복귀·경합·입력), `10-v5-new-pet-growth-playthrough.mp4` **33분50.072초**(생활/복귀·새 모리 생성·1→20·큰 글자·비교·원본/새 성장 복원). 중간 v4 영상을 최신 증거로 사용하지 않았다.

아래는 두 번째 영상의 재생 시각이다. 성장 행은 실제 섭취 확정 후의 성장 표현이며 자동 생활 행과 구분한다. trace의 perform→complete 및 디코딩된 전/중/후 프레임을 함께 확인했다.

| 장면 | 영상 시각 | 실제 변화 |
|---|---|---|
| Lv.1 |13:02~13:08|시선·몸 기울이기, ‘여기부터 볼까.’ |
| Lv.5 |15:14~15:20|방향 속임과 장난 표정, ‘이쪽인 줄 알았어?’ |
| Lv.10 |18:10~18:16|몸 낮추기·앞발 인사, ‘내 인사는 이거야.’ |
| Lv.15 |22:31~22:37|앞발 두 박자·돌아보기, ‘두 번이면 알겠지.’ |
| Lv.16 |22:53~22:59|실제 모노 모델·새 자세·놀람 표정, ‘자세가 달라졌네.’ |
| Lv.20 |26:27~26:33|방향 전환·인사·복원, ‘이게 내 방식이야.’ |
| 일반 자율 개인기 |19:55~,21:39~,24:15~|Lv.10 작은 튀기, Lv.12 방향 장난 시작 후 식사로 중단, Lv.16에서 배운 두 박자. automatic=true/replay=false |
| 성장 후 일반 생활 |26:49~,27:07~,27:24~|Lv.20 까꿍·가까이 기대기·주변 살피기와 공놀이. 강제 장면 버튼 미사용 |

세부 장면은 `24-video-scene-index.json`, `20-complete-growth-timeline.json`, `growth-frame-review/`에 있다. 20개 성장 몸짓 모두 perform→complete, 주목 레벨6개는 실제 프레임으로 확인했다. 모든 새로운 개인기가 이번 무작위 관찰에서 자율 선택됐다고 주장하지 않는다. Lv.20 signature는 실제 성장 표현으로 확인했고 정상 생활의 도달성은 공통 selector/회귀 검사로 확인했다.

### 현재 성능 — proxy gate PASS / 실기기·GPU·물리 지연 NOT_RUN

같은 v5 Release·루미20/모노·같은 방·software_balanced·동작 줄이기 OFF,60초 고정 구간으로 녹화 ON/OFF를 확인했다. 기준은 RAF p95≤33.34ms, 제출≥30Hz, 입력→다음 제출 p95≤100ms(5표본 이상),500ms 초과 gap0 그대로다. 호스트의 당시 CPU/온도 부하를 수치로 계측하지 않았고 녹화만 원인이라고 단정하지 않는다. 이 구간에는 위의 새 테스트/lint/typecheck를 병렬 실행하지 않았다. 큰 글자/동작 줄이기 설정은 원래대로 복원했다.

| 구간 | 길이 | 제출 proxy Hz | RAF p95/max ms | 입력 n / p95 ms | >500ms gap | 판정 |
|---|---:|---:|---:|---:|---:|---|
| ON A |60초|59.25|17.77 /125.13|0 /미측정|0|프레임 PASS, 입력 INSUFFICIENT_DATA. 바닥 이동은 현재 probe 계측 대상 아님 |
| ON B |60초|52.28|30.24 /87.58|7 /21.07|0|모든 proxy gate PASS |
| OFF A |60초|53.38|29.56 /42.91|12 /21.95|0|모든 proxy gate PASS |

입력은 Simulator의 실제 클릭/드래그를 RN이 touch로 분류한 표본이며 물리 터치 지연이 아니다. RAF/endFrameEXP 제출/영상 인코딩 FPS는 GPU 표시 FPS가 아니다. 소프트웨어 Simulator에서 긴 정지나 대화·메뉴 뒤 영구 잠금은 관찰하지 않았으나 실제 기기·GPU·input-to-photon·발열·배터리는 **NOT_RUN**이다. Android 최신 native/UI는 이번 범위 **NOT_RUN**, 과거 Windows Android/이전 bundle·CNG·Release compile은 이력으로 유지한다.

### 현재 검사·SELF_REVIEW·사용자 실행

이번 새 실행: `npm test` **376/376**(실패/skip0), `npm run typecheck`, `npm run lint` PASS. 과거374/348/360을 새 실행 숫자로 복사하지 않았다. 운영/문서 정합성 검사 `validation/check_workflow.py`도 이번에 **42/42 PASS**. 새 결과는 로컬 evidence에 보존하고 추적된 과거 generated 검사 파일은 그대로 유지했다. 앱 소스가 같으므로 native/JS bundle 재빌드는 하지 않았다. Context7은 이번 실제 호출 목록도0개라 문서 호출 NOT_RUN_TOOL_NOT_EXPOSED, 설치/중복 등록 없이 이전 정확한 SDK55 원문 감사 근거를 유지했다.

**SELF_REVIEW**: 기능 품질은 저장/연속 성장/진화/입력/복원 확인, 표현 품질은 실제 몸짓·표정·대사·후속 행동의 연결 확인이다. 게임 재미·작은 앞발/표정 가독성·최종 아트는 사용자 검토 대기이며 별도 독립 리뷰라고 기록하지 않는다. SOL_DIRECT, 새 subagent0, 요청 GPT-6.1 Sol Max/effective ROUTING_UNVERIFIED. 이번 미완료는 실기기/Android 최신 native·GPU/물리 계측과 사용자 재미·아트 평가이며 현재 iOS Simulator LIFE-02 검토의 host-lock blocker는 해소됐다. SRS 전체 출시 완료로 확대하지 않는다.

현재 앱은 **모리 Lv.20**에서 바로 볼 수 있다. 메뉴→설정→**최근 성장 체험 이어보기**는 가장 최근 모리를 연다. 기존 루미는 삭제되지 않았고 첫 검증에서 정상 이어보기/재실행을 확인했다. 새 1→20을 볼 때는 메뉴→설정→**Lv.1부터 키워보기**→이름→함께 지내기→계속 키우기를 한 번 누른다. 성장 일시정지/전후 비교가 가능하고 일반 방으로 돌아가도 저장을 지우지 않는다. 건강 연결 없는 합성/가상 시간 체험임을 유지한다.

Git은 기존 feature의 문서 checkpoint/일반 push 범위다. 최종 staged 파일·로컬/추적/live-origin 해시·clean 결과는 같은 증거 폴더의 `git-final-audit.json` 및 최종 응답에 남긴다. 영상/DB/native/build/node_modules/비밀은 stage/외부 업로드하지 않는다.

## Historical — LIFE-02 v5 마무리 시도 / 잠금 중 2026-10-06

현재 체크포인트 `a43ff69`에서 이어갔다. Git 작업 트리는 clean이고 `6155b22` 이후 App/src/package/lockfile 변경은 없다. 실제 설치 번들 SHA `92452f2aad011ba3096dd89ffb56b1545eb8ef6653d00c725bd5bbaaa71d6c12`가 growth-v5 manifest와 일치하며 모든 앱 소스 파일 해시도 같았다. 재빌드·재설치·DB 초기화를 하지 않았다.

두 DB를 읽기 전용으로 확인하고 온라인 백업했다. schema7/integrityok. 일반 Sim/reserved/arucon/food0/coin15/EXP25.125/meal3, 기존 루미/reserved/mono/EXP6150/meal374/coin2140이 보존됐다. 현재 선택은 `growth_playthrough#1791218209615`이며 잠금 해제 뒤 정상 메뉴로 일반 방을 먼저 선택할 예정이다. 이 DB 확인은 실제 메뉴/복원/입력 검증의 PASS가 아니다.

이번 현재 CUA 접근 세 번 모두 **Mac locked**였다. 잠금 해제를 요청했으며 보안 설정을 우회하지 않았다. Context7 실제 호출 도구도 현재0개였다. 플러그인 설치 상태와 직접 MCP 등록형의 차이는 이전 감사 그대로 유지하고 중복 등록/새 설치/권한 변경을 하지 않았다.

| 남은 현재 v5 검증 | 현재 결과 |
|---|---|
| 일반 방→최근 성장 이어보기→기존 루미20→접촉/자율 생활→일반 방→재실행→동일 루미 | BLOCKED_HOST_LOCKED / NOT_RUN |
| 격리 native 경합·동일 요청·정산 중복 방지 및 일반 앱 정산/교감/설정/프로필 전환 | BLOCKED_HOST_LOCKED / NOT_RUN |
| 새 별도 개체의 최신1→20 영상,1/5/10/15/16/20 장면 시각 | BLOCKED_HOST_LOCKED / NOT_RUN |
| 정상 자율 개인기·몸짓/표정/대사 비교 | BLOCKED_HOST_LOCKED / NOT_RUN; 진단 재생으로 대체하지 않음 |
| 최신 입력·background/cold·큰 글자·동작 줄이기·60초 성능 proxy | BLOCKED_HOST_LOCKED / NOT_RUN |

증거 `evidence/life-02-v5-finish-2026-10-06/baseline.json`, `before-arucon-dev.db`, `before-arucon-life-experience.db`, `current-access.json`은 로컬 ignored 위치에 있다. 이번에 앱 변경이나 검사 재실행은 없으며 과거16/16·374/374·v4 영상/경합을 새 PASS로 재사용하지 않는다. Source build 대응과 저장 보존만 새로 확인했다. 재미·최종 아트 USER_REVIEW_PENDING, 실기기/GPU/물리 입력 NOT_RUN을 유지한다.

## Historical — LIFE-02 Context7 / SQLite 버전 감사

현재 Codex의 실제 호출 목록에서 Context7 도구는0개다. 플러그인 관리 조회는 Context7이 설치·ENABLED임을 확인했으므로 미설치라고 단정하지 않는다. 다만 현재 세션에서 문서 조회 호출은 NOT_RUN_TOOL_NOT_EXPOSED다. user/project `config.toml`의 직접 MCP 항목에도 Context7이 없었다. Codex에서 기존 Context7의 활성/노출을 확인하고 세션을 새로 여는 것이 먼저다. 직접 MCP 등록이 필요하면 공개 remote URL `https://mcp.context7.com/mcp`를 이용할 수 있으며, 이 작업에서 설정 변경/설치/권한 확대는 하지 않았다.

Expo55.0.31 / expo-sqlite55.0.20을 package.json·lock·설치본에서 대조했다. SDK55 공식 문서의 권장55.0.20과 일치하며 npm gitHead의 원본 소스도 설치본과 SHA256가 같았다. 트랜잭션 내부는txn으로 실행하고, 밖의 비동기 쓰기는 exclusive API가 자동 대기시키지 않는다는 조건을 확인했다. `SQLITE_BUSY`는 다른 연결 경합이며 finalize는 앞선 실행 실패를 전달할 수 있다. 원문 URL·버전·해시는 [ADR-015](docs/adr/ADR-015-sqlite-access-and-growth-playthrough.md)에 기록했다.

현재30개 콜백과 helper 전달, 정산/접촉/생활 기억/설정/프로필 전환의 파일 대기열 경로를 감사했다. 새로운 우회 경로는 발견되지 않았다. 실제 기존 native 재현은 execute code5가 먼저, finalize code5가 뒤였다. 이 근거의 현재6155b22 구현을 유지하고, 재시도 시간을 늘리거나 API 이름만 바꾸지 않았다. 정리가 늦어지는 동안 외부 쓰기가 대기하는지와 정리 자체 실패를 구분하는 회귀를 추가해 **이번 영향16/16**, typecheck/lint PASS를 새로 실행했다. 과거374/374를 이번 전체 실행으로 복사하지 않았다.

이번 실제 Simulator 접근도 두 번 **Mac locked**였다. 현재 v5의 저장 안정성/동일 개체1→20/정상 입력/성능은 아래 남은 검증을 그대로 이어간다. 문서 조회나 Context7 설치 상태 확인을 LIFE-02 완료로 보고하지 않는다. 상태는 PARTIAL_WITH_BLOCKERS, 재미·최종 아트 USER_REVIEW_PENDING이다.

## Historical — PARTIAL_WITH_BLOCKERS / latest-v5 actual input pending

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

### Git / 빌드 대응

앱 소스 checkpoint **6155b22a56d9cf81b33b356cdecb0737f669a61c**. v5는 cdb7325의 작업 트리로 빌드됐고, 이후 이 checkpoint의 App/src/lockfile 전체 파일 해시가 빌드 manifest와 일치했다. Source code 변경 없이 보고/상태만 후속 갱신한다. Feature 일반 push만 수행하며 actual 로컬/추적/live-origin 해시 및 최종 clean 상태는 최종 보고와 `git-final-audit.json`에 남긴다. 영상·DB·로그·CNG/native/build/node_modules/.expo·비밀은 staged되지 않았다.

### 로컬 영상과 화면 증거

`evidence/growth-playthrough-2026-10-06/09-v4-final-native-growth.mp4`는 **17분41.137초**의 무편집 정상 속도 영상이다. AVFoundation 실제 디코딩과 프레임 확인을 했다. 약250초에 루미 Lv1,400초에 Lv9/식사·말풍선,650초에 Lv20/mono/합성49일이 보인다. v4 selection trace에는 level11~19의 서로 다른 body recipe perform→complete와16의 new_stance가 있다. 이 프레임은 해당 시각의 시각 증거이며 정지 프레임이나 인코딩 FPS를 모션·GPU·입력 지연 측정으로 취급하지 않는다. 최신v5 실제 플레이/성능은 별도 환경 차단으로 남긴다.

`01-before-storage.mp4`(구형), `02-v2-native-storage-and-growth.mp4`(중간), before DB backups, `native-contention-v4.json`, `10-growth-v4-start.json`, `13-v4-live-growth.json`, `14-v5-preserved-state.json`, `release-v5-manifest.json`, `v4-frame-review/`를 같은 ignored 폴더에 보존했다. 기본 sandbox의 AVFoundation decode는 실패했으나 로컬 파일 분석에 허용된 실행에서 실제 decode 성공했다. 호스트 화면 잠금/입력 차단과 과거 저장 영상 분석을 구분했다. 외부 업로드 없음.

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

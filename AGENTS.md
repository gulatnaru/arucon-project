# Arucon — 공통 작업 기준 v1.9

제품 기준은 `docs/arucon-SRS.md` v1.9다. 2026-09-19 사용자 승인 여섯 MVP 기본 정책과 가역 config/ADR 위임을 적용한다. **2026-10-04 현재 직접 개발 책임자의 요청 모델은 GPT-6.1 Sol Max이며 SOL_DIRECT / AUTONOMOUS PRODUCT HARDENING으로 운영한다.** 직접 설계·구현·디버깅·실제 앱 검증과 SELF_REVIEW를 책임지고 새 subagent를 기본적으로 생성하지 않는다. 설정의 요청 모델과 실제 effective model 확인은 구분한다. 2026-09-28 이후 ASTRA_DIRECT의 완료 증거·과거 ENG-03 역할 설정·결정 이력은 보존한다.

## 현재 제품 품질 강화
- REBOOT-04의 현재 승인 범위는 `tasks/REBOOT-04-personality-foundation.md`다. 게임용 네 연속 성격 축·대표3종의 실제 생활/교감/표정과 분리된 검토 저장을 구현한다. 같은 공통 네발 후보가 필요하면 한 종만 별도 준비하고 기존 A/B/C/원본을 보존한다. 과거 새 기능 제한은 이번 명시 승인 범위를 막지 않는다. 16종 전체·성장기/진화형 전체·상점/AI/경제 확대와 일반 저장의 성격 소급 변경은 하지 않는다. STORAGE-01의 원래 VFS 인과원인은 OPEN으로 유지한다.
- 2026-10-10 REBOOT-03.2는 `tasks/REBOOT-03-2-global-visual-quality.md`다. 전체 방/캐릭터의 실제 native 해상도·AA·곡면/normal/기본 눈 균형을 분리해 개선하고 DPR1.5/2/2.25/2.5/3·지원AA·fresh60초 proxy를 비교한다. A/B/C·기존 저장/정책을 보존하고 최종 렌더 채택은 사용자 검토 전 확정하지 않는다.
- 2026-10-09 REBOOT-03.1 현재 범위는 `tasks/REBOOT-03-1-hybrid-baby-c.md`다. 사용자 A +35의 낮고 둥근 모찌 실루엣/얼굴/큰 앞발 선호를 기준으로 Blender C 한 후보를 별도 제작한다. A/B 및 원본 .blend/GLB를 보존하고 기본 A를 유지한다. A/B/C +25/+35 실제 동일조건 비교·정상속도 영상·CPU morph/GL 대기/제출 비용을 검증한다. 최종 채택·아트·재미·크기 미확정, 성장기/진화형/상점/AI/경제/저장 확장 없음.
- 2026-10-09 현재 범위는 `tasks/REBOOT-03-blender-baby-ab.md`다. 사용자 v8 외형·표정·움직임 개선의 긍정 평가를 보존한다. A=v8 기본값/원본을 유지하고 B=실제 Blender 제작 아기 한 종류를 같은 앱·조건에서 비교한다. Blender 미설치 시 명시적 설치 승인을 먼저 받으며 MCP 없이 Blender Python 제작이 가능하다. 성장기/진화형·경제·수면/동면·AI 확장 없음. 최종 A/B 채택·아트·재미·크기는 사용자 판단이며 재내보내기만으로 Blender 제작 완료를 주장하지 않는다.
- 2026-10-08 REBOOT-02는 `tasks/REBOOT-02-baby-charm.md`가 현재 범위다. 사용자 판정 REWORK_REQUIRED — CHARACTER/MOTION/EXPRESSION을 적용하고 아기 한 마리의 얼굴·연결된 자율 생활·상황별 교감·작은 말풍선·+15/+25/+35% 실제 크기 비교만 진행한다. REBOOT-01 READY는 과거 기능 검토이며 제품 만족 승인이 아니다. 성장기/진화형 대량 제작은 아기 검토 뒤로 미룬다. 저장·경제·성장·수면/동면 엔진을 다시 만들지 않고 최종 크기·아트·재미를 임의 승인하지 않는다.
- 2026-10-07 REBOOT-01은 `tasks/REBOOT-01-core-experience-and-memory.md`가 현재 첫 개발 범위다. 사용자 LIFE-02 재미 불충족 평가를 유지한다. 한 계열의 세 성장 후보·교감·모자/이동 휴식 소품·구조화된 기억과 실제 로컬 AI 비교를 별도 검토 프로필에서 직접 구현할 수 있다. 아래의 ‘새 기능 확대 금지/현재 설치본 우선’은 이전 LIFE-02 hardening 범위이며 이번 명시 승인 범위를 막지 않는다. 경제·기존 저장/원본 아트·보안 경계와 검사 기준은 그대로 유지한다. 잠재 기질의 성장 표현은 비교용이며 일반 저장의 personality ID를 바꾸지 않는다. 후속 전체 상점/먹이 가격/구매 변기 이전은 이번 범위 밖이다.
- 소스6c76c9b·인계1d234d8에서 이어간다. 실제 HEAD/dirty/원격/설치본을 확인하고 과거 commit으로 reset하지 않는다.
- 현재 설치된 Release를 먼저 제품 관점으로 관찰한다. 재현되는 명백한 기능 결함·화면 깨짐·상태 불일치·입력 잠금에 한해 기술 수정한다. 새 기능을 무작정 추가하지 않는다.
- 재현 → 원인 → 수정 → Release → Simulator 정상 조작 → 시간/저장/입력 회귀 → SELF_REVIEW를 직접 반복한다. 자체 검토를 독립 리뷰라고 기록하지 않는다.
- 사용자의 걷기·달리기·수면 결과에 따른 성장과 자율 식사·휴식·화장실·탐색·장난·기질/버릇을 제품 목표로 유지한다. 실제 건강 연결 OFF에서의 합성 검증과 실데이터 연결은 구별한다.
- 기능 품질 / 표현 품질 / 게임 재미를 분리해 검토하고 테스트 개수로 완료를 판단하지 않는다. 반환은 PRODUCT_REVIEW_READY, 실제 환경/권한 BLOCKED, 성장·경제·진화 규칙 변경 필요, 사용자 캐릭터/재미 선택 필요 중 해당 사유로 한다.
- 실기기·GPU·물리 입력 성능 NOT_RUN, 재미·최종 아트 USER_REVIEW_PENDING을 유지한다. 기존 feature checkpoint/일반 push만 허용하며 main/merge/deploy/실건강/실결제 권한은 확대하지 않는다.

## 안내판
- LIFE-01 실행 이력: `tasks/LIFE-01-autonomous-growth-resume.md` — 화면 복구 후 자율 생활·성장·발견을 검증했다. 당시 ASTRA_DIRECT/SELF_REVIEW 증거는 보존하며 현재 운영은 SOL_DIRECT를 따른다.
- LIFE-00 개편 이력: `tasks/LIFE-00-living-pet-overhaul.md` — 2026-09-29 ASTRA_DIRECT 직접 구현·검증. FUN의 관련 UX·행동·아트 기준과 과거 증거를 계승하며 현재 운영은 SOL_DIRECT다. 재미·최종 아트는 USER_REVIEW_PENDING이다.
- FUN-00 개편: `tasks/FUN-00-overhaul.md`, `docs/fun-first-plan.md` — 기존 저장/정책/원본을 보존한 플레이 개편. 체형 두 후보 제작은 허용하며 최종 재미·아트는 USER_REVIEW_PENDING이다.
- 자율 개발 시작: `tasks/AUTO-00-orchestrate.md`
- 모델 라우팅: `docs/model-routing.md`
- 제품 동작/승인 상태: 관련 SRS FR + `docs/decisions.md`의 관련 DEC
- 화면/모션: FR-10.1/16 + `docs/personality-life-design.md` + 최신 `references/floor-navigation-03/`
- 캐릭터 이름: `docs/character-naming.md` — 공통형=아루콘, 1차=말루/모노/피코/몽글. 형태와 성격은 분리한다.
- 검증: `docs/validation-policy.md`, `validation/commands.json`, 실제 저장소의 더 강한 필수 검사
- Hard Stop: `docs/hard-stops.md`

## 모든 구현이 지켜야 할 제품 사실
- EXP는 실제 섭취에서만 생긴다. 직접 급식과 opt-in 식탁 자동급식은 같은 조건·효율이다.
- 실제 걷기·달리기와 무료 가벼운 쓰다듬기·인사·관찰은 펫 체력을 깎지 않는다.
- 성격과 자동화는 경제적 우열을 만들지 않는다.
- 기운 없음은 청결 방치만 원인이고 약 없이 회복 가능하다. 화장실에 유지비·고장·새 청소 숙제를 붙이지 않는다.
- 먹이 상한으로 기존 보유량을 회수하지 않는다. 사망·영구 손실·사용자 비난·효율 현금 구매 우회를 만들지 않는다.
- 건강 원본·비밀은 서버·일반 로그·외부 도구로 내보내지 않는다. PC/위젯/배경화면 표시·교감으로 보상을 중복 지급하지 않는다.
- P2 소셜, P3 번식, 2차 진화, PC/배경화면은 현재 모바일 본앱 자율 개발 범위와 섞지 않는다.
- 밸런스는 config에서 읽고, 도메인·저장·표시·OS 어댑터를 분리한다.

## 자율 실행 완료 조건
- 현재 최종 기준은 SRS §14/§14-1 전체다. APP-01~06은 기존 구현 이력이며 작업 범위를 제한하지 않는다. 승인된 여섯 기본 정책의 가역 config는 구현하고, 실제 외부·환경 경계만 대기열로 남긴다.
- APP-01→06은 가능한 독립 범위를 연속 진행한다. 게이트 보고만 위해 사용자 응답을 기다리지 않는다.
- 각 변경은 영향에 맞는 검사와 저장소 필수 검사를 통과해야 한다. 작고 되돌릴 수 있는 변경에 불필요한 전체 테스트를 반복하지 않는다.
- 실패/미실행/확인 불가/결정 대기를 PASS와 분리한다. 테스트 삭제·완화·기대값 조작으로 성공시키지 않는다.
- 화면·모션 변경은 실제 앱 렌더 증거를 남긴다. 정지 화면으로 모션/FPS를 승인하지 않는다.
- APP-06 종료 시 `AUTONOMOUS-RUN-REPORT.md`, `AUTONOMOUS-STATUS.json`, 실제 명령/환경/증거, Hard Stop, Git·외부 반영 여부를 남긴다.

## 제품 결정과 권한 경계
- OPEN/PROPOSED 제품 선택을 임의로 APPROVED로 바꾸지 않는다. interface/feature flag/dev fixture/DecisionRequired로 격리하고 독립 작업은 계속한다.
- 실제 건강정보, 실사용자 인증·외부 계정/클라우드 생성, 실결제, 공개/운영 배포, 원격 push/merge, 공유권한 변경, 파괴적 삭제/마이그레이션, 승인 아트의 큰 재디자인은 `docs/hard-stops.md`를 따른다.
- 로컬 코드/문서 수정, 프로젝트 로컬 의존성·lockfile, 합성 데이터, 로컬 DB, 테스트/lint/typecheck/build, 로컬 simulator/emulator, 캡처/로그는 허용 범위다.

## 현재 운영과 과거 역할 라우팅

현재 SOL_DIRECT 제품 품질 강화에서는 아래 분업 지침을 강제 적용하지 않는다. 단계별 별도 reviewer를 요구하지 않으며 자체 검토는 `SELF_REVIEW`로 명시한다. 제품 요구·테스트 기대값·검증 증거·보안/외부 권한은 그대로 유지한다. 아래는 기존 ENG-03 역할 이력이다.
- 긴 계획·게이트 조율·교차 모듈 판단·최종 통합은 루트 Astra가 맡는다.
- 고난도 구현/아키텍처는 `arucon_builder`.
- 탐색·대량 읽기·호출경로 수집은 `arucon_explorer`.
- 독립 검토는 `arucon_reviewer`.
- 같은 형태의 좁은 반복 수정은 `arucon_luna_worker`.
- 짧고 표적화된 즉답형 코딩 반복은 사용 가능할 때 `arucon_spark_worker`.
- 같은 파일의 동시 작성자는 하나다. 읽기 역할은 제품 코드를 수정하지 않는다.
- 위임 브리핑에는 **결과 / 제약·허용 파일 / 검증 / 멈출 지점**을 넣는다.

과거 ENG-03의 오케스트레이터 분업과 ASTRA_DIRECT 직접 구현은 이력이다. 현재는 요청된 GPT-6.1 Sol Max가 직접 개발을 책임지며 새 subagent를 기본적으로 생성하지 않는다. 과거 하위 역할 파일은 삭제하거나 현재 수행 기록으로 바꾸지 않는다.

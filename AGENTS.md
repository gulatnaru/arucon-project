# Arucon — 공통 작업 기준 v1.9

제품 기준은 `docs/arucon-SRS.md` v1.9다. 2026-09-19 사용자 승인 여섯 MVP 기본 정책과 가역 config/ADR 위임을 적용한다. **2026-09-28 품질 복구·FUN 개편은 ASTRA_DIRECT 모드**다. Astra가 설계·구현·디버깅·실제 앱 검증을 직접 책임지고 새 서브에이전트를 생성하지 않는다. 과거 ENG-03 역할 설정과 결정 이력은 보존한다.

## 안내판
- 현재 LIFE-00 개편: `tasks/LIFE-00-living-pet-overhaul.md` — 2026-09-29 ASTRA_DIRECT 직접 구현·검증. FUN의 관련 UX/행동/아트 범위를 갱신한다. 새 서브에이전트 없이 진행하며 재미·최종 아트는 USER_REVIEW_PENDING이다.
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

이번 품질 복구·FUN 개편에서는 아래 분업 지침을 실행하지 않는다. 단계별 별도 reviewer를 요구하지 않으며 자체 검토는 `SELF_REVIEW`로 명시한다. 제품 요구·테스트 기대값·검증 증거·보안/외부 권한은 그대로 유지한다. 아래는 기존 ENG-03 역할 이력이다.
- 긴 계획·게이트 조율·교차 모듈 판단·최종 통합은 루트 Astra가 맡는다.
- 고난도 구현/아키텍처는 `arucon_builder`.
- 탐색·대량 읽기·호출경로 수집은 `arucon_explorer`.
- 독립 검토는 `arucon_reviewer`.
- 같은 형태의 좁은 반복 수정은 `arucon_luna_worker`.
- 짧고 표적화된 즉답형 코딩 반복은 사용 가능할 때 `arucon_spark_worker`.
- 같은 파일의 동시 작성자는 하나다. 읽기 역할은 제품 코드를 수정하지 않는다.
- 위임 브리핑에는 **결과 / 제약·허용 파일 / 검증 / 멈출 지점**을 넣는다.

과거 ENG-03에서는 루트가 기본 구현자가 아니었으나, 현재 ASTRA_DIRECT 범위에서는 Astra가 직접 구현하고 검증한다. 재위임은 새로운 사용자 지시 전까지 중단한다.

# APP-06 — 통합 QA + 개발 빌드

자율 게이트: **G6 / 자율 실행 종료 게이트**  
관련: 전체 모바일 MVP 중 현재 구현 가능한 범위, SRS 14장, validation-policy

## 권장 역할
- 통합 수정: `arucon_builder`; 교차 게이트 충돌만 루트 Astra
- 증거/누락 탐색: `arucon_explorer`
- 반복 QA fixture/문서 정리: `arucon_luna_worker`
- 최종 독립 검토: `arucon_reviewer`

## 목표

APP-01~05를 하나의 설치형 개발 앱으로 통합하고, **실제로 구현/검증된 범위와 Hard Stop 때문에 미완인 범위를 분리한 개발 후보**를 만든다. MVP 출시 완료라고 과장하지 않는다.

## 통합

1. 앱 시작→로컬 onboarding→방→합성 activity→food/coin→meal→EXP→생활/저장→reload 흐름을 연결한다.
2. local/offline 상태에서 반복 실행·background/foreground·clock advance·migration·duplicate command를 검증한다.
3. 캐릭터 form catalog는 아루콘/말루/모노/피코/몽글을 표시할 수 있지만 DEC-08 실제 resolver는 비활성.
4. 실제 health/auth/payment/server/public deployment는 feature flag OFF 또는 interface only.
5. dev fixture와 production-ready code path를 혼동하지 않도록 build config/feature flag 문서화.

## QA

- 전체 unit/integration/E2E/lint/typecheck/build.
- 앱 시작/복귀/저장/바닥이동/쓰다듬기/식사/자동식사 fixture/화장실 fixture/수면 fixture/widget projection.
- 개인정보 검사: 건강 원본/비밀이 로그·원격 요청 payload에 없음.
- 경제 invariant 전수: 걸음→EXP 직접 없음, 걷기 stamina 감소 없음, free interaction 중립, utility cash 없음, widget/표시 중복 보상 없음.
- 실제 앱 화면 캡처/영상. 가능한 simulator/emulator build artifact 경로 기록.
- reviewer가 SRS 14장의 각 항목을 `PASS/PARTIAL/BLOCKED/OUT_OF_SCOPE`로 대조.

## 산출물

- `AUTONOMOUS-RUN-REPORT.md`
- `AUTONOMOUS-STATUS.json`
- `docs/adr/` 기술 결정
- test/build logs
- screenshots/video
- Hard Stop decision brief
- `NEXT-RESUME.md`: 사용자 결정 후 정확히 어디서 재개할지

## 완료 판정

`AUTO-DEVELOPMENT: PASS`는 **자율 허용 범위의 모든 게이트가 PASS 또는 명시적 Hard Stop PARTIAL로 종료되고, 알려진 failing test를 숨기지 않았을 때**만 쓴다. 이것은 App Store 출시/MVP 전체 완료를 뜻하지 않는다.

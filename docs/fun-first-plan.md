# FUN-00 실행 계획 — 2026-09-27

> 2026-09-28 현재 운영: ASTRA_DIRECT. 아래 역할 배정은 이전 실행 이력이다. 새 서브에이전트 없이 정상 사용자 경로의 쓰다듬기→몸/표정→펫 근처 말풍선→후속 행동→이동을 직접 복구·검증한다. 자체 검토는 SELF_REVIEW이며 완료/재작업/환경 차단을 구분한다.

Baseline `55c03ec`, branch `feature/arucon-mobile-autonomous`. 사용자 작성 FUN-00 지시서와 현재 소스/저장/원본 GLB를 보존한다. 이번 승인 범위는 입력 복구, 반응·대화·기억·성장 표시, 공통 아기형 두 비교 후보다. 경제/진화/성격 형성 산식과 출시 기준은 바꾸지 않는다.

## 순서와 책임

1. FUN-01: 기록창 닫기/입력 취소/청소 피드백을 실제 앱에서 재현한다. 기존 iOS software renderer 333ms 제출 제한과 실제 보이는 갱신을 분리 측정한다. Sol은 App/scene을 소유한다.
2. FUN-02: 쓰다듬기·공놀이·휴식의 입력→상황→반응→선택/후속 행동→기억 연결을 먼저 만든다. 별도 Sol은 pure reaction/state/memory 경계를 소유하며 App 소유자에게 API를 전달한다.
3. FUN-03: Luna는 검증된 데이터 계약으로 생활 콘텐츠를 확장한다. 확정 식사/성장 표시와 별도 합성 프로필을 연결한다. 일반 저장과 시연 저장을 섞지 않는다.
4. ART-02: 별도 Sol이 원본 GLB를 보존한 두 후보와 재생성 가능한 편집 소스를 만든다. App 소유자가 비교 선택기/방향/동작을 연결한다. 원본이 기본이며 최종 선택은 USER_REVIEW_PENDING이다.
5. FUN-04: 영향 검사→독립 Terra 리뷰→수정→재검증, 실제 Simulator 장면과 동일 조건 성능 비교, 약 10분 사용자 실행 경로를 준비한다. 미실행 플랫폼/성능/아트는 구분한다.

루트는 통합·기술 선택·실제 실행 증거·Git checkpoint를 맡는다. 한 파일의 작성자는 하나다. 요청 모델은 Terra/Sol/Luna이며 확인 가능한 backend metadata가 없으면 ROUTING_UNVERIFIED다.

## 재사용과 경계

- 기존 ApprovedMvpService/LocalPetStore/원자적 MealConsumed 정산/성장 projection/GLB clip을 재사용한다.
- 반응/순간 감정/대화는 표현 상태다. 완료 callback에 경제 명령을 연결하지 않는다. 최근 기억은 제한된 별도 저장소로 분리하고 손상 시 게임 저장을 수정하지 않는다.
- 일반 방은 작은 펫·넓은 바닥·최소 조작을 유지한다. 비교/진단은 합성 도구에서만 연다.
- 기록 닫힘과 청소 0개 성공 표현은 재오픈한 사용자 결함이다. 과거 Simulator 통과로 이번 결과를 대신하지 않는다.

## 변경 전 관찰과 사전 성능 예산

기존 iPhone 16e / iOS 26.3 Simulator Release에서 기록 패널에 닫기 수단이 없고 기록 버튼 재입력 후에도 열린 상태임을 관찰했다. `mobile/evidence/fun-00/00-baseline-history.png`, `01-baseline-movement.mp4`를 보존한다. 기존 renderer는 정확한 Apple Software Renderer에서 GL 제출과 hit projection을 333ms로 제한한다. 모션 시계나 영상 캡처 주기를 뜻하지 않는다.

이번 **검토 환경의 엔지니어링 실험 예산**은 변경 전 다음으로 고정한다: 입력 후 첫 JS 확인 반응 p95 ≤100ms, JS RAF 간격 p95 ≤50ms, 연속 UI 잠금 ≤500ms. 이동 중 GL 제출은 초당 20회 이상을 목표로 하되 제출 횟수를 화면 표시 FPS로 부르지 않는다. 실제 화면에서 500ms 초과 멈춤이 남으면 준비 완료를 선언하지 않는다. 실패 후 임계값을 낮추지 않는다. DEC-31의 사용자 승인 출시 사양이나 실기기 보장이 아니다.

측정 구간/모드/해상도/renderer를 같이 기록한다. RAF/GL submit/영상의 보이는 변화/실제 input-to-photon은 서로 다른 수치다. Debug와 Release, Simulator와 실제 기기를 섞지 않는다. 기기 접촉 지연·발열·배터리는 연결 실기기가 없으면 NOT_RUN이다.

## 종료 판정

실제 대표 장면과 비교 후보, 고정한 성능 예산 및 필수 회귀 증거가 준비되면 READY_FOR_PRODUCT_REVIEW. 필요한 실제 증거를 확보하지 못하면 가능한 독립 구현을 마친 뒤 BLOCKED_WITH_CHECKPOINT. 두 경우 모두 재미·최종 아트는 USER_REVIEW_PENDING이다. Health OFF, 외부 서비스/실결제/main/merge/배포는 금지한다.

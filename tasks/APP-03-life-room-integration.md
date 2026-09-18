# APP-03 — 방/돌봄/생활 통합

자율 게이트: **G3 / APP-02 이후 자동 진행**  
관련: FR-4, FR-8~11, FR-16~20, DEC-19~27/32

## 권장 역할
- 도메인↔UI 통합: `arucon_builder`
- hit 영역/호출경로 탐색: `arucon_explorer`
- 좁은 UI 반복 수정: `arucon_spark_worker`(가능할 때) 또는 `arucon_luna_worker`
- 시각/정합성 리뷰: `arucon_reviewer`

## 목표

APP-01의 방/캐릭터 렌더링을 APP-02 도메인/저장과 연결해 **로컬에서 실제로 놀 수 있는 생활 루프**를 만든다. 현재 사용자가 만족한 캐릭터/모션/입력 감각을 보존한다.

## 구현

1. 바닥 전체 이동, 쓰다듬기, 식탁, 쿠션/수면, 화장실, 공/기본 가구의 hit 영역을 분리한다.
2. feeding UI는 domain consumeMeal을 통해서만 경제 상태를 바꾼다. 직접/자동은 presentation만 달라지고 동일 조건/효율.
3. 기본 화장실 보유/설치 fixture는 자동 청결 생활 행동을 보여줄 수 있지만 가격/해금/철거 규칙은 OPEN으로 둔다.
4. reserved/츤데레와 비교 personality fixture의 행동 차이는 표정·거리·타이밍으로만 표현하고 능력 차이를 만들지 않는다.
5. 무료 쓰다듬기·인사·관찰은 자원 중립. 적극적 놀이 비용이 OPEN이면 무료 기본 교감과 별도 command로 분리하고 활성화하지 않는다.
6. life journal은 실제 확정 이벤트와 완료된 관찰만 기록한다. 보상 수령/출석을 연결하지 않는다.
7. 앱 background/foreground, process reload, orientation/safe area에서 렌더/상태가 중복 생성되지 않게 한다.
8. 개발 빌드에 `DEV_FIXTURE_ONLY` 표시를 제공하되 일반 게임 화면을 디버그 대시보드로 만들지 않는다.

## 시각 기준

- 크림색 아기 아루콘 GLB, 작은 둥근 뿔, 축 처진 귀, 반쯤 감긴 눈/작은 입.
- 작은 펫 + 넓은 실제 walkable floor.
- 사용자가 확인한 빠르고 부드러운 이동/쓰다듬기.
- 러그 밖 빈 바닥도 이동. 화면/가구 충돌 시 가장 가까운 안전 목표.

## 검증

- E2E/UI: floor tap 각 방향, 목적지 갱신, pet touch와 floor tap 충돌 없음, table/cushion/toilet hit 분리.
- feeding direct/auto 경제 결과 동일, reload 후 중복 없음.
- free interaction resource-neutral.
- 실제 앱 screenshot/video, safe-area pet bounds.
- reviewer가 프로토타입의 경제 수치를 운영 config로 복사했는지 검사.

## 게이트 판정

로컬 생활 루프와 핵심 E2E가 통과하면 APP-04 자동 진행. 실제 상품/밸런스 OPEN은 PARTIAL 사유로만 기록한다.

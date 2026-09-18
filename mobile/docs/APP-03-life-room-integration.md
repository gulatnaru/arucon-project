# APP-03 생활 루프 통합 계약

범위: FR-4/7~10/18/19, AT-AUTO-01~10, AT-LIFE-01~03. `DEV_GAME_CONFIG`는 DEC-02/04/06/07/24/25의 승인 전 합성 fixture다. 실제 서비스 밸런스나 출시 상태를 정하지 않는다.

`createDevLifeServiceFromExpo(expoDb, petId, givenName, personalityProfileId, createdAtMs)`는 루트 SQLite 안에서 `migrate → initialPet → createPet`을 수행한다. 같은 `petId`로 다시 열면 기존 펫을 읽고 추가 발급하지 않는다. `DevLifeService`의 모든 쓰기는 `LocalPetStore.execute`를 거친다. `currentState()`와 반환된 최신 상태를 UI에 사용한다. 과거 명령 재시도의 `state`를 화면에 재적용하지 않는다.

## 시간·급식

`advanceTo(nowMs)`는 기존 재고와 자동급식 설정으로 이전 시간을 먼저 처리한다. 배고픔 임계 시각마다 `advance` 뒤 안정적인 자동 `mealId/commandId`로 `consumeMeal`을 확정한다. `mealAt == hibernateAt`이면 동면이 먼저다. 일반 수면·동면·재고 없음·opt-in 없음에서는 자동 섭취가 없다. 직접/자동은 동일한 도메인 `consumeMeal` 명령을 사용한다.

`receiveActivity(activity, nowMs)`와 `returnToForeground(nowMs, activity?)`는 먼저 부재 구간을 정산하고 새 활동을 적용한다. 새 먹이를 과거 시점의 식사에 사용할 수 없다. 활동만 수신하는 것은 `lastForegroundAtMs`를 갱신하지 않는다. 복귀는 `foregroundReturn` 명령으로 동면 해제 및 전경 시각을 확정한다. 수면·시설·배율 설정 변경도 먼저 이전 구간을 정산하므로 새 값이 과거 식사에 소급되지 않는다.

## 일지·위젯·화면

`readJournal()`은 `LocalPetStore`가 펫 상태와 같은 SQLite 트랜잭션에 쓴 `local_outbox` 확정 이벤트만 읽는다. 재생·열람은 명령이 아니고 추가 보상을 지급하지 않는다. `readWidgetProjection()`은 SQLite에 저장된 펫에서 허용 필드만 투영하는 읽기 전용 미리보기다. 시각은 읽은 시각이 아니라 저장 상태의 마지막 시뮬레이션 시각이다. 별도 OS 위젯 게시·갱신은 여기서 실행하지 않는다.

`LifeRoomControls`는 상태와 `onAction(action)`을 받아 직접급식, 자동급식 opt-in, 쉬기/깨우기, 청소, 무료 쓰다듬기, 기록 버튼을 제공한다. `DevFixturePanel`은 별도로 합성 걸음·시간·시설·수면 배율 및 상점/위젯 미리보기 콜백을 제공한다. 두 컴포넌트는 수치를 직접 변경하지 않는다. `App.tsx`가 이 콜백을 서비스 명령으로 연결한다.

`App.tsx`는 SafeAreaProvider 안에서 기존 SQLite 펫을 먼저 읽는다. 스냅샷 손상·원장 고아 행·열기 실패는 오류와 재시도로 남기며 새 펫을 생성하지 않는다. `loadPet()==null`인 최초 DEV 경로에서만 합성 온보딩 미리보기를 받아 `createPet`을 실행한다. `AppState` 전경 복귀는 부재 정산 후 복귀, 배경 전환은 `foregroundExit`으로 실제 사용 종료 시각을 저장한다. busy 중 생긴 전환은 가장 최근 상태를 보류해 실행한다. 30분 전경 체크포인트는 연속 사용 중 24시간 동면을 방지한다.

개발 시간은 `max(벽시계, 앱 내 개발 시계, 저장된 마지막 시각)`으로 단조 증가한다. 합성 500걸음은 UTC 날짜 fixture와 저장된 일별 공급자 cursor에서 누적 수치·revision을 이어간다. 재시도는 처음 정규화한 입력을 그대로 재전송한다. 같은 날 다른 공급자가 저장됐다면 합산하지 않고 안내한다. 이 UTC 날짜는 실제 계정 시간대 정책(DEC-02) 승인으로 쓰지 않는다.

예상된 급식 거절은 짧은 안내로 표시하고 다른 조작을 계속할 수 있다. 불확실한 저장 실패는 동일 명령 ID와 입력을 가진 요청을 재시도한다. 화면 상태는 재생된 과거 `state`가 아닌 `currentState()` 또는 서비스가 반환한 최신 상태만 받는다.

방의 식사 모션 신호는 확정 후 반환된 EXP 증가와 `local_outbox`의 새 `MealConsumed` 이벤트가 함께 확인될 때만 보낸다. `mealCue` 토큰은 확정 이벤트 ID이고 mode는 direct/auto다. 시작 시 저장 상태 로드, 과거 명령 replay, 단순 일지·위젯 조회, 부재 정산의 과거 식사를 현재 장면에서 반복 재생하지 않는다.

## 현재 검증과 미완료

Node 내장 SQLite 어댑터를 이용한 실제 SQL 통합 테스트는 직접/자동 동일성, 구간 분할, 동면 동시 경계, 지연 활동, 재시도·재열기 일지, 읽기 전용 투영, 연속 전경 체크포인트를 검사한다. 기기 렌더, 앱 background event, Expo SQLite 네이티브 실행, 위젯 OS 저장·게시, 터치 hit 영역, 화면 동영상은 아직 확인되지 않았다.

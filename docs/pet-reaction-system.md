# 펫 반응 시스템 v1

상태: FUN-00 로컬 구현. 최종 재미·아트 승인을 뜻하지 않는다.
근거: SRS FR-5, FR-10/10.1, FR-16/19, DEC-19/22/23, `tasks/FUN-00-overhaul.md` §§6~8, 11.

## 책임과 경계

`mobile/src/reactions/`는 입력 사건과 읽기 전용 상황을 받아 로컬 장면을 선택하고 프레젠테이션 명령을 만든다. 이 모듈은 게임 상태, 원장, outbox, 먹이, 코인, EXP를 쓰지 않는다. 식사와 성장은 각각 `committed_meal`, `committed_growth` 증거가 들어온 뒤에만 표시할 수 있다. 합성 성장 비교는 `source: fixture`와 `synthetic_growth_fixture`를 요구하므로 실제 확정 장면으로 선택되지 않는다.

호출은 사건 단위다. 입력, 확정 도메인 사건, 대화 진행, 취소 때만 선택기와 저장소를 호출한다. 렌더 프레임마다 카탈로그를 검색하거나 기억을 쓰는 경로는 없다.

## 공개 API

`mobile/src/reactions/index.ts`가 다음 순수 API를 제공한다.

- `dispatchReaction(context, memory, dependencies?)`: 상황을 검증하고 장면을 선택해 첫 세션과 프레젠테이션 명령을 반환한다. 테스트용 시계·난수·세션 ID를 주입할 수 있다.
- `advanceReactionSession(session, event)`: 현재 줄의 최소 읽기 시간이 지난 뒤 다음 줄이나 선택지로 이동한다.
- `chooseReactionSession(session, choiceId, nowMs)`: 선택에 연결된 후속 동작과 줄을 반환한다.
- `cancelReactionSession(session, reason, nowMs)`: 사용자 닫기, background, 화면 전환, 새 장면 대체를 즉시 정리한다.
- `selectReaction(...)`, `previewReaction(...)`: 개발 미리보기와 선택 근거 확인용이다.
- `createCommittedGrowthContext(...)`, `createGrowthComparisonFixture(...)`: 실제 확정 성장과 합성 비교의 출처를 분리한다.

선택 설명에는 후보, 제외 이유, 반복 제한 우회, 안전 기본 반응 사용 여부, 카탈로그 오류가 포함된다. 카탈로그가 손상되거나 적절한 후보가 없으면 성격별 지원 클립을 쓰는 안전 반응으로 끝나며 입력을 무반응으로 만들지 않는다.

미리보기는 `preferredReactionId`와 `recent`를 받아 특정 장면·반복 이력을 실제 세션 명령으로 만든다. 새 장면은 기존 clip 계약을 쓰는 catalog 데이터로 추가하며 선택 엔진을 고치지 않는다. `{petName}` 템플릿은 세션 시작 때 NFC 이름으로 치환한다. 기존 `unicode-segmenter` grapheme 계산을 사용해 고정 접미사까지 1~13 grapheme만 허용하고 줄바꿈·제어문자를 거부한다.

## 대화 상태 머신

```text
presenting -> awaiting_choice -> follow_up -> completed
     |              |               |
     +--------------+---------------+-> cancelled
```

줄은 `minReadMs`와 장면의 `minVisibleMs` 중 긴 시간 전에는 진행되지 않는다. 현재 콘텐츠 기본값은 1.4초다. 공놀이 선택지는 `timeoutMs: null`이라 자동으로 넘어가지 않는다. 사용자가 선택하거나 명시적으로 닫을 때까지 유지하며 background·화면 전환·대체 장면에서는 `cancelReactionSession`이 `clear_presentation`과 취소 결과를 반환한다. 선택한 `같이 놀기`와 `옆에서 쉬기`는 서로 다른 후속 클립으로 이어진다.

반응 명령은 clip, hold pose, 시선, 순간 감정, 대사 표시, 표시 정리만 포함한다. 완료·취소 콜백은 경제 명령을 포함하지 않는다.

## 선택과 콘텐츠

상황 조건은 trigger, live/fixture 출처, 두 표현 프로필, 성장 단계, 가구 affordance, 수면·동면, 컨디션·청결, 접촉 위치, 확정 증거를 사용한다. 조건을 통과한 뒤 우선순위가 높은 후보를 고르고, 반응 ID cooldown과 의미 장면 family window로 반복을 줄인다. 모든 적절한 후보가 최근 사용되었으면 후보 중 하나를 선택해 반응 자체가 사라지지 않게 한다.

현재 카탈로그는 27개 정의를 포함한다.

- `petting`, `rest`, `greeting`: reserved/expressive 각각 두 개의 의미 장면 계열과 서로 다른 실제 클립
- `ball`: 성격별 장면, reserved의 선택형 후속 공놀이/휴식
- `rest` 중 수면 상태: 말풍선이나 깨우기 없이 `sleep` 클립을 유지하는 조용한 반응
- `clean`: `nothing_to_clean`, `auto_toilet`, `cleaned` 결과별 정확한 장면
- 성장 발견: stage 2 이상에서만 해금되며 live/fixture와 표현 프로필별로 분리
- 식사·수면·깨우기·가구: 실제 조건과 증거가 맞을 때만 선택

`mobile/scripts/check-reaction-content.ts`는 구조 검사만 하지 않는다. 각 정의에 만족하는 상황과 반복 이력을 만들고 실제 `selectReaction`을 통과해 해당 ID가 선택되는지 검사한다. 또한 두 표현 프로필의 장면 계열, 성장 단계 잠금, fixture 출처, 청소 세 결과, 공 affordance, 수면 중 조용한 휴식을 확인한다.

## 제한된 기억 저장

`mobile/src/storage/reactionMemory.ts`는 게임 DB와 다른 `arucon-reactions.db`를 연다. 합성 시나리오는 `arucon-reactions-fixture-<fixtureId>.db`와 `fixture:<fixtureId>` namespace를 쓰고, 모든 조회와 정리는 다시 `petId`로 제한한다.

기록 시점은 다음과 같다.

1. 화면에 첫 장면을 보이면 `recordShown(session)`으로 `shown`을 기록한다.
2. 정상 종료 결과는 `recordCompleted(outcome)`으로 같은 행을 완료 처리한다.
3. 사용자 닫기·background·화면 전환·대체는 `recordCancelled(outcome)`으로 중단 처리한다.

세션 ID 재실행은 같은 데이터면 멱등이고 다른 데이터면 거부한다. 펫·namespace별 최근 32행만 유지한다. schema version, 정렬, 중복 세션, 행 필드를 읽을 때 검증한다. 알려진 v1 손상은 선택된 펫·namespace의 원시 행을 같은 반응 전용 DB의 32행 제한 quarantine으로 원자 이동한 뒤 빈 정상 snapshot으로 복구한다. 재시작 후에도 복구 상태를 읽고 새 기억을 쓸 수 있다. 미래 schema version은 해석하거나 quarantine하지 않고 원본을 보존한 채 거부한다. 상세 선택은 ADR-013에 기록한다.

## 검증 범위

Node 통합 테스트는 실제 SQLite SQL을 메모리 DB에서 실행해 shown/completed/cancelled, 펫별 상한, live/fixture 격리, 멱등 migration, 알려진 v1 손상 quarantine과 재시작 복구, 미래 version 무변경 거부를 검사한다. 선택기·상태 머신 테스트는 반복 억제, 안전 기본 반응, 두 표현 프로필의 의미 장면, 최소 읽기 시간, 무기한 선택 대기와 명시 취소, 성장 단계·출처 잠금, 청소 결과 분기, 긴 Unicode 이름 템플릿을 검사한다.

실제 앱의 입력부터 후속 모션까지 이어지는 장면과 렌더 성능은 앱 통합 및 런타임 증거에서 별도로 확인해야 한다. 사람 대상 재미 평가와 최종 아트 승인은 자동 검사 결과에 포함되지 않는다.

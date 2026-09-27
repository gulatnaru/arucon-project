# FUN 반응 콘텐츠 매트릭스

오프라인 카탈로그 `mobile/src/reactions/catalog.ts`의 실제 장면 전제와 연결 자산을 기록한다. 대사는 짧은 표현이며, 선택 후에는 다음 대사만 바뀌는 것이 아니라 후속 클립이 재생된다.

| 트리거 | 실제 전제 | 성격 표현 | 시작 행동 / 후속 행동 | 자산 | 반복 규칙 |
|---|---|---|---|---|---|
| petting | 유효한 머리·몸 접촉, 접촉 위치 전달 | reserved는 곁눈질/손이 있던 곳 보기, expressive는 눈맞춤/먼저 다가오기 | 쓰다듬기 확인 → 기대기/손을 다시 바라보기 | pet_reserved, pet_expressive, tsundere_touch, quiet_approach, honest_touch | 두 표현 프로필 모두 실제 클립이 다른 두 의미 장면 계열. 반응별 12초, 계열별 90초 2회 |
| ball | 공 상호작용이 실제로 가능 | reserved는 딴청 뒤 참여, expressive는 먼저 참여 | 공 확인 → 선택에 따라 공놀이 또는 옆에서 쉬기 | tsundere_ball, honest_ball, idle_reserved, honest_touch | 선택 결과도 ball 가족으로 묶음 |
| rest | 각성·비동면 중 휴식 입력. 수면 중 휴식은 별도 조용한 장면 | reserved는 조용히 곁에 앉음, expressive는 먼저 기대기 | 휴식 자세 → 가까이 앉기/기대기. 수면 중에는 대사 없이 sleep 유지 | idle_reserved, idle_expressive, quiet_approach, honest_touch, sleep | 두 표현 프로필 모두 실제 클립이 다른 두 의미 장면 계열. 수면 장면은 깨우기 없음 |
| greeting | 방 진입/인사 입력 | reserved는 짧은 시선/옆을 보며 손짓, expressive는 눈맞춤/먼저 다가감 | 인사 → 다가와 눈맞춤 | tsundere_greet, tsundere_touch, honest_greet, quiet_approach | 두 표현 프로필 모두 실제 클립이 다른 두 의미 장면 계열 |
| meal_committed | `committed_meal` 증거가 있는 섭취 확정 | 누구나 만족을 표현 | 먹기 → 따뜻해진 자세 | eat, idle_expressive | 실제 확정만, 연출 재생으로 재지급 없음 |
| sleep | `sleeping=true`, 동면 아님 | 조용한 잠들기 | 잠들기 → 없음 | sleep | 잘못된 깨우기/급식 클립 없음 |
| wake | `sleeping=false`, `hibernating=false` | 깨어난 뒤 환영 | 깨기 → 짧은 인사 자세 | wake, honest_greet | 수면 상태가 아닐 때 잠들기 후보와 충돌하지 않음 |
| furniture | cushion과 table affordance가 모두 있는 현재 카탈로그 상황 | 대상에 호기심 | 가구로 다가감 → 앉아 쉬기 | quiet_approach, idle_expressive | 현재 한 장면. 가구별 동의어를 새 장면으로 세지 않음 |
| growth_committed | stage 2 이상. live는 `committed_growth`, fixture는 `synthetic_growth_fixture` | 두 표현 프로필의 기존 버릇을 유지하며 변화 확인 | 변화 확인 → 프로필별 새 자세 보여주기 | tsundere_greet, honest_greet, idle_reserved, idle_expressive | live/fixture 후보를 분리. stage 1에서는 안전 기본 반응이고 합성 비교는 실제 성장 기록에 쓰지 않음 |
| clean | `clean_result`의 정확한 결과 값 | 결과 안내이며 성격·경제 효율 차이 없음 | 대상 없음 / 자동 화장실 처리 / 실제 청소 성공을 서로 다른 장면으로 표시 | idle_reserved, idle_expressive | `nothing_to_clean`, `auto_toilet`, `cleaned` 각각 한 후보. 대상 없음/자동 처리를 청소 성공으로 표시하지 않음 |

지원 클립 계약은 `types.ts`의 `REACTION_CLIPS`와 일치해야 한다. 현재 카탈로그가 사용하는 클립은 `idle_reserved`, `idle_expressive`, `pet_reserved`, `pet_expressive`, `quiet_approach`, `eat`, `sleep`, `wake`, `tsundere_greet`, `tsundere_touch`, `tsundere_ball`, `honest_greet`, `honest_touch`, `honest_ball`이다. 없는 동작을 완료한 것으로 표시하지 않는다.

모든 콘텐츠는 로컬에서 동작하며 건강 원본, 개인 정보, 접속·돌봄 비난, 재화·EXP·효율 변경을 포함하지 않는다. interaction 입력은 첫 프레젠테이션으로 즉시 확인하고, 성격별 후속 연기는 그 뒤에 재생한다.

## 도달성·미리보기

`cd mobile && node --import tsx scripts/check-reaction-content.ts`는 27개 정의를 각각 실제 선택기에 넣어 목표 ID가 선택되는지 검사한다. 두 표현 프로필의 petting/rest/greeting 두 계열, 성장 stage 잠금과 live/fixture 출처, 청소 세 결과, 공 affordance, 수면 중 조용한 휴식도 함께 검사한다. 구조 validator 통과만으로 도달 가능하다고 판정하지 않는다.

`node --import tsx scripts/check-reaction-content.ts --preview=<reactionId>`는 해당 정의에 맞는 합성 상황을 만들고 실제 preview API가 낸 세션과 첫 명령을 JSON으로 출력한다. 앱의 개발 미리보기는 `previewReaction({ context, recent, preferredReactionId, nowMs })`로 특정 장면과 최근 이력을 지정할 수 있다. 새 장면은 지원 중인 clip과 데이터 계약만 사용하면 선택 엔진 수정 없이 catalog 항목 추가로 미리볼 수 있다.

현재 표는 코드 카탈로그·Node 선택기와 일치한다. 실제 앱에서 입력 → 첫 반응 → 선택 → 후속 모션까지 재생되는지와 런타임 자산이 각 clip을 구분하는지는 앱 통합 증거가 나오기 전까지 `RUNTIME_PENDING`이다.

# 결정 재감사 요약

2026-09-19 · 시작 체크포인트 `a8aa900aa148f7824305db458dc24250e0920802` · branch `feature/arucon-mobile-autonomous`

## 판정 원칙과 결과

기존 10개 DQ는 각각 여러 종류의 결정을 섞고 있었다. **묶음 전체를 Hard Stop으로 취급하지 않고, 가역적 기술 선택을 AUTO_DECIDE로 분리했다.** 제품·민감정보 승인은 유지한다. 기술 채택은 제품 DEC의 OPEN/PROPOSED를 APPROVED로 바꾸지 않는다.

- `AUTO_DECIDE`: 기술 대안 비교/채택은 ADR-001~004. 새로운 retry·native integration·알림 계약을 구현하고, 이미 있는 architecture/storage/config/검사 기반은 그대로 채택했다.
- `RECOMMEND_AND_WAIT`: 게임 경험·정체성·보상·이용 제한·알림 압박에 영향을 주는 선택. 추천안과 대안별 경험/경제/복잡도/철학을 [대기열](DECISION-QUEUE.md)에 기록했다.
- `EXTERNAL_APPROVAL_REQUIRED`: 실제 법적 동의·건강정보·계정/프로젝트·결제·관리자 설치·출시. 실행 준비와 실제 권한을 분리한다.

10개 모두 일부 제품/외부 판단이 남는다. **대기열 제목을 합쳐 숫자만 줄이지 않았다.** 사람이 검토할 대상에서 기술 스택·schema/index·retry·migration·SDK 모듈 방식·테스트 전략을 제거한 것이 이번 축소다. 실제 제품 결정의 수치/예시와 외부 권한은 추천 방향 선택만으로 자동 승인되지 않는다.

## 원래 10개 → 기술 처리와 사람에게 남은 범위

| 원래 항목 | AUTO_DECIDE 처리 | 남은 분류/판단 | Astra 추천 요약 |
|---|---|---|---|
| DQ-01 정산·밸런스 | 정수 표현/원자 transaction/config schema·계층/검사 방식 채택(ADR-004); 제품 반올림 의미 제외 | RECOMMEND_AND_WAIT: 생활/정산 규칙, 초기 상태, 감소 계수 | 중립 이상 수면 보너스 방향, 날짜·소스 고정 및 기존 재화 비회수. 정확한 값/순서는 승인 |
| DQ-02 수면 | scorer/benefit 포트·버전·주입 커브·idempotent 회복 유지, 추천형 config 격리 검사 | RECOMMEND_AND_WAIT: 점수 공식/세션/날짜/혜택. 실제 읽기는 EXTERNAL | 개인 기준·유효 세션 중심의 단순 점수, 불확실하면 no_data, 과거 EXP 재계산/중복 회복 없음 |
| DQ-03 성장·성별·진화 | 순수 projector/RNG 포트, 단회 결과 저장/재사용·identity 원장 채택 | RECOMMEND_AND_WAIT: 성장 기간/경계·비율·케어→외형·성격 규칙 | 설명 가능한 케어 결정표, 형태·성격·효율 분리, 원문 비용 후보부터 검증 |
| DQ-04 상점·시설·놀이 | 원자 debit/ownership·catalog validation·disabled payment 채택 | RECOMMEND_AND_WAIT: 초기 설치/가격/효과/놀이. 실제 상품·결제는 EXTERNAL | 기본 화장실 시작 설치, 작은 코인 생활가구 목록. 현금 범위는 별도 승인 |
| DQ-05 활동·플랫폼 | local Expo Module+CNG plugin, 실제 읽기 없는 native boundary(ADR-002) | RECOMMEND_AND_WAIT: 지원 보증·fallback 수용. 실제 건강 접근 EXTERNAL | 두 OS의 검증된 소스만 약속, 측정 불가 정직한 안내 |
| DQ-06 계정·동의 | 기존 RN/SQLite/service/adapter 구조 및 synthetic scope/revocation/allowlist 채택 | EXTERNAL_APPROVAL_REQUIRED: 법적 정책/실가입/서비스 접근 | 검토된 정책 후 별도 테스트 서비스 권한; 법적 검토 없이 checkbox로 완료 금지 |
| DQ-07 동기화·복구 | durable equal-jitter retry/HOL 순서/single-flight/offline + schema6(ADR-001) | RECOMMEND_AND_WAIT: 단일 기기·복구 손실/충돌 UX·보존. 실서버 EXTERNAL | 단일 쓰기 기기·명시 이전·서버 확인분 복구·미확인 기록 보존/안내 |
| DQ-08 위젯·알림 | read-only native 준비, synthetic planner/idempotent port/취소·철회(ADR-002/003) | RECOMMEND_AND_WAIT: 최신성 안내·발송 cadence/quiet hours | timestamp 위젯+앱 안 안내 우선, OS 알림은 필요 시 명시 opt-in |
| DQ-09 SDK·실기기 | inventory/build/scaffold/검증 순서 기술 결정 | EXTERNAL_APPROVAL_REQUIRED: 준비된 SDK/기기 제공 또는 관리자 설치, 별도 건강 동의 | 준비된 환경에서 먼저 읽기 OFF synthetic native 검증 |
| DQ-10 출시·보안·상표 | 중복/형식/순서 불변식·비밀/생성물/의존성 검사 채택 | RECOMMEND_AND_WAIT: 이상 임계값/보류 UX. EXTERNAL: 상표/결제/출시 | 행동 임계값은 승인 전 미적용, 실제 결제/명칭/출시 각 gate 완료 후 승인 |

## 채택한 기술 대안

| ADR | 대안 | 선택과 이유 | 실제 처리 |
|---|---|---|---|
| [001](docs/adr/ADR-001-sync-retry.md) | 고정 간격 / capped exponential equal jitter / OS scheduler만 의존 | durable exponential+jitter. 재시작·오프라인·동시 요청을 검사 가능 | schema6, retry policy/version/due 저장, 순서별 선행 실패 차단, no-drop scheduler |
| [002](docs/adr/ADR-002-native-integration.md) | 외부 wrapper / generated project 직접 수정 / local Expo Module+plugin | local module+plugin. 소스 추적·clean prebuild 재현·권한 감사 가능 | Swift/Kotlin disabled module, autolinking, JS bridge, plugin 기본 OFF, native widget 소스 준비 |
| [003](docs/adr/ADR-003-notification-delivery.md) | 순수 synthetic port / 지금 SQLite 알림 원장 / 지금 server push | 순수 planner+idempotent port. 미정 발송 정책을 정하지 않고 계약 검증 | duplicate/retry/cancel/revoke/quiet-hour tests; 실제 OS 전달·restart durable 알림 구현 아님 |
| [004](docs/adr/ADR-004-technical-authority.md) | DEC 전부 대기 / DEC 전부 기술 승인 / 기술 하위 범위만 채택 | 하위 범위 분리. 기존 제품 철학·권한 유지 | 기존 RN/SQLite 계층·원자성·config/테스트 기준 채택, HS/ENG 문서 정합화 |

Retry base1s/cap5m는 교체 가능한 내부 스케줄링 설정이다. action의 최대 시도 횟수/영구 drop/보상 소멸을 만들지 않는다. native dev identifier는 실제 App Group 등록·서명 승인이 아니다. 모듈 발견/프로젝트 생성은 Swift/Kotlin 컴파일 성공이 아니다.

## 추천 승인 전 interface/config/tests

- 수면: `SleepScoreProvider`, `SleepBenefitPolicy`, `SleepBalanceConfig`가 다른 커브를 명시 주입한다. 테스트의 보너스 커브는 임의 TEST_ONLY 예시이며 추천하는 운영 수치가 아니다. 기본 원문 DEV 커브·not_configured 운영 경계를 보존한다.
- 성장/진화: `GrowthProjectionPolicy`, injected resolver/RNG, durable resolution ledger를 재사용한다. 운영 분기/성격 정책은 채우지 않는다.
- 가격/초기 상태: registry의 unresolved 항목과 DEV catalog를 유지한다. 원자 구매/보유 처리만 검증한다.
- sync: 기술 재시도와 제품 복구 정책을 분리한다. synthetic server를 실서버 완료로 취급하지 않는다.
- 위젯/알림: read-only snapshot/앱 진입·명시 DEV 정책으로 준비한다. 기본 app/health/notification gate는 OFF다.
- 동의/서비스: fake grant와 실제 동의 proof가 같다고 주장하지 않는다. 외부 계정·프로젝트·건강 기록·결제 없음.

## 실제 구현·검증·검토 결과

명령별 최종 실행 결과, 테스트 수, independent review 수정 및 재검증은 [AUTONOMOUS-RUN-REPORT](AUTONOMOUS-RUN-REPORT.md)의 **결정 재감사 실행** 기록이 기준이다. 과거 a8aa900의147/147은 현재 실행 증거로 재사용하지 않는다. 원시 로그는 ignored `mobile/evidence/decision-audit/`에 보존한다.

네이티브 SDK compile은 환경 부족과 구분해 기록하고 simulator/physical device가 미실행이면 NOT_RUN이다. native template 정적 검사나 prebuild/JS bundle을 기기 통과로 표현하지 않는다. SRS14/14-1 전체 판정은 [MVP-GAP-MATRIX](MVP-GAP-MATRIX.md)에 유지한다.

## 사람에게 필요한 다음 입력과 승인 후 자동 재개

1. DQ-01~04 추천 방향을 바탕으로 정확한 값·분기표·대표 예시를 확정한다. 방향만 승인되고 값이 비어 있으면 해당 활성화는 대기한다.
2. DQ-05/07/08의 이용 가능성·다기기 복구 한계·알림 방해 수준을 선택한다.
3. 환경만 준비돼도 건강 읽기 OFF native 개발 빌드·synthetic 기기 QA를 자동 재개한다. 실제 건강정보 승인은 별도다.
4. 동의 정책/서비스/결제·출시는 각각 승인된 행위만 수행한다. 이번 feature Git 권한을 외부 운영 권한으로 확대하지 않는다.
5. 승인된 branch부터 config/운영 adapter/App 연결 → 영향 테스트 → 독립 reviewer → 수정 → 재검증 → 전체 gap 갱신. 다른 branch의 독립 작업은 계속한다.

재개 프롬프트: “DECISION-SUMMARY.md와 DECISION-QUEUE.md의 최신 상태를 읽고, 다음 승인/환경 변경만 반영해 재개해라: [항목·정확한 값/예시·외부 허용 범위]. 기술 AUTO_DECIDE는 다시 묻지 말고, 나머지 OPEN은 유지하며 SRS14/14-1 기준으로 구현→검증→독립 review를 계속해라. 실제 건강/계정/결제/배포는 명시 승인된 범위만 수행해라.”

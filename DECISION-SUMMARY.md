# 승인된 MVP 기본 정책 — 결정 요약

2026-09-19 · 시작 checkpoint `34ab069dc874947a0f71ff7b70c3be2b14065e00` · feature/arucon-mobile-autonomous

## 새 사용자 승인

사용자는 앞선 Astra 추천 여섯 방향을 **제품 기본 결정으로 승인**했고, 그 범위의 구현 세부값은 제품 철학을 바꾸지 않고 config/ADR로 되돌릴 수 있으면 엔지니어가 선택하도록 위임했다. 지난 재감사의 ‘추천이므로 운영 기본값 미활성’은 이 승인 범위에서 대체됐다. 실제 민감정보·외부 계정·법적 미성년 정책·결제/출시·시스템 설치 권한으로 확대하지 않는다.

| 승인 묶음 | 현재 기본 방향 | 반영한 계약/검증 |
|---|---|---|
| 정산·밸런스 | 기존 획득 재화 비회수, 수면 bonus 중심 | 상한/high-water/late·분수·식사 원자성·동면·기존 snapshot 무손실 이행 |
| 수면 | 개인 기준+유효 세션의 설명 가능한 단순 게임 점수 | config 계수, 경계/no_data/분할/겹침, bonus>=1, 의료 판정 없음, 실제 읽기 OFF |
| 성장·진화 | 케어 기록 결정표, arucon→mallu/mono/piko/mongle | personality 독립, 단회 확정/재시도/기록부족, 레벨·성별 경계와 EXP 보존 |
| 상점·시설 | 기본 화장실 시작 사용, 작은 코인 카탈로그 | 잔액/소유/설치/사용 원자성, 무료 교감·자연 회복, cash 효율 경로 없음 |
| 동기화·복구 | 한 쓰기 기기·명시 이전·충돌 비병합 | epoch fence, 미동기화 보존, last sync/복구 한계 설명, fake authority 검증 |
| 위젯·알림 | read-only snapshot·마지막 갱신 시각·앱 안 안내 우선 | 자원 중립, OS 갱신 보증 금지, 죄책감/비난 없음, native scaffold·오류 상태 |

정확한 승인 범위는 SRS v1.9 §0-4/§9-4와 docs/decisions.md의 v1.9 표시가 기준이다. 실제 config 값·선택 근거는 ADR-005/006/007, 구현/테스트 결과는 AUTONOMOUS-RUN-REPORT.md에서 확인한다.

## 원래10개 DQ의 처리

| 이전 ID | 현재 처리 | 남은 사람 범위 |
|---|---|---|
| DQ-01 정산/생활 | 승인 범위의 config·service로 구현 | 없음: 해당 세부값을 제품 질문으로 돌려보내지 않음 |
| DQ-02 수면 | scorer/bonus/혜택 구현, 합성 검증 | 실제 건강정보 접근 승인 |
| DQ-03 성장/외형 | 케어 결정표·독립 personality·원장 연결 | 범위 밖 2차 아트/P3는 이번 작업에 추가하지 않음 |
| DQ-04 상점/시설 | 기본 화장실·코인 구매/효과, cash 격리 | 실제 결제·출시 |
| DQ-05 플랫폼/활동 | 조건부 지원/미연결·오류·fake provider 준비 | 실기기 검증 후 지원 OS 최종 출시 선언, 실제 건강 접근 |
| DQ-06 계정/동의 | fake scope·철회·오류·비전송 경계 | 법률·외부 계정/프로젝트 |
| DQ-07 동기화/복구 | single writer·handoff·fence·복구 안내 구현 | 실제 backend/account와 법적 보존/삭제 |
| DQ-08 위젯/알림 | timestamp/read-only·앱 안 안내, native 준비 | 실제 기기 검증·서명/플랫폼 계정 |
| DQ-09 환경 | 2026-09-20 Xcode26.3/Simulator 확인, 위젯 compile/link·CNG 경로/JSI constructor 수정 | Xcode26.4+ 요구 충족 후 앱 재빌드; Android SDK/기기 준비 |
| DQ-10 보안/출시 | 중복/형식/순서 정합성 검사·비난 없는 오류 유지 | 법률/상표·실결제/출시. 행동 임계값으로 처벌하는 새 기능은 도입하지 않음 |

## 기술 결정 연결

- ADR-001: durable retry/backoff/HOL/no-drop. 기존 선택 유지.
- ADR-002/007: local Expo module/CNG 및 read-only native 위젯 target 준비. 실제 Health 읽기 OFF, 지원 OS를 출시 보증하지 않음.
- ADR-003: 합성 알림 idempotency/cancel/revoke. 현재 앱 안 안내 우선이며 실제 발송 비활성.
- ADR-004: 계층/SQLite/검사 전략. 승인 제품 정책은 새 ADR로 연결하고 과거 DEC 대기 상태를 반복하지 않음.
- ADR-005: 승인된 게임 config/scorer/케어표/코인 catalog·기존 snapshot 이행.
- ADR-006: single-writer authority/이전/복구 상태·계정 경계. fake의 검증이 실backend 완료는 아님.

## 권한과 완료 의미

- 로컬 합성 입력은 실제 건강 접근을 포함하지 않는다. 법적 동의/실미성년 계정은 미활성이다.
- 2026-09-20 Xcode26.3/Swift6.2.4/CocoaPods1.17.0/iOS26.3 Simulator를 확인했다. Expo SDK57의 공식 Xcode26.4+ 최소 요구에 미달하며 앱 빌드는 JSI pointer data-race 오류로 실패했다. Android SDK/emulator는 없다. 최신 증거는 `mobile/evidence/ios-widget-path-fix/`다.
- native project generation·parse·JS bundle과 실제 native compile·simulator·physical device를 분리한다.
- 1차 외형 논리와 승인 아트/최종모션도 구분한다. 승인 2D 참고 시트는 존재한다. formId는 렌더러까지 전달되지만 전용 rigged/animated runtime asset이 없는 네 진화형은 명시적인 공통 GLB fallback을 사용한다. 이를 최종 진화 아트 렌더 통과로 표현하지 않는다.
- SRS14/14-1 전체30행은 MVP-GAP-MATRIX.md에서 로컬 충족·외부·환경 잔여로 판정한다. 실기기/실서비스 미실행을 PASS로 바꾸지 않는다.

## 남은 사람 작업과 재개

DECISION-QUEUE.md에는 **법률 / 실제 건강정보 / 외부 계정 / 실결제·출시 / 시스템 환경**만 남긴다. 승인된 여섯 제품 방향을 다시 질문하지 않는다. 준비된 가지부터 구현→테스트→독립 reviewer→수정→재검증하며 다른 독립 가지도 계속한다.

재개 프롬프트: “최신 DECISION-SUMMARY/QUEUE/MATRIX와 Git 상태를 읽고, 다음 외부 승인/환경 변경만 반영해 재개해라: [항목·범위]. 승인된 여섯 MVP 정책과 ADR config는 다시 묻지 말고 이어 써라. 실제 건강 읽기·법적 미성년 정책·실계정/결제/배포는 명시된 범위만 수행하고 native compile/simulator/physical device를 구분해 SRS14/14-1 전체를 검증해라.”

## 2026-09-20 iOS 빌드 수정

ADR-008: 위젯 group-relative source 경로 수정 및 expo-modules-jsi57.1.0 constructor annotation의 버전/내용 검사 postinstall 패치. `npm ci --offline` 재설치에서 자동 적용을 확인했고 위젯 compile/link는 통과했다. 전체 앱은 Swift pointer data-race 7개로 exit65이며 simulator 앱/실기기 실행은 NOT_RUN이다. 승인 제품 정책 변경은 없다. 새 검사 결과는 최신 실행 보고서와 분리 기록한다.

## 2026-09-19 검증 이력

전체 자동 검사236/236, lint/typecheck, Android/iOS JavaScript bundle 및 native project generation/static 검사 PASS. 실제 native compile은 BLOCKED_ENV, simulator/physical device/GLView 및 위젯 OS 렌더는 NOT_RUN이다. 수면 App 미래 시각 결함, 복구 원자성 및 stale confirmed checkpoint는 독립 리뷰 뒤 수정·재검증했다. 정확한 최종 명령/로그/범위는 AUTONOMOUS-RUN-REPORT.md와 `mobile/evidence/approved-mvp/`를 따른다.

# SRS MVP gap matrix — 승인된 여섯 정책 구현 이후

2026-09-19 · 시작 `34ab069` · SRS v1.9 §14 전체19행 + §14-1 전체11행. PASS는 표에 명시한 로컬 코드/자동 검증 범위다. native generation/parse/JS bundle은 네이티브 compile·simulator·physical device 검증이 아니다.

## 2026-09-20 환경 갱신

Xcode26.3/Swift6.2.4/CocoaPods1.17.0 및 iOS26.3 Simulator가 사용 가능해졌다. 위젯 Swift compile/link는 PASS지만 전체 앱은 ExpoModulesJSI pointer data-race 오류7개로 exit65다. 설치 Xcode는 SDK57의 공식 최소26.4+에 미달한다. iOS 앱·위젯 OS 실행은 NOT_RUN, Android SDK는 부재다. 아래 과거 자동 검사 PASS는 해당 범위의 이력이며 이번 실행 숫자가 아니다. 최신 증거: `mobile/evidence/ios-widget-path-fix/`.

## §14 MVP Definition of Done

| ID | 요구 | 분류 | 현재 구현/잔여 |
|---|---|---|---|
| M01 | 가입·연령·이름 | HARD_STOP_EXTERNAL | 로컬 합성 온보딩/명명·scope·철회 계약. 실제 미성년 동의·가입은 EXT-LEGAL/ACCOUNT. |
| M02 | 활동→먹이·코인·상한·폴백 | HARD_STOP_EXTERNAL | 승인 config·중복/분수/상한/과거 수정·불완전 집계 보류·fake/오류 처리. 실제 건강 읽기 OFF, 지원 OS 최종 선언 전 EXT-HEALTH/ENV/RELEASE. |
| M03 | 직접/자동 식사·부재 정산 | PASS | 로컬 승인 서비스 공통 reducer·실제 섭취만 EXP·원자 원장/재시도. OS 강제 종료 검증은 V03으로 분리. |
| M04 | 기본 화장실 | PASS | 신규 시작 설치·레거시 비회수 이행·자동 처리·무유지비. 실제 렌더는 M13. |
| M05 | 성격·무료 교감 독립 | NEEDS_DEVICE_VALIDATION | 성격/외형/경제 독립과 무료 교감 자동 검사. 실제 반응·표현은 EXT-ENV. |
| M06 | 가구 생활·일지·자동화 동등 | NEEDS_DEVICE_VALIDATION | 코인 소유/설치·생활 UI·확정 일지와 직접/자동 동등 검사. 실제 화면/행동 검토는 EXT-ENV. |
| M07 | 레벨·성별·외형 | PASS | 승인 비용·Lv6 단회 성별·Lv16/확정7일 케어표·personality 독립·결과 영속/snapshot. 최종 아트/모션은 M13 및 출시 검토. |
| M08 | 수면 배율·회복 | HARD_STOP_EXTERNAL | 개인 기준 세션 scorer·bonus-only·날짜/무기록·wake 단회 로컬 검사. 실제 기록 연동은 EXT-HEALTH/ENV, V05. |
| M09 | 체력 경계 | PASS | 시간/소화·승인 행동 경계와 무료 교감·실제 걷기 비소모·저체력 허용 자동 검사. |
| M10 | 청결·청소·기분 | PASS | 승인 config·청결 상태/분할·기존 상태 보존 자동 검사. 실제 화면은 M13. |
| M11 | 청결만 기운 없음·자연 회복 | PASS | 청결 단일 원인·약 없는 회복·선택 약 코인50 원자 처리 검사. |
| M12 | 배회·표정·터치 | NEEDS_DEVICE_VALIDATION | 기존 renderer/입력·reduced-motion 계약 유지. 실제 GL/터치/모션은 EXT-ENV. |
| M13 | 방·가독성·말캉 실제 검토 | BLOCKED_ENV | 승인 2D 참고형 존재, form renderer 연결·명시적 공통 GLB fallback. 네 전용 rigged runtime asset 납품 및 실제 렌더/영상/FPS 수용은 미완료(EXT-RELEASE/ENV). |
| M14 | 상점·현금 경계 | HARD_STOP_EXTERNAL | 초기 코인 약/식탁/공/쿠션과 구매 원자성 구현. cash disabled. 실제 결제 gate는 EXT-RELEASE/V08. |
| M15 | 두 OS 위젯 | BLOCKED_ENV | 6필드 timestamp/open_app bridge·CNG 경로 수정 및 iOS 위젯 compile/link PASS, 경제 명령 없음. 전체 앱 compiler failure 및 Android SDK 부재로 설치/OS 갱신·위젯 실행은 미검증(EXT-ENV/ACCOUNT). |
| M16 | 동면 부정 진행 정지 | PASS | 승인 로컬 config·경계/복귀·정지 자동 검사. OS lifecycle는 V03/V06. |
| M17 | 단일 config | PASS | APPROVED_MVP_POLICY/APPROVED_GAME_CONFIG와 역사적 DEV fixture 분리, SRS9-4/ADR005 연결. |
| M18 | 건강 원본 미전송 | PASS | 현재 local/fake/nativeOFF 경로 allowlist·원본/비밀 차단 검사. 실제 연결 후 재검증 의무 유지. |
| M19 | 비난 없는 안내 | PASS | 앱 안 상태 안내 우선·중립 문구·합성 알림 중복/철회 검사. 실제 발송 비활성. |

## §14-1 검증 게이트

| ID | 요구 | 분류 | 현재 구현/잔여 |
|---|---|---|---|
| V01 | 승인·SRS/config/tests 일치 | HARD_STOP_EXTERNAL | 여섯 제품 방향과 가역 config 승인 반영. 출시 전체에 필요한 법률·실서비스·지원 OS 승인은 잔여. |
| V02 | 중복·상한·분수·과거·날짜 | PASS | 승인 로컬 정책의 합성 경계/재시도/분할 검사. 실제 공급자 데이터는 V05/V06. |
| V03 | 식사 OS 종료·재시작 | BLOCKED_ENV | SQLite 실패/rollback/reload·중복 방지 자동 검사. 실제 앱 프로세스 강제 종료는 미실행. |
| V04 | 시각/RNG·분할·복합 상태 | PASS | 주입 시간/난수·단회 결과·시간 경계·복합 상태 자동 검사. |
| V05 | 수면 승인 예시+실제 기록 | HARD_STOP_EXTERNAL | 승인 산식과 합성 예시/분할/무기록 검사 완료. 실제 플랫폼 기록은 EXT-HEALTH/ENV. |
| V06 | 두 OS 권한/철회/재부팅 | BLOCKED_ENV | fake 오류/철회·권한 OFF·native scaffold. SDK/기기와 실제 건강 접근 승인 필요. |
| V07 | 오프라인/이전/복구/migration | HARD_STOP_EXTERNAL | schema7 additive migration·재시도/HOL·단일 writer/fence·명시 이전·확인분 복구 한계 합성 검사. 실제 계정/서버는 EXT-ACCOUNT. |
| V08 | 실결제 실패/중복/복원/환불 | HARD_STOP_EXTERNAL | 현금 비활성 port/catalog 경계. 실결제 및 플랫폼 sandbox는 EXT-RELEASE/ACCOUNT. |
| V09 | 동의/정책·접근 통제 | HARD_STOP_EXTERNAL | fake scope/철회·privacy allowlist 검사. 법적 정책과 실제 backend 접근 검증 필요. |
| V10 | 실제 환경/명령/증거 | PASS | 2026-09-19 전체236개/JS bundle 이력 보존. 2026-09-20 경로·호환성 영향 검사와 lint/typecheck, 위젯 compile/link PASS 및 전체 앱 exit65/NOT_RUN을 분리 기록. |
| V11 | 차단 결함·인간 출시 판단 | HARD_STOP_EXTERNAL | 독립 로컬 코드 QA와 외부/실기기 미검증 구분. 최종 출시 판단은 EXT-RELEASE. |

## 종료 판단

현재 환경과 승인 범위에서 IMPLEMENTABLE_NOW인 독립 작업은 완료했다. 남은 일은 법률 / 실제 건강정보 / 외부 계정 / 실결제·출시 / 시스템 환경으로 한정한다. iOS Simulator는 있으나 전체 앱이 현재 Xcode26.3에서 컴파일되지 않아 NEEDS_DEVICE_VALIDATION 실행이 막혔다. Android SDK와 실기기도 미준비다. 상태는 WAITING_FOR_HUMAN_DECISIONS, 전체 제품은 MVP_NOT_COMPLETE다. 실제 검증·독립 리뷰는 AUTONOMOUS-RUN-REPORT.md, 승인과 재개 항목은 DECISION-SUMMARY.md 및 DECISION-QUEUE.md에 있다.

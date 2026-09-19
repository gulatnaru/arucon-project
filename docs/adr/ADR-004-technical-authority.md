# ADR-004 — 기술 선택의 자율 결정과 제품 승인 분리

날짜: 2026-09-19 · 상태: **ACCEPTED / AUTO_DECIDE**
권한 근거: a8aa900 이후 사용자의 결정 재감사 지시. 제품 DEC의 OPEN/PROPOSED 상태를 일괄 승인하는 기록이 아니다.

## 문제와 대안

| 대안 | 품질·비용 | 판단 |
|---|---|---|
| DEC에 걸린 모든 구현을 사람에게 반환 | 이미 허용된 원자성·SDK 연결·재시도까지 정지 | 기각 |
| DEC 전체를 기술 결정으로 승인 | 성장·건강 해석·복구 손실을 기술 선택에 숨김 | 기각 |
| 기술 하위 항목만 채택하고 제품 정책은 명시 주입 | 로컬 개발 계속, 기존 제품 철학과 승인 경계 유지 | **채택** |

## 채택한 기술 기준

- 현재 React Native/TypeScript/Expo + SQLite 구성 유지. 프레임워크 교체는 검증된 코드와 호환성 비용을 늘린다. 런타임 버전은 package-lock에 고정한다. 실제 Firebase/Apple/Google 프로젝트는 생성하지 않는다.
- 순수 도메인 → application service → repository/transaction → OS/transport adapter 경계를 유지한다. 화면이나 위젯에 별도 경제 writer를 두지 않는다.
- SQLite additive migration, transaction 원자성, 동일 actionId 재시도, 실패 시 기존 데이터 보존, versioned config를 채택한다. JSON 저장소 교체나 파괴적 재생성은 선택하지 않는다. schema/index는 실제 질의와 정합성 요구에 맞춰 엔지니어가 결정한다.
- 내부 정수 표현·canonical JSON·원장 ID와 보상 값의 반올림/정산 자격은 구분한다. 전자는 자율 구현, 후자는 기존 SRS/승인된 정책만 사용한다. DEV fixture의 scale이 운영 보상 의미를 승인하지 않는다.
- 테스트는 주입 Clock/RNG/transport + 실제 로컬 SQLite 통합, 린트/타입, native project generation, JS bundle을 사용한다. 가짜 OS 결과로 실제 기기 게이트를 통과시키지 않는다.
- 동기화 재시도는 [ADR-001](ADR-001-sync-retry.md), 네이티브 통합은 [ADR-002](ADR-002-native-integration.md), 합성 알림 전달 계약은 [ADR-003](ADR-003-notification-delivery.md)에서 별도 비교·결정한다.
- 원본 건강정보·비밀의 outbound 차단, 기본 OFF permission/read/delivery, 가짜 계정 grant 철회는 구현 기준이다. 실제 법적 동의 완료를 가짜 grant로 대체하지 않는다.

## 승인 전 준비와 활성화

기존 `SleepScoreProvider`/`SleepBenefitPolicy`/`SleepBalanceConfig`, `GrowthProjectionPolicy`와 한 번 확정 원장, `BalanceDecision`, DEV shop catalog, synthetic sync recovery policy를 재사용한다. 추천안 때문에 별도 운영 기본값을 만들지 않는다. 추천 수치·기간·진화표는 승인 전 null/DecisionRequired 또는 명시 DEV 주입으로만 표현한다.

다음은 이 ADR이 결정하지 않는다: 수면 산식·세션 선택, 성장/성별/성격 분기·기간, 가격·초기 지급, 보상 날짜·소급 정산, 데이터 보존/삭제, 다기기 이용 제한과 분실 복구 UX, 알림 빈도·quiet hours, 공개 지원 OS, 실사용자 동의·계정·결제·배포.

## 되돌리기와 검증

서비스/adapter 교체는 같은 계약의 영향 테스트로 검증한다. schema6 도입 후 이전 바이너리로 무검증 다운그레이드하지 않는다. rollback은 원본 보존 후 별도 호환 migration으로 준비한다. 기술 선택이 되돌릴 수 있다는 말은 사용자 DB 삭제를 허용한다는 뜻이 아니다.

실제 실행 결과와 독립 QA는 [실행 보고서](../../AUTONOMOUS-RUN-REPORT.md)에 기록한다. native compile·simulator·physical device 검증은 각자 별도 상태다.

# 외부 승인·환경 대기열 — 승인된 MVP 기본 정책 이후

2026-09-19 · 기준34ab069 이후 사용자 승인. 기존 여섯 제품 방향과 그 안의 가역 config/ADR 세부값은 승인됐다. 수면 계수·케어 결정표·작은 코인 카탈로그·SQLite/재시도·단일 쓰기/이전·위젯/앱 안 안내를 다시 제품 질문으로 반환하지 않는다. 구현/검증 결과는 DECISION-SUMMARY와 실행 보고서에서 확인한다.

## EXT-LEGAL — 법률·동의·명칭

- 남은 사람 작업: 서비스 지역, 실제 연령/법정대리인 동의 검증, 수집 목적·보존/삭제·철회·접근 통제의 검토된 법적 정책. 명칭/캐릭터 상표의 사용·등록 검토.
- 이유: 합성 pending/verified/revoked와 체크박스는 법적 동의 증명이 아니다. 실제 미성년 계정 정책은 활성화하지 않는다.
- 준비 범위: fake consent/계정 scope·철회·오류·outbound allowlist, 문구·정책 interface. 원본 건강정보 서버/로그 금지.
- 선택지: 검토된 정책+명시 테스트 범위를 제공 / 정책만 확정하고 실가입은 보류. **추천: 정책 검토 후 별도 테스트 권한 제공.**
- 이후 첫 검증: 승인 policy state matrix → fake 격리/철회/삭제 검사 → 별도 허용 실제 auth/backend 검사. 법적 검토 결과를 구현자가 임의 대체하지 않는다.

## EXT-HEALTH — 실제 건강정보

- 남은 사람 작업: 실제 HealthKit/Health Connect/센서 접근의 참가자 동의, 기기, 기간, 허용 데이터 범위, 로그/삭제 원칙을 명시한 승인.
- 이유: 이번 승인은 게임용 개인 기준 scorer와 합성 입력 구현만 허용한다. 실제 건강정보 읽기는 계속 OFF.
- 준비 범위: 설명 가능한 scorer/config, 유효 세션/겹침/분할/no_data/error tests, native adapter/entitlement scaffold, 읽기 없는 기본 모듈.
- 선택지: 기기 준비 뒤 최소 범위 실제 기록 테스트를 명시 승인 / 실제 기록 검증 보류. **추천: SDK synthetic 검증을 먼저 끝낸 뒤 최소 범위 승인.**
- 이후 첫 검증: 데이터 없이 권한/상태 경계 → 승인 범위 실제 기록/철회/지연 처리. 원본은 로그·서버·외부 도구로 내보내지 않는다.

## EXT-ACCOUNT — 외부 계정·프로젝트

- 남은 사람 작업: 사용할 테스트 계정/프로젝트와 허용 리소스·작업 범위 제공 또는 생성 승인. 실제 Apple App Group/서명·Firebase/Google 프로젝트/OAuth/API key도 포함한다.
- 이유: 단일 writer/handoff가 승인됐어도 외부 프로젝트 생성이나 실계정 접속 권한은 아니다.
- 준비 범위: fake authority·epoch fence·idempotent handoff·복구 설명·계정/기기 scope·실제 source/build config scaffold. 비밀은 Git에 저장하지 않는다.
- 선택지: 기존 테스트 프로젝트를 제한 권한으로 제공 / 생성할 서비스와 작업을 명시 승인 / 외부 연결 보류. **추천: 준비된 테스트 리소스의 최소 권한 사용.**
- 이후 첫 검증: 프로젝트/계정 격리와 동의 scope → fake와 동일한 이전/충돌/복구 시나리오. 서버 원본 건강 저장 금지.

## EXT-RELEASE — 실결제·출시

- 남은 사람 작업: 현금 코스메틱의 실제 상품/결제·환불/복원 범위, 지원 OS/최소버전의 검증 후 최종 선언, 명칭·법적 정책·기기 gate 및 최종 runtime 아트 납품/시각 수용 후 출시 판단. 승인 2D 진화 참고형은 이미 있으며 새 외형 방향 결정을 요구하는 항목이 아니다.
- 이유: 현재 현금 코스메틱은 catalog/interface만 있고 효율 상품은 코인 전용이다. 실제 상품 생성·결제·TestFlight/App Store/Play/운영 배포는 금지다.
- 준비 범위: disabled cash port, source/catalog 경계·코인 원자 처리·오류·release 검사 목록. 공개 지원 OS는 build minimum과 구분한다. formId→renderer selector와 명시적 common GLB fallback을 준비했으며 네 전용 rigged/animated runtime asset을 납품·실기기 검토한 것으로 주장하지 않는다.
- 선택지: 기기/법적 검증 뒤 별도 결제·출시 범위를 승인 / 로컬 MVP 개발만 유지. **추천: 각 gate의 실제 증거를 확인한 뒤 별도 승인.**
- 이후 첫 검증: 승인된 상품의 테스트 검증/중복/복원/환불 → 실제 제출은 별도 명시 권한. feature push가 main merge/push·tag/release·배포 승인은 아니다.

## EXT-ENV — 시스템 환경·기기

- 남은 사람 작업: Expo SDK 57의 [공식 최소 Xcode 26.4+](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions)를 충족하는 개발 환경과 Android SDK/emulator/테스트 기기 준비. 시스템 설치는 사용자가 별도 수행/승인한다.
- 2026-09-20 재조사: Xcode26.3/Swift6.2.4/CocoaPods1.17.0 및 iPhone16e iOS26.3 simulator는 사용 가능하다. Android SDK/adb/emulator는 없다. 최신 inventory는 `mobile/evidence/ios-widget-path-fix/native-environment.json`.
- 실행/잔여: 위젯 Swift compile/link PASS. 전체 앱은 경로와 constructor annotation 수정 후에도 ExpoModulesJSI JavaScriptRuntime.swift의 pointer data-race 진단 7개로 xcodebuild exit65. iOS는 도구 부재가 아닌 공식 최소 미달/컴파일 호환성 BLOCKED_ENV다. simulator 앱 실행·OS 위젯 렌더·실기기 NOT_RUN. ADR-008의 재현 가능한 프로젝트 수정은 완료했고 동시성 검사는 완화하지 않았다.
- 선택지: 이미 준비된 개발 호스트/기기 제공 / 관리자가 필요한 SDK 설치 / 로컬 계약 검사 상태 유지. **추천: 준비된 개발 환경 제공.**
- 이후 첫 검증: environment inventory → 실제 건강 읽기 OFF native compile/simulator → lifecycle/저장/화면/위젯·모션/FPS → physical device 검증. simulator와 실기기는 별도 기록.

## 재개 규칙

승인된 여섯 방향은 재승인을 묻지 않고 이어 구현한다. 위 항목 중 준비된 가지부터 구현→영향 테스트→독립 reviewer→수정→재검증한다. 승인·실행 없는 외부/기기 gate를 PASS로 바꾸지 않는다. 최종 기준은 SRS14/14-1 전체다.

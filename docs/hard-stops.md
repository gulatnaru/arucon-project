# 멀티모델 자율 개발 Hard Stop — v1.9

이 목록은 **사용자에게 물어봐야 하는 지점**이다. 어떤 모델의 능력과도 무관하다. 한 가지 Hard Stop이 생겨도 독립 작업을 계속할 수 있으면 먼저 계속한다.

## HS-01 실제 건강정보

멈춤 조건: 실제 사람의 HealthKit/Health Connect/센서/수면 기록을 읽거나 처리하려는 순간, 또는 실제 건강 원본을 로그/서버/분석 도구에 전달하려는 순간.

자율 가능: adapter 인터페이스, 권한 상태 모델, synthetic provider, 공식 API 타입/manifest/entitlement scaffold, 실제 읽기 기본 OFF.

## HS-02 실제 사용자 계정·외부 서비스 생성

멈춤 조건: Firebase/Supabase/Apple/Google 등 실제 프로젝트·OAuth client·API key·사용자 계정을 만들거나 외부 서비스에 데이터를 쓰려는 순간.

자율 가능: repository/auth interface, local fake, emulator가 이미 설치·승인되어 있고 실제 계정/비밀이 필요 없는 테스트.

## HS-03 실결제·스토어 상품

멈춤 조건: App Store/Play 실제 상품 생성, 카드/실돈 결제, 실제 purchase verification backend 연결.

자율 가능: disabled payment port, sandbox-free fake receipt fixture, 코인 전용 utility 규칙의 로컬 테스트.

## HS-04 공개/운영 반영

멈춤 조건: Netlify/클라우드 운영 배포, 앱스토어 제출, TestFlight/Play 트랙 업로드, 원격 서버 migration, push notification 실제 발송, 공개 링크 변경.

자율 가능: 로컬/dev build와 산출물 생성, 로컬 simulator/emulator 실행.

## HS-05 원격 Git/공유/삭제

멈춤 조건: `git push`, merge/PR merge, 강제 이력 변경, 공유 권한 변경, 다른 사람 파일/브랜치 삭제, 되돌리기 어려운 데이터/DB migration.

자율 가능: `git diff/status`와 로컬 파일 수정. 로컬 commit은 사용자가 별도로 허용하지 않았다면 만들지 않는다.

## HS-06 제품 경험을 새로 결정해야 할 때

멈춤 조건: SRS/DEC에 답이 없고 선택에 따라 경제·성장·건강 해석·법적 동의·진화 결과·사용자 경험이 달라지는 경우. 예: 수면 점수 산식, 케어 기록→말루/모노/피코/몽글 분기, 실제 가격/성장 기간, 법정대리인 동의 방법.

자율 가능: 양쪽을 수용할 interface/config schema/test fixture. 한 안을 실제 사용자 기본값으로 확정하는 것은 금지.

## HS-07 승인 캐릭터의 큰 재디자인

멈춤 조건: 현재 승인된 아기 아루콘의 크림색 모찌 몸·작은 뿔·귀·시크한 기본 인상이나 1차 형태 카탈로그를 새 디자인으로 대체해야 하는 경우, 또는 2차 진화 형태/이름을 새로 정하려는 경우.

자율 가능: 기존 GLB/아트 재사용, 렌더링/성능 이식, 기술적 포맷 변환의 비파괴 사본.

## HS-08 시스템 권한·관리자 설치

멈춤 조건: `sudo`, 관리자 권한, 시스템 보안 설정 변경, 전역 SDK/도구 설치가 필요함.

자율 가능: 이미 설치된 Xcode/Android SDK/Node 사용, 프로젝트 로컬 npm/pnpm/yarn 패키지 설치, 워크스페이스 캐시.

## Hard Stop 보고 형식

```text
HARD STOP ID:
막힌 APP/기능:
왜 지금 사람이 결정해야 하는가:
시도하지 않은 위험 작업:
이미 완료한 독립 작업:
선택지 2~3개와 각각의 영향:
추천이 아니라 사실상 필요한 결정:
재개 후 첫 검증:
```

사용자가 답하지 않아도 가능한 독립 작업이 남았다면 이 보고를 먼저 만들되 **실행을 종료하지 말고 독립 작업을 계속**한다.

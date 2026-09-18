# Arucon 모바일 재구성 실행 보고서

기준일: 2026-09-19 KST. **전체 게이트: PARTIAL — 로컬 구현·검사 완료, 네이티브 검증과 제품 결정 대기.**

## Git 구조와 변경 범위

아래 미커밋/미push 표기는 재구성 검증 종료 시점의 기록이다. 이후 체크포인트 저장 승인은 이 문서 마지막 절에 별도로 기록한다.

`mobile/`을 현재 루트 Git 저장소의 일반 폴더로 구성했다. `mobile/.git`은 만들지 않았다. 루트 브랜치는 `feature/arucon-mobile-autonomous`, 기준 HEAD는 `83897aa`다. 사용자가 staged한 기존 gitlink 삭제와 `.gitignore` 변경을 보존했다. 새 mobile 파일은 루트에서 untracked 상태다. commit, push, merge, 공개 배포는 하지 않았다.

비어 있던 mobile과 루트의 Git 객체에서 이전 소스를 복구할 수 없어 요구 문서·승인 GLB를 기준으로 다시 구현했다. 이 보고서는 과거 별도 mobile Git/Windows 기록을 대체하며, 과거 55개 테스트 결과를 현재 코드의 근거로 사용하지 않는다.

## 구현 결과

| 단계 | 구현 | 게이트와 남은 검증 |
|---|---|---|
| APP-01 | Expo 개발 셸, Three GLB 방·이동·터치·성격 모션 | PARTIAL; 실제 렌더·기기 모션/FPS 확인 불가 |
| APP-02 | 순수 도메인, 원자적 SQLite 저장·식사/명령 원장·손상 보호 | PARTIAL; Node SQLite 검증, Expo SQLite 네이티브 미실행 |
| APP-03 | 직접/자동 식사·시간 경계·전경 복귀·일지·재시도·방 입력 연결 | PARTIAL; 실제 AppState/앱 종료/화면 미실행 |
| APP-04 | DEV 명명·합성 연령/보호자 상태·활동 공급자 계약 | PARTIAL; 실제 건강/인증/동의 OFF |
| APP-05 | 합성 수면 정책·코인 전용 상점 견적·읽기 전용 위젯 미리보기 | PARTIAL; 실제 scorer/회복·구매 트랜잭션·OS 위젯 미구현 |
| APP-06 | 통합 검사, SRS14 매핑, 증거·재개 기록 | PARTIAL; 로컬 증거 기록 완료, 설치형 앱 수용 게이트 잔여 |

운영 밸런스·수면·진화·동의·가격 OPEN/PROPOSED는 승인으로 바꾸지 않았다. 이름 카탈로그는 아루콘/말루/모노/피코/몽글을 유지하며 실제 외형 resolver는 DecisionRequired다. 승인 GLB는 원본과 바이트가 같다.

## 검토에서 수정한 문제

- 저장 스냅샷 누락을 신규 펫으로 오인하지 않도록 생성 marker와 원장 잔존 검사를 추가했다.
- 활동 공급자·revision·연결 이후 구간을 저장 트랜잭션 안에서 다시 검사한다.
- 불확실한 재시도는 같은 명령과 합성 걸음 aggregate를 재사용한다. 예상 급식 거절은 다음 입력을 막지 않는다.
- 과거 시간은 기존 재고로 먼저 정산한다. 전경 종료·보류된 lifecycle·동면 동시 경계도 검사했다.
- 표시용 식사 신호는 확정 EXP와 일지 이벤트에서만 만든다. 일지/위젯 조회는 경제 명령을 실행하지 않는다.
- 비동기 모델 로딩 후 자원 해제와 RAF 단일 예약을 검사했다. 동작 줄이기의 터치·식사·공은 짧은 정지 포즈로 바꾸고 mixer 시간이 전진하지 않는 것을 검사했다.

## 실행 기록

아래 결과는 마지막 reduced-motion 수정까지 반영한 소스에서 실행했다. 관련 source SHA-256 목록은 `mobile/evidence/rebuild-2026-09-19/source-sha256.json`에 보존했다.

| 명령 / cwd | 결과 | 로컬 증거 |
|---|---|---|
| `npm test` / mobile | exit 0, **72/72 PASS**, 실패·skip 0 | `tests.log` |
| `npm run lint` / mobile | exit 0, 오류·lint 경고 0 | `lint.log` |
| `npm run typecheck` / mobile | exit 0 | `typecheck.log` |
| `EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo export --platform all --max-workers 2 --output-dir evidence/rebuild-2026-09-19/metro` / mobile | exit 0, Android/iOS Hermes 번들·GLB 자산 생성 | `metro-export.log`, `metro/metadata.json` |
| Python 3.12.14 `validation/check_workflow.py` / root | exit 0, **38/38 PASS** | `workflow.log` |
| Python 3.12.14 `test_workflow_validator.py`의 회귀 assertion / root | exit 0 | `workflow-regression.log` |
| Git 구조·GLB 동일성·문서 링크 | PASS | `repository-check.log` |

장면 검사 11개를 포함한 합계이며 운영 수용 사례 218개 전체 실행 수가 아니다. 단위/SQLite 통합 검사이고 실제 UI E2E는 미실행이다. Expo의 NO_COLOR/FORCE_COLOR 런타임 경고는 번들 실패가 아니며 lint 경고와 구분한다.

환경: macOS, Node 26.7.0, npm 11.19.0, Python 3.12.14(번들), Java 21.0.12.1. Expo57/RN0.86.3/React19.2.3.

로컬 증거 폴더: `mobile/evidence/rebuild-2026-09-19/` (Git 제외). 원본 GLB SHA-256: `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`.

실제 온라인 `npm audit --json`은 exit 1, moderate 10, high/critical 0이었다. Expo→xcode→uuid 경로 GHSA-w5hq-g745-h8pq가 남아 있다. 제안된 Expo46 강제 다운그레이드는 적용하지 않았다. 오프라인 감사 0건은 결과로 채택하지 않았다. `EXPO_OFFLINE=1 CI=1 expo install --check`는 exit 0이나 오프라인 호환성 검사가 불완전하다는 경고가 있으므로 전체 호환성 승인으로 해석하지 않는다.

## 미실행·결정 대기

Xcode/Simulator·Android SDK/adb가 없어 APK/IPA, 실제 앱 화면·영상·FPS·Expo SQLite·OS 생명주기는 **미실행 / 확인 불가**다. Metro export는 JavaScript와 자산 번들이며 설치형 빌드가 아니다. 실제 건강정보/계정/결제/서버·공개 배포도 수행하지 않았다.

[APP-06 QA](mobile/docs/APP-06-validation.md)에 SRS14 전 항목, 네이티브 수용 판정, Hard Stop별 막힌 기능/선택지/재개 검사를 기록했다. [NEXT-RESUME.md](NEXT-RESUME.md)는 준비된 SDK 환경에서 이어갈 정확한 순서를 안내한다. 현재 결과로 MVP 완료나 AUTO-DEVELOPMENT: PASS를 선언하지 않는다.

## 역할 및 외부 반영

루트는 통합·최종 판단, arucon_builder는 장면/도메인/앱 통합, arucon_explorer는 요구·참조 탐색, arucon_reviewer는 독립 검토를 담당했다. APP-05 위임 중 모델 용량 오류가 발생해 루트가 기존 파일의 타입/config 수정과 통합을 이어갔다. 실제 backend model ID를 검증할 메타데이터가 없어 **ROUTING_UNVERIFIED**다.

로컬 소스·lockfile·문서와 합성 테스트 산출물만 작성했다. npm 의존성 다운로드와 공식 문서 조회 외에 외부 서비스에 제품 데이터를 쓰지 않았다. 건강 원본·비밀 접근, 계정 생성, 원격 Git 반영, 공유권한 변경, 시스템 SDK 설치, 승인 아트 재디자인은 수행하지 않았다.


## 체크포인트 저장 승인 — 커밋 전 기록

2026-09-19 사용자가 현재 재구성 소스의 commit과 `origin/feature/arucon-mobile-autonomous` push를 명시적으로 승인했다. 커밋 메시지는 `APP: rebuild mobile checkpoint through APP-04`다. 기존 APP-05/06 개발 경계와 검증 문서도 현재 소스의 일부로 보존하며, 메시지를 이유로 해당 구현 상태를 바꾸지 않는다.

사전 확인: 요청 브랜치 일치, `mobile/.git` 없음, package/lockfile 존재, 루트 Git 일반 파일 대상, 커밋 후보 제외 경로·비밀 패턴 발견 없음, 기존 검증 소스 해시 일치. stage 후에는 두 package 파일의 mode 100644 및 잔여 gitlink 부재를 확인한다. 실제 commit/push 성공은 이 커밋 전 문장에서 선행 선언하지 않으며 작업 종료 시 HEAD·원격 추적 ref·실제 원격 ref를 대조한다. main push, merge/PR merge, 배포는 승인 범위에 없다.

검증 기록은 **72/72, lint/typecheck PASS, Android/iOS bundle PASS**를 유지한다. 실제 기기 검증은 SDK 부재로 **미실행**이며 번들 통과를 실기기 통과로 표시하지 않는다.

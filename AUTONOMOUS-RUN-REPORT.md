# 이동용 개발 체크포인트
2026-09-18. 사용자 요청으로 기능 개발을 멈췄다. APP-05/06은 시작하지 않았다. 출시 완료 보고가 아니다.

## 단계별 실제 상태
전체 단계의 필수 기기 검증이 남아 있어 APP-01~04를 `in_progress`로 기록했다. 로컬 구현 완료와 전체 게이트 완료를 구분한다.

| 단계 | 상태 | 완료한 범위 | 남은 범위 / 마지막 통과 |
|---|---|---|---|
| APP-01 | in_progress | Expo 셸, 원본 GLB, 이동·터치·safe area; 독립 검토 완료 | native 화면/모션/FPS; 당시 8/8 |
| APP-02 | in_progress | 순수 도메인, SQLite 저장·ledger·rollback; 독립 검토 완료 | native SQLite, 운영 정책; 당시 36/36 |
| APP-03 | in_progress | 방/생활/직접·자동 급식/일지, 기존 DB 시설 일치; 독립 검토 완료 | 실제 UI 검증; 당시 47/47 |
| APP-04 | in_progress | 로컬 이름/동의 예시, 합성 활동 provider, 중복·역순 정산 | 독립 reviewer 검토 대기, 실기기/실제 건강 연동; 현재 55/55 |
| APP-05 | not_started | 없음 | 이번 요청에서 진행 금지 |
| APP-06 | not_started | 없음 | 이번 요청에서 진행 금지 |

마지막으로 마무리한 소규모 작업은 APP-04 저장본 사전 검사 회귀(스키마 v1에 game_state 행이 없는 경우 포함) 및 전체 테스트/Android 번들 검증이다. 제품 코드 추가 없이 체크포인트 문서와 제외 규칙을 정리했다.

## 구현 및 기술 선택
- Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript 6.0.3. Expo GL + Three로 네이티브 GL 방을 구성했다. WebView가 아니다. [렌더러 ADR](mobile/docs/ADR-APP-01-renderer.md).
- 승인 GLB를 변경 없이 번들했다. SHA256: `6971E18721E03784A22033D5F73BCD90474862117F1CB7D694DC326D254E984F`. 캐릭터 형태/성격/모션을 재디자인하지 않았다.
- 도메인·저장·표시·OS 경계를 분리했다. 실제 섭취만 EXP, 직접/opt-in 자동급식 같은 경제 규칙, 무료 교감·활동 자원 중립, 청결 기반 기운 없음, 동면 정지 규칙을 테스트했다. [도메인/저장 결정](mobile/docs/APP-02-domain-storage.md).
- SQLite 트랜잭션, 명령/식사 ledger, pending 명령, 엄격한 저장본 검증으로 중복 보상/부분 저장을 방지한다. 손상 저장본은 새 펫으로 덮어쓰지 않는다.
- 자동급식은 실제 배고픔 조건이 성립하는 시점에 정산하며 늦게 받은 활동 먹이를 과거에 소급 소비하지 않는다. [방/생활 통합](mobile/docs/APP-03-life-room-integration.md).
- 온보딩·이름 규칙·나이/보호자 상태·활동 날짜는 DEV fixture다. 실제 법적 동의나 건강 연결을 구현했다고 주장하지 않는다. native health 기본 OFF, 운영 config는 DecisionRequired/NotConfigured로 격리했다. [APP-04 경계](mobile/docs/APP-04-onboarding-activity.md).
- Windows 인코딩 오류를 고치기 위해 validation/check_workflow.py의 텍스트 입출력에 UTF-8을 명시했다. 기존 검증 조건/테스트 기대값은 유지했다. 운영 기술 DEC를 APPROVED로 바꾸지 않았다.

## 테스트와 빌드
환경: Windows, Node 24.19.0, npm 11.17, 프로젝트 로컬 Python 3.13.15. PowerShell에서는 npm.cmd/npx.cmd 사용.

| 검사 | 결과 |
|---|---|
| mobile: npm.cmd test | PASS 55/55, fail 0, skip 0 |
| mobile: npm.cmd run lint | PASS, exit 0 |
| mobile: npm.cmd run typecheck | PASS, exit 0 |
| mobile: npx.cmd expo export --platform android --output-dir evidence/app04-android-export | PASS, 664 modules, GLB + HBC 번들; APK 빌드 아님 |
| Python workflow checker | PASS 38/38 |
| 기존 test_current_workflow_validator_passes 직접 실행 | PASS |
| 기존 참조 baseline | 104/105; site/sw.js 미생성으로 실패 |
| 원본 보존 복사본 build.py 후 참조 재검사 | 111/112; 원본 assets/icons 누락으로 manifest icon 검사 실패 |
| npm audit --json | exit 1; moderate 10, high/critical 0; Expo→xcode→uuid 체인, 강제 다운그레이드 안 함 |

원시 로그는 mobile/evidence/checkpoint-npm-test.log, app04-lint-final.log, app04-typecheck-final.log, app04-export-approved.log 및 evidence/autonomous/에 있다. 로그/대형 export는 Git 제외 대상이다. 이 문서와 JSON에 결과 요약을 남겼으며 다음 PC에서는 명령을 다시 실행한다.

## 검증하지 못한 항목 / OPEN / Hard Stop
- Android 기기는 adb unauthorized였다. Java/Android SDK/emulator를 찾지 못했고 Windows에서 iOS/Xcode 빌드는 확인할 수 없다. APK/IPA, 실제 렌더/영상/FPS, OS SQLite, background/native health는 NOT_RUN이다.
- APP-04 독립 검토는 미실행이다. 이전 APP-01~03 reviewer 결과로 이를 대체하지 않는다.
- DEC-05 수면 scorer, DEC-08 진화, DEC-09 가격/결제, DEC-11 실제 동의, DEC-12/31 운영 기술/지원환경, DEC-13/24 밸런스, DEC-17 보존/복구 및 DEC-01/02/15 등 PROPOSED/OPEN 정책은 승인 대기다.
- HS-01 실제 건강정보, HS-02 실제 계정/외부 쓰기, HS-03 실결제, HS-04 운영 배포, HS-05 원격 Git/파괴적 작업, HS-06 제품 결정, HS-07 큰 아트 변경, HS-08 관리자/전역 도구 설치는 실행하지 않았다. 상세 경계는 [hard-stops](docs/hard-stops.md).
- 현재 정지 사유는 사용자의 이동 체크포인트 요청이다. OPEN 때문에 모든 독립 개발이 불가능하다는 뜻은 아니다.

## 모델/역할
| 역할 | 요청 모델 | 실제 실행 확인 |
|---|---|---|
| root 통합/판단 | Astra | 런타임 모델 ID 미노출 |
| arucon_builder 구현 | Sol | ROUTING_UNVERIFIED |
| arucon_explorer 읽기 조사 | Terra | ROUTING_UNVERIFIED |
| arucon_reviewer 독립 검토 | Terra | ROUTING_UNVERIFIED |
| arucon_luna_worker 좁은 반복 수정 | Luna | ROUTING_UNVERIFIED |
| arucon_spark_worker | Codex-Spark | HTTP 400, 계정 미지원; 재시도 안 함 |

역할별 probe는 실행했으나 설정/자기 식별을 실제 모델 증거로 취급하지 않았다. Astra 상속을 입증한 증거도 없어 ROUTING_MISMATCH로 단정하지 않는다. evidence/autonomous/routing.*에 세부 기록이 있다.

## Git와 이관 범위
- 루트는 Git 저장소가 아니다. mobile만 별도 저장소이며 branch `main`, HEAD `800090441b5e9e0ae351d2cb02a16fa85d7a10c0` (Initial commit)이다.
- 변경된 tracked 파일: mobile/.gitignore, App.tsx, app.json, package.json, package-lock.json.
- 새 커밋 후보: mobile/README.md, assets/arucon-tsundere-motion.glb, docs/, eslint.config.js, metro.config.js, src/, tests/.
- 루트 체크포인트 변경: .gitignore, AUTONOMOUS-STATUS.json, AUTONOMOUS-RUN-REPORT.md, NEXT-RESUME.md. 이전 작업의 docs/adr/README.md와 validation/check_workflow.py도 이관해야 한다. 루트에는 비교할 Git 기준선이 없어 전체 변경 여부를 Git diff로 확정할 수 없다.
- mobile만 업로드하면 루트 문서·tasks·references·검증/라우팅 지침은 포함되지 않는다. 전체 개발 맥락은 프로젝트 루트도 함께 이관해야 한다. 저장소 초기화/중첩 .git 삭제/이력 변경은 하지 않았다.
- 양쪽 .gitignore를 보강했다. .env*, 키/인증 파일, 의존성/캐시, SQLite, 로그, 빌드, evidence, 영상/ZIP을 제외한다. 필수 GLB·이미지·lockfile·소스는 보존한다. 원본 참조 assets도 유지한다.
- 비밀정보 검사: mobile 커밋 후보 텍스트 및 루트 docs/tasks/validation/.codex/.agents/figma/references 텍스트 116개에서 private-key header, 알려진 키 형식, API key/token/password 할당과 URL을 검사했다. 실제 자격증명/내부 URL 후보는 발견되지 않았다. 바이너리 내부·ignored 생성물·Git 과거 이력은 검사 범위 밖이며 완전한 비밀 부재 보장은 아니다. 값은 출력하지 않았다.
- commit/push/merge/배포/외부 데이터 쓰기는 하지 않았다.
- 추가 비밀 패턴 검사: mobile 기존 tracked 텍스트 9개와 루트 최상위 텍스트 7개도 후보 0건. Git 과거 이력/바이너리는 제외했다.

### 체크포인트 자체 검증
- arucon_reviewer의 독립 체크포인트 검토: BLOCKER 없음. 문서/ignore/검증 증거만 검토했으며 APP-04 구현 리뷰는 여전히 pending이다.
- 상태 JSON 파싱 및 각 단계 상태 enum 검사 PASS.
- root ignore 규칙을 npm ignore matcher로 검사: 제외 17경로/보존 6경로 모두 예상 일치. root 자체의 Git 추적 검사는 저장소 부재로 불가하다.
- mobile git check-ignore 대표 패턴 검사 PASS; GLB/필수 PNG/소스/lockfile 유지, tracked 민감/대형 생성물 후보 없음.
- mobile git diff --check PASS. 변경된 tracked 파일은 5개이며 새 소스는 아래 ?? 항목에 별도로 표시된다.

최종 mobile Git 상태(로컬 명령 한정 safe.directory 지정, 전역 설정 변경 없음):
```text
## main
 M .gitignore
 M App.tsx
 M app.json
 M package-lock.json
 M package.json
?? README.md
?? assets/arucon-tsundere-motion.glb
?? docs/
?? eslint.config.js
?? metro.config.js
?? src/
?? tests/
```

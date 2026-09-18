# 다음 PC 재개 안내
기준일: 2026-09-18. 현재는 사용자 요청으로 멈춘 이동 체크포인트다.

## 브랜치 / 마지막 완료 작업
루트는 Git 저장소가 아니다. mobile 저장소의 브랜치는 `main`, HEAD는 `800090441b5e9e0ae351d2cb02a16fa85d7a10c0`이다. 새 commit/push는 하지 않았다.
APP-03까지 로컬 구현과 독립 검토를 완료했다. APP-04 로컬 구현 및 마지막 저장본 회귀 검사를 마쳤고 전체 55/55와 Android Metro export가 통과했다. 전체 APP 게이트는 기기 검증이 남아 in_progress다.

## 미완료와 다음 정확한 작업
1. 프로젝트 루트 전체의 소스/문서/원본 assets를 이관한다. mobile Git만으로는 루트 AGENTS.md, .codex, .agents, docs, tasks, references, validation 및 이 체크포인트 문서가 전달되지 않는다. node_modules/.expo/.tools/빌드/DB/비밀/영상/ZIP은 이관 소스로 필요하지 않다.
2. AGENTS.md → 이 문서 → AUTONOMOUS-STATUS.json → AUTONOMOUS-RUN-REPORT.md → docs/model-routing.md와 hard-stops.md를 읽는다. mobile 수정 전 mobile/AGENTS.md도 읽는다.
3. Git 상태/Node/npm 및 필요한 개발 도구를 확인하고 lockfile로 npm ci 후 아래 검사를 재현한다.
4. APP-04만 독립 arucon_reviewer에 읽기 검토를 위임한다. 대상: mobile/src/onboarding, activity, storage/gameStore.ts, application/lifeController.ts, App.tsx와 관련 tests/docs. DEC/실제 건강 OFF/손상 저장본/중복 정산 경계를 대조한다. 필요한 좁은 수정은 builder에 위임하고 영향 검사를 다시 실행한다.
5. 승인된 기기와 이미 준비된 SDK가 있으면 native 개발 빌드 및 실제 화면/이동/터치/복귀/SQLite/모션 영상을 검증한다. 실제 건강정보 접근은 별도 Hard Stop이다.
6. 새로운 APP-05/06은 이번 체크포인트 요청 범위가 아니다. 다음 사용자의 개발 재개 지시에 따라 시작한다.

## 개발 명령
프로젝트 루트에서 시작한다. Node 24.19.0 / npm 11.17에서 마지막 검증했다.
```powershell
git -C mobile status --short --branch
Set-Location mobile
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform android --output-dir evidence/resume-android-export
npm.cmd run start
```
native SDK/기기가 준비된 환경에서만 `npm.cmd run android`; iOS는 macOS/Xcode에서 `npm run ios`.
루트의 Python 3.11 이상 환경:
```powershell
python -X utf8 validation/check_workflow.py
python -X utf8 -c "import runpy; case=runpy.run_path('validation/test_workflow_validator.py'); case['test_current_workflow_validator_passes'](); print('PASS')"
```
현재 PC에서는 python alias 대신 `.tools/python313/python.exe`를 사용했다. 이 로컬 바이너리는 Git에 넣지 않는다.
소유권 오류가 나면 전역 safe.directory를 바꾸지 않고 해당 명령에만 현재 실제 mobile 절대 경로를 `git -c safe.directory=...`로 지정했다.

## 마지막 결과 / 알려진 문제
- 앱 test 55/55, lint/typecheck PASS. Android Metro export 664 modules PASS; APK/IPA 빌드 성공이 아니다.
- workflow 38/38 및 기존 회귀 assertion PASS.
- 참조 재빌드 111/112: 원본 assets/icons 누락으로 1개 실패. npm audit moderate 10건(Expo/xcode/uuid), high/critical 0. 테스트 삭제/강제 다운그레이드하지 않았다.
- adb unauthorized, Java/Android SDK/emulator 미확인. 실제 기기 화면/모션/FPS/native SQLite/health/background는 미검증.
- APP-04 reviewer 대기. 이름/보호자 상태/활동 날짜·인식 시작은 DEV fixture; 실제 동의/운영 정책이 아니다.
- 운영 밸런스·수면 scorer·진화 resolver·가격·동의·보존/복구 DEC는 OPEN/PROPOSED. DecisionRequired/NotConfigured/native OFF를 유지한다.
- routing은 ROUTING_UNVERIFIED. 모델 설정은 확인했지만 runtime ID는 없다. Spark는 계정 미지원이다.

## 환경변수 이름
현재 합성 앱 실행에 필요한 API 키/비밀 환경변수는 없다. Android 개발 도구 경로를 설정할 경우 필요한 이름만 나열한다.
- ANDROID_HOME
- ANDROID_SDK_ROOT
- JAVA_HOME

## 다음 Codex 세션 재개 프롬프트
> 루트 AGENTS.md와 NEXT-RESUME.md, AUTONOMOUS-STATUS.json, AUTONOMOUS-RUN-REPORT.md를 먼저 읽어라. 이동 체크포인트에서 재개한다. mobile은 main의 별도 Git 저장소이고 루트는 Git 저장소가 아니므로 변경과 이관 범위를 먼저 확인해라. 루트는 통합을 담당하고 docs/model-routing.md에 따라 역할 위임해라. routing runtime ID를 확인할 수 없으면 ROUTING_UNVERIFIED로 기록하고 성공으로 주장하지 마라. APP-04 독립 reviewer 검토부터 진행하고 필요한 수정과 영향 범위 검증을 완료해라. 실제 기기 검증은 환경과 허용 범위를 확인한 뒤 수행해라. OPEN 제품 선택과 실제 건강정보/계정/결제/배포/원격 Git/파괴적 작업 Hard Stop을 지켜라. 기존 아트·불변식을 보존하고 APP-05/06은 아직 시작하지 마라. commit/push는 별도 지시 없이는 하지 마라.

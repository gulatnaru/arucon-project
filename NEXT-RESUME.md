# 다음 재개 안내

기준일: 2026-09-19 KST. 루트 저장소의 `mobile/`에 개발 소스를 다시 구성했다. 이전 Windows/별도 mobile Git 체크포인트와 혼동하지 않는다.

## Git과 소스

- 루트: `/Users/heung/projects/arucon-project`, 브랜치 `feature/arucon-mobile-autonomous`, 기준 HEAD `83897aa`.
- `mobile/`은 **일반 하위 디렉터리**다. `mobile/.git`을 만들거나 `git init`을 실행하지 않는다. 루트에서 Git 작업을 수행한다.
- 기존 gitlink 삭제는 사용자가 staged했고, 이후 현재 재구성 체크포인트를 루트 Git에 commit하여 `origin/feature/arucon-mobile-autonomous`에 push하도록 명시적으로 승인했다. 지정 메시지는 `APP: rebuild mobile checkpoint through APP-04`다. 실제 저장 상태는 아래 Git 명령으로 HEAD와 원격 브랜치를 대조한다. main push·merge·배포는 이 승인에 포함되지 않는다.
- 이전 gitlink 소스는 현재 로컬 객체/디렉터리에 없어 요구 문서와 승인 GLB로 다시 구현했다. 이전 55개 테스트 결과를 현재 소스의 결과로 사용하지 않는다.
- `node_modules`, `.expo`, `evidence`, 생성 `ios/android`, 비밀과 DB는 이관 소스에서 제외한다. 합성 앱에 API 키는 필요 없다.

## 현재 상태와 남은 일

APP-01~05 로컬 구현과 통합 검사 결과는 [실행 보고서](AUTONOMOUS-RUN-REPORT.md), [상태](AUTONOMOUS-STATUS.json), [APP-06 QA](mobile/docs/APP-06-validation.md)에 기록했다. 전체 상태는 PARTIAL이다.

1. 현재 Git/파일 상태와 최종 검사 기록을 확인한다. 문서·테스트 PASS를 네이티브 실행 PASS로 해석하지 않는다.
2. 준비된 Xcode 또는 Android SDK 환경에서 로컬 개발 빌드를 실행한다. 현재 Mac에는 Xcode/Simulator/Android SDK/adb가 없으며 시스템 설치는 HS-08 승인 경계다.
3. 실제 앱의 최초 온보딩→방→합성 걸음→직접/자동 식사→저장→종료/재실행을 검사한다. Expo SQLite와 AppState 실제 동작을 확인한다.
4. 작은 휴대폰 레이아웃, 바닥 목적지 변경·가구 회피·펫 우선 터치, 두 성격, 식사/공/쓰다듬기 모션, 움직임 줄이기, 배경/복귀 RAF를 캡처·영상으로 검증한다. 기기 FPS를 별도로 측정한다.
5. 제품 DEC 승인 후 수면 scorer/체력 회복·진화/성별·운영 밸런스·가격·동의 정책을 반영한다. 실제 건강/계정/결제/배포는 각각 Hard Stop을 먼저 확인한다. 상점은 견적만, 위젯은 읽기 전용 앱 내 미리보기만 구현되어 있다.
6. 의존성 감사의 moderate 10건(Expo→xcode→uuid)을 호환 가능한 수정으로 해소한다. 현재 제안된 Expo 46 강제 다운그레이드를 적용하지 않는다.

## 재현 명령

Node 26.7.0 / npm 11.19.0에서 검사했다. `npm ci`는 lockfile 기준 설치다.

```sh
git status --short --branch
git -C mobile rev-parse --show-toplevel
cd mobile
npm ci
npm test
npm run lint
npm run typecheck
CI=1 npx expo export --platform android --output-dir evidence/resume-android
CI=1 npx expo export --platform ios --output-dir evidence/resume-ios
```

SDK가 준비된 환경에서 `npm run ios` 또는 `npm run android`, 이후 `npm start`를 사용한다. Metro export는 APK/IPA가 아니다.

루트에서는 Python 3.11 이상 및 PyYAML을 사용한다.

```sh
python3 validation/check_workflow.py
python3 -c "import runpy; runpy.run_path('validation/test_workflow_validator.py')['test_current_workflow_validator_passes']()"
```

현재 Mac의 시스템 Python 3.9.6 대신 Codex 번들 Python 3.12.14로 실행했다. 검사기가 생성하는 `validation/v1.9-static-check.json`은 의미 없는 정렬 변경이 생길 수 있으므로 의도하지 않은 diff를 남기지 않는다.

## 다음 세션 재개 프롬프트

> 루트 AGENTS.md, NEXT-RESUME.md, AUTONOMOUS-STATUS.json과 AUTONOMOUS-RUN-REPORT.md부터 읽어라. mobile은 현재 루트 Git의 일반 하위 디렉터리이며 mobile/.git을 절대로 만들지 마라. 기존 gitlink의 staged 삭제와 사용자 변경을 보존해라. 현재 소스의 최종 검사만 근거로 삼고 과거 별도 저장소 결과를 재사용하지 마라. 역할 지침에 따라 위임하되 runtime model ID가 확인되지 않으면 ROUTING_UNVERIFIED로 남겨라. 준비된 로컬 SDK가 있는지 확인하고 설치형 개발 앱·SQLite·화면·모션 검증부터 이어가라. 실제 건강정보·계정·결제·운영 배포·원격 Git·시스템 설치·제품 결정 Hard Stop을 지켜라. 별도 허용 없이 commit/push/merge하지 마라.

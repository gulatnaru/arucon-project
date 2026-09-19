# 다음 재개 안내

기준일: 2026-09-19 KST. 기준 체크포인트는 **3b52a5b24685d113ebff34550cfa60be1e7b5cf7**, 브랜치는 **feature/arucon-mobile-autonomous**다. 현재 재개 작업 결과는 [상태](AUTONOMOUS-STATUS.json)와 [실행 보고서](AUTONOMOUS-RUN-REPORT.md)를 우선 확인한다.

## 저장소와 권한

- `mobile/`은 루트 Git의 일반 디렉터리다. `mobile/.git`·중첩 저장소·gitlink를 만들지 않는다.
- 개발 기준 체크포인트 3b52a5b 이후 APP-04~06 로컬 구현·검증을 완료했다. 사용자가 후속 요청으로 `APP: complete local implementation through APP-06` 체크포인트의 stage/commit 및 현재 feature 브랜치 push를 승인했다. 이 저장 작업의 실제 결과는 HEAD·원격 ref로 확인한다. main push/merge·PR merge·배포는 승인되지 않았다.
- 현재 소스는 체크포인트의 APP-01~04를 이어 쓰며 재구현하지 않았다. APP-04 reviewer의 문서 오류는 정정 후 LOCAL PASS/CLOSED다.
- `node_modules`, `.expo`, `evidence`, 생성 native/번들, DB/비밀/영상/ZIP은 Git 제외 대상이다. 새 소스가 untracked이면 작업 디렉터리 이관 시 빠뜨리지 않는다.

## 이어갈 순서

1. Git 상태와 보고서의 실제 결과·남은 사항을 확인한다. APP-05/06 로컬 게이트가 완료된 항목은 다시 구현하지 않는다.
2. 준비된 Xcode 또는 Android SDK 환경에서 네이티브 개발 빌드를 진행한다. 이번 호스트는 Xcode/simctl/Android SDK/adb/emulator가 없어 BLOCKED_ENV다. 시스템 도구 설치가 필요하면 HS-08 범위를 먼저 확인한다.
3. 실제 앱의 온보딩→합성 활동→직접/자동 섭취→수면 fixture→이후 식사→저장/재실행과 native SQLite/AppState를 확인한다. 합성 null/0/70/100은 실제 건강 scorer가 아니다.
4. 변경된 DEV 패널·수면 안내·위젯 ready/stale/missing/error/unsupported 미리보기를 실제 작은 화면에서 확인한다. 위젯 앱 내 미리보기는 OS widget extension이나 실제 앱 진입 검증을 대신하지 않는다.
5. 기존 방의 이동·쓰다듬기·두 성격·식사·동작 줄이기·전경 복귀를 실제 캡처/영상으로 검증한다. FPS는 장치에서 측정하고 번들 통과/정지 화면으로 승인하지 않는다.
6. 수면 scorer/날짜귀속/회복·진화·운영 가격·법정 동의는 OPEN/PROPOSED 결정 후 구현한다. 현재 실제 건강·계정·결제/클라우드 경로는 연결하지 않는다. 상점은 읽기 전용 견적이며 실제 코인 구매 트랜잭션도 아직 없다.

## 명령

현재 Node 26.7.0/npm 11.19.0이며 lockfile은 체크포인트 버전을 유지한다. 의존성이 이미 있으면 재설치하지 않는다.

```sh
git status -sb
git log --oneline --decorate -3
git -C mobile rev-parse --show-toplevel
cd mobile
npm test
npm run lint
npm run typecheck
EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo export --platform all --max-workers 2 --output-dir evidence/resume-app05-06/metro
```

테스트는 영향 범위로 좁히되 APP-06 최종 통합 게이트에서는 전체 실행 기록을 남긴다. 준비된 SDK가 있을 때만 `npm run ios` 또는 `npm run android`를 실행한다. Metro는 JavaScript/자산 번들이며 APK/IPA가 아니다.

루트 문서 검사는 Python 3.11 이상+PyYAML이 필요하다. 이 호스트의 시스템 Python3.9.6 대신 Codex 번들 Python3.12.14를 사용한다. `validation/check_workflow.py`의 생성 JSON 정렬만 바뀌면 의미 없는 diff를 남기지 않는다.

## 증거와 재개 프롬프트

이번 로컬 증거는 `mobile/evidence/resume-app05-06/`에 있으며 Git에서 제외한다. 이전 72/72는 체크포인트 결과, 이번 최종 결과는 보고서의 해당 실행 표로 구분한다. 실제 backend model ID는 노출되지 않아 ROUTING_UNVERIFIED다.

> AGENTS.md, AUTONOMOUS-STATUS.json, AUTONOMOUS-RUN-REPORT.md, NEXT-RESUME.md를 먼저 읽고 현재 HEAD와 로컬 변경을 보존해라. mobile은 루트 Git 일반 디렉터리다. 완료된 APP-01~05 로컬 구현을 다시 만들지 마라. 모델 역할을 유지하고 남은 native 환경/수용 검증 및 제품 결정부터 이어가라. 실제 건강·계정·클라우드·결제·운영 배포·시스템 설치 권한 경계를 지켜라. 현재 변경에 대한 별도 명시적 승인 없이는 stage/commit/push/merge하지 마라.

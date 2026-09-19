# 다음 재개 — 승인 MVP 기본 정책 구현 이후

시작 baseline34ab069 이후 여섯 제품 정책을 승인·구현했다. 현재 feature checkpoint는 이 파일을 포함하는 Git HEAD/원격 브랜치로 확인한다. 현재 판정은 WAITING_FOR_HUMAN_DECISIONS / MVP_NOT_COMPLETE다.

## 먼저 확인

1. AGENTS.md, AUTONOMOUS-STATUS.json, AUTONOMOUS-RUN-REPORT.md, DECISION-SUMMARY.md, DECISION-QUEUE.md, MVP-GAP-MATRIX.md와 SRS14/14-1 및 관련 DEC/ADR를 읽는다.
2. feature/arucon-mobile-autonomous, root Git 일반 mobile 디렉터리, mobile/.git/gitlink 없음과 변경 상태를 확인한다. 기존 작업을 다시 구현하지 않는다.
3. 2026-09-19 전체236/236 및 두 OS JS bundle은 과거 이력이다. 2026-09-20 위젯 경로/JSI constructor 호환성 수정 후 npm ci 재현 및 영향 검사를 실행했다. 위젯 Swift compile/link는 통과했으나 전체 앱 xcodebuild는 JavaScriptRuntime.swift pointer data-race 7개로 exit65다. Xcode26.3은 Expo SDK57의 공식 최소26.4+ 미달이다. simulator 자체는 사용 가능하며 앱/physical device/visual runtime은 NOT_RUN이다.
4. ADR-008과 `mobile/evidence/ios-widget-path-fix/`를 확인한다. Xcode26.4+ 환경 제공 뒤 설치된 도구만 사용해 재빌드한다. 현재 26.3에서 같은 명령 반복이나 concurrency 검사 완화로 PASS를 만들지 않는다. Expo57 prebuild는 기본 clean이므로 기존 생성 프로젝트를 유지하려면 `--no-clean`을 명시한다.

## 진화형 runtime 아트 잔여

승인 2D 진화 참고 시트와 외형 이름/실루엣은 이미 존재한다. formId→renderer 계약은 연결했지만 말루/모노/피코/몽글의 전용 rigged/animated runtime asset 네 개는 아직 없다. 현재는 명시적 공통 GLB 미리보기 fallback이며, 별도 asset 납품/출시 시각 수용과 실제 기기 검증이 필요하다. 이를 새로운 외형 제품 결정이나 4형 렌더 PASS로 바꾸지 않는다. `mobile/docs/MVP-form-render-readiness.md` 참조.

## 재개 가능한 가지

- EXT-ENV: 제공된 SDK/기기를 다시 조사하고 설치·계정 인증 없이 준비돼 있으면 건강 읽기 OFF native compile/simulator/기기·위젯·lifecycle·시각·모션을 검증한다.
- EXT-LEGAL/ACCOUNT: 검토된 정책 및 별도 허용 테스트 계정/리소스 범위 안에서만 실제 연결을 진행한다.
- EXT-HEALTH: 실제 건강정보 접근은 별도의 명시적 승인 전 OFF. 합성 scorer와 정책은 이미 승인됐다.
- EXT-RELEASE: 실결제/상품/출시/지원 OS 최종 선언은 실제 gate와 별도 권한이 필요하다. main/merge/force/tag/release/배포 금지 경계 유지.

합성 sync controller의 authority는 앱 재시작 후 실제 서버처럼 재구성하지 않는다. durable outbox/last-confirmed/fence는 보존되며 이전된 설치는 읽기 전용이다. 실제 backend가 준비되기 전 fake를 운영 복구 보증으로 사용하지 않는다.

## 재개 프롬프트

“현재 feature checkpoint와 위 문서를 읽고, 다음 환경/외부 승인 변화만 반영해 재개해라: [항목·범위]. SRS14/14-1 전체를 완료 기준으로 삼고, 승인된 여섯 제품 정책 및 ADR config는 재승인을 묻지 말고 유지해라. docs/model-routing에 따라 구현→영향 테스트→독립 reviewer→수정→재검증을 계속해라. 실제 건강/법적 미성년 정책/실계정/결제·출시는 명시된 범위만 수행하고 simulator와 physical device를 구분해 기록해라. 현재 feature의 일반 commit/push만 허용하며 main/merge/force/tag/release/배포는 하지 마라.”

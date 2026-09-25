# SRS MVP gap matrix — 승인된 여섯 정책 구현 이후

2026-09-19 · 시작 `34ab069` · SRS v1.9 §14 전체19행 + §14-1 전체11행. PASS는 표에 명시한 로컬 코드/자동 검증 범위다. native generation/parse/JS bundle은 네이티브 compile·simulator·physical device 검증이 아니다.

## 2026-09-20 SDK55 마이그레이션 이후 현재 환경

Expo55.0.31/RN0.83.10/React19.2.0으로 정렬해 macOS15.6/Xcode26.3에서 native compile과 Simulator 설치·프로세스 시작을 통과했다. iOS26.3 runtime도 있다. `expo run:ios` 전체는 마지막 Simulator 창 활성화의 System Events 권한 부족으로 exit1이며 별도 xcodebuild exit0와 구분한다. 실제 GLB·터치/모션·OS 위젯 UI는 권한 대기로 NOT_EVALUATED, physical device NOT_RUN, Android SDK 부재다. 최신 전체239개/lint/typecheck/doctor20개/두 JS bundle/CNG25개 검사는 이번 실행이다. 2026-09-19의236개와 SDK57 빌드 실패는 역사적 증거로 보존한다.

### 2026-09-25 Windows Android 실제 관찰 (현재)

앞 문단의 Android SDK 부재는 2026-09-20 macOS 이력이다. Windows에서 project-local SDK36/NDK27.1로 AVD synthetic runtime, source254/254/lint/typecheck, targeted17/17, CNG16/16, current x86_64 debug/release builds, Font130 runtime, widget footer/tap/rest를 기록했다. Balanced-renderer A/B is PARTIAL/NOT_PASS, not GL FPS/physical proof. Windows scoped engineering is complete; iOS current execution은 Windows에서 NOT_RUN이고 전체 product status는 `MVP_NOT_COMPLETE`다.

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
| M12 | 배회·표정·터치 | PARTIAL_DEVICE_VALIDATION | Windows AVD에서 normal touch lean/restore, floor arrival, corrected reduced-motion을 합성 입력으로 관찰. 전체 motion/FPS와 iOS는 미실행. |
| M13 | 방·가독성·말캉 실제 검토 | PARTIAL_DEVICE_VALIDATION | Windows AVD cold/warm room/GLB와 compact UI를 관찰. Release balanced renderer (MSAA0/no AA, DPR1.65, Lambert) warm render PASS; runtime A/B is PARTIAL/NOT_PASS and physical gain is unproven. 네 전용 rigged asset, 영상/FPS 수용과 iOS는 미완료(EXT-RELEASE/ENV). |
| M14 | 상점·현금 경계 | HARD_STOP_EXTERNAL | 초기 코인 약/식탁/공/쿠션과 구매 원자성 구현. cash disabled. 실제 결제 gate는 EXT-RELEASE/V08. |
| M15 | 두 OS 위젯 | PARTIAL_DEVICE_VALIDATION | Android footer/home/tap/rest is observed PASS; iOS17 containerBackground/target-phase PNG/footer static review closed; targeted native17/17, Android debug/release compile, source suite254/254/lint/typecheck PASS. iOS OS render NOT_RUN. 경제 명령 없음. |
| M16 | 동면 부정 진행 정지 | PASS | 승인 로컬 config·경계/복귀·정지 자동 검사. OS lifecycle는 V03/V06. |
| M17 | 단일 config | PASS | APPROVED_MVP_POLICY/APPROVED_GAME_CONFIG와 역사적 DEV fixture 분리, SRS9-4/ADR005 연결. |
| M18 | 건강 원본 미전송 | PASS | 현재 local/fake/nativeOFF 경로 allowlist·원본/비밀 차단 검사. 실제 연결 후 재검증 의무 유지. |
| M19 | 비난 없는 안내 | PASS | 앱 안 상태 안내 우선·중립 문구·합성 알림 중복/철회 검사. 실제 발송 비활성. |

## §14-1 검증 게이트

| ID | 요구 | 분류 | 현재 구현/잔여 |
|---|---|---|---|
| V01 | 승인·SRS/config/tests 일치 | HARD_STOP_EXTERNAL | 여섯 제품 방향과 가역 config 승인 반영. 출시 전체에 필요한 법률·실서비스·지원 OS 승인은 잔여. |
| V02 | 중복·상한·분수·과거·날짜 | PASS | 승인 로컬 정책의 합성 경계/재시도/분할 검사. 실제 공급자 데이터는 V05/V06. |
| V03 | 식사 OS 종료·재시작 | PARTIAL_DEVICE_VALIDATION | Windows AVD meal 후 force-stop/relaunch를 관찰: SQLite integrity_check OK 및 food0/coin5/EXP15M/meals1/registry1 동일. iOS 및 final fresh regression은 미실행/PENDING. |
| V04 | 시각/RNG·분할·복합 상태 | PASS | 주입 시간/난수·단회 결과·시간 경계·복합 상태 자동 검사. |
| V05 | 수면 승인 예시+실제 기록 | HARD_STOP_EXTERNAL | 승인 산식과 합성 예시/분할/무기록 검사 완료. 실제 플랫폼 기록은 EXT-HEALTH/ENV. |
| V06 | 두 OS 권한/철회/재부팅 | BLOCKED_ENV | fake 오류/철회·권한 OFF·native scaffold. SDK/기기와 실제 건강 접근 승인 필요. |
| V07 | 오프라인/이전/복구/migration | HARD_STOP_EXTERNAL | schema7 additive migration·재시도/HOL·단일 writer/fence·명시 이전·확인분 복구 한계 합성 검사. 실제 계정/서버는 EXT-ACCOUNT. |
| V08 | 실결제 실패/중복/복원/환불 | HARD_STOP_EXTERNAL | 현금 비활성 port/catalog 경계. 실결제 및 플랫폼 sandbox는 EXT-RELEASE/ACCOUNT. |
| V09 | 동의/정책·접근 통제 | HARD_STOP_EXTERNAL | fake scope/철회·privacy allowlist 검사. 법적 정책과 실제 backend 접근 검증 필요. |
| V10 | 실제 환경/명령/증거 | PARTIAL_DEVICE_VALIDATION | macOS historical evidence와 Windows Android current evidence를 분리 보존. Windows source254/254/lint/typecheck/native17/17, CNG Android16/16, debug/release x86_64 compile, Font130, footer/tap/rest, release cold/warm GLB PASS. Renderer A/B PARTIAL/NOT_PASS; iOS NOT_RUN. |
| V11 | 차단 결함·인간 출시 판단 | HARD_STOP_EXTERNAL | 독립 로컬 코드 QA와 외부/실기기 미검증 구분. 최종 출시 판단은 EXT-RELEASE. |

## 종료 판단

macOS SDK55 migration history와 Windows Android partial runtime evidence는 모두 보존한다. Windows scoped engineering is complete, with balanced-renderer A/B explicitly PARTIAL/NOT_PASS. iOS current runtime is NOT_RUN on Windows. 상태는 `WINDOWS_ENGINEERING_COMPLETE_PRODUCT_MVP_NOT_COMPLETE`, 전체 제품은 `MVP_NOT_COMPLETE`다. 법률/실제 건강/계정/결제·출시의 외부 경계는 유지한다.

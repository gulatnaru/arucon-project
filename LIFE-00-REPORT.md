# LIFE-00 개편 체크포인트

2026-09-29 · **PARTIAL_WITH_BLOCKERS** · ASTRA_DIRECT / SELF_REVIEW.
재미·최종 아트: **USER_REVIEW_PENDING**. 실제 플레이 품질: **확인 불가**.

## 이번에 연결한 장면과 현재 한계

새 코드는 펫이 주변을 살피고 몸을 풀며 자리를 고르다가 공을 살펴보고 먼저 건네는 경로를 갖는다. 사용자는 바닥 방향으로 공을 굴리거나 좌/우 까꿍, 하이파이브/갸우뚱을 고를 수 있다. 공의 이동·감속과 접근·앞발 접촉·반환을 연결했고, 쓰다듬기 뒤 복원·후속 반응, 공을 옆으로 보내고 쿠션에 정착하는 흐름을 만들었다. 실제 완료한 공놀이만 다음 제안에서 언급하고, 다양한 경험 이후 약한 사물 선호가 자율 선택에 반영된다. 확정 식사로 성장하면 이후 앞발 응답이 달라진다.

**위 내용은 구현·자동 검사 범위다. 이번 빌드의 화면에서 이 장면을 직접 관찰한 증거는 아직 없다.** Simulator CUA가 “Mac is locked”를 반환했고 잠금 해제를 요청했다. 보안 설정을 바꾸거나 입력 도구를 우회하지 않았다. 따라서 대표 플레이 §3, 8~10분 연속 영상, L01~L22의 실제 화면/입력 판정과 재미/아트 평가는 미완료다. 이전 FUN·Simulator 영상이나 Android 결과를 이번 PASS로 옮기지 않았다.

## 바로 실행하기

이 Mac의 iPhone 16e / iOS 26.3 Simulator에 새 Release를 설치해 두었다. Metro가 필요 없다.

```sh
open -a Simulator
xcrun simctl launch booted com.arucon.dev
```

1. Mac 잠금 해제 후 앱 우측 메뉴 → **별도 생활 체험 시작 / 이어 하기**. 이름은 비워 두면 아루콘이다. 기존 방의 이름은 그대로 표시한다.
2. 새 체험의 공·쿠션·화장실·식탁과 체험 먹이를 사용한다. 처음 2분은 관찰하고, 제안의 ‘굴려 주기’ 또는 놀기 메뉴를 이용한다. 공놀이 중 바닥을 누르면 공을 굴리고, ‘그만 놀기’ 후 다시 이동한다.
3. 펫 누름·유지·놓기 → 몸 반응/말풍선 → 같이 쉬기 → 기록 열기/닫기 → 다시 접촉을 연속 확인한다.
4. 메뉴 → 설정에서 **솔직한 성격 / 성장 직전 / 화장실 생활 / 잔여 청소 체험**을 선택할 수 있다. 모두 별도 petId이며 최초 준비 뒤 잔량/진행을 유지한다. 성장 체험은 정상 먹이 주기, 화장실 체험은 정상 전경 시간 정산으로 확인한다.
5. 설정 → 체험 도구와 빌드 진단 → 반응/아트 비교에서 원본/v3와 말루·모노·피코·몽글의 정면·측면·후면을 비교한다. 진단 모드의 강제 재생은 일반 경로 통과 증거가 아니다.

체험 DB는 `arucon-life-experience.db`; 일반 DB `arucon-dev.db`는 자원 지급/이름 변경/삭제 대상이 아니다. 체험은 위젯의 기존 일반 펫 snapshot도 덮어쓰지 않는다. 실제 건강 연결·실결제는 OFF다.

## 실제 실행한 검사

| 검사 | 이번 실행 결과 |
|---|---|
| 전체 Node 테스트 | **336/336 PASS**, 실패/skip 0 |
| lint / typecheck | **PASS** |
| Android / iOS JS export | **PASS**, `dist-life-android` / `dist-life-ios` |
| iOS Release xcodebuild | **exit 0 / BUILD SUCCEEDED** |
| Simulator 설치 / launch | **PASS_PROCESS_START**, PID 67967(기록 시점) |
| iOS CNG 정합성 | **23/23 PASS**; 실제 widget UI는 별도 NOT_RUN |
| 운영 정적 검사 | **40/40 PASS** |
| 원본/초안 자산 | 원본 SHA 보존, 초안 5종 재생성 일치·15 clips·18 morph bindings·유한 geometry PASS |
| 정상 사용자 연속 입력/영상 | **BLOCKED_HOST_LOCKED / NOT_RUN** |
| Android native/emulator 이번 개편 | **NOT_RUN** |
| iPhone / Android 실기기 | **NOT_RUN** |

첫 회귀는 330개 중 328개 통과했다. 실패 2개는 이전 UI 구조/원본 기본 후보를 고정한 정적 검사였다. LIFE-00 §4/§11에 맞춰 세 동작 묶음·새 후보·더 엄격한 패널 입력 차단을 검사하도록 변경했고, 경제/저장 기대값은 완화하지 않았다. 이후 생활/아트/성능 회귀를 추가해 현재 336개를 모두 재실행했다. CNG 첫 시도는 잘못된 cwd로 실패했으며 `mobile/`에서 재실행한 23개 결과만 PASS다.

### 빌드 식별과 증거 위치

- 작업 기준: `e7af01f`(LIFE-00 원문), 검증한 코드 commit **`22f8249`**. 이후 보고서 해시 기록 commit은 앱 소스를 바꾸지 않는다.
- macOS 15.6 (24G84), Xcode 26.3 (17C529), Expo SDK55, iOS 26.3, iPhone 16e `2170BD93-715C-482E-AD9C-DD7479970003`.
- Simulator 화면 1170×2532px / 390×844pt, content size `large` 확인. 작은 화면·접근성 큰 글자 실조작은 NOT_RUN.
- Release bundle SHA256: `c2a26400cc88b76e8e0ef648caca8435104794ad95a5c1ccb485fcbf21fa3938`. DerivedData와 설치 앱의 해시가 동일하다. CFBundleVersion 1. 초기 설치 해시 fe6c19ad는 중간 빌드이며 현재 검증용 설치본이 아니다.
- 8081에는 Java 프로세스가 있었다. Metro라고 간주하거나 종료하지 않았다. 이번 Release는 내장 번들로 실행했다.
- 로컬 증거: `evidence/life-00/2026-09-29/`의 `tests-final.log`, `build-final.log`, `bundle-ios.log`, `bundle-android.log`, `lint.log`, `typecheck.log`, `cng-ios.json`, `workflow.log`.
- 기존 Simulator DB는 같은 제외 폴더의 `private-original-backup/`에 보존했다. DB·영상·로그·빌드는 Git/외부 업로드 대상이 아니다. **이번 실제 플레이 영상/화면 캡처 없음.**

## L01~L22 — 소스 검사와 실제 실행 분리

| ID | 구현/자동 검사 상태 | 이번 실제 앱 판정 |
|---|---|---|
| L01 | 전체 방·작은 헤더·3동작·스크롤/키보드 대응 연결 | BLOCKED: 작은 화면/큰 글자/콜드 화면 |
| L02 | 저장 이름 불변·중복 콘 접미사 제거·체험 이름/분리 저장 | BLOCKED: 화면/새 이름 입력 |
| L03 | 의도 유지·2분 순수 로직 검사 3계열 이상 | BLOCKED: 2분 실제 관찰 |
| L04 | 실제 공·유한 기다림·무응답 복귀 | BLOCKED: 제안 수락/무응답 시각 |
| L05 | 직접/버튼 동일 경제 중립 경로·눌림/복원·후속 표현 | BLOCKED: hold/release/연속 입력 |
| L06 | 공 바닥 입력·좌우 까꿍·앞발/기울기·취소 | BLOCKED: 놀이 3종 실제 입력 |
| L07 | 말풍선과 idle 공존·타이머 취소·background 정리 | BLOCKED: 대화 중 화면 freeze/복귀 |
| L08 | 최근3 제외·20회 혼합 director 입력·5계열 도달 검사 | BLOCKED: 정상 앱 20회 혼합 |
| L09 | stable personality·거리/시선/타이밍/말투·별도 프로필 | BLOCKED: 이름 숨긴 시각 비교 |
| L10 | 실제 완료/표시 분리·bounded SQLite 기억·약한 선호 | BLOCKED: 실제 입력 후 재실행 |
| L11 | 기존 직접/자동급식 회귀 PASS·commit 뒤 식사 장면 | BLOCKED: 접근/섭취/중단 시각 |
| L12 | 실제 전경 timer/식사 projection·revision 중복 억제·격리 체험 | BLOCKED: 시설 이용 장면 |
| L13 | 기존 청소 service·실제 잔여물 target·없음/자동 안내 | BLOCKED: 대상 터치/자동 처리 |
| L14 | 성장 직전 격리 상태→정상 실제 식사·앞발 응답 변화 | BLOCKED: 성장 전후 시각 |
| L15 | 4계열 전용 초안 GLB·실루엣/귀 차이 자동 검사 | BLOCKED: 실제 렌더·최종 아트 미승인 |
| L16 | Modal close/backdrop/back·방 입력 gating 검사 | BLOCKED: 정상 기록→재접촉 |
| L17 | 측정된 bubble bounds·safe-area 제한 유지 | BLOCKED: 가장자리/큰 글자 |
| L18 | 지원 상황에 새 대사 데이터 추가→같은 selector 도달 검사 | BLOCKED: 실제 일반 경로 |
| L19 | 원본 보존·v3 생성기/geometry/morph 검사 | BLOCKED: 앞/옆/뒤·걷기·눌림 |
| L20 | 30Hz/100ms 목표·phase 계측·고정 draw 병합 | PERFORMANCE_BLOCKED: 같은 Release 전후 비교 |
| L21 | 저장/DB 실패·손상 보존·중복 지급 방지·기존 경제 회귀 PASS | 앱의 오류 안내/복구 화면 NOT_RUN |
| L22 | 양 플랫폼 bundle·iOS Release 설치·추적 가능한 source/lockfile | iOS 화면 BLOCKED / Android runtime·실기기 NOT_RUN |

## SELF_REVIEW 및 남은 품질 작업

직접 검토 중 이전 life command의 재실행, 정상 프로필로 체험 자원 유입, 위젯 덮어쓰기, 중복 공 시작, 줄인 대사 설정이 수동 응답까지 숨기는 문제, 반복 실패 안내 지워짐을 점검하고 수정했다. 독립 reviewer를 실행했다고 기록하지 않는다. 새 subagent는 0이며 과거 agent는 모두 완료 상태였다. 요청 root 역할은 Astra이고 backend effective model 메타데이터는 확인 불가(**ROUTING_UNVERIFIED**).

원래 보고된 화면 깨짐·대화 freeze·두 문장 반복·저장 깜빡임·텍스트뿐인 접촉은 이번 화면 개편으로 재오픈한 실제 플레이 검증 항목이다. 자동 PASS만으로 해결 판정을 하지 않는다. 특히 공/앞발의 접촉 위치, 쿠션/화장실 진입 실루엣, 12개 비언어 장면의 실제 구분, 1차 초안의 인상은 영상 확인 후 수정해야 한다.

성능 예산은 과거 20Hz를 그대로 통과시키지 않도록 30Hz 최소 목표로 올렸다. 기존 22Hz proxy는 이번 통과 근거가 아니다. 고정 geometry batching과 morph/draw/queue drain 계측을 추가했으나, 표시 FPS·touch-to-photon·GPU·발열/배터리·동작 줄이기 비교는 미측정이다. 성능 때문에 얼굴·GLB·말캉함·모션 기능을 삭제하지 않았다.

## 다음 한 작업

Mac 잠금 해제 후 위 해시의 설치 Release에서 **메뉴→별도 생활 체험→공 제안/공 굴리기→펫 누름/놓기→쿠션→기록 닫기→다시 이동**을 먼저 촬영·확인한다. 실제 결함이 보이면 소스/config/template에서 고치고 같은 빌드로 재검증한다. 이 대표 연결이 통과한 뒤 L01~L22와 정상 속도 8~10분 영상, 두 성격/성장/화장실/자산/성능 비교를 마친다.

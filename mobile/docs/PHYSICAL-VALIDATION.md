# Physical device validation runbook

이 문서는 iOS/Android 실기기가 생겼을 때 같은 범위와 판정으로 검증하기 위한 준비 절차다. 소스 준비 상태는 `PASS_SOURCE`로 기록할 수 있지만, 아래 14개 항목의 기본 결과는 모두 `NOT_RUN`이다. 도구가 있거나 기기 목록 명령이 성공했다는 사실만으로 `PASS_PHYSICAL_DEVICE`를 만들지 않는다.

## 1. Read-only preflight

`mobile/`에서 다음 명령을 실행한다.

```sh
node scripts/check-physical-readiness.mjs
node scripts/check-physical-readiness.mjs --output evidence/physical/readiness.json
```

두 번째 형태의 출력은 프로젝트 내부이면서 Git ignore 규칙에 걸리는 상대 `.json` 경로만 허용한다. CLI는 다음 읽기만 수행한다.

- `xcrun devicectl list devices`의 JSON inventory, Xcode/xctrace 가용성, 기존 Apple code signing identity와 provisioning profile 수
- `adb devices -l`; `device` 상태의 대상에 한해 `ro.kernel.qemu`, `ro.boot.qemu`, `ro.boot.hardware` 읽기
- 이 저장소에서 준비한 14개 물리 검증 항목과 로컬에서 사용할 수 있는 Instruments template 목록

CLI는 네트워크 검색·연결·pairing, OS 권한 변경, Developer Mode 변경, 앱 설치·실행, 계정 생성, 인증서 또는 profile 생성, Android SDK 설치를 하지 않는다. `devicectl` 원시 JSON은 OS 임시 디렉터리에서 읽고 즉시 삭제한다.

보고서에는 기기 identifier, serial, 이름, hostname/IP, SDK·개발자 디렉터리 경로, probe 원문, 실제 건강 원본을 넣지 않는다. 기기별 행 대신 상태별 개수만 기록한다. 출력 JSON은 0600 권한으로 쓴다.

### 상태 해석

| 상태 | 의미 |
|---|---|
| `TOOL_MISSING` | inventory 도구 자체가 없다. 기기 0대라는 관찰이 아니다. |
| `TOOL_ERROR` | 도구가 있었지만 inventory를 읽지 못했다. |
| `SCHEMA_UNVERIFIED` | JSON/텍스트가 지원한 schema와 달라 개수를 판정하지 않았다. iOS `result.devices` 누락도 여기에 포함한다. |
| `NO_PHYSICAL_DEVICE` / `NO_TARGET` | 지원한 schema의 빈 배열/목록을 실제로 관찰했다. |
| `PHYSICAL_DEVICE_NOT_READY` / `NO_READY_PHYSICAL_DEVICE` | 물리 후보는 있으나 연결·권한·상태 조건이 부족하다. |
| `READY_PHYSICAL_DEVICE` | preflight 조건만 충족했다. 앱 동작이나 물리 검증 통과 판정은 아니다. |

iOS는 Apple mobile platform, paired, booted, Developer Mode enabled와 명시적인 현재 연결 신호를 모두 요구한다. paired만이거나 local-network 기록만 있고 tunnel이 disconnected이면 ready로 보지 않는다. Android는 `unauthorized`, `offline`, 알 수 없는 상태와 에뮬레이터를 각각 분리한다. `device` 상태의 authorized 대상도 읽기 전용 qemu/hardware property 분류가 실패하면 물리 기기로 추정하지 않는다.

## 2. 실제 기기 연결 조건과 사람 경계

### iOS

1. 사용자가 잠금 해제한 실제 iPhone/iPad를 USB로 연결하고 Trust, pairing, [Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device) 상태를 직접 확인한다.
2. 현재 프로젝트에 이미 속한 Apple Development identity와 provisioning profile을 사용한다.
3. 앱과 Widget extension 양쪽의 기존 App Group entitlement가 profile 및 현재 Team에서 허용되는지 Xcode signing 화면에서 확인한다.
4. preflight가 `READY_PHYSICAL_DEVICE`를 보고해도 실제 development build의 signing, install, launch와 widget install은 별도로 실행하고 결과를 남긴다.

Apple 계정 생성, Developer Portal의 identifier/capability/profile 변경, 새 인증서 발급은 사용자 경계다. App Group entitlement가 기존 profile과 맞지 않으면 `BLOCKED_SIGNING`으로 멈추고 임시 bundle identifier나 entitlement 삭제로 우회하지 않는다.

### Android

1. 사용자가 잠금 해제한 실제 Android 기기를 USB로 연결하고 공식 [hardware device 실행 절차](https://developer.android.com/studio/run/device)에 따라 이 개발 호스트의 debugging 승인을 직접 처리한다.
2. `unauthorized` 또는 `offline`이면 `NOT_READY`로 남긴다. CLI가 승인 dialog를 누르거나 TCP/IP ADB 연결을 만들지 않는다.
3. 저장소에 이미 준비된 Android SDK/ADB가 있을 때만 후속 빌드·설치를 수행한다. 이 runbook을 위해 SDK나 시스템 software를 설치하지 않는다.

## 3. 표준 physical 14항목

각 행은 독립 판정한다. 기기가 없을 때 결과와 수치는 `NOT_RUN`; 준비 문서와 파서만 `PASS_SOURCE`다.

| # | 항목 | 최소 실제 증거 |
|---:|---|---|
| 1 | Native build/install/launch | 대상 OS·build mode, signing/install/launch 결과, cold launch process와 GLB 출현 관찰 |
| 2 | 방·바닥·펫 가독성 | 실제 GLB가 보이는 화면에서 바닥 접촉, 작은 펫의 눈매·입, UI에 가리지 않는 이동 범위, 상태 변경 뒤 morph 복귀 |
| 3 | Touch/navigation/direct pet input | 실제 손가락 입력으로 floor 이동, 연속 retarget, 펫 접촉과 UI 입력 구분 |
| 4 | Normal/reduce-motion motion | idle→이동→도착 정지, touch press/recovery, Reduce Motion ON/OFF 각각의 실제 동작 |
| 5 | Lifecycle/reboot | foreground/background, force quit, relaunch, 기기 reboot 뒤 상태 복구 |
| 6 | Transaction and synthetic sleep flow | 합성 sleep score→배율→실제 meal 적용, 식사 전·transaction 중·commit 직후 종료와 재시도에서 재고·EXP 일관성 |
| 7 | Activity/permission boundary | fake/synthetic provider로 unavailable, denied, revoked, delayed record와 reboot; 실제 0과 읽기 불가 구분. actual health read는 OFF |
| 8 | Widget runtime | 설치, 최초/지연 갱신, stale/missing/error, 탭 후 앱 진입 |
| 9 | Widget resource neutrality | widget read/reload/tap 전후 food·coin·EXP·meal·recovery 불변 |
| 10 | Accessibility | screen reader focus/action, touch target, 큰 글꼴, 색/대비 확인 |
| 11 | Portrait/safe area | 기본 portrait와 큰 글꼴에서 control 잘림·겹침·홈 indicator 침범 없음 |
| 12 | Frame/CPU/GPU/memory | 동일 시나리오의 raw timing trace와 도구·구간·build mode; DEC-31 미정이므로 수치 PASS 없음 |
| 13 | Input-to-photon latency | 실제 손가락 입력과 실제 display 변화가 함께 보이는 외부 고속 영상 및 frame 단위 판독 |
| 14 | Thermal/battery/background energy | 고정 시나리오 전/중/후 thermal state, app-scoped energy/battery summary, background 정지 여부 |

모든 health permission 상태는 fake/synthetic provider와 빈 응답으로만 검증하고 actual health read는 OFF로 유지한다. 실제 사람의 건강 원본 읽기를 요구하는 지점에서는 별도 승인 전 `HARD_STOP_HEALTH_DATA`로 멈춘다. 권한 거부·철회 UI와 합성/빈 응답 검증을 실제 건강 원본 조회 승인으로 확대하지 않는다.

## 4. Performance and latency capture

### iOS / Instruments

현재 로컬 Xcode에서 후보로 확인할 template은 `Animation Hitches`, `Time Profiler`, `Power Profiler`, `Game Performance`, `Metal System Trace`다. preflight는 실행 시 해당 template의 존재 여부만 다시 기록한다.

1. Release 또는 검증 대상으로 명시한 동일 build를 실제 기기에 설치한다.
2. idle 30초, floor 이동·연속 retarget 30초, touch/meal 30초, background 30초처럼 재현 가능한 구간과 시작/종료 표식을 정한다.
3. Animation Hitches 또는 Game Performance로 frame/hitch 자료를, Time Profiler로 CPU sample을 수집한다. Power Profiler는 동일 시나리오의 상대 energy 관찰에 사용한다.
4. Expo GL은 EAGL/GL submission 경로이므로 `Metal System Trace`에 앱의 모든 GL frame이 직접 대응한다고 가정하지 않는다. trace에 보이는 GPU event, JS RAF, `gl.endFrameEXP()` submit은 각각 실제 display presentation과 다른 관찰이다.
5. raw trace는 ignored local evidence에 제한하고, 공유 summary에는 도구·build·구간·샘플 수와 익명화한 측정값만 남긴다.

### Android / Perfetto and gfxinfo

1. 동일한 Release 시나리오와 구간 표식을 사용해 Perfetto의 app/process 및 frame 관련 data source를 최소 범위로 캡처한다.
2. `dumpsys gfxinfo`의 ViewRoot/Jank 통계는 React Native native view traversal을 설명할 수 있지만 Expo GL surface의 실제 GL present FPS와 같지 않다. ViewRoot 숫자를 GL FPS로 이름 붙이지 않는다.
3. Perfetto frame timeline도 producer가 제공한 surface/event 범위만 설명한다. GL submit, compositor frame, display scanout 중 무엇을 측정했는지 summary에 명시한다.
4. broad system log나 전체 bugreport는 수집하지 않는다. app-scoped trace에도 identifier/path가 있으면 공유 전에 제거하고 원시는 ignored local evidence에만 둔다.

### Input-to-photon

실제 input-to-photon은 외부 고속 카메라로 손가락이 화면에 닿는 순간과 display pixel이 변하는 순간을 한 영상에 담아 측정한다. 최소 20회 동일 동작을 반복하고 촬영 fps, 한 frame의 시간, 각 반복의 frame 차이, median과 percentile을 기록한다. 카메라 영상의 encoding metadata만으로 앱 FPS를 계산하지 않는다.

JS touch callback timestamp, RAF callback, GL submit timestamp는 내부 구간 진단에는 쓸 수 있지만 input-to-photon 값이 아니다. 화면 녹화는 입력 손가락과 실제 scanout을 함께 보장하지 않으므로 외부 고속 영상의 대체 증거가 아니다.

## 5. Thermal and battery procedure

1. 배터리 충전 상태·밝기·네트워크·thermal state·build mode를 같은 조건으로 맞추고 안정화 구간을 둔다. 기기 이름, serial, IP, 실제 건강 상태는 기록하지 않는다.
2. idle, active room, repeated input, background의 고정 workload를 각각 최소 15분 실행하고 같은 조건으로 3회 반복한다. 이 시간과 반복 수는 측정 재현을 위한 가역 절차값이며 제품 PASS 기준이 아니다.
3. iOS는 Power Profiler와 공개된 thermal state의 앱 관찰만, Android는 app-scoped Perfetto/battery summary만 사용한다. 전체 sysdiagnose, bugreport, 광범위한 system log, 배터리 actual-health dump는 수집하지 않는다.
4. 시작/종료 배터리 비율, wall-clock duration, thermal state 변화, background CPU wake 여부를 원시 관찰값으로 남긴다. 짧은 단일 run은 장기 배터리 소모 보장이 아니다.

DEC-31의 frame/CPU/GPU/memory/input latency/thermal/battery 기준은 아직 확정되지 않았다. 따라서 관찰값과 회귀 비교를 기록하되 임의의 30/60 FPS, ms, CPU%, 온도 또는 배터리 감소량을 제품 PASS 임계값으로 만들지 않는다. 영상 파일의 encoded FPS도 앱 성능 판정에 사용하지 않는다.

## 6. Evidence record and stop points

각 실행에는 revision, platform/OS 범주, build mode, 시나리오, 명령, exit code, 시작/종료 시각, 익명화한 측정값, `PASS_OBSERVED_SCOPE`/`FAIL`/`NOT_RUN`/`BLOCKED_*` 판정을 남긴다. `PASS_OBSERVED_SCOPE`는 실제 관찰한 행과 조건에만 붙인다.

다음 조건에서는 독립적인 read-only 준비만 보존하고 멈춘다.

- 도구 부재, schema 변경, unauthorized/offline, 연결 신호 부재: `BLOCKED_ENV` 또는 `NOT_READY`
- 기존 signing/App Group profile 불일치: `BLOCKED_SIGNING`
- Apple/Google 계정·portal/capability/profile 변경 필요: 사용자 경계
- 실제 건강 원본, 실사용자 계정, 실결제 필요: 해당 Hard Stop
- DEC-31 성능 수치 판정 필요: 측정값 기록 후 `DECISION_REQUIRED`

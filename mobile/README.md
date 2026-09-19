# 아루콘 모바일 로컬 MVP

이 디렉터리는 루트 Git 저장소의 일반 하위 디렉터리입니다. 별도 Git 저장소를 만들지 않습니다. 현재 진입점은 승인된 여섯 MVP 정책을 로컬 `ApprovedMvpService`와 합성 데이터로 실행하는 앱입니다. 실제 건강정보, 법적 미성년 동의, 외부 계정, 결제, 공개 출시는 꺼져 있습니다. 승인 범위와 선택 근거는 [DECISION-SUMMARY](../DECISION-SUMMARY.md), [ADR-005](../docs/adr/ADR-005-approved-game-policy.md), [ADR-006](../docs/adr/ADR-006-single-writer-recovery.md), [ADR-007](../docs/adr/ADR-007-native-build-readiness.md)를 참고합니다.

APP-01은 방/캐릭터 렌더링 기술 검증의 역사적 기록이며 현재 MVP 전체를 설명하지 않습니다. 장면 계약은 아래에 보존되어 있습니다.

## 로컬 실행

Node.js 22.13 이상, npm, 대상 플랫폼의 로컬 네이티브 도구가 필요합니다. 현재 의존성은 Expo SDK 57, React Native 0.86, React 19.2, `expo-gl`, Three.js와 `expo-dev-client`입니다. 계정과 클라우드 프로젝트는 필요하지 않습니다.

```sh
cd mobile
npm ci
npm run typecheck
npm run lint
npm test
npm run ios       # Xcode + iOS Simulator가 설치된 macOS
# 또는 npm run android  # Android SDK + Emulator가 설치된 환경
npm start
```

`npm run ios`/`npm run android`는 로컬 개발 빌드를 만들고 실행합니다. Expo Go나 브라우저 캡처를 설치형 앱 검증으로 대신하지 않습니다. 장치 없이 JavaScript 자산 묶기만 확인하려면 `npx expo export --platform ios --output-dir dist`를 사용합니다. `ios/`, `android/`, `dist/`, `node_modules/`는 Git 대상이 아닙니다.

현재 환경에는 full Xcode/iOS Simulator와 Android SDK/emulator가 없어 네이티브 compile은 `BLOCKED_ENV`, simulator/physical device 실행은 `NOT_RUN`입니다. 위 명령은 해당 도구가 설치된 환경에서만 실행할 수 있습니다. 로컬 MVP의 입력은 `SYNTHETIC_LOCAL` 합성 활동·수면 세션이며, 위젯은 마지막 갱신 시각을 보여 주는 read-only 앱 연결입니다.

동기화 데모는 한 쓰기 기기와 명시적 handoff를 사용합니다. fake authority는 앱 재시작 뒤 재생성하지 않으며, durable writer fence와 충돌 증거를 보존합니다. 이 경계는 로컬 검증용이며 실제 서버 권한이나 계정 복구를 증명하지 않습니다.

## APP-01 장면 계약

`src/scene/AruconRoom.tsx`의 `AruconRoom`을 `SafeAreaProvider` 아래 전체 화면 콘텐츠로 렌더합니다. `RoomProps`는 `formId`, 성격(`reserved`/`expressive`), 수면, 움직임 줄이기, 식탁/화장실 설치, 공/쿠션 노출 상태를 입력받습니다. 빈 바닥, 펫, 가구의 Pressable은 분리되어 있습니다. `onPetTouch`, `onFurnitureHit`, `onMove`는 상위 앱으로 신호만 보냅니다. 장면 코드는 EXP/체력/재화/저장을 변경하지 않습니다. 진화형은 승인 2D 참고형을 보유하지만 전용 rigged runtime asset이 없어 공통 GLB 미리보기로 대체되며, 이 상태는 [MVP form renderer readiness](docs/MVP-form-render-readiness.md)에 기록된 렌더러 fallback입니다.

방 GLView는 [승인 GLB](../references/floor-navigation-03/assets/arucon-tsundere-motion.glb)를 바이트 동일한 사본 `assets/arucon_tsundere_motion.glb`에서 읽습니다. SHA-256: `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`. GLB의 기존 15개 클립은 수정하지 않았습니다. 화면의 이동 속도는 기존 presentation 기준 `reserved=1.55`, `expressive=1.72` 월드 단위/초, 방향 응답 12, 가속 응답 14, 도착 응답 6, 전환 0.14초를 사용합니다. 교감 눌림은 스프링 110/15를 1/120초 단계로 적분하고, 손을 뗀 뒤 2.1초 동안 복원합니다. 앱 복귀 시 RAF는 하나만 활성화합니다.

## 대상 확인 순서

1. 작은 휴대폰 세로 화면에서 펫 얼굴과 74×86 pt 교감 영역, 안전 영역 가림을 관찰합니다.
2. 러그 앞/뒤/좌/우 빈 바닥, 가구 주변, 화면 가장자리 터치를 확인합니다. 이동 중 다른 바닥을 누르면 목적지가 바뀌어야 합니다.
3. 펫을 길게 누르고 놓은 뒤 기존 GLB의 반응과 기본 표정 복귀를 봅니다. 가구와 펫이 겹치면 펫 hit가 우선합니다.
4. 앱을 background→foreground로 여러 번 전환하여 RAF/입력 중복과 모델 재생성을 확인합니다.
5. OS의 움직임 줄이기를 켜고 장식 배회/idle bounce가 멈추며 터치·식사·공은 짧은 정지 포즈로 보이는지 확인합니다. 수동 이동과 무료 터치 콜백은 남아야 합니다.
6. 실제 앱 화면 캡처와 짧은 녹화를 남깁니다. 정지 이미지만으로 모션이나 FPS를 승인하지 않습니다.

SDK/라이브러리 버전의 근거는 [Expo SDK 표](https://docs.expo.dev/versions/latest/), [GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/), [Asset](https://docs.expo.dev/versions/latest/sdk/asset/), [FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/), [개발 빌드](https://docs.expo.dev/develop/development-builds/introduction/)입니다. GLB 로딩과 Three.js WebGLRenderer의 실제 기기 호환성은 네이티브 실행 증거가 있어야 PASS로 판단합니다.

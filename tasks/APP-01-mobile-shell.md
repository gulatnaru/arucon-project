# APP-01 — 설치형 모바일 셸 + 현재 캐릭터 렌더링

작업 유형: 기술 스파이크 / 실제 앱 프로젝트 시작  
자율 게이트: **G1 / 통과 후 APP-02 자동 진행**  
관련: SRS 3-6, 4장, FR-10.1/16, DEC-12/27/31/32

## 권장 역할
- 탐색: `arucon_explorer`
- 렌더러/네이티브 기술 스파이크와 핵심 구현: `arucon_builder`
- 반복적인 스타일/fixture/좁은 파일 편집: `arucon_luna_worker` 또는 사용 가능한 `arucon_spark_worker`
- 독립 검토: `arucon_reviewer`

## 결과와 완료 조건

현재 기준 아기 아루콘 GLB와 모션을 **설치형 모바일 개발 빌드**에서 직접 렌더링하고, 넓은 방의 빈 바닥 터치 이동과 쓰다듬기를 재현한다. 기존 HTML/WebView를 앱 화면으로 감싸는 방식은 실패로 간주한다.

완료하려면 다음이 모두 필요하다.

1. 실제 모바일 프로젝트 구조가 생성되고 개발 빌드 명령이 문서화됨.
2. `references/floor-navigation-03/assets/arucon-tsundere-motion.glb`를 원본 그대로 로드함.
3. 전체 화면 방에서 펫을 작은 비율로 표시하고, 빈 바닥의 러그 밖 좌표도 이동 목표가 됨.
4. 펫 터치/쓰다듬기와 바닥 이동 입력이 충돌하지 않음. 가구/메뉴 hit 영역도 바닥과 분리할 구조를 둠.
5. 기존 빠른 이동/말캉한 반응의 핵심 presentation config를 재현하거나, 기술적으로 다른 값을 썼다면 전후 근거를 남김.
6. 앱 background→foreground 복귀 시 렌더러/입력 루프가 중복 생성되지 않음.
7. 움직임 줄이기에서 장식적 bounce/배회를 줄일 경로가 있음. 경제 결과는 이 스파이크에 없음.
8. 가능한 실제 대상에서 빌드/실행하고 스크린샷 또는 짧은 화면 녹화, 명령 로그를 남김. 환경이 없으면 해당 플랫폼은 `확인 불가`로 보고.

## 기술 후보와 멈출 지점

- SRS의 React Native 권장안을 따라 **React Native + Expo development build**를 첫 후보로 시험할 수 있다. 정확한 SDK/React Native/렌더러 버전은 작업 시작 시 공식 자료와 설치 환경에서 확인한다.
- GLB의 morph/animation 요구를 안정적으로 충족하지 못하거나 성능/네이티브 모듈 제약이 크면 억지로 우회하지 않는다. 최소 재현을 만들거나 실패 증거를 확보한 뒤 대안(Unity/Godot/다른 RN 3D 파이프라인 등)을 비교 보고한다. 운영 채택은 사용자 승인 전 하지 않는다.
- 실제 건강 데이터, 인증, 결제, Firebase/서버 생성, 앱스토어 배포, Figma 원격 수정은 금지.
- 새 유료 서비스/계정/클라우드 프로젝트가 필요하면 멈추고 승인 요청.

## 반드시 읽을 것

- `AGENTS.md`
- `docs/arucon-SRS.md`: 3-6, 4장, FR-10.1, FR-16, 13장 DEC-12/31/32
- `docs/character-naming.md`
- `docs/personality-life-design.md`: 아트/성격/경제 분리
- `references/floor-navigation-03/QA-REPORT.md`
- `references/floor-navigation-03/docs/ACTIVE-MOTION-02.md`
- `references/floor-navigation-03/docs/FLOOR-NAVIGATION-03.md`
- `references/floor-navigation-03/src/motion-config.js`

## 수정 허용

새 모바일 앱 디렉터리와 APP-01 전용 테스트/문서. 기존 SRS/DEC를 제품 선택을 위해 임의 수정하지 않는다. 참조 GLB·승인 아트 파일은 읽기 기준이며 원본을 덮어쓰지 않는다.

## 검증

- 프로젝트가 제공하는 lint/typecheck/unit test를 실제 실행.
- 앱 시작/종료/복귀, 빈 바닥 앞·뒤·좌·우 터치, 펫 터치, 연속 목적지 변경을 검증.
- 렌더 화면의 펫 bound가 안전 영역 밖으로 잘리지 않는지 확인.
- 테스트를 새 기준에 맞추기 위해 삭제/완화하지 않는다.
- 시각 결과는 실제 앱 렌더 캡처로 남긴다. 웹 프로토타입 캡처를 네이티브 결과로 재사용하지 않는다.

## 보호해야 할 현재 시각 기준

- 크림색, 모찌 같은 말캉한 몸, 작은 둥근 뿔, 축 처진 귀.
- 기본 reserved/츤데레 프로필의 반쯤 감긴 눈과 작은 일자 입.
- 사용자가 확인한 빠르고 부드러운 이동/쓰다듬기 속도.
- 빈 바닥 어디든 이동하되 화면/가구와 겹치지 않는 안전 목표.
- 형태 대명사는 APP-01에서 `아루콘`만 실제 캐릭터에 사용. 말루/모노/피코/몽글은 카탈로그/fixture까지만 사용하며 분기 로직을 만들지 않는다.

## 게이트 판정

`APP-01: PASS / PARTIAL / BLOCKED`를 기록한다. PASS는 최소 하나의 설치형 target/simulator/emulator에서 캐릭터 렌더·바닥 이동·쓰다듬기를 실제 실행한 증거가 있을 때만 사용한다.

PASS면 사용자 확인을 기다리지 말고 APP-02로 간다. 실기기만 없는 경우 simulator/emulator와 코드/테스트가 충족되면 PARTIAL로 기록하고 APP-02를 계속할 수 있다. 렌더링 기술 자체가 성립하지 않아 앱 UI 통합이 불가능하면 기반 BLOCKED이므로 AUTO-00 규칙대로 대안을 3회 이내 검증한 뒤 전체 중단 여부를 판단한다.

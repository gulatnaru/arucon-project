# 아루콘 — 플랫폼 근거와 제품 요구의 구분

버전 v1.5 · 확인일 2026-09-17 · 공식 개발 문서만 사용

이 문서는 기술 가능성/제약의 근거다. 특정 기술 선택, 실제 빌드·실기기 성능, 스토어 심사 또는 출시 승인의 증거가 아니다. SDK/OS 버전은 개발 착수 시 다시 고정한다.

| ID | 공식 자료 | 확인한 범위 | 아루콘에 적용하는 설계 방향 |
|---|---|---|---|
| EXT-07 | Electron — Custom Window Styles | 테두리 없는 창과 투명 창 옵션을 제공. 투명 창에는 플랫폼별 제약이 있음 | PC 작은 방/펫만 보기의 기술 후보. Electron 채택 완료를 뜻하지 않음 |
| EXT-08 | Electron — Custom Window Interactions | 드래그 영역과 일반 입력 영역을 분리하며, 마우스 무시/통과 기능은 별도 API | 투명 영역이 자동으로 클릭 통과된다고 가정하지 않고 실제 입력·복귀 경로 검증 |
| EXT-09 | Apple — Developing a WidgetKit strategy | 위젯은 타임라인·시스템 스케줄·갱신 예산을 사용 | 상태 스냅샷·갱신 시각·오래됨 표현, 즉시 갱신/항상 실행 보장 금지 |
| EXT-10 | Apple — Animating data updates in widgets and Live Activities; Widgets HIG | 데이터 변화 애니메이션은 최대 2초로 안내. 버튼/토글과 앱 진입 가능 | 계속 배회하는 펫 대신 스냅샷. 짧은 인사/반응은 OS 지원 확인 후 검토 |
| EXT-11 | Android — WallpaperService.Engine | 가시성/표면 생명주기·터치 입력. 실제 배경과 미리보기 등 여러 Engine 가능. 숨겨졌을 때 CPU 사용 주의 | 보이지 않을 때 장식 루프 정지, 런처 입력 한계·동시 인스턴스의 비경제적 동작 검증 |
| EXT-12 | Android — App widgets overview | 홈 화면의 작은 정보/조작 영역이며 크기·호스트에 맞춘 디자인 필요 | 앱 전체를 옮기지 않고 펫 요약과 앱 진입을 제공, 크기/런처별 검증 |

## 공식 원문

- EXT-07: https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- EXT-08: https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions
- EXT-09: https://developer.apple.com/documentation/WidgetKit/Developing-a-WidgetKit-strategy
- EXT-10: https://developer.apple.com/documentation/widgetkit/animating-data-updates-in-widgets-and-live-activities
- EXT-10 보조: https://developer.apple.com/design/human-interface-guidelines/widgets
- EXT-11: https://developer.android.com/reference/android/service/wallpaper/WallpaperService.Engine
- EXT-12: https://developer.android.com/develop/ui/views/appwidgets/overview

Apple 일부 페이지의 직접 HTML은 JavaScript 안내만 반환했다. 해당 항목은 공식 도메인의 검색에 제공된 본문으로 확인했으며 실제 앱에서 동작을 검사한 것은 아니다.

## 근거를 넘어 확대하지 않는 내용

‘위젯을 만들 수 있다’는 사실은 실시간 게임 루프, 임의의 OS 홈 화면 조작, 특정 기기에서 동일한 프레임·입력·배터리 결과를 보장하지 않는다. Android 배경 터치는 호스트가 전달하는 입력에 의존한다. 투명 창/마우스 통과의 존재가 모든 OS의 동일 구현을 보장하지도 않는다.

같은 펫 ID, 중복 성장 금지, 무료 교감, 초기 PC 경제 쓰기 제외, 최소 데이터 전달은 **이 프로젝트의 제품/설계 규칙**이지 위 공식 문서가 정한 게임 규칙이 아니다.

기존 SRS EXT-01~06은 과거 기록으로 보존한다. 수면 산식·아동 동의·상표·법률·헬스 동기화 SDK의 호환성을 이번 작업에서 새로 검증하거나 승인하지 않았다.

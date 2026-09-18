# 방 전체 이동 03 — 검증 보고서

작성일: 2026-09-18. 대상: `src/`, 동일 자산/코드를 포함한 단일 HTML 및 `site/`.

## 결과

**자동 동작 검사 258/258 통과**, 별도 원본/범위 보존 검사 **8/8 통과**. 둘은 구분하며 실제 휴대폰 검증 수가 아닙니다.

| 검사 | 명령 | 결과 | 이번 최종 실행 근거 |
|---|---|---|---|
| 도메인·세션·모바일·웹패키지·속도 정책·바닥 좌표 | `node --test tests/engine.test.cjs tests/integration.test.cjs tests/mobile.test.cjs tests/web_package.test.cjs tests/motion.test.cjs tests/floor.test.cjs` | 112/112 | `tests/final-node.tap` |
| 기존 방·식사·수면·입력·UI | `python tests/browser_test.py` | 58/58 | `tests/final-browser.log`, `tests/browser-results.json` |
| 모바일 터치 모사·복귀·보고서·화면 | `python tests/mobile_browser_test.py` | 41/41 | `tests/final-mobile.log`, `tests/mobile-browser-results.json` |
| 러그 밖 입력·도착·경계·저장·회피 | `python tests/floor_browser_test.py` | 47/47 | `tests/final-floor-browser.log`, `tests/floor-browser-results.json` |
| 모델·속도·탄성·엔진·렌더 변경 범위 | `python tests/verify_preservation.py` | 8/8 | `tests/final-preservation.log`, `tests/floor-preservation.json` |

`python build.py` 성공. `src/*.js` 각각 `node --check` 성공. 전체 게임/계정/서버의 출시 수용 기준을 통과한 것은 아닙니다.

## 재현

원본 active-motion-02에서 390×844 화면의 (195,660)을 터치하면 z≈6.4323으로 변환되지만, 코드가 z>4.25를 거부해 이동이 시작되지 않았습니다. `tests/baseline-floor-probe.json`은 실제 이전 HTML 입력 전후를 기록합니다. 러그 자체의 원형 충돌이 아니라 보이는 바닥과 고정 입력 범위의 불일치였습니다.

수정판은 같은 터치에 목표 표시를 주고 해당 바닥으로 이동합니다. 앞/뒤/좌/우의 빈 바닥, 가장자리의 안전한 인접 목표, 새 터치의 목적지 변경, 식탁/쿠션/화분 회피, 벽/메뉴 구분을 검사했습니다. 새 바깥 위치는 메모리 저장 fixture 재생성 후 복원되며 이전 저장의 게임 상태는 유지합니다.

## 보존과 변경

입력 ZIP의 GLB, 게임 engine/config, motion-config, pet-asset, 서비스워커 템플릿은 SHA-256 동일합니다. renderer는 화면→바닥 역변환 메서드만 달라졌고, 그 밖의 그리기 코드는 동일함을 별도로 검사합니다. 스프링 110/15·시크 눈매·기존 개선된 속도 정책을 유지합니다.

이전 검증기의 renderer 전체 바이트 동일 조건은 이번 좌표 메서드 변경과 맞지 않아, 이전 검증기를 `references/before-floor-03/verify_preservation.py`에 보존하고 ‘해당 메서드 외 동일’ 검사로 바꿨습니다. 게임 기대값이나 속도 조건은 완화하지 않았습니다.

초기 바닥 검사에서는 목표 표시가 다음 프레임까지 안 보이는 1건을 발견해 입력 성공 직후 위치 표시를 갱신하도록 고쳤습니다. 초기 모바일 검사의 1건은 이전 빌드 문자열을 기대하던 항목이므로 기대 버전을 `floor-navigation-03`으로 갱신했습니다. 개인정보/원장 미포함 조건은 그대로입니다. 초기 실패 로그를 보존했고, 최종 검사는 모두 다시 실행했습니다.

## 실제 시각 증거

`previews/01-front-target.png`, `02-front-arrival.png`, `03-rear-arrival.png`, `04-right-arrival.png`, `05-phone-floor.png`와 비교 PNG/MP4를 실제 코드로 렌더했습니다. 제작 중 직접 확인한 것은 펫이 러그 앞 빈 바닥에 도착하는 모습, 화면 가장자리 여백, 기존 가구·얼굴의 유지입니다. 정지 이미지나 자동 수치 검사로 촉감에 대한 사용자 승인을 대신하지 않습니다.

비교 영상은 이전/수정 HTML에서 같은 좌표를 터치한 8초·96프레임 영상입니다. 12fps는 인코딩 설정이며 실기기 성능 수치가 아닙니다. `previews/video-probe.json`에 H.264, 800×914, 8초를 확인했습니다.

## 환경과 한계

Node.js, Python Playwright, headless Chromium, gl-egl 소프트웨어 렌더링. 실제 DOM 클릭/터치 이벤트를 사용했지만 HTML은 `page.set_content`로 주입하고 저장은 명시적 메모리 fixture를 사용했습니다. 기존 환경 확인은 로컬 URL 접근에서 `ERR_BLOCKED_BY_ADMINISTRATOR`, WebKit 실행 파일 없음으로 기록되어 있습니다. 이를 우회하지 않았습니다.

실제 iPhone/Android/Safari, 일반 브라우저 디스크 저장, 이 버전의 네트워크 경로·서비스워커 설치/업데이트·오프라인 동작, 발열/배터리/실시간 FPS는 검증하지 않았습니다. 사용자에게서 받은 이전 버전의 속도 개선 확인을 이번 버전 전체의 실기기 통과로 표시하지 않습니다.

## 원격 반영

Netlify의 기존 사이트/공개 설정/ready 배포를 조회했지만 이번 연결에는 쓰기 도구가 노출되지 않았습니다. 새 파일 업로드나 배포 명령은 실행하지 않았습니다. **수정 파일·빌드·로컬 검증 완료 / 공개 사이트 업데이트 미실행**입니다. Figma·사용자 저장소·계정·공개 범위도 바꾸지 않았습니다.

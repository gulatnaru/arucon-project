# REBOOT-02 — 아기 매력 검토 준비

## PARTIAL_WITH_BLOCKERS — 최신 v2 / 2026-10-08

새 아기는 쿠션·창·식물을 관심 대상으로 삼고 살피기→접근→짧은 놀람/장난→몸 정리→사용자 쪽 확인→다음 생활을 연결하도록 구현했다. 머리 기대기, 몸 꼼지락, 연속 손길 뒤 옆으로 기대기/앞발 내밀기, 직전 탐색 중 놀람과 실제 완료 손길의 재인식이 서로 다른 표현을 사용한다. **이는 구현·자동 검사 결과이며 최신 정상 3분 플레이의 실제 통과는 아직 아니다.**

사용자 판정 **REWORK_REQUIRED — CHARACTER / MOTION / EXPRESSION은 OPEN**이다. 화면/모션/표정의 품질이 실제 정상 입력에서 검증되기 전 닫지 않는다. 재미·최종 아트·세 크기 선택은 **USER_REVIEW_PENDING**. 아기 한 마리만 제작했고 성장기/진화형의 유사함·크기 문제는 사용자 지시대로 다음 아기 검토 뒤로 미뤘다.

### 소스와 설치

- 착수HEAD603b437, sourcecf1d57f/설치v7 SHA6d5cc5f… 일치, clean/ahead3 확인. 첫 CUA에서 AX 목록은 읽었지만 **실제 메뉴 입력은 Mac locked로 실패**했다. 설치 이후의 실제 screenshot 접근도 다시 Mac locked였다. 과거 BLOCKED를 복사한 판정이 아니다.
- 현재 앱 소스 **`9a09f8382da45816f4882d32ca854e6944148abf`**, 설치 **REBOOT-02 baby v2 Release**. bundle SHA **`5877d697c0e1c43fbc9ffd855bde80d17864f54fa81ee501c801eaf2a99b92e2`**. dirty build의 runtime/source141개 해시를 source checkpoint와 대응했다. 이후 문서HEAD와 구분한다.
- iPhone16e `2170BD93-715C-482E-AD9C-DD7479970003`, macOS15.6/Xcode26.3/iOS26.3.1, Expo55/RN0.83.10. Embedded Release여서 Metro 불필요. 기존 ios/CNG/config/template·경제/성장·수면/동면 엔진을 다시 만들지 않았다.
- 로컬 증거 `evidence/reboot-02-baby-2026-10-08/24-release-v2-manifest.json`, `27-native-preservation-audit.json`. v1 compile/bundle은 중간 이력이며 최신v2로 구분한다.

### 실제 제작과 범위

| 범위 | 현재 결과 |
|---|---|
| 얼굴 | 구체 눈을 제거하고 머리 곡면을 따르는 눈매/눈꺼풀/눈썹/볼/입의 별도 mesh·morph 초안. 한 뿔 유지. 원본v7 세GLB byte일치. SourceJSON+generator+285000-byte runtimeGLB 추적 |
| 실제 제작 도구 | PATH/표준Applications/Spotlight/프로젝트.tools에 Blender 없음, BlenderMCP 호출 도구 없음. 새 설치 없음. **parametric 3D 초안이며 Blender sculpt/완성 아트가 아니다. .blend 납품 없음** |
| 크기 | v7 아기 기준1.15/1.25/1.35 세 후보 메뉴 구현. 같은 camera/room/asset, +25는 임시 초기 비교값. finalSize=null. **+15/+35 실제 메뉴·게임 캡처 미실행**. +25는 native 정지 framebuffer만 확인 |
| 연결된 생활 | 현재 사물의 위치·scene 완료/취소를 유지하는6계열/다단계 행동. scan/sniff/통통 이동/too_close/몸 털기/앞발 장난/살금살금/휴식의 실제 transform 구현. Frame마다 random clip/catalog/DB 선택 없음 |
| 표정 | 호기심/신남/장난/놀람/만족/민망/졸림의 눈매·입·눈썹·볼·귀·몸 조합. 실제 GLB의7종 적용값·geometry finite 검사. **ID/값 검사를 작은 화면 시각 PASS로 부르지 않음** |
| 직접 교감 | 머리/몸·직전 탐색·45분 이내 완료 손길·8초 반복 이력에 따른 다른 motor/face/follow-up. 완료 때만 touchRegion 저장, canceled/다른pet/revision/id 중복 거부. EXP/애정 점수/보상 추가 없음 |
| 말풍선 | 펫 근처164pt 폭/50pt head clearance, 작은 cream bubble/닫기 hitSlop. 자동9초 간격·짧은 cue 읽기 시간·최근3줄 제외·무언 beat. 현재 관심/행동별 대사, 자유LLM 없음. 이 데이터 양을 실제 다양성 PASS로 세지 않음 |
| 모자/쿠션 기억 | 최초·재·행동중의 다른 beat와 얼굴, 재착용은 알아보기/정돈; interrupted activity의 실제 target 재개. 쿠션 옛 좌표 시선/현재 좌표 접근·정착 계약 유지. **새 연출의 정상 입력과 체감은 BLOCKED** |
| AI B | 이번 완료 조건 아님. 기본A/기존온디바이스 연구·실제 standalone 추론 이력 보존. 새모델/SDK/서비스/외부LLM 연결 없음 |

### 현재 실행 증거와 미실행

- 최신v2 전체 **404/404**, 영향 **42/42**, lint PASS, 최종 typecheck PASS. 새 테스트의 배열/Node URL 타입 표기 오류는 정정했고 실패 로그도 보존했다. 기존 기대값/검사를 완화하지 않았다.
- iOS Release xcodebuild exit0, 같은 DB 유지 install/process launch, 설치 SHA 일치. 최신Android JS bundle PASS. iOS CNG23/23, 두 asset generator `--check` PASS, 운영검사42/42.
- `26-v2-native-framebuffer-static.png`는 실제 설치v2의 정지 framebuffer다. 새 얼굴·말풍선이 렌더됐으나 **모션/입력/전체표정/크기비교/3분관찰 PASS가 아니다**. Mac 잠금은 우회하지 않았다. 새 정상 연속 영상 없음.
- 현재 작업 시작 시3DB 온라인 백업과 설치후 identity/economy/EXP/facility·meal원장·소유행 **모두 일치**,3DB integrityok. 같은아루/모자/쿠션/preview 보존. 사용자 평가 중 이미 쿠션이(-.93997,3,rev4)/previewbaby로 변경돼 있었고 이 실제 시작값을 유지했다. 오래된v7 보고의 좌표를 원본으로 덮어쓰지 않았다.
- **3분 정상 무입력/반복 머리·몸 접촉/말풍선 숨김/세 크기 실제 비교/모자·쿠션 체감/메뉴·수면·cold/최신 proxy 성능 BLOCKED_HOST_LOCKED**. 장기동면 최신GUI·Androidnative/UI·실기기/GPU/물리입력/발열·배터리 NOT_RUN. 과거v7 성능 수치를 최신값으로 복사하지 않는다.
- Figma 도구는 노출됐지만 개인/회사2계정의 작성 대상을 확인하는 질문이 미응답. 성공호출·Figma산출물 없음, **NOT_USED_ACCOUNT_CHOICE_PENDING**. 앱 수정은 이에 의존하지 않았다. 이미지생성/외부업로드·새계정·유료서비스·전역설치·보안변경 없음.

### 다음 한 작업과 사용자 실행

Mac 실제 입력 접근→같은v2 SHA 대조→현재 아루의 **☰→우리 아이→+15/+25/+35**를 같은 방에서 비교. 실제 값이 같으면 재빌드/재설치/DB초기화하지 않는다. 일반 방이면 메뉴→설정→**아기 매력 검토판**. 아기 모드가 기본이고 이전 세모습은 설정의 별도 이력 비교로 남았다.

이어 같은v2의3분 정상 무입력 원본영상→서로 다른 실제 관심·몸짓·7표정 관찰→머리/몸/행동중/연속 접촉20회·무언 비교→모자 제거/재착용/자율행동 중 착용·쿠션 이동/기억→메뉴·수면/깨우기·앱전환/cold→최신60초proxy. 결함이면 해당 범위만 수정/영향검사/새Release/실제재검증한다. 자체검토는 SELF_REVIEW, subagent0, effective model ROUTING_UNVERIFIED.

feature checkpoint/일반push만. DB/영상/SDK/cache/generatednative/build는 로컬ignored, source/lock/원본 보존. 실제 Git push 결과·HEAD/추적/live origin/clean은 같은 evidence 폴더git-final-audit와 최종응답에 기록한다. main/merge/force/deploy/실건강/실결제 금지. **잠금 해제 후 이 최초 검증을 이어가며 새 계열·상점·Lv1~20로 확대하지 않는다.**

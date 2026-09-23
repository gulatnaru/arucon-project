# APP-04 로컬 온보딩과 합성 활동 경계

범위: FR-1.1~1.3, FR-2/3, AT-ACCOUNT-01~05, AT-ACT-02~09. DEC-01/02/15는 PROPOSED, DEC-11은 OPEN이다. 이 구현은 제품 승인이나 실가입 절차가 아니다.

## DEV 온보딩

`DevOnboardingScreen`은 이름 본문과 합성 생년월일을 받아 `DevPetPreview` 한 개를 반환한다. 입력창의 `콘`은 고정 표시하고 저장용 `givenName`과 `formId=arucon`을 분리한다. 이름 1~12 grapheme, NFC, 양끝 공백, 제어문자 검사는 DEC-15의 **DEV fixture**다. Hermes처럼 `Intl.Segmenter`가 없는 런타임에서도 `unicode-segmenter`의 UAX #29 extended grapheme 분할을 사용해 같은 1~12 grapheme 정책을 적용한다.

연령 분기는 SRS 원문의 14세 경계를 테스트할 뿐이다. 보호자 상태는 `not_assessed/pending/revoked`만 표현하며 `verified`가 없다. 미성년 합성 미리보기에도 `operationalSignUpEnabled=false`다. 실제 계정, 동의 증빙, 펫 발급, 저장은 이 경계에 없다. 미리보기를 호출자가 반복해서 받아도 이 모듈은 펫·재화를 발급하지 않는다.

## 활동 공급자

`ActivityProvider`는 `available/partial/empty/permission_required/denied/unavailable/error`를 구분한다. `empty`는 기록이 없거나 읽을 수 없다는 뜻이며, 0걸음이나 거부 확정이 아니다. 0걸음은 `available` 집계의 정수 값이다. `denied`는 공급자가 확인 가능한 경우에만 제공해야 한다. HealthKit의 빈 읽기를 `denied`로 변환하지 않는다.

`SyntheticActivityProvider`만 구현했다. 실제 HealthKit/Health Connect/센서 읽기, OS 권한 요청, 백그라운드 전달은 실행하지 않았다. 공급자 선택과 활동 연결 시작 시각을 호출자가 명시한다. 정규화는 선택한 공급자의 당일 집계만 허용하고, 연결 전 이력을 포함한 집계는 분할할 수 없으므로 차단한다. 동일 revision 중복과 오래된 revision은 정산 입력을 다시 내보내지 않는다. 같은 revision에서 값이 달라지면 오류다. 메모리 정규화 커서는 재시작 시 사라질 수 있다. 재시작 뒤 중복·공급자 혼합을 최종 방어하는 커서는 APP-02의 저장된 펫 상태에 있다.

`NormalizedActivity`에는 게임 날짜 창·선택 공급자·연결 시각·구간·revision·상태·걸음·러닝 걸음만 있다. 앱 서비스는 이를 APP-02 `activity` 명령에 전달한다. 이 모듈은 EXP·체력·먹이·코인을 변경하지 않는다. 공급자 교체 시점, 지연 기록 범위, 부분 집계 보상 정책은 DEC-02/17 결정이 필요하므로 호출자가 선택·승인된 정책을 적용해야 한다.

## 검증 경계

합성 테스트는 이름·연령 경계·동의 미검증, 상태 의미, 입력 유효성, 공급자 혼합 차단, 중복·역순 revision, APP-02 활동 정산 연결 후 EXP/체력 불변을 검사한다. `Intl.Segmenter`가 없는 조건의 한글 NFC, emoji, 12/13 grapheme 경계와 재현 입력은 Node targeted test 5/5로 통과했다. SDK 55 Hermes Simulator의 수정 후 온보딩 완료는 별도 런타임 검증 중이다. `ActivityStatusView`는 아직 화면에 연결되지 않았지만, `DevOnboardingScreen`은 앱에 연결되어 온보딩 완료 시 DEV SQLite(`arucon-dev.db`)에 로컬 펫을 생성한다. 네이티브 렌더·OS 백그라운드·실기기 권한 및 실제 건강 기록은 확인하지 않았다(HS-01/02).

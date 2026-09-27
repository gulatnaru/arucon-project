# 공통 아기형 캐릭터 v2 후보

상태: `USER_REVIEW_PENDING`

범위: 공통 아기형 아루콘의 비파괴 런타임 후보 2종
기본값: `original`

## 산출물과 보존 계약

- 원본 [`mobile/assets/arucon_tsundere_motion.glb`](../mobile/assets/arucon_tsundere_motion.glb)은 수정하지 않는다. 잠금 SHA-256은 `6971e18721e03784a22033d5f73bcd90474862117f1cb7d694dc326d254e984f`다.
- `moderate`는 앞·뒤 깊이를 조금 늘리고, `plump`는 같은 방향을 더 분명하게 적용한 실제 GLB 후보다.
- 두 후보 모두 원본의 14개 메시, 18개 morph 이름, 15개 애니메이션 이름과 채널, 인덱스 topology를 유지한다.
- 1차 형태 말루·모노·피코·몽글의 전용 런타임 아트는 여전히 없다. 이 후보를 진화 형태 구현 완료로 해석하지 않는다.
- 후보 선택은 `formId`, 성격, 성장, 경제, 저장 데이터를 변경하지 않는다.

후보와 생성 계약은 [`manifest.json`](../mobile/assets/character-candidates/manifest.json)에 기록한다. 생성기는 원본 SHA가 다르면 중단하므로, 원본이 바뀐 뒤 과거 좌표 변형을 조용히 다시 적용하지 않는다.

## 변형 방법

[`generate-character-candidates.mjs`](../mobile/scripts/generate-character-candidates.mjs)는 외부 3D 서비스나 설치 도구 없이 원본 GLB의 정점 데이터를 결정적으로 변형한다.

- 몸·귀·꼬리·얼굴: 세로 위치별 곡률과 앞·뒤 프로필을 사용해 깊이를 늘린다. 전체 uniform scale은 사용하지 않는다.
- 눈·눈꺼풀·입: 몸과 같은 표면 변형을 적용해 커진 몸 안으로 묻히지 않게 앞쪽 위치를 갱신한다.
- 뿔: 이마 접점은 유지하면서 길이를 줄이고 반경을 늘리며 약하게 기울인다.
- 발: 바닥 `y = 0`을 유지하고 앞발과 뒷발을 늘어난 깊이에 맞춰 배치한다.
- morph: 기본 정점뿐 아니라 각 morph 결과 정점을 같은 함수로 변형한다. morph 법선은 변형의 Jacobian으로 다시 계산한다.
- topology: triangle index와 winding은 바꾸지 않는다.

현재 기본 형상 측정은 다음과 같다. 수치는 앱 카메라 배율이 아니라 GLB 로컬 좌표다.

| 항목 | 기존형 | moderate | plump |
|---|---:|---:|---:|
| 몸 앞뒤 깊이 | 1.627 | 1.795 (+10.3%) | 1.985 (+22.0%) |
| 몸 좌우 폭 | 2.060 | 2.086 (+1.3%) | 2.119 (+2.9%) |
| 몸 높이 | 2.005 | 1.985 (-1.0%) | 1.961 (-2.2%) |
| 전체 정면 폭 | 2.641 | 2.677 (+1.4%) | 2.717 (+2.9%) |
| 전체 높이 | 2.490 | 2.416 (-3.0%) | 2.347 (-5.7%) |
| 뿔 높이 | 0.435 | 0.383 (-12.0%) | 0.339 (-22.0%) |

앞면과 뒷면 깊이를 모두 늘리면서 정면의 작은 화면 점유율은 거의 유지하는 방향이다. 재질은 원본의 크림색, 비금속, 높은 roughness 값을 그대로 보존한다.

## 런타임 선택 계약

[`characterCandidates.ts`](../mobile/src/scene/characterCandidates.ts)는 다음 API를 제공한다.

- `CharacterCandidateId = 'original' | 'moderate' | 'plump'`
- `DEFAULT_CHARACTER_CANDIDATE_ID = 'original'`
- `CHARACTER_CANDIDATES`: Expo Metro가 정적으로 발견할 수 있는 각 GLB의 `require(...)`, 표시 이름, 기본 여부, 승인 상태
- `getCharacterCandidate(id)`: 카탈로그 조회

개발 비교 UI는 이 카탈로그의 `asset`만 선택해야 한다. 후보 ID를 형태 ID나 성격 ID로 저장하지 않는다. 최종 아트 승인 전 운영 기본값을 후보로 바꾸지 않는다.

## 재생성과 검사

`mobile`에서 실행한다.

```sh
node scripts/generate-character-candidates.mjs
node scripts/generate-character-candidates.mjs --check
node --import tsx --test tests/scene/characterCandidates.test.ts
```

검사는 원본 SHA, 생성 재현성, GLB 런타임 파싱, 앞·뒤 깊이, 정면 점유율, 뿔·얼굴·발 배치, 모든 기본/morph 정점과 법선의 유한값, 원본 인덱스 보존과 바깥쪽 winding을 확인한다.

## 남은 시각 검토

기술 검사는 자연스러운 외형을 승인하지 않는다. 같은 카메라·조명·화면 크기에서 기존형과 두 후보의 정면·측면·뒷면·3/4, 대기·보행·눌림·복원을 실제 앱으로 비교해야 한다. 작은 크기의 반쯤 감긴 눈과 일자 입 가독성, 뿔의 이마 접점, 발의 바닥 접촉, 귀 지연, 가구 겹침을 영상으로 확인해야 한다. 이 검토와 사용자 최종 아트 선택은 `USER_REVIEW_PENDING`이다.

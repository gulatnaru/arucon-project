# REBOOT-03 — v8 아기와 Blender 제작 아기의 실제 A/B 비교

2026-10-09 사용자 실행 지시. SOL_DIRECT / SELF_REVIEW. 새 강제 분업 없음.

## 목표와 현재 평가

현재 v8의 외형·표정·움직임이 이전보다 개선되었다는 사용자 긍정 평가를 보존한다. 기존 v8은 A이며 삭제·덮어쓰기·기본 모델 교체를 하지 않는다. Blender에서 실제 제작한 아기 후보를 B로 추가하고 같은 실제 앱에서 비교한다. B가 반드시 더 낫다고 가정하지 않는다. 최종 채택·아트·재미·크기는 사용자가 결정한다.

착수 Git HEAD는 7b3e26520c1c952e72c2c2299032944470598301, v8 앱 소스는 6529e260fa799269197d1ebd6e77d22b564727d3이다. 실제 HEAD/dirty/설치본을 확인하고 과거 commit으로 reset하지 않는다.

## 1. 제작 환경

- Mac의 Blender 설치와 현재 Codex의 Blender MCP 실제 호출 가능성을 확인한다.
- Blender가 없으면 공식 설치 경로와 권한을 확인하고 **설치 승인을 요청한다**. 승인 전 다운로드·설치·첫 실행을 시작하지 않는다.
- MCP가 없어도 Blender Python 제작 경로를 검토한다. 단순히 기존 GLB를 Blender에서 다시 내보내는 것을 전문 제작 완료로 취급하지 않는다.
- 사용자 전역 설정·보안 설정·관리자 권한을 임의 변경하지 않는다.

## 2. 아기 후보 제작

현재 v8을 디자인 기준으로 실제 Blender 조형·리깅·애니메이션을 개선한다.

- 모찌처럼 둥글고 통통한 몸, 작은 유니콘 뿔 하나와 은은한 진주빛.
- 귀여운 기본 눈매, 얼굴 곡면에 자연스럽게 연결되는 눈/눈꺼풀.
- 몸에 연결된 작은 앞발 두 개, 정적인 뒷발 없음.
- 호기심 많고 까불거리는 아기의 부드럽고 말랑한 움직임.
- 몸 전체 비율과 얼굴을 Blender에서 조형하고 눈매·눈꺼풀·볼·입의 표정 Shape Key를 제작한다.
- 몸/앞발에 실제 rig와 vertex weights를 적용한다.
- 기본 정지 자세를 먼저 완성하고 걷기·통통 뛰기·정지/착지·쓰다듬기·손을 놓은 후 복원을 제작한다.

## 3. 실제 앱 비교

A = 기존 v8, B = Blender 제작 후보. 기존 A 파일과 기본값을 보존하고 정상 비교 화면에서 선택한다. 이 A/B는 기존 온디바이스 AI의 A/B와 별도다.

같은 방·카메라·조명·화면 크기·렌더 설정·행동·표정에서 +25/+35를 각각 비교한다. 정면/측면/후면에 대해 다음을 확인한다.

1. 기본 자세와 기본 눈매.
2. 호기심·장난·놀람 표정.
3. 걷기, 통통 뛰기, 착지.
4. 쓰다듬기와 손을 놓은 후 복원.

실제 게임 크기 우선. 확대는 모델 결함 분석용이며 실제 크기의 가독성 증거를 대신하지 않는다. 설치한 같은 Release의 commit/build/environment와 정상 속도 영상 출처를 남긴다.

## 4. 품질과 비용

실제 정상 속도 영상에서 얼굴/몸 표면, 실루엣과 귀여움, 눈의 자연스러움, 앞발 연결, 발 미끄러짐, 체중 이동, 착지 압축/복원, 귀/뿔 연결, 표정 가독성, 움직임의 부드러움을 SELF_REVIEW한다. v8보다 늘어난 렌더 비용을 같은 조건에서 측정한다. Simulator의 RAF/프레임 제출/입력 proxy와 실제 GPU·물리 기기 성능을 구분한다. 테스트 수로 아트 품질을 승인하지 않는다.

## 5. 결과물

- 실제 Blender 제작을 보존한 편집 가능한 `.blend`.
- 게임용 `.glb`, 제작 Python/source와 애니메이션/rig/Shape Key.
- A/B 정면·측면·후면 비교 이미지와 정상 속도 영상.
- 실제 게임에서 선택하는 비교 화면.
- 같은 조건의 비용 비교 결과 및 한계.

Blender 제작이 실행되지 않았다면 Blender 전문 제작이라고 기록하지 않는다. B가 없을 때 A fallback을 B 성공으로 보고하지 않는다.

## 6. 경계와 종료

아기 한 종류만. 성장기/진화형·전체 상점·코인·EXP·수면·동면·AI 시스템은 변경하지 않는다. 원본 GLB와 기존 저장·SQLite 대기열·중복 정산·일반 위젯·건강 OFF를 보존한다. 기술 결함은 직접 수정/재검증하되 최종 A/B 채택은 사용자에게 남긴다.

실제 결과는 BLENDER_AB_REVIEW_READY / PARTIAL_WITH_BLOCKERS / REWORK_REQUIRED 중 하나로 기록한다. 기존 feature/arucon-mobile-autonomous의 checkpoint/일반 push 권한만. main/merge/force/deploy/실건강/실결제/보안 변경 금지. 설치 승인 대기는 작업 완료가 아니다.

## 착수 조사 — 2026-10-09

- HEAD/추적/live origin 7b3e265 일치, 작업 트리 clean으로 착수.
- Mac arm64 / macOS15.6, 현재 여유 공간 약6.9GiB.
- PATH·/Applications·사용자 Applications·Homebrew 경로·Spotlight에서 Blender를 찾지 못했다.
- 현재 노출 도구 목록에 Blender MCP 없음. MCP 없이 공식 CLI의 `--background --python` 제작을 준비한다.
- 공식 Apple Silicon 배포본을 프로젝트의 ignored `.tools/blender/`에 두는 경로를 제안한다. 정확한 확장 용량과 서명은 설치 승인 후 확인한다. 일반 전역 Applications/설정을 임의 변경하지 않는다.
- 공식 근거: [요구 사항](https://www.blender.org/download/requirements/), [macOS 설치](https://docs.blender.org/manual/en/latest/getting_started/installing/macos.html), [CLI](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html).

## 설치 승인과 실제 실행

사용자는 2026-10-09 프로젝트 내부 공식 Blender 설치·실행을 승인했다. 공식 Apple Silicon Blender5.2.0 LTS를 ignored `.tools/blender/Blender.app`에 설치했으며 공식 SHA256·Developer ID·notarization과 실제 CLI 실행이 통과했다. Blender MCP는 노출되지 않으므로 Python API를 실제 사용했다. `art/reboot-03/build_baby.py`는 A를 import하지 않고 새 geometry·Shape Key·armature·weights·actions를 제작하며 `.blend`와 B GLB를 보존한다.

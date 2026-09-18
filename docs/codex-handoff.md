# Codex 인계 — 아루콘 v1.7

이 묶음은 **실제 모바일 앱 개발을 Codex에서 시작하기 위한 저장소용 패키지**다. 루트 `AGENTS.md`는 짧은 지도이고 제품 기준은 `docs/arucon-SRS.md`다. 최신 웹 프로토타입은 `references/floor-navigation-03/`에 참조용으로 포함했다.

## 가장 먼저 할 일

패키지를 작업 저장소 루트에 파일별 병합한 뒤 Codex를 그 루트에서 열고 다음 한 줄만 보낸다.

```text
루트 AGENTS.md를 읽고 tasks/APP-01-mobile-shell.md만 실행해라. 이후 단계는 시작하지 말고, 완료 보고서와 실제 실행 증거를 남겨라.
```

APP-01은 현재 아기 아루콘 GLB/모션/바닥 터치를 설치형 앱에서 검증하는 스파이크다. D1/D4 완료가 아니며 실제 건강정보·계정·결제·서버를 연결하지 않는다.

## 캐릭터 명명 결정

- 진화 전 공통형: **아루콘**
- 1차: **말루 / 모노 / 피코 / 몽글**
- 사용자 개체명 `givenName+콘`은 진화와 무관하게 유지
- 형태명과 성격 프로필은 분리
- 실제 케어 기록→형태 분기 규칙은 DEC-08 OPEN

자세한 규칙은 `docs/character-naming.md`, 코드용 키는 `references/character-form-catalog.json`을 따른다.

## 적용 원칙

기존 저장소를 무조건 덮어쓰지 않는다. 사용자 변경·더 엄격한 보안/권한·기존 CI를 보존하고 충돌은 보고한다. 전역 `~/.codex`를 자동 수정하지 않는다. 커밋·push·merge·배포는 명시적 허용 범위에서만 한다.

## 이후 개발

APP-01 뒤 `docs/codex-roadmap.md`와 `docs/arucon-agent-prompts.md`의 S/D 단계로 진행한다. OPEN/PROPOSED 결정을 임의 승인하지 않는다. 특히 수면 점수, 진화 분기, 가격/밸런스, 운영 스택/OS, 실제 동기화는 별도 결정이다.

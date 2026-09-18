# 근거와 설정 확인 범위

확인일: 2026-09-17. 제품 방향의 출처는 사용자 대화와 v1.5 문서다. 운영 문서의 출처는 사용자 제공 글과 그에 대한 검토이며, 설정 키는 아래 공식 자료로 별도 확인했다.

| 구분 | 반영 내용 | 상태 |
|---|---|---|
| 사용자 제공 글 | 공통/역할/브리핑 분리, 짧은 스킬 설명, 완료 조건과 기본 절차 분리 | 사용자가 검토 반영 요청 |
| 아루콘 검토 | 역할·위험 기반 검사, 모든 모델의 공통 보호, 시각 증거, 회사 계정 경계, 조건부 위임 | 이번 운영에 반영 |
| 글의 수치·모델 평가 | 모델별 비용비·사고율·정확도 순위·별칭에 따른 보장 | 이번에 검증·채택하지 않음 |
| 설치된 Codex 실행 | 설정 합성·실제 모델·역할 로드·스킬 발동·권한 집행 | 사용자 환경 미접근, 미검증 |

## 공식 자료에서 확인한 설정

- OpenAI, **Subagents**: 프로젝트 `.codex/agents/` TOML의 필수 name/description/developer_instructions와 역할별 sandbox·model 설정, 부모 설정 상속, 동시 스레드 설정. https://developers.openai.com/codex/subagents (현재 https://learn.chatgpt.com/docs/agent-configuration/subagents 로 연결)
- OpenAI, **Configuration Reference**: `approval_policy`, `sandbox_mode`, `sandbox_workspace_write.network_access`, `agents.enabled`, `agents.max_concurrent_threads_per_session`. 호스트의 더 강한 관리 설정·기존 권한 프로필과 호환을 확인한다. https://developers.openai.com/codex/config-reference
- OpenAI, **Custom instructions with AGENTS.md**: 전역/프로젝트/하위 경로의 지침 발견 방식. 전역을 총괄 전용으로 쓰지 않는 이유다. https://developers.openai.com/codex/guides/agents-md
- OpenAI, **스킬 빌드하기**: `.agents/skills/`, name/description frontmatter, `agents/openai.yaml`의 `policy.allow_implicit_invocation: false`; 명시 호출과 자동 선택을 구분한다. https://learn.chatgpt.com/ko-KR/docs/build-skills
- OpenAI, **Agent approvals & security**: 허용 범위와 실행 승인·샌드박스는 프롬프트 내용과 별도다. https://developers.openai.com/codex/agent-approvals-security

최신 문서에서 문법을 확인한 것이 사용자의 설치 버전 호환성·보안 검증을 완료했다는 뜻은 아니다. 실제 도입 시 버전과 유효 설정을 확인한다. 비용 절감률·스킬 선택 성공률은 별도 실제 실행으로 측정한다.

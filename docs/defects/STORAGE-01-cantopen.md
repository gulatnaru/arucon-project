# STORAGE-01 — SQLite CANTOPEN / 저장 신뢰성

2026-10-10 · OPEN_ORIGINAL_VFS_CAUSE_UNCONFIRMED · SOL_DIRECT / SELF_REVIEW.

REBOOT-03.2 시각 검토 판정과 별개의 저장 결함이다. 디스크127MiB/캡처 실패 시점 뒤 일반 검토 저장에서 `UPDATE pet_snapshot (execute)`의 SQLite14 CANTOPEN을 관찰했다. 정상 재시도는 즉시 복구되지 않았고 같은 설치본 재실행 뒤 write revision13215→13227과새접촉저장을 확인했다. 데이터삭제/초기화/백업복원은 없었다.3DB integrity=ok/기존30+아루/경제·EXP·meal 보존.

## 확인된 사실 / 아직 없는 증거

- 앱 소스a6218d4/설치visual-v5 및 앞선v4의 오류화면·디스크/DB 감사는 로컬 `evidence/reboot-03-2-2026-10-10/`에 보존됐다.
- 최초 관찰은 statement execute이며 finalize 최초 원인으로 기록하지 않는다. 캐시의 기존SQL실패trace에는이사건의최초VFS경로/연결번호/extended code가없다. 전체실패경로를찾았다고주장하지않는다.
- 현재원본3파일은Documents/SQLite에있고journal_mode=DELETE,부모존재.127MiB는host측관찰값이며실패순간SQLite xOpen의available bytes/errno와동일하다고확정하지않는다.
- SQLite14는main/side/temp파일열기실패이며,13 FULL과구분한다. 디스크부족만으로14의원인을확정하지않는다.
- Expo55.0.20 exclusive transaction은별도연결을열고내부쿼리는txn에서실행한다. 앱전체직렬화는기존per-file lane이담당한다. 실제open/close/rollback 경로와최초오류보존을검사한다.

## 현재 후속 범위

1. DPR2.5/AA0와3.0의같은조건연속자율생활/이동/교감·프레임확인. 최종기본렌더는실기기전미확정,2.25비교보존.
2. failure의connection/file/phase/transaction/available bytes/후보경로상태를로컬bounded 진단으로보존. 실제VFS가시도한파일을추정값으로꾸미지않는다.
3. original DB를열거나호스트디스크를채우지않는격리native실험: journal 파일열기실패와SQLite FULL13을분리,실패원자성/같은요청복구/중복섭취·EXP·회복방지.
4. 일반저장/기억/원장/원본과소유를감사,개발산출물점유·보존종류를기록. 사용자원본/영상/DB 임의삭제없음.

원사건의인과원인확정과안전한복구검증은별도판정이다. 재현모델통과만으로원결함을CLOSED하지않는다. 새실제오류가발생하면원래증거/저장을보존하고stage/commit/push에서DB/영상/로그를제외한다.

근거: [Expo55 SQLite](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/), [SQLite result codes](https://www.sqlite.org/rescode.html#cantopen), 설치된expo-sqlite55.0.20 transaction/native code.


## 2026-10-10 후속 실제 결과

설치 **REBOOT-03.2 followup-v2 Release**, bundle `b132a81e013c61e4bad7033f48d51e660ce73099d95691f36541f58975232941`. 최초 visual-v5와 같은 저장에 업데이트 설치했다. 현재 여유는 약30GiB이며, 첫 착수 때부터 약32GiB였다. 이번 작업에서 디스크 정리·원본/영상/DB 삭제를 하지 않았다. 앞선127MiB 회복을 이번 작업의 효과로 쓰지 않는다.

- **원사건 원인 OPEN**: 당시 실제 xOpen 파일·extended error/errno·연결번호를 역으로 복원할 근거가 없다. CANTOPEN14가 저용량13 FULL과 같은 원인이라고 확정하지 않는다. 기록된 최초 실패는 `UPDATE pet_snapshot / execute`; finalize는 앞선 오류 전달 가능성이 있으므로 별도 cleanup으로 관리한다.
- **수동 재현/복구 PASS_NATIVE**: 별도 `storage-reliability-*` DB에서 DELETE 저널 경로에 격리 디렉터리를 만들었을 때 실제 `UPDATE pet_snapshot / execute`14와 finalize14가 발생했다. DB 본체와 부모는 유지하고 blocker만 별도 보존 경로로 옮겼다. 실패 snapshot 전체 동일/섭취0, 같은 command20회→섭취1/EXP15. 재현은 원사건의 VFS 원인 증명이 아니다. 두 별도 native 반복 결과를 보존했다.
- **용량 경계 PASS_NATIVE**: 새 트랜잭션 연결에 `max_page_count`를 적용하고 격리 trigger의 큰 BLOB으로 `INSERT command_ledger / execute`13을 실제 발생시켰다. 먼저 변경됐던 snapshot과 meal도 rollback되고 이후 같은command20회→섭취1/EXP15, integrityok. 호스트 디스크를 채우지 않았다.
- **정리 오류 보존**: 실제 finalize14/13과 최초 execute14/13을 분리한다. 이번 시험에서 rollback 오류를 관찰했다고 주장하지 않는다. 기존 txn executor/per-file lane/최초오류 보존 정책 그대로다. BUSY만 재시도하며 지연 연장은 없다.
- **경합/회복 PASS_NATIVE**: 다른 격리 DB150개 동시요청, 직접 동일요청30회→섭취1, 자동섭취1, 깨우기 동일요청 replay 전체state동일, EXP30/meal2/integrityok. 원본 DB에 fixture를 넣지 않았다.
- **부정 실험 보존**: 처음 격리 부모를 이동한 방법은14가 아니라 READONLY8을 만들었다. 세 파일과 execute/finalize trace를 보존하고 CANTOPEN 통과로 세지 않았다. DB 본체 경로를 옮기지 않는 저널 시험으로 수정했다. 앱 실제 오류가 아닌 추가 QA의 실패다.
- **향후 최초오류 진단 구현**: connectionId/transactionId, file/phase, availableBytes, 본체·부모·유도 저널/WAL·tmp 상태를 로컬 최대8사건에 기록한다. 시도한 VFS 경로는 `NOT_EXPOSED_BY_EXPO`로 표시한다. 건강 원본/SQL bind/snapshot을 로그에 넣지 않는다. 진단 파일 쓰기 실패가 SQL 결과를 바꾸지 않으며 메모리 기록을 유지한다.
- **원본 보존 PASS**: 일반1+기존체험29+같은아루1, 이름/형태/personality/재화/EXP/소유/섭취원장,48개 원본을 대조했다. 세 DB integrityok. 일반Sim의 기존 동면은 그대로이고 검토아루 수면→깨우기/접촉/이동·Home/위젯탭·cold복원을 실제 확인했다. 일반 위젯은 일반 펫 이미지이며 체험아루로 덮지 않았다.

로컬 증거 `evidence/reboot-03-2-followup-2026-10-10/`: `v2-arucon-storage-reliability.json`, 두 `storage-reliability-*-result.json`, `v2-arucon-storage-contention.json`, `v2-arucon-storage-incidents.json`, `hanging-native-qa.json`(초기 QA8 결과), `after-preservation-audit.json`. 실제 VFS 파일은 여전히 미노출이다. **안전한 원자적 복구/중복 방지 확인과 원결함 CLOSED는 별개이며 CLOSED하지 않는다.**

## 개발 산출물과 재발 방지

`validation/audit_local_artifacts.py --require-free-gib 4`는 읽기 전용 프로젝트 점유/여유 사전 검사다.4GiB는 빌드·영상 준비용 가역 기술 여유값이며 앱의 섭취/경제 정책이 아니다. 자동 삭제·정리·전역설정 변경을 하지 않는다. 새 큰 빌드/영상 전에 이 검사를 사용하고 공간이 부족하면 같은 산출물을 반복 생성하지 않는다.

측정상 evidence 약7.52GiB, 프로젝트Blender도구1.21GiB, node_modules.48GiB, ios.37GiB, 이 앱의 XcodeDerivedData1.08GiB. 큰 부분은 보존한AI모델/venv·DB백업·영상이다. Xcode/Pods/node_modules/생성 bundle은 재생성 가능한 분류이고 영상/원본/DB는 보호한다. 파일논리크기와du/APFS할당량은 다르며 프로젝트 밖 캐시/다른 앱/스왑이 원사건을 만들었다고 단정하지 않는다. 사용자 확인 없이 지우지 않았다.

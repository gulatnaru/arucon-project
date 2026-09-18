"""Static validation only; does not test the game, OS integration, or Figma writes."""
from pathlib import Path
import re,json,hashlib,argparse,xml.etree.ElementTree as ET
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline',type=Path,required=True,help='v1.4 docs directory, read-only')
parser.add_argument('--original-srs',type=Path,required=True,help='Separate original v1.4 SRS for preservation check')
args=parser.parse_args()
BASE=args.baseline
if not BASE.is_dir() or not args.original_srs.is_file():
    parser.error('Both baseline docs and the original SRS must exist.')
results=[]
def check(name,ok,detail=''):
    results.append({'check':name,'passed':bool(ok),'detail':detail})
def text(p):return p.read_text(encoding='utf-8')
def ats(s):return re.findall(r'^\| (AT-[A-Z]+-\d+) \|',s,re.M)
srs=text(ROOT/'docs/arucon-SRS.md');dec=text(ROOT/'docs/decisions.md');at=text(ROOT/'docs/acceptance-tests.md')
base_ok=BASE.exists()
check('Reference v1.4 available for this validation run',base_ok,'Baseline is a runtime reference, not bundled in this delivery.')
if base_ok:
    old=text(BASE/'arucon-SRS.md');oa=ats(text(BASE/'acceptance-tests.md'))
    h=lambda s: re.findall(r'^## (\d+)\. (.+)$',s,re.M)
    check('Preserve sections 0–14 and names',h(old)==h(srs),f'{len(h(srs))} chapters')
    fr=lambda s:set(re.findall(r'^### (FR-[A-Za-z0-9.]+)',s,re.M))
    check('Preserve original FR IDs',fr(old).issubset(fr(srs)),str(sorted(fr(old)-fr(srs))))
    def econ(s):
        block=s.split('## 9. 게임 밸런스 상수 (config)',1)[1]
        return block.split('```',2)[1]
    check('Existing economy config block unchanged',econ(old)==econ(srs))
    check('Preserve all 166 old acceptance IDs',len(oa)==166 and set(oa).issubset(set(ats(at))))
    check('Exactly 48 new acceptance IDs',len(set(ats(at))-set(oa))==48)
    check('v1.4 extracted baseline content matches mounted original',hashlib.sha256((BASE/'arucon-SRS.md').read_bytes()).hexdigest()==hashlib.sha256(args.original_srs.read_bytes()).hexdigest())
check('214 unique acceptance cases',len(ats(at))==len(set(ats(at)))==214)
check('Execution status explicitly unexecuted','문서상 현재 실행 상태는 전부 ‘미실행’' in at and at.count('현재 실행 상태: **미실행**') >= 20,'Document declarations only; this script is not a gameplay test.')
check('New 48 scenarios explicitly unexecuted','신규 수용 기준 — 총 48개 / 모두 미실행' in at)
for n in range(27,32):
    check(f'DEC-{n} in SRS and decisions',f'| DEC-{n} |' in srs and f'### DEC-{n} ' in dec)
check('DEC-30 remains proposed',bool(re.search(r'### DEC-30[^\n]*\n\n\*\*상태: PROPOSED',dec)))
check('DEC-31 remains open',bool(re.search(r'### DEC-31[^\n]*\n\n\*\*상태: OPEN',dec)))
check('Separate mobile and extension DoD','### 14-3.' in srs and '모바일 MVP와 별도' in srs)
check('Independent extension task coverage',all(f'## X{i}.' in text(ROOT/'docs/arucon-agent-prompts.md') for i in range(4)))
check('Same pet and no PC economy writes','초기 PC에서 먹이 섭취·구매' in srs and '초기 PC는 읽기 전용' in srs)
check('Figma failure not represented as success','Figma 원본에는 반영하지 못했다' in text(ROOT/'figma/FIGMA-STATUS.md'))
check('Prototype vs native evidence separated','새 네이티브 앱을 제작하지 않았다' in text(ROOT/'docs/prototype-spec.md'))
# Only Markdown links; old historical docs describe paths for their original packages.
bad=[]
for p in list((ROOT/'docs').glob('*.md'))+[ROOT/'README.md',ROOT/'figma/FIGMA-STATUS.md']:
    for u in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text(p)):
        if re.match(r'^(https?://|mailto:|#)',u):continue
        f=u.split('#')[0]
        if f and not (p.parent/f).exists():bad.append((str(p.relative_to(ROOT)),u))
check('Current document local links exist',not bad,json.dumps(bad,ensure_ascii=False))
for f in ['arucon-v1.5-platform-board.svg','arucon-v1.5-platform-board-outlined.svg']:
    p=ROOT/'figma'/f
    try:
        t=ET.parse(p)
        check(f'SVG XML parses: {f}',True)
    except Exception as e:check(f'SVG XML parses: {f}',False,str(e))
fontfiles=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.suffix.lower() in {'.ttf','.otf','.ttc','.woff','.woff2'}]
check('No font files in deliverable',not fontfiles,str(fontfiles))
# No unresolved invented citation handles embedded in documents.
invalid=[]
for p in (ROOT/'docs').glob('*.md'):
    if re.search(r'turn\d+(?:file|search|view)\d+',text(p)):invalid.append(p.name)
check('No internal citation handles in artifacts',not invalid,str(invalid))
summary={'kind':'document_static_checks','game_tests_executed':False,'figma_write_succeeded':False,'passed':sum(r['passed'] for r in results),'total':len(results),'acceptance_spec_cases':len(ats(at)),'checks':results}
(ROOT/'validation/document-checks.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k!='checks'},ensure_ascii=False,indent=2))
for r in results:
    if not r['passed']: print('FAILED:',r)
if not all(r['passed'] for r in results):raise SystemExit(1)

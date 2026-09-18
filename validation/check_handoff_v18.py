#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]

def txt(p): return (ROOT/p).read_text(encoding='utf-8')
def add(name, cond, detail=''): checks.append({'check':name,'passed':bool(cond),'detail':detail})
checks=[]

srs=txt('docs/arucon-SRS.md'); dec=txt('docs/decisions.md'); ag=txt('AGENTS.md'); at=txt('docs/acceptance-tests.md'); cfg=txt('.codex/config.toml')
add('SRS v1.8', '문서 버전: **v1.8' in srs)
add('product requirements preserved note', 'v1.7에서 변경하지 않았다' in srs and '제품 요구' in srs)
add('ENG-02 autonomous approved', '### ENG-02 — Astra 자율 연속 개발 운영' in dec and 'APPROVED (개발 운영 범위)' in dec)
add('Astra pinned', 'model = "gpt-6-astra"' in cfg and 'model_reasoning_effort = "high"' in cfg)
add('network workspace enabled', '[sandbox_workspace_write]' in cfg and 'network_access = true' in cfg)
add('AUTO-00 exists', (ROOT/'tasks/AUTO-00-orchestrate.md').is_file())
for i,name in [(1,'mobile-shell'),(2,'domain-storage'),(3,'life-room-integration'),(4,'onboarding-activity-adapter'),(5,'sleep-shop-widget-scaffold'),(6,'integration-qa')]:
    add(f'APP-0{i} exists', (ROOT/f'tasks/APP-0{i}-{name}.md').is_file())
add('hard stops exist', all(f'HS-0{i}' in txt('docs/hard-stops.md') for i in range(1,9)))
add('autonomous continue wording', '사용자 응답을 기다리지 않고 다음 게이트' in txt('docs/autonomous-development.md'))
add('start points AUTO-00', 'tasks/AUTO-00-orchestrate.md' in txt('CODEX-START.txt'))
add('DEC-32 naming preserved', '### DEC-32' in dec and all(n in dec for n in ['말루','모노','피코','몽글']))
rows=re.findall(r'^\| AT-[A-Z]+-\d+ \|.*$', at, re.M)
add('218 acceptance rows preserved', len(rows)==218, len(rows))
add('DEC-08 still open', bool(re.search(r'### DEC-08[^\n]*\n(?:.*\n){0,6}\*\*상태: OPEN\*\*',dec)))
add('DEC-31 still open', '### DEC-31' in dec and '**상태: OPEN**' in dec[dec.find('### DEC-31'):dec.find('### DEC-32')])
add('current GLB included', (ROOT/'references/floor-navigation-03/assets/arucon-tsundere-motion.glb').is_file())
add('approved art included', (ROOT/'references/current-art/approved-baby-character-sheet.png').is_file() and (ROOT/'references/current-art/approved-first-evolution-sheet.png').is_file())
add('no WebView shortcut', 'WebView' in txt('tasks/APP-01-mobile-shell.md') and '실패' in txt('tasks/APP-01-mobile-shell.md'))
add('no real health auto permission', '실제 Health permission' in txt('tasks/APP-04-onboarding-activity-adapter.md') and 'HS-01' in txt('tasks/APP-04-onboarding-activity-adapter.md'))
add('no real payment auto', '실결제' in txt('tasks/APP-05-sleep-shop-widget-scaffold.md') or '실상품' in txt('tasks/APP-05-sleep-shop-widget-scaffold.md'))
add('status template', (ROOT/'templates/AUTONOMOUS-STATUS.template.json').is_file())
add('machine plan', (ROOT/'tasks/autonomous-plan.json').is_file())

# markdown local links
bad=[]
for p in [ROOT/'README.md',ROOT/'AGENTS.md']+list((ROOT/'docs').glob('*.md'))+list((ROOT/'tasks').glob('*.md')):
    t=re.sub(r'```.*?```','',p.read_text(encoding='utf-8'),flags=re.S)
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',t):
        if re.match(r'^(https?://|mailto:|#)',target): continue
        q=target.split('#')[0]
        if q and not (p.parent/q).exists(): bad.append([str(p.relative_to(ROOT)),target])
add('local markdown links resolve', not bad, bad)
fonts=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.suffix.lower() in {'.ttf','.ttc','.otf','.woff','.woff2'}]
add('no font files', not fonts, fonts)

result={'kind':'v1.8_autonomous_handoff_static_checks','passed':sum(x['passed'] for x in checks),'total':len(checks),'checks':checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if result['passed']==result['total'] else 1)

#!/usr/bin/env python3
"""Validate this delivery's structure/contracts. No model, network or gameplay calls."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import tomllib
from typing import Any
try:
    import yaml
except ImportError:
    raise SystemExit('PyYAML is required for YAML parsing; see validation/requirements.txt. Nothing was installed.')

ROOT = Path(__file__).resolve().parents[1]

def digest(value: str | bytes) -> str:
    return hashlib.sha256(value.encode('utf-8') if isinstance(value, str) else value).hexdigest()

def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')

def at_rows(text: str) -> list[str]:
    return re.findall(r'^\| AT-[A-Z]+-\d+ \|.*$', text, re.M)

def validate(root: Path, baseline: Path | None = None, prototype: Path | None = None) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    def check(name: str, ok: bool, detail: Any = '') -> None:
        checks.append({'check': name, 'passed': bool(ok), 'detail': detail})
    def load_json(path: str) -> Any:
        return json.loads(read(root/path))
    try:
        contract = load_json('validation/baseline-contract.json')
        srs = read(root/'docs/arucon-SRS.md')
        rows = at_rows(read(root/'docs/acceptance-tests.md'))
        check('SRS identifies v1.6 operational revision', '문서 버전: **v1.6' in srs and '### 0-3.' in srs)
        product = srs.split('## 1. 제품 개요', 1)[1]
        check('Product chapters 1 onward byte-preserved', digest(product) == contract['product_from_chapter_1_sha256'])
        check('214 acceptance rows byte-preserved', len(rows) == 214 and digest('\n'.join(rows)) == contract['at_rows_sha256'])
        ids = [x.split('|')[1].strip() for x in rows]
        check('214 unique acceptance IDs', len(ids) == len(set(ids)) == 214)
        dec = read(root/'docs/decisions.md')
        check('Product DEC-01 through DEC-31 retained', all(re.search(rf'^### DEC-{i:02d}\s', dec, re.M) for i in range(1,32)))
        check('DEC-30 remains proposed', bool(re.search(r'### DEC-30[^\n]*\n\n\*\*상태: PROPOSED',dec)))
        check('DEC-31 remains open', bool(re.search(r'### DEC-31[^\n]*\n\n\*\*상태: OPEN',dec)))
        check('Engineering decision separate', '### ENG-01' in dec and 'DEC-32' not in dec)
        prom = read(root/'docs/arucon-agent-prompts.md')
        stages=['PROTO','S0','S','D1','D2a','D2b','D2c','D2d','D3','D4','D4b','D5a','D5b','D5c','D6a','D6b','Q','X0','X1','X2','X3']
        check('All existing task stages retained', all(re.search(rf'^#{{1,2}} {x}\. ',prom,re.M) for x in stages))
        root_agents = read(root/'AGENTS.md'); local_agents=read(root/'docs/AGENTS.md')
        check('Compact shared entry under delivery target', len(root_agents.encode()) <= 6144 and len(root_agents.splitlines()) <= 70)
        check('Document instructions are scoped supplement', '상위 `../AGENTS.md`' in local_agents and '루트에 둔다' not in local_agents and len(local_agents.encode()) < 1800)
        check('Broad mandatory header removed', '## 공통 헤더 — 매 작업 앞에 사용' not in prom and 'SRS.md` 전체, 특히' not in root_agents+local_agents)
        cfg=tomllib.loads(read(root/'.codex/config.toml'))
        check('Project config parse and permission contract',cfg.get('approval_policy')=='on-request' and cfg.get('sandbox_mode')=='workspace-write' and cfg.get('sandbox_workspace_write',{}).get('network_access') is False)
        check('Optional delegation bounded to two child threads',cfg.get('agents',{}).get('enabled') is True and cfg['agents'].get('max_concurrent_threads_per_session')==2)
        role_data={p.stem:tomllib.loads(read(p)) for p in sorted((root/'.codex/agents').glob('*.toml'))}
        check('Exactly three namespaced roles',set(role_data)=={'arucon_explorer','arucon_worker','arucon_reviewer'})
        check('Required role fields are nonempty',all(all(isinstance(d.get(k),str) and d[k].strip() for k in ['name','description','developer_instructions']) and d['name']==n for n,d in role_data.items()))
        check('Exploration/review read-only, implementation workspace-write',all(d.get('sandbox_mode')==('workspace-write' if n=='arucon_worker' else 'read-only') for n,d in role_data.items()))
        check('No assumed model IDs or reasoning settings', all('model' not in d and 'model_reasoning_effort' not in d for d in role_data.values()) and 'default_subagent_model' not in cfg.get('agents',{}))
        skill_files=sorted((root/'.agents/skills').glob('*/SKILL.md'))
        check('Exactly three task-scoped skills',len(skill_files)==3)
        found=[]; policies={}
        for p in skill_files:
            text=read(p);parts=text.split('---',2)
            meta=yaml.safe_load(parts[1]) if len(parts)==3 and not parts[0].strip() else {}
            name=meta.get('name','');desc=meta.get('description','')
            found.append(name)
            check('Skill metadata: '+p.parent.name, name==p.parent.name and bool(re.fullmatch(r'[a-z0-9-]{1,64}',name)) and isinstance(desc,str) and 0<len(desc)<=1024)
            check('Skill outcome/procedure/boundary sections: '+name, '## 완료 조건' in text and '## 기본 절차' in text and ('## 보호 경계' in text or '## 호출·권한 경계' in text) and len(text.splitlines())<100)
            side=yaml.safe_load(read(p.parent/'agents/openai.yaml'))
            policies[name]=side.get('policy',{}).get('allow_implicit_invocation')
            check('Skill YAML UI metadata: '+name, bool(side.get('interface',{}).get('display_name')) and '$'+name+' ' in side.get('interface',{}).get('default_prompt',''))
        check('Implicit invocation only for game/visual; explicit Figma', policies=={'arucon-game-verification':True,'arucon-visual-verification':True,'arucon-figma-handoff':False})
        cases=load_json('validation/skill-trigger-cases.json')['cases']
        check('18 unique evaluation designs, all not run',len(cases)==18 and len({c['id'] for c in cases})==18 and all(c['execution_status']=='NOT_RUN' for c in cases))
        check('Evaluation references known skills without live remote writes',all(set(c['expected_skills']+c['excluded_skills']).issubset(set(found)) and c['remote_write_allowed_in_test'] is False for c in cases))
        commands=load_json('validation/commands.json')['commands']
        check('Six concrete command entries',len(commands)==6 and len({x['id'] for x in commands})==6 and all(x['argv'] and x['cwd_kind'] in ['kit_root','prototype_root'] for x in commands))
        check('Game command entries not misreported as executed',all(c['status'] in ['SOURCE_VERIFIED_NOT_RUN_THIS_CHANGE','ENVIRONMENT_PORT_REQUIRED'] for c in commands if c['cwd_kind']=='prototype_root'))
        check('Kit command required files exist',all((root/f).is_file() for c in commands if c['cwd_kind']=='kit_root' for f in c['requires_files']))
        if prototype:
            missing=[f for c in commands if c['cwd_kind']=='prototype_root' for f in c['requires_files'] if not (prototype/f).is_file()]
            check('External v3 command source paths exist (not executed)',not missing,missing)
        bad_links=[]
        current=[root/'README.md',root/'AGENTS.md']+list((root/'docs').glob('*.md'))+list((root/'templates').glob('*.md'))+list((root/'.agents/skills').glob('*/SKILL.md'))
        for p in current:
            text=re.sub(r'```.*?```','',read(p),flags=re.S)
            for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
                if re.match(r'^(?:https?://|mailto:|#)',target): continue
                path=target.split('#')[0]
                if path and not (p.parent/path).exists(): bad_links.append([str(p.relative_to(root)),target])
        check('Current Markdown local links resolve',not bad_links,bad_links)
        invalid=[str(p.relative_to(root)) for p in current if re.search(r'turn\d+(?:file|search|view)\d+',read(p))]
        check('No internal citation handles embedded in current docs',not invalid,invalid)
        font_files=[str(p.relative_to(root)) for p in root.rglob('*') if p.suffix.lower() in {'.ttf','.ttc','.otf','.woff','.woff2'}]
        check('No font files included',not font_files,font_files)
        check('Runtime and external work explicitly not claimed', '18개' in read(root/'README.md') and '미실행' in read(root/'README.md') and '재접근·생성·수정·업로드하지 않았다' in read(root/'figma/FIGMA-STATUS.md'))
        if baseline:
            missing=[]
            for p,h in contract['original_baseline_file_hashes'].items():
                f=baseline/p
                if not f.is_file() or digest(f.read_bytes())!=h: missing.append(p)
            check('All baseline source files remain unchanged',not missing,missing)
            check('Direct baseline product comparison',read(baseline/'docs/arucon-SRS.md').split('## 1. 제품 개요',1)[1]==product)
            check('Direct baseline AT comparison',at_rows(read(baseline/'docs/acceptance-tests.md'))==rows)
    except Exception as exc:
        check('Unexpected parse or missing-file error',False,f'{type(exc).__name__}: {exc}')
    return {'kind':'document_config_static_checks','game_tests_run':False,'codex_runtime_tested':False,'skill_invocation_tested':False,'figma_accessed':False,'passed':sum(x['passed'] for x in checks),'total':len(checks),'checks':checks}

def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline',type=Path,help='Optional read-only extracted v1.5 package root')
    p.add_argument('--prototype',type=Path,help='Optional read-only v3 code root; checks file paths only')
    args=p.parse_args()
    report=validate(ROOT,args.baseline,args.prototype)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['passed']==report['total'] else 1

if __name__=='__main__':
    raise SystemExit(main())

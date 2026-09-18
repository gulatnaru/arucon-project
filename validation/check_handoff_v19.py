from pathlib import Path
import tomllib, json, sys, re
ROOT = Path(__file__).resolve().parents[1]
checks=[]
def check(name, ok, detail=''):
    checks.append({'name':name,'ok':bool(ok),'detail':detail})

agents = (ROOT/'AGENTS.md').read_text(encoding='utf-8')
check('AGENTS under 32KiB', len(agents.encode()) < 32768, str(len(agents.encode())))
check('AGENTS says Astra not default worker', '모든 코드를 직접 작성하는 기본 워커가 아니다' in agents)
config=tomllib.loads((ROOT/'.codex/config.toml').read_text())
check('root Astra', config.get('model')=='gpt-6-astra', str(config.get('model')))
expected={
 'arucon_builder.toml':('gpt-5.6-sol','high','workspace-write'),
 'arucon_explorer.toml':('gpt-5.6-terra','medium','read-only'),
 'arucon_reviewer.toml':('gpt-5.6-terra','high','read-only'),
 'arucon_luna_worker.toml':('gpt-5.6-luna','low','workspace-write'),
 'arucon_spark_worker.toml':('gpt-5.3-codex-spark',None,'workspace-write'),
}
for fn,(model,effort,sandbox) in expected.items():
    p=ROOT/'.codex/agents'/fn
    check(f'{fn} exists', p.exists())
    if p.exists():
        d=tomllib.loads(p.read_text())
        check(f'{fn} model', d.get('model')==model, str(d.get('model')))
        if effort is not None: check(f'{fn} effort', d.get('model_reasoning_effort')==effort, str(d.get('model_reasoning_effort')))
        check(f'{fn} sandbox', d.get('sandbox_mode')==sandbox, str(d.get('sandbox_mode')))
check('no v1.8 generic worker remains', not (ROOT/'.codex/agents/arucon_worker.toml').exists())
check('routing doc exists', (ROOT/'docs/model-routing.md').exists())
check('audit doc exists', (ROOT/'docs/instruction-audit-v1.9.md').exists())
check('Figma implicit off', 'allow_implicit_invocation: false' in (ROOT/'.agents/skills/arucon-figma-handoff/agents/openai.yaml').read_text())
auto=(ROOT/'tasks/AUTO-00-orchestrate.md').read_text()
for role in ['arucon_builder','arucon_explorer','arucon_reviewer','arucon_luna_worker','arucon_spark_worker']:
    check(f'AUTO mentions {role}', role in auto)
for f in (ROOT/'tasks').glob('APP-0*.md'):
    s=f.read_text()
    check(f'{f.name} has role hints', '## 권장 역할' in s)
# No subagent inheritance comments.
joined='\n'.join(p.read_text() for p in (ROOT/'.codex/agents').glob('*.toml'))
check('no inherit parent model', 'inherit from the parent' not in joined and '부모 것을 씁니다' not in joined)
result={'version':'v1.9','passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks}
(ROOT/'validation/v1.9-static-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if all(x['ok'] for x in checks) else 1)

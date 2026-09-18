"""Regression tests for delivery validation only. Does not execute model/game tools."""
from pathlib import Path
import shutil
import tempfile
import unittest
from check_workflow import validate, ROOT

class WorkflowGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)/'kit'
        shutil.copytree(ROOT,self.root,ignore=shutil.ignore_patterns('__pycache__'))
    def tearDown(self): self.temp.cleanup()
    def change(self,path,old,new):
        p=self.root/path; text=p.read_text(encoding='utf-8')
        self.assertIn(old,text);p.write_text(text.replace(old,new,1),encoding='utf-8')
    def failure(self,check):
        r=validate(self.root)
        item=next(x for x in r['checks'] if x['check']==check)
        self.assertFalse(item['passed'])
    def test_valid_bundle(self):
        r=validate(self.root);self.assertEqual(r['passed'],r['total'],r)
    def test_product_mutation_detected(self):
        self.change('docs/arucon-SRS.md','## 1. 제품 개요\n','## 1. 제품 개요\nUNAPPROVED PRODUCT EDIT\n')
        self.failure('Product chapters 1 onward byte-preserved')
    def test_acceptance_mutation_detected(self):
        self.change('docs/acceptance-tests.md','| AT-CONFIG-01 |','| AT-CONFIG-999 |')
        self.failure('214 acceptance rows byte-preserved')
    def test_reviewer_write_escalation_detected(self):
        self.change('.codex/agents/arucon_reviewer.toml','sandbox_mode = "read-only"','sandbox_mode = "workspace-write"')
        self.failure('Exploration/review read-only, implementation workspace-write')
    def test_figma_auto_invocation_detected(self):
        self.change('.agents/skills/arucon-figma-handoff/agents/openai.yaml','allow_implicit_invocation: false','allow_implicit_invocation: true')
        self.failure('Implicit invocation only for game/visual; explicit Figma')
    def test_network_enable_detected(self):
        self.change('.codex/config.toml','network_access = false','network_access = true')
        self.failure('Project config parse and permission contract')
    def test_missing_local_link_detected(self):
        with (self.root/'README.md').open('a',encoding='utf-8') as f:f.write('\n[missing](does-not-exist.md)\n')
        self.failure('Current Markdown local links resolve')

if __name__=='__main__': unittest.main(verbosity=2)

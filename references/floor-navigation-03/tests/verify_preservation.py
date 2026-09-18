"""Checks protected inputs and explicitly scoped renderer changes for floor-03."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'references/floor-input-hashes.json').read_text())
checks=[]
for item in m['unchanged']:
 actual=hashlib.sha256((R/item['target']).read_bytes()).hexdigest()
 checks.append({'path':item['target'],'expected':item['sha256'],'actual':actual,'passed':actual==item['sha256']})
def without_floor_method(s):
 a=s.index(' floorPoint(x,y){'); b=s.index(' render(root){',a)
 return s[:a]+' SCREEN_TO_FLOOR_METHOD\n'+s[b:]
old=(R/'references/before-floor-03/renderer.js').read_text()
new=(R/'src/renderer.js').read_text()
checks.append({'name':'renderer identical outside screen-to-floor inverse','passed':without_floor_method(old)==without_floor_method(new)})
motion=(R/'src/motion-config.js').read_text()
checks.append({'name':'approved 110/15 direct touch spring preserved','passed':'springStiffness:110' in motion and 'springDamping:15' in motion})
report={'passed':sum(x['passed'] for x in checks),'total':len(checks),'checks':checks,'scope':'Full model/engine/config/motion policy and visual renderer unchanged except floor projection. Navigation, input and cosmetic position validation intentionally updated.'}
(R/'tests/floor-preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
assert report['passed']==report['total']

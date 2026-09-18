#!/usr/bin/env python3
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding="utf-8")
def ok(name, cond, detail=""): return {"check":name,"passed":bool(cond),"detail":detail}

checks=[]
srs=read("docs/arucon-SRS.md")
dec=read("docs/decisions.md")
at=read("docs/acceptance-tests.md")
ag=read("AGENTS.md")
checks.append(ok("SRS v1.7", "문서 버전: **v1.7" in srs))
checks.append(ok("DEC-32 approved naming", "### DEC-32" in dec and "APPROVED (명명 범위)" in dec))
for name in ["말루","모노","피코","몽글"]:
    checks.append(ok(f"name present: {name}", name in srs and name in dec and name in read("docs/character-naming.md")))
checks.append(ok("legacy chic label not personality binding", "`모노`는 세로형·비대칭 귀 실루엣" in srs and "`시크형`은 외형과 성격을 섞어 읽힐 위험" in read("docs/character-naming.md")))
rows=re.findall(r"^\| AT-[A-Z]+-\d+ \|.*$",at,re.M)
checks.append(ok("218 acceptance rows", len(rows)==218, len(rows)))
checks.append(ok("new appearance ATs", all(f"AT-APPEARANCE-0{i}" in at for i in range(4,8))))
checks.append(ok("APP-01 task exists", (ROOT/"tasks/APP-01-mobile-shell.md").is_file()))
checks.append(ok("Codex start exists", (ROOT/"CODEX-START.txt").is_file()))
checks.append(ok("Current GLB included", (ROOT/"references/floor-navigation-03/assets/arucon-tsundere-motion.glb").is_file()))
checks.append(ok("Approved art included", (ROOT/"references/current-art/approved-baby-character-sheet.png").is_file() and (ROOT/"references/current-art/approved-first-evolution-sheet.png").is_file()))
checks.append(ok("AGENTS version and naming map", "v1.7" in ag and "character-naming.md" in ag and len(ag.splitlines())<=75))
checks.append(ok("DEC-08 remains open", bool(re.search(r"### DEC-08[^\n]*\n(?:.*\n){0,5}\*\*상태: OPEN\*\*",dec))))
checks.append(ok("DEC-31 remains open", bool(re.search(r"### DEC-31[^\n]*\n\n\*\*상태: OPEN",dec))))
checks.append(ok("no WebView completion shortcut", "WebView" in read("tasks/APP-01-mobile-shell.md") and "실패" in read("tasks/APP-01-mobile-shell.md")))
# local markdown links
bad=[]
for p in [ROOT/"README.md", ROOT/"AGENTS.md"]+list((ROOT/"docs").glob("*.md"))+list((ROOT/"tasks").glob("*.md")):
    txt=re.sub(r"```.*?```","",p.read_text(encoding="utf-8"),flags=re.S)
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)",txt):
        if re.match(r"^(https?://|mailto:|#)",target): continue
        q=target.split("#")[0]
        if q and not (p.parent/q).exists(): bad.append([str(p.relative_to(ROOT)),target])
checks.append(ok("local markdown links resolve", not bad, bad))
fonts=[str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.suffix.lower() in {".ttf",".ttc",".otf",".woff",".woff2"}]
checks.append(ok("no font files", not fonts, fonts))
result={"kind":"v1.7_handoff_static_checks","passed":sum(c["passed"] for c in checks),"total":len(checks),"checks":checks}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result["passed"]==result["total"] else 1)

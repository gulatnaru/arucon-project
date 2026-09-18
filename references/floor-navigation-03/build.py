"""Build locally. Does not upload/deploy or download dependencies."""
from pathlib import Path
import base64,hashlib,json,shutil
R=Path(__file__).resolve().parent;S=R/'src';web=R/'site';web.mkdir(exist_ok=True)
html=(S/'index.template.html').read_text()
html=html.replace('/*CSS*/',(S/'styles.css').read_text())
html=html.replace('/*MODEL*/',base64.b64encode((R/'assets/arucon-tsundere-motion.glb').read_bytes()).decode())
scripts=['config.js','engine.js','renderer.js','room-scene.js','pet-asset.js','navigation.js','motion-config.js','room-actor.js','session.js','mobile.js','app.js']
html=html.replace('<!--SCRIPTS-->','\n'.join('<script>\n'+(S/p).read_text()+'\n</script>' for p in scripts))
standalone=html.replace('<!--PWA-HEAD-->','')
(R/'arucon-mobile-check.html').write_text(standalone)
# Baseline regression runner expects this filename; not a separate product version.
(R/'arucon-life-room.html').write_text(standalone)
head='<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icons/apple-touch-icon.png"><link rel="icon" href="./icons/icon-192.png">'
(web/'index.html').write_text(html.replace('<!--PWA-HEAD-->',head))
manifest={'id':'./','name':'아루콘 · 휴대폰 체험','short_name':'아루콘','lang':'ko','description':'아기 아루콘 생활·터치 검증판. 실제 건강정보를 읽지 않습니다.','start_url':'./','scope':'./','display':'standalone','background_color':'#eee9dc','theme_color':'#ece7db','icons':[{'src':'icons/icon-192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'icons/icon-512.png','sizes':'512x512','type':'image/png','purpose':'any'},{'src':'icons/icon-maskable.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
(web/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
if (R/'assets/icons').exists():shutil.copytree(R/'assets/icons',web/'icons',dirs_exist_ok=True)
digest=hashlib.sha256()
for p in [web/'index.html',web/'manifest.webmanifest',*sorted((web/'icons').glob('*.png'))]:
 digest.update(p.relative_to(web).as_posix().encode());digest.update(p.read_bytes())
version=digest.hexdigest()[:12]
sw=(S/'sw.template.js').read_text().replace('__BUILD_HASH__',version)
(web/'sw.js').write_text(sw)
(web/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(web/'_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/index.html\n  Cache-Control: no-cache\n/sw.js\n  Cache-Control: no-cache\n')
print(json.dumps({'buildHash':version,'htmlBytes':len(standalone.encode()),'outputs':['arucon-mobile-check.html','site/index.html','site/manifest.webmanifest','site/sw.js']},ensure_ascii=False))

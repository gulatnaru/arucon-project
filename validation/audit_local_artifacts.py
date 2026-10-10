"""Read-only project artifact inventory. No deletion, compression or uploads."""
from pathlib import Path
import argparse,json,shutil
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path.cwd());parser.add_argument('--require-free-gib',type=float,default=0);args=parser.parse_args()
root=args.root.resolve();categories={};largest=[]
protected={'.db','.sqlite','.sqlite3','.mp4','.mov','.png','.jpg','.jpeg','.blend','.glb'}
for directory in ['evidence','.tools','mobile/ios','mobile/android','mobile/node_modules']:
 path=root/directory
 if not path.exists():continue
 for f in path.rglob('*'):
  try:
   if not f.is_file() or f.is_symlink():continue
   size=f.stat().st_size;relative=str(f.relative_to(root));suffix=f.suffix.lower()
   kind='media_preserve' if suffix in {'.mp4','.mov','.png','.jpg','.jpeg'} else 'database_preserve' if suffix in {'.db','.sqlite','.sqlite3'} else 'art_source_preserve' if suffix in {'.blend','.glb'} else 'tools_or_models_preserve' if directory=='.tools' or '/model-cache/'in relative or '/ai-venv/'in relative or suffix in {'.tflite','.bin','.task','.litertlm'} else 'reproducible_build' if any(x in relative for x in ['DerivedData/','/Build/','/build/','node_modules/','/Pods/']) or suffix in {'.o','.a','.hbc','.pcm','.pch','.swiftmodule'} else 'logs_or_other_preserve'
   categories[kind]=categories.get(kind,0)+size;largest.append({'path':relative,'bytes':size,'category':kind,'protected':suffix in protected})
  except OSError:continue
free=shutil.disk_usage(root).free;report={'schemaVersion':1,'root':str(root),'freeBytes':free,'requireFreeGiB':args.require_free_gib,'preflightPass':free>=args.require_free_gib*1024**3,'categoriesBytes':categories,'largest':sorted(largest,key=lambda x:x['bytes'],reverse=True)[:20],'action':'READ_ONLY_NO_DELETION','scope':'Project files only; APFS clones/compression/swap and other apps are not attributed to this inventory.'}
print(json.dumps(report,indent=2));raise SystemExit(0 if report['preflightPass'] else 2)

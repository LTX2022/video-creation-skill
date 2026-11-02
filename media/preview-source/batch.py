from pathlib import Path
import json,subprocess,concurrent.futures,time
# Refuse overwriting prior work; render only in the explicitly prepared empty workspace.
output=Path('output')
if not output.is_dir() or any(output.iterdir()):
 raise SystemExit('Create an empty output directory before running; existing outputs are never overwritten.')
for prior in ('batch-results.json','concat.txt','60-styles-noto-overview.mp4'):
 if Path(prior).exists():raise SystemExit('Refusing to overwrite existing artifact: '+prior)
items=json.loads(Path('index.json').read_text())
def one(i):
 while Path("PAUSE").exists():time.sleep(1)
 t=time.monotonic(); cmd=['python','raster.py',i['id'],str(i['number']),i['nameZh'],str(i['durationSec'])]
 with open('output/'+i['id']+'.log','w') as f:q=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
 print(i['id'],q.returncode,round(time.monotonic()-t,1),flush=True)
 return {'id':i['id'],'returncode':q.returncode}
with concurrent.futures.ThreadPoolExecutor(4) as pool:results=list(pool.map(one,items))
Path('batch-results.json').write_text(json.dumps(results,indent=2))
if any(x['returncode'] for x in results):raise SystemExit(1)
Path('concat.txt').write_text(''.join("file 'output/"+i['id']+".mp4'\n" for i in items))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','concat.txt','-c','copy','-movflags','+faststart','60-styles-noto-overview.mp4'],check=True)

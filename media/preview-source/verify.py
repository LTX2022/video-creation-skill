from pathlib import Path
import json,hashlib,subprocess,concurrent.futures
from PIL import Image,ImageDraw,ImageFont
r=Path('.');p=r/'60-styles-noto-overview.mp4'; index=json.loads((r/'index.json').read_text())
q=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames','-of','json',str(p)],capture_output=True,text=True,check=True);probe=json.loads(q.stdout)
d=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True)
(r/'decode.log').write_text(d.stderr)
assert d.returncode==0 and d.stderr=='',d.stderr
assert probe['streams'][0]['nb_frames']=='11520' and probe['format']['duration']=='384.000000',probe
out=r/'qa';out.mkdir(exist_ok=True)
def shot(i):
 target=out/(i['id']+'.png');t=i['startSec']+i['durationSec']*.6
 subprocess.run(['ffmpeg','-v','error','-threads','1','-ss',str(t),'-i',str(p),'-frames:v','1','-threads','1','-y',str(target)],check=True)
 return target
with concurrent.futures.ThreadPoolExecutor(4) as pool:paths=list(pool.map(shot,index))
font=ImageFont.truetype('fonts/NotoSansCJK-Regular.ttc',16)
for page in range(4):
 subset=paths[page*15:(page+1)*15];im=Image.new('RGB',(960,660),'#ffffff');dr=ImageDraw.Draw(im)
 for j,path in enumerate(subset):
  x=j%3*320;y=j//3*132;f=Image.open(path);f.thumbnail((320,110));im.paste(f,(x,y));dr.text((x+3,y+110),index[page*15+j]['id'],font=font,fill='#111111')
 im.save(out/f'contact-{page+1}.jpg')
source=[]
for p2 in sorted(Path('src/video').rglob('*')):
 if p2.is_file():source.append({'path':str(p2),'sha256':hashlib.sha256(p2.read_bytes()).hexdigest()})
(r/'source-hashes.json').write_text(json.dumps(source,indent=2))
record={'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'probe':probe,'full_decode_exit':d.returncode,'full_decode_stderr_bytes':len(d.stderr),'sampled_frames':60,'sample_fraction_within_each_segment':.6,'source_asset_guard':'Each SVG rejected image/foreignObject/script/href/src/@import; all font-family forced Noto Sans CJK SC','engine':'React SSR -> librsvg/Cairo -> FFmpeg, not Remotion browser','font_manifest':'font-manifest.json','source_manifest':'source-hashes.json','visual_review':'contact sheets pending model inspection; not real-time human playback'}
(r/'verification.json').write_text(json.dumps(record,indent=2));print(json.dumps(record,indent=2))

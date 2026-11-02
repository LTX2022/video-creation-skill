#!/usr/bin/env python3
from pathlib import Path
import subprocess,json,hashlib,argparse
from PIL import Image
ap=argparse.ArgumentParser(description='验证指定产物目录，不渲染视频。')
ap.add_argument('--artifact-dir',required=True,type=Path)
R=ap.parse_args().artifact_dir.resolve();v=R/'semantic-cache-boundary.mp4'
if not v.is_file(): ap.error(f'找不到视频：{v}')
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(v)]))
p=subprocess.Popen(['ffmpeg','-v','error','-i',str(v),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
h=[];size=1280*720*3
while True:
 b=p.stdout.read(size)
 if not b:break
 assert len(b)==size
 h.append(hashlib.sha256(b).hexdigest())
assert p.wait()==0 and len(h)==420
seek={}
for i in [419,0,210,89,299,150,209,300]:
 b=subprocess.check_output(['ffmpeg','-v','error','-ss',f'{i/30:.9f}','-i',str(v),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'])
 seek[str(i)]=hashlib.sha256(b).hexdigest()==h[i]
assert all(seek.values()),seek
alpha=Image.open(R/'foreground-alpha.png').getchannel('A')
report={'ffprobe':probe,'full_decode_frames':len(h),'full_decode_success':True,'unique_decoded_frames':len(set(h)),'adjacent_identical_decoded_frames':sum(a==b for a,b in zip(h,h[1:])),'random_access_matches_sequential_decode':seek,'png_alpha_extrema':alpha.getextrema(),'alpha_video_tested':False}
(R/'decode-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='ffprobe'},indent=2))

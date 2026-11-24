"""Decode the shipped candidate and verify the principal visible timeline."""
import hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
p=Path(sys.argv[1])
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]))
s,=probe['streams']
assert (s['codec_name'],s['width'],s['height'],s['avg_frame_rate'],int(s['nb_read_frames']))==('h264',1080,608,'24/1',132)
assert float(probe['format']['duration'])==5.5
pix=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(p),'-map','0:v:0','-vf','scale=540:304','-pix_fmt','rgb24','-f','rawvideo','-'])
arr=np.frombuffer(pix,np.uint8).reshape(132,304,540,3).astype(np.int16)
# Central ROI excludes the brass annulus; the teal surface contrasts with
# neutral blades. A later bright band lies within its already exposed area.
Y,X=np.ogrid[:304,:540]
roi=(X-292)**2+(Y-150)**2<63**2
g,b,r=arr[...,1],arr[...,2],arr[...,0]
teal=((g-r)>14)&((b-g)<9)&((b-r)>12)&roi
fr=(0,22,30,48,65,68,72,87,102,131)
area=lambda f:int(teal[f].sum())
center=(X-291)**2+(Y-147)**2<49**2
peak=lambda f:float(np.quantile(g[f][center],.996))
assert area(65)>7*area(22)
assert .67<area(68)/area(87)<1.15
assert peak(87)>peak(68)+12
assert float(np.abs(arr[131]-arr[108]).mean())<.25
print(json.dumps({'video_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'frames':132,'size':[1080,608],'fps':24,'duration_s':5.5,'samples':{f:{'exposed_teal_pixels':area(f),'center_peak_G':peak(f)} for f in fr},'final_hold_mean_108_to_131':float(np.abs(arr[131]-arr[108]).mean())},indent=2))

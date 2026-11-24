import json,os,subprocess,hashlib
from pathlib import Path
from state import *
ROOT=Path(__file__).resolve().parent
video=ROOT/'output/product-flow-15s-zh.mp4'
r=json.loads(subprocess.check_output([os.environ.get('FIRST_VIDEO_FFPROBE','ffprobe'),'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(video)]))
assert len(r['streams'])==1
s=r['streams'][0]
assert s['codec_type']=='video' and s['width']==1920 and s['height']==1080
assert s['r_frame_rate']==s['avg_frame_rate']=='30/1' and int(s['nb_read_frames'])==450
assert float(r['format']['duration'])==15
pts=json.loads(subprocess.check_output([os.environ.get('FIRST_VIDEO_FFPROBE','ffprobe'),'-v','error','-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))
times=[float(x['best_effort_timestamp_time']) for x in pts['frames']]
assert len(times)==450 and all(abs(t-f/30)<0.000001 for f,t in enumerate(times))
subprocess.run([os.environ.get('FIRST_VIDEO_FFMPEG','ffmpeg'),'-v','error','-i',str(video),'-f','null','-'],check=True)
states=json.loads((ROOT/'output/states.json').read_text())
assert states==[state(f) for f in range(FRAMES)]
hashes={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['state.py','render.py','verify.py','test_state.py','output/product-flow-15s-zh.mp4','output/states.json']}
out={'status':'technical-checks-pass','resolution':[1920,1080],'frames':450,'fps':30,'duration_seconds':15,
     'audio_streams':0,'frame_pts_match':True,'states_match_current_source':True,'hashes':hashes,
     'scope':'native offline original demonstration, not Remotion production or user visual acceptance'}
(ROOT/'output/verification.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))

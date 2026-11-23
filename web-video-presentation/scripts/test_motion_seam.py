"""Original same-endpoint seam and velocity check in decoded pixel space."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json,subprocess

W,H,FPS=160,80,30
ORB=bytes((96,232,196)); DARK=bytes((12,22,40))
def ff(args, data=None):
    p=subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-xerror",*args],input=data,check=True,capture_output=True)
    return p.stdout

def render(positions,out):
    raw=b"".join(b"".join(DARK*(x-4)+ORB*9+DARK*(W-x-5) if 33<=y<42 else DARK*W for y in range(H)) for x in positions)
    ff(["-f","rawvideo","-pix_fmt","rgb24","-video_size",f"{W}x{H}","-framerate",str(FPS),"-i","-",
        "-an","-c:v","ffv1","-pix_fmt","bgr0",str(out)],raw)

def decode(src):
    raw=ff(["-i",str(src),"-map","0:v:0","-pix_fmt","rgb24","-threads","1","-f","rawvideo","-"])
    size=W*H*3
    assert len(raw)%size==0
    frames=[raw[i:i+size] for i in range(0,len(raw),size)]
    idxs=range(0,W*3,3)
    centers=[]
    for frame in frames:
        line=frame[37*W*3:38*W*3]
        branded=[i//3 for i in idxs if line[i:i+3]==ORB]
        assert len(branded)==9
        centers.append(sum(branded)/9)
    return frames,centers

def check(a,b):
    frames_a,centers_a=a; frames_b,centers_b=b
    incoming=centers_a[-1]-centers_a[-2]
    outgoing=centers_b[1]-centers_b[0]
    seam=frames_a[-1]==frames_b[0]
    return dict(same_decoded_boundary=seam,incoming_x_px_per_frame=incoming,outgoing_x_px_per_frame=outgoing,
      passes_at_one_px_per_frame=seam and abs(incoming-outgoing)<=1)

with TemporaryDirectory() as tmp:
    src={}
    for name,series in dict(left=[72,76,80],correct=[80,84,88],wrong_velocity=[80,90,100],wrong_position=[82,86,90]).items():
        p=Path(tmp)/f"{name}.mkv"
        render(series,p); src[name]=decode(p)
    results={k:check(src["left"],src[k]) for k in ("correct","wrong_velocity","wrong_position")}
    assert results["correct"]["passes_at_one_px_per_frame"]
    assert not results["wrong_velocity"]["passes_at_one_px_per_frame"]
    assert results["wrong_velocity"]["same_decoded_boundary"]
    assert not results["wrong_position"]["same_decoded_boundary"]
    assert not results["wrong_position"]["passes_at_one_px_per_frame"]
    print(json.dumps({"scope":"three-frame original fixtures, not upstream playback","fps":FPS,
       "threshold_px_per_frame":1, "results":results},indent=2))

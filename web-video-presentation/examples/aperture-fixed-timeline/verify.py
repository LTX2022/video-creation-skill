#!/usr/bin/env python3
"""Verify timeline behavior, frame random access and the actual encoded shot."""
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
import render


LED = ((77, 436), (183, 436), (289, 436))
WINDOW = (0, 30, 45, 53, 61, 74, 89, 107, 113, 131)


def require(cond, error):
    if not cond:
        raise AssertionError(error)


def fingerprint(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def signals(rgb):
    return [float(rgb[y-1:y+2,x-1:x+2,0].mean()) for x,y in LED]


def score(frames):
    b=np.asarray(frames[0],dtype=np.float32)
    base=np.array(signals(b))
    expected={45:[True,False,False],53:[True,True,False],61:[True,True,True]}
    found={}
    for f,v in expected.items():
        changed=(np.array(signals(np.asarray(frames[f]))) - base > 40).tolist()
        require(changed==v, f"out-of-order or serial readouts at F{f}: {changed} != {v}")
        found[f]=changed
    # During the stagger, less than half of the shot has elapsed and the lens is still moving.
    a,j=np.array(frames[45],dtype=np.float32),np.array(frames[61],dtype=np.float32)
    eye=(slice(151,352),slice(596,797))
    require(np.abs(a[eye]-j[eye]).mean()>1.6,"lens did not align during stagger")
    # Terminal annulus illumination should materially change rather than merely change the footer.
    a,j=np.array(frames[89],dtype=np.float32),np.array(frames[113],dtype=np.float32)
    ring=(slice(65,430),slice(506,888))
    require(np.abs(a[ring]-j[ring]).mean()>.6,"no visible lens lock")
    a,j=np.array(frames[113],dtype=np.float32),np.array(frames[131],dtype=np.float32)
    require(np.abs(a-j).mean()<.55,"terminal hold did not settle")
    # Anchored registration marks are not transformed alongside the lens.
    roi=(slice(480,496),slice(62,110))
    require(np.abs(a[roi]-b[roi]).mean()<1.4,"protected footer registration moved")
    return found


def verify(path):
    ordered={n:fingerprint(render.draw_frame(n)) for n in WINDOW}
    disorder=(131,45,0,107,113,53,45,89,30,61,74)
    require(all(fingerprint(render.draw_frame(n))==ordered[n] for n in disorder),"non-sequential frame sampling differs")
    require(ordered[113]==ordered[131],"source hold is not perfectly static")
    require(render.pose(45)["align"]<1 and render.pose(45)["readouts"][0]>0,"lost deliberate overlap")
    require(render.pose(89)["lock"]==0 and min(render.pose(89)["readouts"])==1,"lock must follow completed readouts")
    wrong=[]
    for mode in ("serial","reverse-stagger"):
        try:
            score({n:render.draw_frame(n,mode) for n in WINDOW})
        except AssertionError as e:
            require("out-of-order or serial" in str(e),f"negative control failed for wrong reason: {e}")
            wrong.append([mode,str(e)])
        else:
            raise AssertionError(f"negative control incorrectly accepted: {mode}")
    p=subprocess.run(["ffprobe","-v","error","-show_streams","-show_frames","-show_entries","stream=codec_name,width,height,pix_fmt,time_base,codec_type:frame=pts","-of","json",str(path)],check=True,capture_output=True)
    meta=json.loads(p.stdout)
    streams=meta["streams"]
    want={"codec_name":"h264","codec_type":"video","width":render.W,"height":render.H,"pix_fmt":"yuv420p"}
    require(len(streams)==1 and all(streams[0].get(k)==v for k,v in want.items()),"unexpected stream profile")
    time_base=Fraction(streams[0]["time_base"])
    require(len(meta["frames"])==render.COUNT and all(Fraction(x["pts"])*time_base==Fraction(j,render.FPS) for j,x in enumerate(meta["frames"])),"missing frames or incorrect PTS")
    frames={}
    size=render.W*render.H*3
    with subprocess.Popen(["ffmpeg","-nostdin","-v","error","-xerror","-i",str(path),"-f","rawvideo","-pix_fmt","rgb24","-threads","1","-"],stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as p:
        for n in range(render.COUNT):
            data=p.stdout.read(size)
            require(len(data)==size,f"missing decoded RGB frame {n}")
            if n in WINDOW:
                frames[n]=np.frombuffer(data,np.uint8).reshape(render.H,render.W,3)
        require(not p.stdout.read(1) and p.wait()==0,"extra frames or decode failure")
    found=score(frames)
    return {"frames":render.COUNT,"fps":render.FPS,"seconds":render.COUNT/render.FPS,"pts_exact":True,
            "labeled_starts":render.LABELS,"led_transition_samples":found,
            "nonsequential_exact_rgb":len(disorder),"negative_controls":wrong,
            "mp4_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
            "decoded_samples":[n for n in WINDOW]}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("clip",type=Path)
    args=p.parse_args()
    print(json.dumps(verify(args.clip),indent=2))


if __name__=="__main__":
    main()

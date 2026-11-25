#!/usr/bin/env python3
"""Check geometry *and* named identity on actual decoded Edit Desk frames."""
import argparse
from fractions import Fraction
import hashlib
from itertools import combinations
import json
import math
from pathlib import Path
import subprocess

from PIL import Image
import render

# Intent is fixed by the handoff brief; don't derive it from renderer ordering.
EXPECTED={0:("atlas","kestrel","oriole"),30:("atlas","kestrel","oriole"),
          99:("kestrel","oriole","atlas"),131:("kestrel","oriole","atlas")}
EXPECTED_COLOR={"atlas":(175,228,198),"kestrel":(253,172,133),"oriole":(205,192,252)}
REGIONS=((64,295),(364,595),(664,895))
FRAMES=(0,30,67,99,131)
CAPTION_SAMPLES=tuple(range(43,57))+(67,85)
CAPTION_BOX=(460,65,630,87)
HANDOFF=((537,183),(309,349),(609,349))


class IdentityError(AssertionError):
    pass


def ensure(cond, desc):
    if not cond:
        raise AssertionError(desc)


def patches(frame, x, y):
    # Card coordinates relative to its center. Left badge (+25,+25) and
    # uniform color near right edge (+208,+27) identify independent marks.
    x,y=int(round(x)),int(round(y))
    solid=[frame.getpixel((i,j)) for i in range(x+90,x+95) for j in range(y-46,y-41)]
    color=tuple(sum(p[k] for p in solid)/len(solid) for k in range(3))
    badge=[[int(sum(frame.getpixel((x-91+dx,y-46+dy)))>360)
            for dx in range(-6,7)] for dy in range(-6,7)]
    return color,badge


def identify(frame,x,y):
    color,badge=patches(frame,x,y)
    dist=lambda k: sum((a-b)**2 for a,b in zip(color,EXPECTED_COLOR[k]))
    candidate=min(EXPECTED_COLOR,key=dist)
    ensure(dist(candidate)<30**2, f"no identifiable card at {(x,y)}, color {color}")
    # Independent symbol templates in badge coordinates, with ±1 px registration
    # tolerance for subpixel placement and video coding. Distinct from art colors.
    def template(k,a,b):
        if k=="atlas":
            return a*a+b*b<=25
        if k=="kestrel":
            return -6<=b<=5 and abs(a)<=(b+6)*6/11
        return abs(a)<=5 and abs(b)<=5
    def mismatch(k):
        return min(sum(int(bool(badge[v+6][u+6])!=template(k,u-dx,v-dy))
                       for u in range(-6,7) for v in range(-6,7))
                   for dx in (-1,0,1) for dy in (-1,0,1))
    shape=min(EXPECTED_COLOR,key=mismatch)
    ensure(shape==candidate and mismatch(shape)<25,f"badge/art mismatch at {(x,y)}: {shape}/{candidate}")
    return candidate


def occupancy(frame):
    # A scan through the common paper footer, below all typography. The
    # acceptance target is deliberately independent of identity and hue.
    hits=[x for x in range(frame.width) if min(frame.getpixel((x,407)))>170]
    runs=[]
    for x in hits:
        if runs and runs[-1][1]==x-1:
            runs[-1][1]=x
        else:
            runs.append([x,x])
    return [z for z in runs if z[1]-z[0]>200]


def decode(path, retain=FRAMES):
    p=subprocess.run(["ffprobe","-v","error","-show_streams","-show_frames","-show_entries",
                      "stream=codec_name,width,height,pix_fmt,time_base,codec_type:frame=pts",
                      "-of","json",str(path)],check=True,capture_output=True)
    meta=json.loads(p.stdout)
    streams=meta["streams"]
    want={"codec_name":"h264","codec_type":"video","width":960,"height":540,"pix_fmt":"yuv420p"}
    ensure(len(streams)==1 and all(streams[0].get(k)==v for k,v in want.items()),"unexpected stream profile")
    time_base=Fraction(streams[0]["time_base"])
    ensure(len(meta["frames"])==132 and all(Fraction(x["pts"])*time_base==Fraction(j,24)
           for j,x in enumerate(meta["frames"])),"missing frames or incorrect PTS")
    frames={}
    size=960*540*3
    with subprocess.Popen(["ffmpeg","-nostdin","-v","error","-xerror","-i",str(path),"-f","rawvideo","-pix_fmt","rgb24","-threads","1","-"],stdout=subprocess.PIPE) as p:
        for n in range(132):
            data=p.stdout.read(size)
            ensure(len(data)==size,f"missing decoded RGB frame {n}")
            if n in retain:
                frames[n]=Image.frombytes("RGB",(960,540),data)
        ensure(not p.stdout.read(1) and p.wait()==0,"extra frames or decode failure")
    return frames


def cards_at_endpoints(frames):
    layout={}
    for f in EXPECTED:
        bounds=occupancy(frames[f])
        ensure(len(bounds)==len(REGIONS) and all(abs(k-v)<=4 for box,trg in zip(bounds,REGIONS)
                   for k,v in zip(box,trg)),f"invalid row occupancy at {f}: {bounds}")
        layout[f]=bounds
    return layout


def evaluate_identity(frames):
    states={}
    for f,target in EXPECTED.items():
        got=tuple(identify(frames[f],x,341) for x in (180,480,780))
        if got!=target:
            raise IdentityError(f"F{f} geometry passes but slot IDs {got} != intended {target}")
        states[f]=got
    return states


def verify(candidate,control=None):
    frames=decode(candidate,FRAMES+CAPTION_SAMPLES)
    # In the original, Atlas covered this phase caption near F45–55. Compare
    # the actual decoded region across every frame of that obstruction window.
    ref=frames[67].crop(CAPTION_BOX)
    samples=ref.tobytes()
    ensure(sum(1 for i in range(0,len(samples),3) if sum(samples[i:i+3])>330)>100,"clearance caption absent")
    for n in CAPTION_SAMPLES:
        seq=frames[n].crop(CAPTION_BOX).tobytes()
        mae=sum(abs(a-b) for a,b in zip(samples,seq))/len(samples)
        ensure(mae<2.5,f"clearance caption obstructed or unstable at F{n}: {mae:.2f} MAE")
    bounds=cards_at_endpoints(frames)
    result=evaluate_identity(frames)
    ensure(tuple(identify(frames[67],x,y) for x,y in HANDOFF)==("atlas","kestrel","oriole"),
           "card identity lost during the clearance transform")
    for f in range(132):
        positions={k:render.position(k,f) for k in render.START}
        for a,b in combinations(positions.values(),2):
            ensure(abs(a[0]-b[0])>=232 or abs(a[1]-b[1])>=142,f"colliding artwork rectangles F{f}")
    observed=None
    terminal_control=None
    if control is not None:
        wrong=decode(control,tuple(EXPECTED))
        cb=cards_at_endpoints(wrong)
        ensure(all(abs(k-v)<=1 for f in bounds for box,trg in zip(bounds[f],cb[f])
                   for k,v in zip(box,trg)),"negative control altered geometry")
        terminal_control=tuple(identify(wrong[131],x,341) for x in (180,480,780))
        try:
            evaluate_identity(wrong)
        except IdentityError as e:
            observed=str(e)
        else:
            raise AssertionError("decoded wrong-ID control incorrectly passed")
    def fp(f):
        return hashlib.sha256(render.frame_image(f).tobytes()).hexdigest()
    expected={f:fp(f) for f in sorted(FRAMES)}
    ensure(all(fp(f)==expected[f] for f in (131,67,0,99,30,67,131)),"request order affected authored RGB")
    ensure(expected[99]==expected[131],"hold changed after F99")
    return {"frames":132,"fps":24,"seconds":5.5,"profile":"960x540 H.264/yuv420p, silent",
            "occupancy":bounds,"identities":result,"mid_frame":67,"clearance_badges_pass":True,"caption_unobstructed_samples":list(CAPTION_SAMPLES),
            "static_hold":True,"shuffled_frames_same_rgb":True,
            "mp4_sha256":hashlib.sha256(candidate.read_bytes()).hexdigest(),
            "reversed_enumeration":None if control is None else
            {"mp4_sha256":hashlib.sha256(control.read_bytes()).hexdigest(),
             "geometry_unchanged":True,"actual_decoded_terminal_ids":terminal_control,"rejected":observed}}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate",type=Path)
    parser.add_argument("--control",type=Path)
    args=parser.parse_args()
    print(json.dumps(verify(args.candidate,args.control),indent=2))


if __name__=="__main__":
    main()

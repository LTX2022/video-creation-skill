#!/usr/bin/env python3
"""APERTURE 04: fixed-frame product motion (original art, no GSAP runtime)."""
import argparse
from functools import lru_cache
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, COUNT, AA = 960, 540, 24, 132, 2
LABELS = {"expose": 4, "align": 23, "read": 53, "lock": 89, "hold": 113}


def clamp(x):
    return min(1., max(0., x))


def cue(frame, label, span, *, offset=0, ease="out"):
    p = clamp((frame - LABELS[label] - offset) / span)
    if ease == "inout":
        return p * p * (3 - 2 * p)
    if ease == "out":
        return 1 - (1-p)**3
    if ease == "linear":
        return p
    raise ValueError(ease)


def pose(frame, control="good"):
    if not 0 <= frame < COUNT:
        raise ValueError("frame outside shot")
    order = (2, 1, 0) if control == "reverse-stagger" else (0, 1, 2)
    offset = 18 if control == "serial" else -12
    return {
        "reveal": cue(frame, "expose", 26),
        "align": cue(frame, "align", 42, ease="inout"),
        "readouts": tuple(cue(frame, "read", 17, offset=offset + 8*i) for i in order),
        "lock": cue(frame, "lock", 24, ease="inout"),
    }


def xy(seq):
    return tuple(round(v*AA) for v in seq)


def mix(a, b, p):
    return tuple(round(x+(y-x)*p) for x,y in zip(a,b))


INK = (10, 14, 25)
MUTED = (119, 142, 166)
ICE = (184, 225, 244)
CORAL = (255, 128, 100)
WHITE = (237, 245, 252)


@lru_cache(maxsize=None)
def font(size):
    return ImageFont.load_default(size=size*AA)


def type_at(d, p, s, size, fill=WHITE):
    d.text(xy(p), s, font=font(size), fill=fill, anchor="lt")


def letterspace(d, p, s, size, fill=WHITE, spacing=2.7):
    x,y = p
    f = font(size)
    for c in s:
        d.text(xy((x,y)), c, fill=fill, font=f, anchor="lt")
        x += f.getlength(c)/AA+spacing


def rr(d, box, r, **kw):
    d.rounded_rectangle(xy(box), r*AA, **kw)


def line(d, points, fill, width=1):
    d.line([xy(p) for p in points], fill=fill, width=width*AA)


def circ(d, x, y, r, **kw):
    d.ellipse(xy((x-r,y-r,x+r,y+r)), **kw)


@lru_cache(maxsize=1)
def plate():
    y,x = np.ogrid[:H*AA,:W*AA]
    x,y=x/AA,y/AA
    pool=np.exp(-((x-731)/400)**2-((y-236)/285)**2)
    warm=np.exp(-((x-779)/280)**2-((y-490)/185)**2)
    shade=np.array([8,12,22.])+pool[...,None]*[13,20,33]+warm[...,None]*[17,4,3]
    noise=((np.indices((H*AA,W*AA), sparse=True)[0]*67+np.indices((H*AA,W*AA), sparse=True)[1]*131)%41-20)*.11
    return Image.fromarray(np.uint8(np.clip(shade+noise[...,None],0,255)))


@lru_cache(maxsize=1)
def lens():
    d=354*AA
    y,x=np.ogrid[:d,:d]
    x,y=(x-d/2+.5)/AA,(y-d/2+.5)/AA
    r=(x*x+y*y)**.5
    a=np.arctan2(y,x)
    sheen=.55+.3*np.cos(a+1.74)+.14*np.cos(2*a+.48)
    fine=(1+np.sin(r*12.0))*.8
    rgb=np.zeros((d,d,3),np.float32)
    rgb[:]=[4,8,14]
    # Alternating bevels. One circumferential light source, not flat concentric outlines.
    for lo,hi,base,spread in [
        (151,167,(15,20,31),(15,23,38)), (151,154,(35,48,61),(39,58,74)),
        (154,158,(8,12,22),(16,24,38)), (159,161,(54,62,75),(51,61,78)),
        (161,165,(32,40,53),(74,90,105)), (165,168,(9,13,22),(70,85,105)),
        (131,149,(19,26,36),(22,38,54)), (128,132,(36,48,58),(51,64,80)),
        (123,128,(8,13,21),(20,34,49)), (117,123,(23,28,37),(57,69,80)),
        (111,117,(6,11,19),(13,22,37)),
    ]:
        m=(r>=lo)&(r<hi)
        rgb[m]=np.array(base)+sheen[m,None]*spread+fine[m,None]
    glass=np.exp(-((x+18)/128)**2-((y+43)/95)**2)
    g=r<111
    rgb[g]=np.array([7,12,24])+glass[g,None]*[14,29,53]
    ellipse=((x+24)/81)**2+((y+29)/28)**2
    glare=np.exp(-ellipse*3.2)
    rgb[g]+=glare[g,None]*[17,30,49]
    shadow=np.exp(-((x+3)/159)**2-((y-25)/154)**2)
    rgb[r>=168]=[2,3,7]
    alpha=np.where(r<168,255,np.minimum(27,shadow*91)).astype(np.uint8)
    return Image.fromarray(np.dstack((np.uint8(np.clip(rgb,0,255)),alpha)))


def draw_frame(frame, control="good"):
    s=pose(frame,control)
    img=plate().copy()
    d=ImageDraw.Draw(img)
    for x in (46,914):
        for y in (47,493):
            h=1 if x==46 else -1
            v=1 if y==47 else -1
            line(d,((x+9*h,y),(x,y),(x,y+9*v)),(64,81,104))
    line(d,((63,74),(896,74)),(52,65,84))
    line(d,((63,463),(896,463)),(52,65,84))
    letterspace(d,(65,53),"HELION INSTRUMENTS",12,ICE,2.9)
    letterspace(d,(766,53),"OPTICS LAB / 04",12,MUTED,2)
    fades=s["reveal"]
    letterspace(d,(67,150),"FIELD CALIBRATION",13,mix(INK,CORAL,fades),3.3)
    type_at(d,(63,181),"Aperture",72,mix(INK,WHITE,fades))
    type_at(d,(65,261),"04",70,mix(INK,ICE,fades))
    type_at(d,(69,352),"Align. Measure. Lock.",17,mix(INK,(178,197,219),fades))
    line(d,((69,388),(362,388)),(57,73,95))
    letterspace(d,(69,400),"OPTICAL CONTROL MODULE",12,MUTED,1.9)
    # Reference datum is fixed; authored frame time only drives mobile components.
    cx,cy=696,252
    for j in range(72):
        a=2*np.pi*j/72-np.pi/2
        r=184 if j%6==0 else 181
        c=CORAL if j%18==0 else (99,123,148) if j%6==0 else (59,78,103)
        line(d,((cx+np.cos(a)*r,cy+np.sin(a)*r),(cx+np.cos(a)*190,cy+np.sin(a)*190)),c)
    letterspace(d,(476,246),"A",11,MUTED)
    letterspace(d,(902,246),"B",11,MUTED)
    # The shell travels 18px toward its calibrated datum; iris follows an eased track.
    ax=cx+(1-s["align"])*18
    ay=cy+(1-s["align"])*7
    img.paste(lens(),xy((ax-177,ay-177)),lens())
    d=ImageDraw.Draw(img)
    theta=-.35+(1-s["align"])*1.30
    for i in range(8):
        turn=i*2*np.pi/8+theta
        polar=[(105,.0),(104,.75),(70,.94),(45,.8),(40,.46),(65,.19)]
        pts=[(ax+rrr*np.cos(turn+a),ay+rrr*np.sin(turn+a)) for rrr,a in polar]
        hi=.5+.5*np.cos(turn+2.1)
        d.polygon([xy(p) for p in pts],fill=mix((11,22,43),(42,73,102),hi))
        line(d,pts[:4],mix((21,38,70),(91,124,152),hi))
    r=30+11*s["align"]
    circ(d,ax,ay,r,fill=(7,17,28),outline=(55,117,146),width=AA)
    circ(d,ax,ay,r-6,fill=(10,31,48),outline=(30,69,102),width=AA)
    line(d,((ax-10,ay),(ax+10,ay)),(157,215,235))
    line(d,((ax,ay-10),(ax,ay+10)),(157,215,235))
    lock=s["lock"]
    if lock > 0:
        # An acquisition ring completes into four short fiducials, not an endlessly cycling glow.
        def arc(rad, start, end, fill, width=1):
            d.arc(xy((cx-rad,cy-rad,cx+rad,cy+rad)),start,end,fill=fill,width=width*AA)
        reach=3+66*lock
        for a in (-90,0,90,180):
            arc(176,a+3,a+reach,mix((22,39,64),ICE,lock),2)
        breathe=np.sin(np.pi*lock)*.82+lock*.18
        circ(d,ax,ay,r+7,outline=mix((27,51,75),(201,236,255),breathe),width=AA)
        circ(d,ax,ay,3,fill=mix((35,79,104),CORAL,lock))
    for a in (0, np.pi/2, np.pi, np.pi*1.5):
        xx, yy=cx+171*np.cos(a),cy+171*np.sin(a)
        circ(d,xx,yy,2.7,fill=mix((78,107,130),CORAL,s["lock"]))
    # Readout transforms use a grouped 8-frame stagger, not three one-off delays.
    for index,(label,val) in enumerate(zip(("AXIS","PHASE","GAIN"),("0.00°","+0.03","1.00x"))):
        p=s["readouts"][index]; x=66+106*index
        color=mix((51,64,83),ICE,p)
        rr(d,(x,423,x+92,449),5,fill=(20,29,42),outline=(62,79,98),width=AA)
        circ(d,x+11,436,3,fill=mix((73,87,104),CORAL,p))
        label_or_val = val if p>.72 else label
        type_at(d,(x+22,431),label_or_val,13,color)
    line(d,((638,486),(663,486)),mix((56,70,86),CORAL,s["lock"]),2)
    letterspace(d,(674,480),"LOCK CONFIRMED" if s["lock"]==1 else "TRACK IN PROGRESS",12,mix(MUTED,WHITE,s["lock"]),2.4)
    type_at(d,(65,481),"A/04",12,MUTED)
    type_at(d,(858,481),"/ 001",12,MUTED)
    return img.resize((W,H),Image.Resampling.LANCZOS)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("directory", type=Path, help="new render directory")
    p.add_argument("--frame", type=int, help="write one frame to PNG instead of MP4")
    args=p.parse_args()
    if args.frame is not None and not 0<=args.frame<COUNT:
        p.error(f"frame must be 0–{COUNT-1}")
    ff=shutil.which("ffmpeg")
    if args.frame is None and not ff:
        p.error("ffmpeg with libx264 is required")
    args.directory.mkdir()
    if args.frame is not None:
        draw_frame(args.frame).save(args.directory/f"f{args.frame:03}.png")
        return
    out=args.directory/"Aperture-04.mp4"
    cmd=[ff,"-nostdin","-loglevel","error","-f","rawvideo","-pixel_format","rgb24","-video_size",f"{W}x{H}","-framerate",str(FPS),"-i","-","-an","-c:v","libx264","-pix_fmt","yuv420p","-threads","2","-crf","17","-movflags","+faststart","-n",str(out)]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as proc:
        try:
            for f in range(COUNT):
                proc.stdin.write(draw_frame(f).tobytes())
        except BrokenPipeError:
            pass
        finally:
            proc.stdin.close()
        if proc.wait()!=0:
            raise SystemExit("FFmpeg encode failed")
    print(out)


if __name__=="__main__":
    main()

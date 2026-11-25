#!/usr/bin/env python3
"""Edit Desk: fixed-frame, identity-preserving layout handoff."""
import argparse
from functools import lru_cache
import math
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont

W,H,FPS,N,AA=960,540,24,132,2
START=("atlas","kestrel","oriole")
END=("kestrel","oriole","atlas")
X=(180,480,780)
Y=341
COLORS={"atlas":(175,228,198),"kestrel":(253,172,133),"oriole":(205,192,252)}
IDS={"atlas":"A17","kestrel":"K09","oriole":"O23"}
TITLES={"atlas":"Atlas","kestrel":"Kestrel","oriole":"Oriole"}
SUB={"atlas":"01  /  WIDE","kestrel":"02  /  DETAIL","oriole":"03  /  MOTION"}
BG=(11,17,18)
PAPER=(230,236,218)
MUTED=(132,151,144)
GRID=(42,55,51)
BORDER=(223,233,214)
FRAMES=(30,99)


def ease(u):
    u=min(max(u,0),1)
    return u*u*u*(10-15*u+6*u*u)


def rgbmix(a,b,n):
    return tuple(round(x+(y-x)*n) for x,y in zip(a,b))


def xy(*a):
    return tuple(round(x*AA) for x in a)


@lru_cache(maxsize=None)
def font(s):
    return ImageFont.load_default(size=s*AA)


def text(d,x,y,s,sz,fill=PAPER,tracking=0):
    f=font(sz)
    if tracking:
        for c in s:
            d.text(xy(x,y),c,font=f,anchor="lt",fill=fill)
            x+=f.getlength(c)/AA+tracking
    else:
        d.text(xy(x,y),s,font=f,anchor="lt",fill=fill)


def rr(d,x,y,x2,y2,rad,fill,outline=None,width=1):
    d.rounded_rectangle(xy(x,y,x2,y2),radius=rad*AA,fill=fill,outline=outline,width=width*AA)


def ln(d,points,fill,width=1):
    d.line([xy(*p) for p in points],fill=fill,width=width*AA)


def ellipse(d,cx,cy,r,fill=None,outline=None,width=1):
    d.ellipse(xy(cx-r,cy-r,cx+r,cy+r),fill=fill,outline=outline,width=width*AA)


def position(card, frame, wrong=False):
    src=START.index(card)
    # The deliberate bug zips original IDs with reversed destination enumeration
    # instead of matching stable keys. It preserves the destination geometry.
    end_slots=tuple(END.index(k) for k in START)
    dst=(end_slots[::-1] if wrong else end_slots)[src]
    f0,f1=FRAMES
    t=ease((frame-f0)/(f1-f0))
    along=ease((frame-f0-10)/(f1-f0-20))
    lift=ease((frame-f0)/20)*ease((f1-frame)/20)
    if card=="atlas":
        y=Y-158*lift
        x=X[src]+(X[dst]-X[src])*along
    else:
        y=Y+8*math.sin(math.pi*t)
        x=X[src]+(X[dst]-X[src])*t
    return x,y


@lru_cache(maxsize=1)
def paper():
    im=Image.new("RGB",xy(W,H),BG)
    d=ImageDraw.Draw(im)
    # Understated vignette/graph-paper plate; no stochastic renderer state.
    for y in range(H*AA):
        p=(1-(y/(H*AA)))*.35
        d.line((0,y,W*AA,y),fill=rgbmix(BG,(26,43,38),p))
    for x in range(44,921,24):
        for y in range(122,453,24):
            d.point(xy(x,y),fill=(50,71,63))
    ln(d,((48,109),(912,109)),GRID)
    ln(d,((48,461),(912,461)),GRID)
    return im


def badge(d,kind,cx,cy,c):
    if kind=="atlas":
        ellipse(d,cx,cy,5,fill=c)
    if kind=="kestrel":
        d.polygon([xy(cx,cy-6),xy(cx-6,cy+5),xy(cx+6,cy+5)],fill=c)
    if kind=="oriole":
        d.rectangle(xy(cx-5,cy-5,cx+5,cy+5),fill=c)


@lru_cache(maxsize=3)
def tile(kind):
    # All IDs have the exact same card dimensions and outer border.
    c=COLORS[kind]
    ink=(12,28,27)
    im=Image.new("RGBA",xy(232,142))
    d=ImageDraw.Draw(im)
    rr(d,0,0,231,141,7,(220,229,211),BORDER,2)
    rr(d,6,6,225,97,5,c)
    for x in range(14,224,11):
        ln(d,((x,12),(x,91)),rgbmix(c,ink,.16))
    if kind=="atlas":
        for rad in range(9,43,7):
            ellipse(d,113,49,rad,outline=ink,width=2)
        for a in range(0,360,45):
            x,y=113+42*math.cos(math.radians(a)),49+42*math.sin(math.radians(a))
            ellipse(d,x,y,2,fill=ink)
        ln(d,((27,50),(197,50)),ink)
    elif kind=="kestrel":
        for i in range(6):
            n=i*11
            d.polygon([xy(80+n,15),xy(99+n,15),xy(145+n,83),xy(126+n,83)],fill=rgbmix(c,ink,.22+i*.11))
        ln(d,((29,68),(55,39),(85,63)),ink,2)
    else:
        for i in range(5):
            w=38-i*6
            ln(d,((114,48-w),(114+w*1.25,48),(114,48+w),(114-w*1.25,48),(114,48-w)),ink,2)
        d.rectangle(xy(111,45,117,51),fill=ink)
    rr(d,15,15,61,36,4,ink)
    badge(d,kind,25,25,c)
    text(d,34,20,IDS[kind],11,c)
    text(d,15,105,TITLES[kind],24,ink)
    text(d,140,114,SUB[kind],11,rgbmix(ink,(108,131,112),.47),.8)
    return im


def frame_image(f,wrong=False):
    if not 0<=f<N:
        raise ValueError(f)
    im=paper().copy()
    d=ImageDraw.Draw(im)
    sent=f>=FRAMES[1]
    transit=FRAMES[0]<f<FRAMES[1]
    text(d,48,28,"EDIT DESK  /  07",13,MUTED,2.7)
    text(d,47,55,"Review handoff",39,PAPER)
    text(d,713,31,"POST  /  CAMERA ROLL",12,MUTED,2.2)
    if sent:
        rr(d,743,60,912,92,16,(191,218,127))
        text(d,767,69,"READY FOR REVIEW",13,BG,1)
    elif transit:
        rr(d,743,60,912,92,16,(33,52,45),GRID)
        text(d,772,69,"ARRANGING",13,PAPER,1)
    else:
        rr(d,743,60,912,92,16,(33,52,45),GRID)
        text(d,772,69,"DRAFT QUEUE",13,PAPER,1)
    # Phase metadata belongs to the fixed header, above all card motion.
    ln(d,((443,64),(443,88)),GRID)
    text(d,465,70,"SOURCE ORDER" if not sent and not transit else "CLEARANCE TRACK" if transit else "EDITORIAL ORDER",13,(162,181,165),2.2)
    for j,x in enumerate(X):
        ln(d,((x-115,427),(x+115,427)),GRID)
        text(d,x-111,434,f"0{j+1}",13,MUTED,1.1)
    # Atlas has front priority while it clears the path; draw order is not identity.
    for k in ("kestrel","oriole","atlas"):
        x,y=position(k,f,wrong)
        rr(d,x-116,y-69+5,x+116,y+69+5,9,(6,11,12))
        card=tile(k)
        im.paste(card,xy(x-116,y-71),card)
    text(d,48,485,"03 ORIGINAL PROOFS",13,MUTED,1.5)
    text(d,699,485,"ASSEMBLY / BOARD 07",13,MUTED,1.5)
    return im.resize((W,H),Image.Resampling.LANCZOS)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("directory",type=Path)
    p.add_argument("--reverse-enumeration-control",action="store_true")
    p.add_argument("--frame",type=int)
    a=p.parse_args()
    if a.frame is not None and not 0<=a.frame<N:
        p.error("frame must be in 0..131")
    ff=shutil.which("ffmpeg")
    if a.frame is None and not ff:
        p.error("FFmpeg with libx264 is required")
    a.directory.mkdir(exist_ok=False)
    if a.frame is not None:
        frame_image(a.frame,a.reverse_enumeration_control).save(a.directory/f"f{a.frame:03}.png")
        return
    out=a.directory/"Edit-Desk-Review-Handoff.mp4"
    cmd=[ff,"-nostdin","-loglevel","error","-f","rawvideo","-pixel_format","rgb24","-video_size",f"{W}x{H}","-framerate",str(FPS),"-i","-","-an","-c:v","libx264","-pix_fmt","yuv420p","-threads","2","-crf","17","-movflags","+faststart","-n",str(out)]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as proc:
        try:
            for f in range(N):
                proc.stdin.write(frame_image(f,a.reverse_enumeration_control).tobytes())
        except BrokenPipeError:
            pass
        finally:
            proc.stdin.close()
        if proc.wait()!=0:
            raise SystemExit("FFmpeg encode failed")
    print(out)


if __name__=="__main__":
    main()

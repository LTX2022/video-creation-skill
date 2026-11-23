#!/usr/bin/env python3
"""Original 2.5D editorial-style card handoff. Python/Pillow/NumPy -> FFmpeg."""
from pathlib import Path
import argparse
import json
import math as m
import subprocess
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W,H,FPS,N = 1280,720,30,195
OW,OH = 560,326
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
COLORS = ("#c4a9fa","#9de9d2","#f6c387")
FG = "#f0eff9"
SECONDARY = "#b0adbf"
NAVY = "#1b2031"

@lru_cache(maxsize=100)
def font(size, name=SANS):
    return ImageFont.truetype(name,size)

def tx(d,xy,text,size=16,color=FG,style=SANS,anchor=None):
    d.text(xy,text,font=font(size,style),fill=color,anchor=anchor)

def letter(d,xy,text,size=13,color=FG,gap=2.2,style=MONO):
    x,y=xy
    for c in text:
        tx(d,(x,y),c,size,color,style)
        x+=d.textlength(c,font=font(size,style))+gap

def bg():
    x,y=np.meshgrid(np.arange(W),np.arange(H))
    glow=lambda sx,sy,kx,ky: np.exp(-((x-sx)/kx)**2-((y-sy)/ky)**2)
    g=glow(520,375,630,350); q=glow(1120,490,600,335); p=glow(110,85,490,300)
    rng=np.random.default_rng(249)
    grain=rng.uniform(-1.25,1.25,size=(H,W))
    im=np.stack([9+16*g+7*q+7*p+grain,12+13*g+5*q+5*p+grain,19+26*g+12*q+11*p+grain],axis=-1)
    out=Image.fromarray(np.uint8(np.clip(im,0,255)))
    d=ImageDraw.Draw(out)
    for x in range(28,W,27):
        for y in range(125,608,27):
            d.point((x,y),fill=(46,44,64))
    d.line((56,72,W-56,72),fill="#353744"); d.line((56,625,W-56,625),fill="#353744")
    for x in (56,W-56):
        for y in (98,602):
            d.line((x-6,y,x+6,y),fill="#656378");d.line((x,y-6,x,y+6),fill="#656378")
    return out

def card(k):
    im=Image.new("RGBA",(OW,OH))
    d=ImageDraw.Draw(im)
    c=COLORS[k]
    d.rounded_rectangle((2,2,OW-3,OH-3),radius=22,fill=NAVY,outline="#596077",width=2)
    d.rounded_rectangle((19,19,47,47),radius=7,fill=c)
    tx(d,(33,33),str(k+1),15,"#1b1830",BOLD,"mm")
    letter(d,(62,23),("CAPTURE","SHAPE","DELIVER")[k],13,c,2)
    tx(d,(534,34),("SOURCE","TIMELINE","MASTER")[k],13,SECONDARY,MONO,"rm")
    d.line((20,61,539,61),fill="#3b4056",width=2)
    tx(d,(22,75),("Select takes","Build rhythm","Check delivery")[k],32,FG,BOLD)
    tx(d,(23,119),("Two source ranges retained","A clean, editable cut","Ready for review")[k],17,SECONDARY)
    if k==0:
        for j,(name,note) in enumerate((("Intro take","00:02–00:05"),("Detail take","00:08–00:12"))):
            y=161+j*58
            d.rounded_rectangle((22,y,538,y+47),radius=10,fill="#24293a",outline="#343a50")
            for q in range(18):
                x=270+q*7; dh=(0.5+0.5*m.sin(q*1.6+j))*12+2
                d.line((x,y+24-dh,x,y+24+dh),fill=c,width=2)
            tx(d,(35,y+14),name,16,FG,BOLD)
            tx(d,(522,y+24),note,14,SECONDARY,MONO,"rm")
    elif k==1:
        for j in range(13):
            x=23+j*40
            d.line((x,165,x,260),fill="#30344b",width=1)
        for y,key in ((166,"V1"),(215,"A1")):
            d.rounded_rectangle((22,y,538,y+38),radius=8,fill="#272c3d",outline="#373b51")
            tx(d,(38,y+11),key,14,SECONDARY,MONO)
        for x,end,label in ((83,205,"INTRO"),(208,356,"DETAIL"),(359,507,"RESULT")):
            d.rounded_rectangle((x,174,end,196),radius=5,fill="#29433e",outline=c)
            tx(d,((x+end)/2,184),label,12,"#e1f6ee",MONO,"mm")
        for q in range(57):
            x=84+q*7;h=max(1,6*(.8+m.sin(q*1.13))*abs(m.sin(q*.91)))
            d.line((x,234-h,x,234+h),fill=c,width=2)
        d.line((355,153,355,254),fill="#ffda9e",width=2)
    else:
        for j,(left,right) in enumerate((("Duration","06.50 s"),("Picture","1280 × 720"),("Editability","SOURCE KEPT"))):
            y=154+j*39
            d.line((22,y+37,538,y+37),fill="#35384d")
            d.ellipse((26,y+13,42,y+29),fill="#544430")
            tx(d,(34,y+21),"✓",10,c,BOLD,"mm")
            tx(d,(59,y+12),left,16,FG)
            tx(d,(530,y+21),right,15,c,MONO,"rm")
    d.line((22,279,538,279),fill="#373c52")
    letter(d,(23,292),("MEDIA  /  02","SEQUENCE  /  01","OUTPUT  /  01")[k],12,SECONDARY,1.7)
    letter(d,(440,292),"CUTLINE",12,c,1.7)
    return im

def clamp(x): return min(1.,max(0.,x))
def s(x):
    x=clamp(x)
    return x*x*x*(10+x*(-15+6*x))
def mix(a,b,v): return a+(b-a)*v
def eased(f, lo, hi): return s((f-lo)/(hi-lo))
def pose(k,f):
    targetx=(248,640,1032)[k]; targety=(377,353,377)[k]
    t=eased(f,2+k*8,64+k*7)
    cx=mix((150,640,1130)[k],targetx,t)
    cy=mix((446,390,445)[k],targety,t) - m.sin(m.pi*t)*((37,60,43)[k])
    wander=eased(f,49+k*7,76+k*7)
    yaw=mix((-81,80,81)[k],(-19,4,19)[k],t)+(f-(64+k*7))*(.11 if k!=0 else -.11)*wander
    pitch=mix((7,-10,7)[k],(-6,-5,-6)[k],t)+m.sin(f*.037+k)*3*wander
    roll=mix((17,-8,-17)[k],(-7,0,7)[k],t)+m.sin(f*.034+k)*1.2*wander
    scale=mix(.71,.72 if k==1 else .63,t)
    to=eased(f,112+(2-k)*4,144)
    tx0=(550,640,730)[k]
    cx=mix(cx,tx0,to); cy=mix(cy,421,to) + m.sin(m.pi*to)*(14+k*7)
    yaw=mix(yaw,(-49,30,49)[k],to)
    pitch=mix(pitch,-10,to);roll=mix(roll,0,to);scale=mix(scale,.068,to)
    amt=1-eased(f,133,146)
    return (cx,cy,yaw,pitch,roll,scale,amt)

def project(p,z=0):
    cx,cy,yaw,pitch,roll,scale,amt=p
    X,Y,Z=[v*m.pi/180 for v in (pitch,yaw,roll)]
    rx=np.array([[1,0,0],[0,m.cos(X),-m.sin(X)],[0,m.sin(X),m.cos(X)]])
    ry=np.array([[m.cos(Y),0,m.sin(Y)],[0,1,0],[-m.sin(Y),0,m.cos(Y)]])
    rz=np.array([[m.cos(Z),-m.sin(Z),0],[m.sin(Z),m.cos(Z),0],[0,0,1]])
    basis=rz@rx@ry
    out=[]
    for x,y in ((-OW/2,-OH/2),(OW/2,-OH/2),(OW/2,OH/2),(-OW/2,OH/2)):
        a,b,c=basis@np.array([x*scale,y*scale,z*scale])
        depth=1000/(1000+c)
        out.append((cx+a*depth,cy+b*depth))
    return out, float(basis[2][2])

def warp(im,quad):
    x0=max(0,int(m.floor(min(p[0] for p in quad)))-2)
    y0=max(0,int(m.floor(min(p[1] for p in quad)))-2)
    x1=min(W,int(m.ceil(max(p[0] for p in quad)))+2)
    y1=min(H,int(m.ceil(max(p[1] for p in quad)))+2)
    matrix=[]
    b=[]
    for (x,y),(u,v) in zip(quad,((0,0),(OW-1,0),(OW-1,OH-1),(0,OH-1))):
        x,y=x-x0,y-y0
        matrix.append([x,y,1,0,0,0,-x*u,-y*u]); b.append(u)
        matrix.append([0,0,0,x,y,1,-x*v,-y*v]); b.append(v)
    out=im.transform((x1-x0,y1-y0),Image.Transform.PERSPECTIVE,np.linalg.solve(matrix,b),
                     Image.Resampling.BICUBIC)
    return out,(x0,y0)

def composite_card(img, texture,k,p):
    face,nz=project(p); back,_=project(p,14)
    if p[-1]<=0: return
    if nz<=0: raise AssertionError("mirrored/backface projection")
    dd=Image.new("RGBA",img.size)
    d=ImageDraw.Draw(dd)
    alpha=round(255*p[-1])
    d.polygon(back,fill=(17,19,28,alpha))
    for i in range(4):
        j=(i+1)%4
        d.polygon([face[i],face[j],back[j],back[i]],fill=(52,52,76,alpha))
    img.alpha_composite(dd)
    raster,coord=warp(texture,face)
    if alpha<255:
        raster.putalpha(raster.getchannel("A").point(lambda q:(q*alpha+127)//255))
    img.alpha_composite(raster,coord)

def draft(out):
    key={0:"opening",22:"side-to-face",76:"readable-faces",101:"moving-hold",134:"converge",164:"handoff",194:"final"}
    stills=out/"keyframes";stills.mkdir()
    images=[card(k) for k in range(3)]
    background=bg()
    video=out/"cutline-three-cards.mp4"
    argv=["ffmpeg","-v","error","-nostdin","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","pipe:0","-an","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",str(video)]
    sample={}
    with subprocess.Popen(argv,stdin=subprocess.PIPE) as proc:
        for f in range(N):
            img=background.convert("RGBA")
            d=ImageDraw.Draw(img)
            letter(d,(58,26),"CUTLINE STUDIO",14,"#e5d5ff",2.4)
            letter(d,(873,26),"MOTION STUDY    /    2.5D",13,SECONDARY,2.1)
            letter(d,(56,103),"A  MOTION  STUDY",12,"#c8b8f0",3)
            tx(d,(54,125),"Three stages. One cut.",41,FG,BOLD)
            # One bottom ruler is the shared landing rail across all stages.
            d.line((220,559,1060,559),fill="#524b64",width=1)
            for xx in range(220,1061,15):
                d.line((xx,555,xx,563),fill="#474259")
            for k,(x,name) in enumerate(zip((248,640,1032),("SOURCE","SEQUENCE","MASTER"))):
                c=COLORS[k]
                d.ellipse((x-4,555,x+4,563),fill=c)
                tx(d,(x,584),name,13,c,MONO,"mm")
            poses=[pose(k,f) for k in range(3)]
            if f<146:
                for k in (0,2,1):
                    composite_card(img,images[k],k,poses[k])
            if f>=137:
                final=Image.new("RGBA",img.size)
                fd=ImageDraw.Draw(final)
                a=eased(f,137,159)
                lift=round(mix(16,0,a))
                def rgba(hex,alpha=255): return (*tuple(int(hex[i:i+2],16) for i in (1,3,5)),round(alpha*a))
                for k,(sx,ex) in enumerate(zip((550,640,730),(482,640,798))):
                    v=eased(f,142,162)
                    nx=mix(sx,ex,v);ny=mix(421,465,v)
                    fd.line((nx,ny,nx,mix(421,478,v)),fill=rgba(COLORS[k],151),width=1)
                    fd.ellipse((nx-5,ny-5,nx+5,ny+5),fill=rgba(COLORS[k]))
                fd.rounded_rectangle((282,230+lift,998,438+lift),radius=18,fill=rgba("#131823"),outline=rgba("#625572"),width=2)
                tx(fd,(640,278+lift),"SOURCE  /  SEQUENCE  /  MASTER",15,rgba("#cdb5f6"),MONO,"mm")
                tx(fd,(640,345+lift),"Ready for review",60,rgba("#f0eff9"),BOLD,"mm")
                tx(fd,(640,401+lift),"One cut. Three stages. Still editable.",19,rgba("#b6b2c8"),SANS,"mm")
                img.alpha_composite(final)
            d=ImageDraw.Draw(img)
            letter(d,(58,651),"EDITABLE MOTION    /    ORIGINAL STUDY",12,SECONDARY,2.3)
            for j in range(21):
                h=5+abs(m.sin(j*2.6))*9
                c="#bba1eb" if j/(20)<=f/(N-1) else "#4b415e"
                x=1041+j*8
                d.line((x,666-h,x,666+h),fill=c,width=2)
            rgb=img.convert("RGB")
            if f in key:
                rgb.save(stills/f"{f:03d}-{key[f]}.png")
            proc.stdin.write(rgb.tobytes())
            if f in key or f in (89,90,91,110,111,112):
                sample[str(f)]=[
                    {"card":k,"center_xy":[round(p[0],3),round(p[1],3)],
                     "yaw_degrees":round(p[2],4),"scale":round(p[5],5),
                     "opacity":round(p[-1],5),"front_normal_z":round(project(p)[1],5)}
                    for k,p in enumerate(poses)]
        proc.stdin.close()
        if proc.wait()!=0: raise RuntimeError("FFmpeg render failed")
    for f in range(N):
        assert all(project(pose(k,f))[1]>0 for k in range(3))
    (out/"poses.json").write_text(json.dumps({"frames":N,"fps":FPS,"width":W,"height":H,
        "selected":sample,"every_pose_front_facing":True},indent=2)+"\n")
    print(video)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("output",type=Path,help="New output directory.")
    args=p.parse_args()
    args.output.mkdir(parents=True)
    draft(args.output)
if __name__=="__main__": main()

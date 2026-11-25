#!/usr/bin/env python3
"""Render Stillroom, an original 6-second concept UI film; no input media."""
from pathlib import Path
from functools import lru_cache
import argparse, math, os, shutil, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W,H,FPS,N=1280,720,30,180
REGULAR=os.environ.get('STILLROOM_REGULAR_FONT','/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf')
BOLD=os.environ.get('STILLROOM_BOLD_FONT','/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf')
MONO=os.environ.get('STILLROOM_MONO_FONT','/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf')
COL={'fg':(251,247,240),'muted':(178,168,188),'warm':(235,215,219),'ink':(39,27,52),'line':(88,72,105),'fog':(196,179,215),'mint':(215,250,176)}
C=lambda x:COL[x]

@lru_cache(None)
def face(n,kind): return ImageFont.truetype(MONO if kind=='mono' else BOLD if kind=='bold' else REGULAR,n)
def drawtext(d,xy,s,n,col='fg',kind='regular',anchor=None):
    d.text(xy,s,font=face(n,kind),fill=C(col) if isinstance(col,str) else col,anchor=anchor)
def rr(d,box,r,fill,outline=None,w=1): d.rounded_rectangle(box,r,fill=fill,outline=outline,width=w)
def ease(x): x=max(0,min(1,x)); return x*x*(3-2*x)
def mix(a,b,q): return tuple(round(x+(y-x)*q) for x,y in zip(a,b))
def pos(f):
    t=ease((f-32)/25); u=1-t
    ax,ay=1116,539; bx,by=1110,302; cx,cy=1000,256; dx,dy=932,225
    return (round(u**3*ax+3*u*u*t*bx+3*u*t*t*cx+t**3*dx),round(u**3*ay+3*u*u*t*by+3*u*t*t*cy+t**3*dy))

def background():
    s=Image.new('RGB',(320,180)); p=s.load()
    for y in range(180):
        for x in range(320):
            v=math.exp(-.9*(((x-195)/110)**2+((y-98)/73)**2))
            u=math.exp(-.8*(((x-292)/75)**2+((y-143)/56)**2))
            i=((x*271+y*53+x*y*31)%17-8)/6
            p[x,y]=(int(21+38*v+21*u+i),int(16+21*v+11*u+i),int(37+39*v+18*u+i))
    bg=s.resize((W,H),Image.Resampling.BICUBIC); d=ImageDraw.Draw(bg)
    for x in range(60,1221,27):
        for y in range(97,647,27): d.point((x,y),fill=(101,77,123))
    for i in range(4): 
        r=175+i*36; d.arc((1090-r,410-r,1090+r,410+r),225,355,fill=(87-i*5,66-i*4,109-i*7),width=1)
    sh=Image.new('RGBA',(W,H)); sd=ImageDraw.Draw(sh); rr(sd,(150,163,1130,624),30,(5,3,14,220))
    sh=sh.filter(ImageFilter.GaussianBlur(27)); bg.paste(sh,(0,0),sh)
    d=ImageDraw.Draw(bg)
    drawtext(d,(60,42),'STILLROOM',20,'fg','bold')
    drawtext(d,(1220,50),'PRODUCT CONCEPT  /  INTERACTION STUDY',13,'muted','mono','ra')
    d.line((60,80,1220,80), fill=(110,87,129),width=1)
    rr(d,(152,137,1128,596),27,(33,25,49),(122,99,151),1)
    rr(d,(153,138,1127,182),27,(45,34,65))
    d.rectangle((153,160,1127,182),fill=(45,34,65))
    for i,c in enumerate(((234,151,173),(240,205,151),(198,229,176))):
        d.ellipse((174+i*16,154,181+i*16,161),fill=c)
    drawtext(d,(640,153),'Workshop  /  Morning Desk',14,'warm','regular','ma')
    d.line((153,182,1127,182), fill=C('line'))
    d.line((356,183,356,595), fill=C('line'))
    rr(d,(176,251,334,288),9,(66,48,86))
    for i,(label,pick) in enumerate((('Today',True),('Projects',False),('Library',False))):
        y=261+i*54
        d.ellipse((188,y+4,196,y+12),fill=C('mint') if pick else (113,94,133))
        drawtext(d,(208,y),label,19,'fg' if pick else 'muted','bold' if pick else 'regular')
    drawtext(d,(178,221),'WORKSPACE',12,'muted','mono')
    d.line((176,546,334,546),fill=C('line'))
    drawtext(d,(178,559),'LOCAL PROJECT',12,'muted','mono')
    rr(d,(835,195,1015,252),16,(22,17,37),C('line'))
    drawtext(d,(392,216),'Morning desk',30,'fg','bold')
    drawtext(d,(392,253),'Make space for the important work.',18,'muted')
    d.line((391,280,1087,280),fill=C('line'))
    d.line((61,645,1220,645),fill=(110,87,129))
    drawtext(d,(61,657),'STILLROOM  /  CONCEPT UI',13,'muted','mono')
    drawtext(d,(1220,657),'VIDEO CREATION SKILL  /  SILENT DEMO',13,'muted','mono','ra')
    return bg

STATIC=None

def render_frame(f):
    global STATIC
    if STATIC is None: STATIC=background()
    img=STATIC.copy(); d=ImageDraw.Draw(img); q=ease((f-67)/11)
    left=841+round(86*q)
    sat=ease((f-62)/2) if 62<=f<=66 else 0
    if sat: 
        rr(d,(928,200,1009,247),12,(77,58,107))
        d.ellipse((922+2*sat,215+2*sat,942-2*sat,235-2*sat),outline=(221,187,255),width=1)
    rr(d,(left,201,left+81,246),12,mix((224,209,237),C('mint'),q))
    drawtext(d,(883,224),'Overview',14,mix(C('ink'),C('muted'),q),'bold','mm')
    drawtext(d,(967,224),'Focus',14,mix(C('muted'),C('ink'),q),'bold','mm')
    a=(403,304,1086,413)
    rr(d,a,17,mix((57,42,77),(68,56,88),q),mix((97,79,123),(160,156,146),q))
    rr(d,(421,321,487,396),13,mix((105,79,150),(203,232,162),q))
    # Original orbit-and-mountain logo drawn from simple geometry, independent of text size.
    d.arc((431,330,477,378),18,342,fill=mix(C('fg'),C('ink'),q),width=2)
    d.polygon([(435,367),(449,346),(456,358),(461,352),(475,367)],fill=mix(C('fg'),C('ink'),q))
    drawtext(d,(505,324),'Draft the field guide',29,'fg','bold')
    drawtext(d,(505,365),'Writing  •  Ready for a deep-work block',17,'muted')
    rr(d,(946,326,1066,355),14,mix((96,74,130),(210,238,177),q))
    drawtext(d,(1007,341),'PINNED',12,mix(C('fg'),C('ink'),q),'mono','mm')
    for i,(label,typ) in enumerate((('Review studio notes','REVIEW'),('Sort the reference board','PLANNING'))):
        y=431+i*66
        rr(d,(403,y,1086,y+53),13,mix((53,39,72),(37,26,53),q),mix((84,69,105),(62,48,81),q))
        drawtext(d,(424,y+16),label,18,mix((231,221,240),(166,149,191),q))
        drawtext(d,(1067,y+21),typ,14,mix((203,186,222),(157,138,180),q),'mono','ra')
    q1=ease((f-66)/12)
    # Same label area, with one eased position settle as the feedback becomes readable.
    if f<67:
        drawtext(d,(61,622),'A desk full of possibilities.',18,'warm','bold')
    else:
        caption=Image.new('RGBA',(500,27)); cd=ImageDraw.Draw(caption)
        if q1<1:
            cd.text((0,0),'A desk full of possibilities.',font=face(18,'bold'),fill=C('warm')+(round(255*(1-q1)),))
        cd.text((0,round((1-q1)*8)),'The work that matters stays in view.',font=face(18,'bold'),fill=C('warm')+(round(255*q1),))
        img.paste(caption,(61,622),caption)
    # The geometric tip is the operative hotspot. An opacity envelope avoids interior jumps.
    if 29<=f<=102:
        x,y=pos(f)
        if f>82:
            e=ease((f-82)/19); x+=round(74*e); y+=round(55*e)
        alpha=round(255*min(ease((f-29)/7),1-ease((f-94)/8)))
        pointer=Image.new('RGBA',(40,39)); pd=ImageDraw.Draw(pointer)
        p=[(0,0),(7,29),(13,21),(21,30),(25,26),(17,17),(28,15)]
        pd.polygon([(a+2,b+3) for a,b in p],fill=(13,8,22,alpha))
        fill=(239,244,255) if f<62 or f>66 else (216,250,176)
        pd.polygon(p,fill=fill+(alpha,),outline=(25,15,50,alpha),width=2)
        img.paste(pointer,(x,y),pointer)
    return img

def main():
    p=argparse.ArgumentParser(); p.add_argument('output',type=Path); args=p.parse_args()
    if os.path.lexists(args.output): p.error(f'Output already exists: {args.output}')
    if not shutil.which('ffmpeg'): p.error('FFmpeg with libx264 is required')
    for name,path in [('STILLROOM_REGULAR_FONT',REGULAR),('STILLROOM_BOLD_FONT',BOLD),('STILLROOM_MONO_FONT',MONO)]:
        if not Path(path).is_file(): p.error(f'{name} not found: {path}')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    # Stage beside the target, then claim its name atomically without replacing it.
    # FFmpeg's -n protects the staged name; link() closes the final-name race.
    with tempfile.TemporaryDirectory(prefix='.stillroom-', dir=args.output.parent) as tmp:
        staged = Path(tmp) / args.output.name
        try:
            with subprocess.Popen(['ffmpeg','-v','error','-nostdin','-xerror','-n','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-threads','4','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(staged)],stdin=subprocess.PIPE) as proc:
                for f in range(N): proc.stdin.write(render_frame(f).tobytes())
                proc.stdin.close()
                if proc.wait(): raise RuntimeError('FFmpeg exited unsuccessfully')
        except (BrokenPipeError, RuntimeError) as exc:
            p.exit(1, f'FFmpeg failed; no output was published: {exc}\n')
        try:
            os.link(staged, args.output)
        except FileExistsError:
            p.exit(1, f'Output already exists: {args.output}\n')
        except OSError as exc:
            p.exit(1, f'Could not publish safely (the destination must support hard links): {exc}\n')

if __name__=='__main__': main()

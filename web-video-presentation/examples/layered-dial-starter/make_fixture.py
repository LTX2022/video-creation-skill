"""Original synthetic meter: generate independent aligned layers and real plate."""
import argparse, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
import math

W,H=480,270
CX,CY=240,148

def render(dst):
    a=dst/'assets'; a.mkdir(parents=True,exist_ok=False)
    # Patterned surrounding plate differentiates correct matte from black or generic solid.
    im=Image.new('RGB',(W,H)); px=im.load()
    for y in range(H):
        for x in range(W):
            v=max(0,1-math.hypot((x-240)/330,(y-120)/200))
            px[x,y]=(12+int(9*v),31+int(16*v),48+int(19*v))
    d=ImageDraw.Draw(im)
    for x in range(18,W-15,18):
        d.line((x,14,x,H-14),fill=(24,43,60),width=1)
    for y in range(14,H-13,18):
        d.line((15,y,W-14,y),fill=(24,43,60),width=1)
    d.rounded_rectangle((17,15,463,255), radius=10,outline=(51,89,110),width=1)
    d.rectangle((23,24,67,28), fill=(34,113,132))
    im.save(a/'plate.png')
    subprocess.run(['ffmpeg','-v','error','-n','-loop','1','-framerate','24','-i',str(a/'plate.png'),
                    '-frames:v','72','-an','-c:v','libx264','-pix_fmt','yuv420p',str(a/'plate.mp4')],check=True)

    k=3
    def blank(): return Image.new("RGBA",(W*k,H*k))
    def sc(box): return tuple(round(v*k) for v in box)
    def save(q,n): q.resize((W,H),Image.Resampling.LANCZOS).save(a/n)
    dial=blank(); d=ImageDraw.Draw(dial)
    d.rounded_rectangle(sc((120,58,360,224)),radius=21*k,fill='#13242e',outline='#5c8897',width=2*k)
    d.rounded_rectangle(sc((127,65,353,216)),radius=17*k,fill='#233a47',outline='#365868',width=k)
    d.rounded_rectangle(sc((142,76,338,198)),radius=12*k,fill='#101e25')
    d.arc(sc((160,69,320,227)),202,338,fill='#527482',width=2*k)
    for angle in range(-65,66,13):
        r=math.radians(angle)
        def pt(dist):return ((CX+math.sin(r)*dist)*k,(CY-math.cos(r)*dist)*k)
        d.line([pt(64 if angle%26 else 60),pt(72)],fill='#c3dce2',width=2*k)
    for x in (140,340):
        for y in (82,191):
            d.ellipse(sc((x-3,y-3,x+3,y+3)),fill='#537482')
    d.rounded_rectangle(sc((217,203,263,212)),radius=4*k,fill='#0d2834',outline='#537482',width=k)
    d.ellipse(sc((224,205,228,210)),fill='#3ee3af')
    d.line(sc((239,207,252,207)),fill='#abc7ce',width=k)
    save(dial,'dial.png')

    needle=blank();d=ImageDraw.Draw(needle)
    d.polygon([sc((236,155)),sc((238,89)),sc((240,78)),sc((242,89)),sc((244,155))],fill='#ffd078')
    d.line(sc((240,87,240,140)),fill='#fff3bb',width=k)
    save(needle,'needle.png')
    hub=blank();d=ImageDraw.Draw(hub)
    d.ellipse(sc((CX-9,CY-9,CX+9,CY+9)),fill='#192d38',outline='#96b7c1',width=2*k)
    d.ellipse(sc((CX-4,CY-4,CX+4,CY+4)),fill='#8da6ac')
    save(hub,'hub.png')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('case',type=Path)
    render(p.parse_args().case)

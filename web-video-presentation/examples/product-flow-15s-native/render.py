"""Offline original 15-second product-flow demonstration. No browser or installs."""
import argparse,json,os,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from state import *
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
W,H=1920,1080
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
INK='#eaf0fa';MUTED='#8e9db4';BLUE='#8dafff';GREEN='#7bdec3'

def mix(a,b,u): return tuple(int(x+(y-x)*u) for x,y in zip(a,b))

yy,xx=np.mgrid[0:H,0:W];glow=np.exp(-(((xx-420)/1100)**2+((yy-220)/700)**2))
bg=np.empty((H,W,3),dtype=np.uint8)
for i,(a,b) in enumerate([(9,17),(15,29),(28,53)]):bg[:,:,i]=a+(b-a)*glow
BASE=Image.fromarray(bg)
d=ImageDraw.Draw(BASE)
for x in range(0,W,80):d.line((x,0,x,H),fill=(20,30,46),width=1)
for y in range(0,H,80):d.line((0,y,W,y),fill=(20,30,46),width=1)
shadow=Image.new('RGBA',(W,H));ImageDraw.Draw(shadow).rounded_rectangle((175,238,1745,885),radius=36,fill=(0,0,0,160))
BASE=Image.alpha_composite(BASE.convert('RGBA'),shadow.filter(ImageFilter.GaussianBlur(32)))

def text(d,pos,s,font,fill=INK):d.text(pos,s,font=font,fill=fill)
def check(d,x,y,color,width=5):d.line([(x-10,y),(x-2,y+8),(x+13,y-10)],fill=color,width=width,joint='curve')

def draw(frame):
    s=state(frame);t=s['time'];p=s['plan_progress'];im=BASE.copy();d=ImageDraw.Draw(im)
    text(d,(180,98),'A task. A plan. Done.',B[52])
    text(d,(182,169),'An editable product-workflow demonstration',F[24],MUTED)
    for i,name in enumerate(['INPUT','PLAN','COMPLETE']):
        x=1135+i*205;active=s['phase']==name
        d.rounded_rectangle((x,125,x+190,172),radius=23,fill='#284367' if active else '#142236')
        text(d,(x+18,137),f"0{i+1}  {['INPUT','PLAN','CHECK OFF'][i]}",F[21],INK if active else MUTED)
    d.rounded_rectangle((180,245,1740,865),radius=30,fill='#142238',outline='#344662',width=2)
    d.line((180,325,1740,325),fill='#344662',width=2)
    for i,c in enumerate(['#f08d82','#e3bf75','#7bcead']):d.ellipse((214+i*28,277,226+i*28,289),fill=c)
    text(d,(340,269),'LAUNCH / WORKSPACE',B[22],MUTED)
    text(d,(1513,270),'TASK 041',B[22],'#d8bf8e')
    # Input card continuously becomes the persistent left-hand task identity.
    left=280-30*p;right=1640-780*p
    text(d,(left,376),'WHAT NEEDS TO HAPPEN?',B[22],MUTED)
    boxy=440;boxh=193
    d.rounded_rectangle((left,boxy,right,boxy+boxh),radius=18,fill='#0c1729',outline='#678aca' if t<4.7 else '#40546d',width=2)
    # Keep two text baselines throughout the morph, avoiding a one-frame reflow.
    first=s['input'][:9];second=s['input'][10:]
    text(d,(left+30,boxy+36),first,F[38]);text(d,(left+30,boxy+91),second,F[38])
    if t<4.7 and int(t*2)%2==0:
        current=second if len(s['input'])>9 else first;cy=boxy+(91 if len(s['input'])>9 else 36)
        advance=d.textlength(current,font=F[38]);d.line((left+32+advance,cy+7,left+32+advance,cy+47),fill=BLUE,width=3)
    if p<.98:
        # Button stays under the pointer at the exact build request event.
        alpha=1-p
        color=mix((20,34,56),(132,168,255),alpha)
        d.rounded_rectangle((1120,660,1515,744),radius=18,fill=color)
        if p<.65:text(d,(1190,682),'Build plan  →',B[30],'#102039')
    if p>.02:
        # Reveal is clipped, not a cut to a second screen.
        layer=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(layer)
        q=ease(t,6.05,6.4)
        ld.line((900,365,900,813),fill=(52,70,98,round(255*q)),width=2)
        text(ld,(940,358),'YOUR THREE-STEP PLAN',B[22],(142,157,180,round(255*q)))
        for i,progress in enumerate(s['row_progress']):
            if progress<=0:continue
            y=411+i*130;offset=round((1-progress)*26)
            row=Image.new('RGBA',(W,H));rd=ImageDraw.Draw(row)
            rd.rounded_rectangle((940,y+offset,1670,y+104+offset),radius=17,fill='#18372f' if s['done'][i] else '#203149',outline='#477462' if s['done'][i] else '#3b4f6c',width=2)
            cy=y+38+offset
            rd.ellipse((958,cy-16,990,cy+16),fill=GREEN if s['done'][i] else '#152239',outline=GREEN if s['done'][i] else '#7187a9',width=2)
            if s['done'][i]:check(rd,974,cy,'#13382d',4)
            text(rd,(1016,y+22+offset),STEPS[i],B[27],INK)
            text(rd,(1016,y+62+offset),'Completed' if s['done'][i] else ['Start with the right people','Make every asset ready','Choose the launch moment'][i],F[21],GREEN if s['done'][i] else MUTED)
            row.putalpha(row.getchannel('A').point(lambda a:int(a*progress)))
            layer=Image.alpha_composite(layer,row);ld=ImageDraw.Draw(layer)
        layer.putalpha(layer.getchannel('A').point(lambda a:int(a*p)))
        im=Image.alpha_composite(im,layer);d=ImageDraw.Draw(im)
        if p>.98:
            text(d,(left+2,674),'One task. Three clear steps.',F[24],MUTED)
            text(d,(left+2,726),f"{s['done_count']} / 3 completed",B[30],GREEN if s['all_done'] else BLUE)
            d.rounded_rectangle((left,786,right,794),radius=4,fill='#35455b')
            visual_done=sum(ease(t,c,c+.4) for c in COMPLETE_TIMES)/3
            if visual_done>0:d.rounded_rectangle((left,786,left+(right-left)*visual_done,794),radius=4,fill=GREEN)
    if s['all_done']:
        u=ease(t,12.6,13.15)
        text(d,(180,940),'Checklist complete.',B[34],mix((14,23,38),(123,222,195),u))
    else:text(d,(180,940),'From a clear request to a finished plan.',F[27],MUTED)
    # A real animated pointer, no artificial screenshot-only interactions.
    if t>=3.5:
        x,y=cursor(t);d.polygon([(x,y),(x+3,y+34),(x+12,y+25),(x+21,y+43),(x+28,y+39),(x+19,y+22),(x+32,y+20)],fill='#eef4ff',outline='#0a172b',width=2)
        for c in [4.7]+COMPLETE_TIMES:
            a=(t-c)/.45
            if 0<=a<1:
                r=12+24*a;d.ellipse((x-r,y-r,x+r,y+r),outline=mix((90,140,220),(20,34,56),a),width=3)
    return im.convert('RGB')

def main():
    global F,B
    ap=argparse.ArgumentParser()
    ap.add_argument('--keyframes',action='store_true')
    ap.add_argument('--font-regular',default=FONT)
    ap.add_argument('--font-bold',default=BOLD)
    ap.add_argument('--font-regular-index',type=int)
    ap.add_argument('--font-bold-index',type=int)
    args=ap.parse_args()
    regular,bold=args.font_regular,args.font_bold
    reg_index=args.font_regular_index if args.font_regular_index is not None else (0 if regular==FONT else 0)
    bold_index=args.font_bold_index if args.font_bold_index is not None else (0 if bold==BOLD else 0)
    F={s:ImageFont.truetype(regular,s,index=reg_index) for s in [21,24,27,30,34,38,42,52,60]}
    B={s:ImageFont.truetype(bold,s,index=bold_index) for s in [22,24,27,30,34,38,42,52,60]}
    indices=[0,90,140,165,205,270,306,342,378,420,449]
    if args.keyframes:
        for f in indices:draw(f).save(OUT/f'frame-{f:03d}.png')
        return
    cmd=[os.environ.get('FIRST_VIDEO_FFMPEG','ffmpeg'),'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-',
         '-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'product-flow-15s.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    for f in range(FRAMES):proc.stdin.write(draw(f).tobytes())
    proc.stdin.close();assert proc.wait()==0
    (OUT/'states.json').write_text(json.dumps([state(f) for f in range(FRAMES)],indent=2))
    (OUT/'sha256.txt').write_text(hashlib.sha256((OUT/'product-flow-15s.mp4').read_bytes()).hexdigest()+'  product-flow-15s.mp4\n')

if __name__=='__main__':main()

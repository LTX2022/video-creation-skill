"""Original deterministic concept film. No upstream code/assets. Python+Pillow+FFmpeg."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, math, subprocess, json, wave, pathlib
ROOT=pathlib.Path(__file__).resolve().parent
W,H,FPS,N=1280,720,30,420
S=1.5
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
fonts={}
def font(sz,b=False):
 k=(sz,b)
 if k not in fonts: fonts[k]=ImageFont.truetype(BOLD if b else FONT,int(sz*S))
 return fonts[k]
def ease(a,b,t):
 u=max(0,min(1,(t-a)/(b-a))); return u*u*(3-2*u)
def lerp(a,b,u): return a+(b-a)*u
def col(c,a=1): return tuple(c)+(int(255*max(0,min(1,a))),)
INK=(17,26,37); ACC=(198,247,95); PAPER=(243,245,233); MUTE=(143,157,167)
def state(f):
 t=f/FPS
 # One persistent surface, three transformations; positions in world coordinates.
 keys=[(0,(640,365,164,164,48)),(1.0,(640,365,164,164,48)),(2.6,(640,375,860,200,42)),(5.4,(640,375,860,200,42)),(6.7,(700,380,900,350,34)),(9.5,(700,380,900,350,34)),(11.4,(640,315,130,130,38)),(14,(640,315,130,130,38))]
 for (a,A),(b,B) in zip(keys,keys[1:]):
  if a<=t<=b: return [lerp(x,y,ease(a,b,t)) for x,y in zip(A,B)]
 return list(keys[-1][1])
def render(f):
 t=f/FPS; im=Image.new('RGB',(int(W*S),int(H*S)),(13,21,31)); d=ImageDraw.Draw(im,'RGBA')
 def line(points,fill,width=1): d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=max(1,int(width*S)))
 def rr(box,rad,fill,outline=None,width=1): d.rounded_rectangle(tuple(int(v*S) for v in box),radius=int(rad*S),fill=fill,outline=outline,width=int(width*S))
 def text(x,y,s,sz=26,fill=col(PAPER),b=False,anchor=None): d.text((x*S,y*S),s,font=font(sz,b),fill=fill,anchor=anchor)
 def ellipse(box,fill,outline=None,width=1): d.ellipse(tuple(int(v*S) for v in box),fill=fill,outline=outline,width=int(width*S))
 # Quiet architectural field, asymmetric halo, not a stock asset.
 for x in range(-160,1450,80): line([(x+18*math.sin(t*.13),0),(x+18*math.sin(t*.13),720)],(21,31,41,255))
 for y in range(0,800,80): line([(0,y),(1280,y)],(21,31,41,255))
 for r in (220,340,460):
  d.arc(tuple(int(v*S) for v in (1080-r,150-r,1080+r,150+r)),40+3*t,285+3*t,fill=(37,49,51,255),width=2)
 text(64,42,'THREAD / 一线',23,b=True)
 text(1216,49,'原创概念演示',14,fill=col(MUTE),anchor='ra')
 # Editorial framing changes, while the actual object remains continuous.
 a=1-ease(1.0,1.9,t)
 if a>0: text(640,145,'把想法，变成下一步。',44,fill=col(PAPER,a),b=True,anchor='mt')
 a=ease(1.7,2.5,t)*(1-ease(5.5,6.1,t))
 if a>0: text(210,180,'一个想法。',46,fill=col(PAPER,a),b=True)
 a=ease(5.8,6.7,t)*(1-ease(9.5,10.3,t))
 if a>0:
  text(79,215,'三步',45,fill=col(PAPER,a),b=True); text(79,276,'成形。',45,fill=col(ACC,a),b=True)
 cx,cy,w,h,r=state(f); x=cx-w/2;y=cy-h/2
 # Crisp offset shadow and thin bevel.
 rr((x+3,y+16,x+w+3,y+h+16),r,(4,10,15,150))
 rr((x,y,x+w,y+h),r,col(PAPER))
 rr((x+2,y+2,x+w-2,y+h-2),max(2,r-2),None,(255,255,250,255),2)
 # Logo = a continuous rising line. Its point progressively becomes confirmation.
 logoAlpha=1-ease(.9,1.7,t)+ease(10.0,11.1,t)
 if logoAlpha>0:
  q=min(w,h)/164; px=cx;py=cy
  pts=[(px-40*q,py+25*q),(px-12*q,py-10*q),(px+9*q,py+8*q),(px+42*q,py-31*q)]
  line(pts,col(INK,logoAlpha),10*q)
  ellipse((px+34*q,py-39*q,px+50*q,py-23*q),col(INK,logoAlpha))
 # Input is actual progressive text + pointer action, not just a title page.
 ia=ease(1.8,2.5,t)*(1-ease(5.55,6.25,t))
 if ia>0:
  text(x+36,y+25,'创建计划',16,fill=col((98,113,110),ia))
  typed='做一份周末摄影计划'; n=int(ease(2.55,4.15,t)*len(typed))
  text(x+36,y+65,typed[:n],34,fill=col(INK,ia),b=True)
  if 2.5<t<4.5:
   tw=d.textlength(typed[:n],font=font(34,True))/S
   line([(x+40+tw,y+72),(x+40+tw,y+111)],col((80,108,70),ia),2)
  bx=x+w-92; by=cy+3
  rr((bx-30,by-30,bx+30,by+30),21,col(INK,ia))
  line([(bx-11,by+6),(bx+9,by+6),(bx+9,by-8)],col(ACC,ia),3)
  line([(bx+9,by-8),(bx+3,by-1)],col(ACC,ia),3)
  line([(bx+9,by-8),(bx+16,by-1)],col(ACC,ia),3)
  # pointer arrives, compresses button, releases; click ring anchored to the action
  u=ease(4.05,4.85,t); mx=lerp(1115,bx+8,u);my=lerp(610,by+15,u)
  if t>4.05:
   d.polygon([(mx*S,my*S),((mx+6)*S,(my+27)*S),((mx+12)*S,(my+18)*S),((mx+23)*S,(my+17)*S)],fill=col((87,106,91),ia))
  if 4.85<t<5.5:
   pr=ease(4.85,5.5,t);rad=15+pr*42
   ellipse((bx-rad,by-rad,bx+rad,by+rad),None,col((94,130,60),(1-pr)*ia),2)
 # Result data are stable semantic items, sequentially revealed from the surface.
 ra=ease(6.0,6.7,t)*(1-ease(9.4,9.95,t))
 if ra>0:
  text(x+35,y+25,'周末摄影计划',29,fill=col(INK,ra),b=True)
  text(x+w-35,y+37,'3 个步骤',16,fill=col((98,113,110),ra),anchor='ra')
  rows=[('01','选一个地点','河岸 · 清晨光线'),('02','准备轻装','相机 · 一支镜头'),('03','留出探索时间','慢走 · 发现细节')]
  for i,(no,title,desc) in enumerate(rows):
   u=ease(6.55+i*.40,7.15+i*.40,t); yy=y+88+i*75
   if u:
    rr((x+26,yy+10*(1-u),x+w-26,yy+64),14,col((226,233,214),ra*u))
    ellipse((x+43,yy+17,x+73,yy+47),col((51,74,48),ra*u))
    text(x+58,yy+20,no,14,fill=col(ACC,ra*u),anchor='mt')
    text(x+94,yy+15,title,23,fill=col(INK,ra*u),b=True)
    text(x+340,yy+22,desc,18,fill=col((89,106,91),ra*u))
    v=ease(7.8+i*.35,8.15+i*.35,t)
    if v>0: line([(x+w-70,yy+33),(x+w-62,yy+41),(x+w-47,yy+24)],col((54,101,40),v*ra),3)
 # Ending breath 2.3 seconds, no fake product claim.
 a=ease(11.0,11.75,t)
 if a:
  text(640,420,'让下一步，看得见。',44,fill=col(PAPER,a),b=True,anchor='mt')
  text(640,491,'THREAD / 一线',20,fill=col(ACC,a),anchor='mt')
 text(64,660,'DESIGN STUDY  /  014',13,fill=col(MUTE))
 # Progress represents the film, not fabricated product performance.
 line([(1012,668),(1216,668)],(51,63,70,255),2);line([(1012,668),(1012+204*min(1,t/14),668)],col(ACC),2)
 return im.convert('RGB').resize((W,H),Image.Resampling.LANCZOS)

def audio():
 sr=48000;t=np.arange(sr*N//FPS)/sr; out=np.zeros_like(t)
 for sec,freq,dur,gain in [(1.15,220,.45,.10),(2.6,440,.25,.07),(4.88,880,.10,.11),(6.6,330,.45,.10),(7.0,440,.25,.06),(7.4,550,.25,.06),(8.1,660,.3,.06),(10.05,196,.6,.08),(11.4,440,1.4,.08),(11.4,550,1.4,.06),(11.4,660,1.4,.05)]:
  u=t-sec;mask=(u>=0)&(u<dur);z=u[mask]; env=(1-np.exp(-z*90))*np.exp(-z*5/dur)*(1-z/dur)
  out[mask]+=gain*env*(np.sin(2*np.pi*freq*z)+.2*np.sin(2*np.pi*freq*2*z))
 with wave.open(str(ROOT/'sound.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype('<i2').tobytes())
if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--out-dir', required=True, help='New or empty output directory, outside the source directory')
 parser.add_argument('--font', default=FONT)
 parser.add_argument('--bold-font', default=BOLD)
 args=parser.parse_args()
 source=ROOT
 ROOT=pathlib.Path(args.out_dir).expanduser().resolve()
 if ROOT==source or source in ROOT.parents:
  parser.error('Output must be outside the source directory')
 if ROOT.exists() and (not ROOT.is_dir() or any(ROOT.iterdir())):
  parser.error('Output must be a new or empty directory')
 FONT=str(pathlib.Path(args.font).expanduser().resolve())
 BOLD=str(pathlib.Path(args.bold_font).expanduser().resolve())
 for path in (FONT,BOLD):
  if not pathlib.Path(path).is_file(): parser.error('Required font is missing: '+path)
 # Validate font loading before creating artifacts; glyph coverage is not certified here.
 font(20);font(20,True)
 ROOT.mkdir(parents=True,exist_ok=True)
 audio()
 cmd=['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(ROOT/'sound.wav'),'-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(ROOT/'thread-continuity-14s.mp4')]
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=open(ROOT/'render.log','w'))
 for f in range(N):
  im=render(f);p.stdin.write(im.tobytes())
  if f in [0,30,60,90,120,146,170,195,225,255,285,310,342,375,419]:im.save(ROOT/f'frame-{f:03}.png')
 p.stdin.close();assert p.wait()==0
 (ROOT/'frame-state.json').write_text(json.dumps([{'frame':f,'surface':state(f),'objectId':'focus-surface'} for f in range(N)],indent=2))
 print('Rendered',ROOT/'thread-continuity-14s.mp4')

"""Generate only the original, opaque 640x360 educational fixture."""
import argparse
from pathlib import Path
from PIL import Image as I, ImageDraw as D, ImageFilter as F
W,H,S=640,360,4
BG=(18,32,39,255); X,Y=218,216
def canvas(): return I.new('RGBA',(W*S,H*S))
def coords(t): return tuple(round(v*S) for v in t)
def rr(im,t,r,c,o=None,w=1): D.Draw(im).rounded_rectangle(coords(t),round(r*S),fill=c,outline=o,width=max(1,round(w*S)))
def e(im,t,c,o=None,w=1): D.Draw(im).ellipse(coords(t),fill=c,outline=o,width=max(1,round(w*S)))
def l(im,t,c,w=1): D.Draw(im).line(coords(t),fill=c,width=max(1,round(w*S)))
def grad(im,b,r,a,z):
    mask=I.new('L',im.size)
    B=coords(b); D.Draw(mask).rounded_rectangle(B,r*S,fill=255)
    g=canvas(); d=D.Draw(g)
    for y in range(B[1],B[3]+1):
        t=(y-B[1])/(B[3]-B[1]); d.line((B[0],y,B[2],y),fill=tuple(round(x*(1-t)+v*t) for x,v in zip(a,z))+(255,))
    im.paste(g,(0,0),mask)
def bolt(im,x,y,r):
    e(im,(x-r-1,y-r,x+r+1,y+r+2),'#172829')
    e(im,(x-r,y-r,x+r,y+r),'#71898d','#afbcad',.65)
    e(im,(x-r+2,y-r+2,x+r-2,y+r-2),'#526d74')
    l(im,(x-r+3,y-r+3,x+r-3,y+r-3),'#24383b',1.6)
base=canvas(); shadow=canvas()
e(shadow,(92,278,555,309),(0,0,0,115))
base.alpha_composite(shadow.filter(F.GaussianBlur(12*S)))
rr(base,(101,186,542,303),24,'#0d222c','#2f4448')
grad(base,(101,174,542,292),24,(65,98,105),(22,50,61))
rr(base,(103,176,540,290),22,None,'#68898b')
rr(base,(118,187,525,276),15,'#223f49','#54747a')
grad(base,(120,189,523,274),13,(41,70,79),(22,42,52))
l(base,(136,265,510,265),'#4e6a6d')
rr(base,(243,151,484,232),14,'#152c37','#466571')
rr(base,(248,156,479,229),11,'#19343d','#0e232d')
for x in range(259,474,13): l(base,(x,158,x,226),'#2b4952')
l(base,(259,178,467,178),'#36565e')
l(base,(260,220,465,220),'#112831')
rr(base,(132,241,180,250),4,'#17313b','#4f6c71')
for x,col in [(141,'#bd663e'),(151,'#d69356'),(161,'#70a78d')]: e(base,(x-2,243,x+2,247),col)
for x,y in [(135,204),(135,258),(503,205),(503,257)]: bolt(base,x,y,6)
rr(base,(183,195,254,249),21,'#122932','#708788')
e(base,(195,193,241,239),'#121e24','#88aaab')
e(base,(200,198,236,234),'#4a777d','#1f393e')
bolt(base,272,235,10)
raw=canvas()
e(raw,(197,195,239,237),'#492b23','#c79264')
rr(raw,(215,202,451,230),12,'#653b2b','#171f22',2)
grad(raw,(215,202,450,228),11,(224,165,96),(95,46,36))
rr(raw,(221,205,446,225),9,None,'#d2945d',.7)
l(raw,(241,208,427,208),'#ffd88b'); l(raw,(242,222,428,222),'#63352b')
rr(raw,(425,195,474,237),16,'#40252a','#0f2229',2)
grad(raw,(425,195,474,233),15,(221,149,77),(102,54,46))
rr(raw,(426,196,473,232),14,None,'#e9b478')
for x in (435,440,445,450,455,460,465): l(raw,(x,204,x,225),'#8c4938')
lever=raw.rotate(12,resample=I.Resampling.BICUBIC,center=(X*S,Y*S))
cap=canvas()
e(cap,(204,202,232,230),'#131f26','#c29268')
e(cap,(207,205,229,227),'#8e674c','#f1cc8e',.8)
e(cap,(210,208,226,224),'#4e4142','#322d34')
D.Draw(cap).polygon(coords((214,211,221,211,224,216,221,221,214,221,212,216)),fill='#172932')
parts=[i.resize((W,H),I.Resampling.LANCZOS) for i in (base,lever,cap)]

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    im = I.new('RGBA', (W, H), BG)
    for part in parts:
        im.alpha_composite(part)
    with args.output.open('xb') as output:
        im.convert('RGB').save(output, format='PNG', optimize=True)

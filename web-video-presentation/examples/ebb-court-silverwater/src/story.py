"""Text-free flow study; render original R6 surfaces with a world-space flow material."""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from hashlib import sha256

import numpy as np
from PIL import Image

import court_r6 as r

# Fixed geometry from R6, traversed in physical order.
PTS=np.array([[-4.34,1.17,2.44],[-3.82,1.14,2.44],[-1.53,.85,2.44],
              [-.67,.69,1.79],[-.53,.212,1.64]])
DEL=np.diff(PTS,axis=0)
L=np.linalg.norm(DEL,axis=1)
OFFSET=np.r_[0,np.cumsum(L)]
MATERIALS={
 'pier':(173,177,170),'travertine':(187,193,182),'trim':(158,149,126),
 'bronze':(132,113,92),'bronze_dark':(87,75,62),'light_strip':(171,147,98),
 'cap':(211,205,179),'pool':(38,112,129),'channel_top':(65,169,158),
 'ripples':(103,147,148)
}
def setup():
    if not r.MESH:r.scene()
    r.SCREEN_FACES={r.OBJECTS[n] for n in ('arrival-screen','screen-fins','screen-coping')}
    r.MATS.update(MATERIALS)
    return r.make_shadow()

def unproject(rows,cols,depth,C,B,W,H,fov):
    lens=(H/2)/math.tan(math.radians(fov/2))
    uv=np.stack(((cols+.5-W/2)/lens, (H/2-rows-.5)/lens, np.ones(len(rows))),axis=1)
    return (uv*depth[:,None]) @ B + C

def painted_frame(f,W,H,shadow,animated=True,style="natural"):
    captured=None
    original=r.raster_triangle
    def capture(xy,depth,w,h,db,projection='perspective'):
        nonlocal captured
        if projection=='perspective':captured=db
        return original(xy,depth,w,h,db,projection)
    r.raster_triangle=capture
    try:rgb,oid,(C,T,fov)=r.frame(f,W,H,True,shadow)
    finally:r.raster_triangle=original
    assert captured is not None
    base=rgb.copy()
    if not animated:return base,oid,{}
    B=r.camera_basis(C,T)
    metrics={}
    sec=f/24
    start=3.45
    speed=2.36
    head=(sec-start)*speed
    for group,names in [('intake',('intake-fluid',)),('route',('connected-rill-water','rill-fall-water')),('basin',('recessed-basin','basin-water-marks'))]:
        match=np.isin(oid,[r.OBJECTS[n] for n in names])
        y,x=np.nonzero(match)
        metrics[group]={'visible':len(x),'excited':0}
        if not len(x):continue
        p=unproject(y,x,captured[y,x],C,B,W,H,fov)
        if group=='basin':
            X=p[:,0]-PTS[-1,0]; Z=p[:,2]-PTS[-1,2]
            rad=np.hypot(X,Z)
            v=np.zeros(len(x))
            for discharge in (0.,1.45,2.90):
                age=sec-start-OFFSET[-1]/speed-discharge
                if age>0:
                    swell=min(1,age*6)*np.exp(-age*.76)
                    radius=age*1.39
                    spec=np.exp(-((rad-radius)/.074)**2)
                    inner=np.exp(-((rad-radius+.14)/.052)**2)
                    v+=swell*(spec+.41*inner)
            if style=='natural':
                age=sec-start-OFFSET[-1]/speed
                v=np.zeros(len(x))
                if age>0:
                    # Impact and gravity ripples on the actual basin plane.
                    # Interference breaks the perfect graphic circle into low-contrast traveling arcs.
                    angle=np.arctan2(Z,X)
                    # The impact signature ebbs to a dimmer, wandering
                    # glancing highlight, not a permanent luminous dot.
                    impact=(.56*np.exp(-age*1.94)+.08)*(.82+.18*np.sin(age*22+angle*2))
                    center_x=.014*np.sin(age*13)
                    center_z=.016*np.sin(age*17+.38)
                    d0=np.exp(-(((X-center_x)/.102)**2+((Z-center_z)/.095)**2))
                    v+=d0*impact
                    deform=rad+.025*np.sin(angle*4-age*4)+.014*np.cos(angle*7+age*4.2)
                    # Early capillary ridges move away and disappear; a very
                    # shallow heartbeat of displaced fluid follows later.
                    for stagger, strength in ((0.,.84),(.24,.52),(.47,.35),(.82,.21),(1.15,.12)):
                        t=age-stagger
                        if t<=0:continue
                        radius=t*(1.12+.03*math.sin(stagger*10))
                        grain=(.53+.26*np.sin(5*angle+rad*8-age*3)+.19*np.cos(9*angle-age))
                        wave=np.exp(-((deform-radius)/(.016+.017*t))**2)
                        capillary=np.exp(-((deform-radius+.039)/(.014+.010*t))**2)
                        v+=np.exp(-t*1.6)*min(1.,t*12)*(wave+.25*capillary)*grain*strength
                add=v[:,None]*np.array([80,96,99])
            else:
                add=v[:,None]*np.array([91,175,144])
        else:
            indexes=range(1) if group=='intake' else range(1,4)
            choices=[]
            for i in indexes:
                t=np.clip(((p-PTS[i])*DEL[i]).sum(axis=1)/L[i]**2,0,1)
                dist=np.linalg.norm(p-PTS[i]-t[:,None]*DEL[i],axis=1)
                choices.append((dist,OFFSET[i]+t*L[i]))
            d,s=choices[0]
            for nd,ns in choices[1:]:
                select=nd<d
                d=np.where(select,nd,d)
                s=np.where(select,ns,s)
            v=np.zeros(len(x))
            for offset in (0.,1.45*speed,2.9*speed):
                h=head-offset
                if h<-.14:continue
                trailing=(h-s >= 0)
                v+=np.exp(-((h-s)/np.where(trailing,.82,.22))**2)
            spread=np.exp(-(d/(.45 if group=='intake' else .12))**2)
            active=np.clip((head+.07)*6,0,1)
            if style=='natural':
                # A path-resolved narrow crest and longitudinal broken filaments.
                past=head-s
                wet=np.clip(past*15,0,1)
                narrow=np.exp(-((past-.050)/.110)**2)*wet
                k=np.clip((head-.05)*5,0,1)
                u=np.where(p[:,0]<-1.53,p[:,2]-2.44,
                           .58*(p[:,0]+1.53)+.814*(p[:,2]-2.44))
                bend=.020*np.sin(s*11-sec*9)+.010*np.sin(s*23+sec*5)
                core=np.exp(-((u+bend)/.038)**2)
                split=np.exp(-((u-bend*.5-.041)/.017)**2)
                taper=np.exp(-np.maximum(0.,past)/1.65)
                slit=wet*(.27+.73*taper)*(.68*core+.32*split)
                q=(narrow*spread*k) * (.41+.59*core)
                if group=='intake':
                    slit=wet*(.16+.56*np.exp(-((past-.02)/.26)**2))*spread
                add=slit[:,None]*np.array([25,37,40])+q[:,None]*np.array([111,132,127])
                if group=='intake':
                    q0=wet*spread*np.exp(-((past-.34)/.39)**2)
                    add+=q0[:,None]*np.array([40,61,58])
            else:
                add=(v*spread*active)[:,None]*np.array([118,172,125])
        metrics[group]['excited']=int(np.count_nonzero(np.max(add,axis=1)>=19))
        rgb[y,x]=np.rint(np.clip(rgb[y,x].astype(float)+add,0,255)).astype(np.uint8)
    eligible=np.isin(oid,[r.OBJECTS[n] for n in ('intake-fluid','connected-rill-water','rill-fall-water','recessed-basin','basin-water-marks')])
    assert np.array_equal(base[~eligible],rgb[~eligible]), 'light escaped water materials'
    return rgb,oid,metrics

def clean_digest(oid):
    return sha256(oid.astype('<u2').tobytes()).hexdigest()

def main():
    pa=argparse.ArgumentParser()
    pa.add_argument('out',type=Path)
    pa.add_argument('--video',action='store_true')
    pa.add_argument('--width',type=int,default=640)
    pa.add_argument('--height',type=int,default=360)
    pa.add_argument('--style',choices=('natural','initial'),default='natural')
    pa.add_argument('--threads',type=int,default=4)
    args=pa.parse_args()
    W,H=args.width,args.height
    out=args.out;out.mkdir(parents=True)
    shadow=setup()
    evidence={}
    risk=(0,59,60,61,72,83,88,94,101,111,120,121,122,123,135,151,173)
    sheet=Image.new('RGB',(W*3,H*3))
    illustration=(72,83,88,94,101,111,122,135,173)
    for f in risk:
        im,ids,data=painted_frame(f,W,H,shadow,style=args.style)
        _,control,_=painted_frame(f,W,H,shadow,False)
        assert np.array_equal(ids,control)
        evidence[f]={'same_id_sha256':clean_digest(ids),'flow':data}
        if f in illustration:
            j=illustration.index(f);sheet.paste(Image.fromarray(im),(W*(j%3),H*(j//3)))
    sheet.resize((1200,675),Image.Resampling.LANCZOS).save(out/'proof.png')
    (out/'proof.json').write_text(json.dumps(evidence,indent=2)+'\n')
    if args.video:
        with subprocess.Popen(['ffmpeg','-v','error','-nostdin','-n','-f','rawvideo','-pix_fmt','rgb24',
                 '-s',f'{W}x{H}','-r','24','-i','pipe:0','-an','-c:v','libx264','-threads',str(args.threads),
                 '-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'ebb-flow.mp4')],
                 stdin=subprocess.PIPE) as proc:
            for f in range(174):
                rgb,_,_=painted_frame(f,W,H,shadow,style=args.style)
                proc.stdin.write(rgb.tobytes())
            proc.stdin.close()
            if proc.wait():raise RuntimeError('FFmpeg encoding failed')

if __name__=='__main__':main()

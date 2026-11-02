#!/usr/bin/env python3
"""ORDER, EMERGENT — standalone deterministic CPU motion-design trial.
No file I/O at import. render_frame(frame, config=None, layers=False) -> PIL image.
All object state is a pure function of time and seed. No browser/Remotion claimed.
"""
from __future__ import annotations
import argparse, json, math, os, subprocess, time
from dataclasses import dataclass, asdict
from pathlib import Path
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parent
TAU = 2 * np.pi

@dataclass(frozen=True)
class Config:
    width: int = 1920
    height: int = 1080
    fps: int = 30
    duration: float = 26.0
    seed: int = 20261027
    threads: int = 36
    samples: int = 256
    title: str = '从噪声到秩序'
    palette: tuple = ((255, 220, 167), (251, 169, 106), (238, 224, 197))
    grain: float = 0.40
    cjk_font: str = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
    cjk_font_index: int = 2
    latin_font: str = '/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf'

    def __post_init__(self):
        for name in ('width','height','fps','threads','samples','seed','cjk_font_index'):
            if type(getattr(self,name)) is not int: raise ValueError(f'{name} must be an integer')
        if not (128<=self.width<=4096 and 128<=self.height<=4096 and self.width%2==self.height%2==0):
            raise ValueError('width/height must be even integers in [128,4096]')
        if self.width*9!=self.height*16: raise ValueError('This specimen supports 16:9 only; a different aspect requires explicit composition redesign')
        if not 1<=self.fps<=120: raise ValueError('fps must be in [1,120]')
        if isinstance(self.duration,bool) or not isinstance(self.duration,(int,float)) or not math.isfinite(self.duration) or not 1<=self.duration<=600: raise ValueError('duration must be finite in [1,600] seconds')
        if abs(self.duration*self.fps-round(self.duration*self.fps))>1e-7: raise ValueError('duration*fps must be an integer frame count')
        if not 0<=self.seed<2**63: raise ValueError('seed must be in [0,2**63)')
        if not (6<=self.threads<=120 and 32<=self.samples<=1024): raise ValueError('threads in [6,120], samples in [32,1024] required')
        if type(self.palette) is not tuple or len(self.palette)!=3 or any(type(c) is not tuple or len(c)!=3 or any(type(v) is not int or not 0<=v<=255 for v in c) for c in self.palette):
            raise ValueError('palette must be an immutable tuple of three RGB integer tuples')
        if not isinstance(self.title,str) or not 1<=len(self.title)<=8: raise ValueError('title must contain 1–8 characters (short editorial title)')
        if isinstance(self.grain,bool) or not isinstance(self.grain,(int,float)) or not math.isfinite(self.grain) or not 0<=self.grain<=4: raise ValueError('grain must be finite in [0,4]')
        if self.cjk_font_index<0: raise ValueError('font collection index cannot be negative')

DEFAULT = Config()

def smooth(x):
    x = np.clip(x, 0, 1)
    return x*x*x*(x*(x*6-15)+10)

def span(t, a, b): return smooth((t-a)/(b-a))
def mix(a,b,k): return a*(1-k)+b*k

def rot_x(a):
    c,s=np.cos(a),np.sin(a)
    return np.array([[1,0,0],[0,c,-s],[0,s,c]],dtype=np.float32)

def rot_y(a):
    c,s=np.cos(a),np.sin(a)
    return np.array([[c,0,s],[0,1,0],[-s,0,c]],dtype=np.float32)

def rot_z(a):
    c,s=np.cos(a),np.sin(a)
    return np.array([[c,-s,0],[s,c,0],[0,0,1]],dtype=np.float32)

@lru_cache(maxsize=8)
def identity_data(cfg: Config):
    rng=np.random.default_rng(cfg.seed)
    g,j,k=np.meshgrid(np.arange(3),np.arange(cfg.threads),np.arange(cfg.samples),indexing='ij')
    g=g.reshape(-1);j=j.reshape(-1);k=k.reshape(-1)
    n=len(g)
    u=(k+rng.uniform(-.16,.16,n))/cfg.samples
    v=TAU*(j+rng.uniform(-.12,.12,n))/cfg.threads
    rnd=rng.normal(0,1,(n,3)).astype(np.float32)
    # A broad, filamentary volume: not a random 2D star texture.
    a=TAU*u
    noise=np.stack([4.2*(u-.5)*2 + .40*rnd[:,0],
      (.7+.8*(1-u))*np.sin(.75*a-.8)+.40*np.cos(2*a+v)+.58*rnd[:,1],
      1.3*np.cos(a*.85)+.48*np.sin(2*a+v)+.74*rnd[:,2]],axis=1)
    b=rng.uniform(.15,1,n)**2
    bright=rng.random(n)>.991
    b[bright]=rng.uniform(2.0,4.5,bright.sum())
    result={'id':np.arange(n),'g':g,'j':j,'u':u,'v':v,'rnd':rnd,'noise':noise.astype(np.float32),'brightness':b.astype(np.float32),'bright':bright}
    for value in result.values(): value.flags.writeable=False
    return result

def model_state(t: float, cfg: Config=DEFAULT):
    """Stable particle IDs + authored parameterized positions, not a fluid simulation."""
    d=identity_data(cfg);u=d['u'];v=d['v'];g=d['g'];rnd=d['rnd']
    phase=TAU*(u + .008*t)
    noise=d['noise'].copy()
    noise[:,1]+=.12*np.sin(.4*t+phase*2)
    noise[:,2]+=.15*np.cos(.3*t+v)
    radius=(.24+.06*np.sin(phase*2+g))*np.maximum(.025,np.sin(np.pi*u))**.65
    stream=np.stack([8.4*(u-.5), .65*np.sin(phase+.2*t)+radius*np.cos(v+phase*2+g*.7),
        .45*np.sin(phase*2)+radius*np.sin(v+phase*2+g*.7)],axis=1)
    # Coherence travels left-to-right, so capture has visible cause and delay.
    capture=smooth((t-(3.4+u*1.6+(d['j']%13==0)*1.4))/2.8)[:,None]
    pos=mix(noise,stream,capture)
    toroids=np.empty_like(pos)
    centers=np.array([[-2.6,.55,.2],[.25,1.05,-.75],[2.65,-.52,.65]],dtype=np.float32)
    for group in range(3):
        m=g==group;a=phase[m]+group*.17;vv=v[m]
        rr=[.98,1.13,1.22][group]+.155*np.cos(vv)+.035*np.sin(3*a+.3*t+group)*np.sin(vv)
        local=np.stack([rr*np.cos(a),rr*np.sin(a),.155*np.sin(vv)],axis=1)
        rotation=rot_y([.22,-.32,.30][group])@rot_x([.75,1.1,.93][group])@rot_z(.10*np.sin(t*.25+group))
        toroids[m]=local@rotation.T+centers[group]
    form=span(t,8.0,12.0)
    # A handful of loose motes have longer capture paths, not a perfect solid wall.
    scatter=(np.abs(rnd[:,0])**2*.035)[:,None]*rnd
    scatter[d['j']%6==0]=0  # Connected contour identities remain smooth; loose motes may scatter.
    toroids+=scatter
    pos=mix(pos,toroids,form)
    # The three preserved populations phase-lock into one common orbital surface.
    a=phase+g*.14*(1-span(t,17,21))
    rr=2.14+(g-1)*.055+.15*np.cos(v)+.025*np.sin(a*3+.3*t)*np.sin(v)
    final=np.stack([rr*np.cos(a),rr*np.sin(a),.15*np.sin(v)+(g-1)*.065],axis=1)
    final=final@(rot_y(.14)@rot_x(-1.07)).T
    final+=scatter*.60
    final[:,0]+=1.08*span(t,19,23)
    join=span(t,15.8,21.0)
    join_times=np.array([16.1,14.8,17.0])[g]
    local_join=smooth((t-join_times)/4.1)[:,None]
    pos=mix(pos,final,local_join)
    # Vanishing disorder is shared by point and contour geometry.
    wobble=.015*(1-form)+.008*(1-join)
    pos+=wobble*rnd*np.sin(t*.7+v)[:,None]
    return {'positions':pos.astype(np.float32),'capture':capture[:,0], 'form':float(form),'join':float(join), 'ids':d['id'].copy()}

def camera(t,cfg=DEFAULT):
    # Continuous authored blocking: wide volume -> along-flow -> three forms ->
    # selected central arc close-up -> wide oblique reveal. Real perspective.
    keys=np.array([
      [0,-.20,14.3,1.5,0,0], [4,-.18,13.4,.9,-.3,0],
      [7.5,1.04,9.0,.55,.70,.10], [11,.12,13.1,2.7,0,.10],
      [12.5,-.12,12.8,2.3,0,.1], [15.4,.48,6.7,1.65,.25,.85],
      [18,.78,10.2,2.0,.15,.2], [21,.22,11.4,1.45,0,0],
      [24,.08,11.6,1.45,0,0], [26,.02,11.6,1.45,0,0]],dtype=np.float32)
    k=int(np.clip(np.searchsorted(keys[:,0],t)-1,0,len(keys)-2))
    a,b=keys[k],keys[k+1];v=mix(a[1:],b[1:],span(t,float(a[0]),float(b[0])))
    yaw,distance,height,tx,ty=v
    target=np.array([tx,ty,0],dtype=np.float32)
    eye=np.array([np.sin(yaw)*distance+tx,height,np.cos(yaw)*distance],dtype=np.float32)
    fwd=(target-eye);fwd/=np.linalg.norm(fwd)
    right=np.cross(fwd,[0,1,0]);right/=np.linalg.norm(right)
    up=np.cross(right,fwd)
    mat=np.stack([right,up,fwd])
    return eye,mat,cfg.width*1.03

def project(p,t,cfg=DEFAULT):
    eye,mat,f=camera(t,cfg)
    q=(p-eye)@mat.T
    xy=np.stack([cfg.width*.5+f*q[:,0]/q[:,2],cfg.height*.47-f*q[:,1]/q[:,2]],axis=1)
    return xy,q[:,2]

@lru_cache(maxsize=8)
def background(cfg):
    h,w=cfg.height,cfg.width
    y,x=np.mgrid[0:h,0:w].astype(np.float32);x=x/w;y=y/h
    haze=np.exp(-(((x-.50)/.44)**2+((y-.44)/.53)**2)*2)
    warmer=np.exp(-(((x-.70)/.24)**2+((y-.49)/.34)**2)*2)
    rgb=np.zeros((h,w,3),np.float32)
    rgb[:]=[8.0,9.0,10.0]
    rgb+=haze[...,None]*np.array([9,7.5,6],np.float32)
    rgb+=warmer[...,None]*np.array([4.2,1.7,.4],np.float32)
    rng=np.random.default_rng(cfg.seed+6)
    grain=rng.normal(0,cfg.grain,(h,w)).astype(np.float32)
    rgb+=grain[...,None]
    return rgb

@lru_cache(maxsize=32)
def font(size,kind='sans',custom_path=None,index=None):
    names={'serif':'/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc', 'sans':'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'latin':'/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf', 'italic':'/usr/share/fonts/opentype/urw-base35/P052-Italic.otf'}
    return ImageFont.truetype(custom_path or names[kind],size,index=(2 if kind in ('sans','serif') else 0) if index is None else index)

def text_tracked(draw,xy,text,ft,fill,tracking):
    x,y=xy
    for ch in text:
        draw.text((x,y),ch,font=ft,fill=fill)
        x+=draw.textlength(ch,font=ft)+tracking

@lru_cache(maxsize=24)
def text_plate(cfg,key):
    # Text is rendered at 2x, then downsampled; no blurry particle bloom on letters.
    im=Image.new('RGBA',(cfg.width*2,cfg.height*2));d=ImageDraw.Draw(im)
    s=cfg.width/1920*2; x=int(140*s)
    if key=='final':
        d.text((x,int(690*s)),cfg.title,font=font(int(78*s),'serif',cfg.cjk_font,cfg.cjk_font_index),fill=(237,224,200,255))
        text_tracked(d,(x,int(800*s)),'ORDER, EMERGENT',font(int(17*s),'latin',cfg.latin_font,0),(173,148,120,255),3.2*s)
    else:
        labels={'noise':('01','离散'),'cohere':('02','共振')}
        num,txt=labels[key]
        d.line([(x,int(883*s)),(x+int(38*s),int(883*s))],fill=(152,117,81,255),width=max(1,int(s)))
        text_tracked(d,(x+55*s,int(867*s)),num,font(int(15*s),'latin',cfg.latin_font,0),(178,154,125,255),1.5*s)
        d.text((x,int(913*s)),txt,font=font(int(41*s),'serif',cfg.cjk_font,cfg.cjk_font_index),fill=(224,212,192,255))
    return im.resize((cfg.width,cfg.height),Image.Resampling.LANCZOS)

def sphere_layer(t,cfg):
    """Ray/sphere intersection: analytic depth used to occlude rear light strands."""
    h,w=cfg.height,cfg.width;eye,mat,f=camera(t,cfg)
    appear=span(t,17.0,20.2)
    center=np.array([1.08*span(t,19,23),0,0],dtype=np.float32)
    rad=.97*appear
    rgb=np.zeros((h,w,3),np.float32); depth=np.full((h,w),np.inf,np.float32);alpha=np.zeros((h,w),np.float32)
    if rad<.01:return rgb,depth,alpha
    cc=(center-eye)@mat.T
    sx=w*.5+f*cc[0]/cc[2];sy=h*.47-f*cc[1]/cc[2]
    rpx=f*rad/cc[2]*1.08
    x0=max(0,int(sx-rpx)-2);x1=min(w,int(sx+rpx)+3);y0=max(0,int(sy-rpx)-2);y1=min(h,int(sy+rpx)+3)
    y,x=np.mgrid[y0:y1,x0:x1].astype(np.float32)
    dx=(x-w*.5)/f;dy=-(y-h*.47)/f
    aa=dx*dx+dy*dy+1; bb=dx*cc[0]+dy*cc[1]+cc[2]
    disc=bb*bb-aa*(np.dot(cc,cc)-rad*rad)
    valid=disc>=0;z=(bb-np.sqrt(np.maximum(disc,0)))/aa
    p=np.stack([dx*z-cc[0],dy*z-cc[1],z-cc[2]],axis=-1)/rad
    light=np.array([-.48,.68,-.55]);light/=np.linalg.norm(light)
    diffuse=np.maximum(0,p@light)
    rim=np.clip(1-np.abs(p[...,2]),0,1)**5
    # Almost-black, physically occluding core; grazing copper edge, not a UI circle.
    col=np.array([8.8,9.2,9.8])+diffuse[...,None]*np.array([22,16.2,10.3])+rim[...,None]*np.array([58,31,13])
    rgb[y0:y1,x0:x1]=col*valid[...,None]
    depth[y0:y1,x0:x1]=np.where(valid,z,np.inf)
    alpha[y0:y1,x0:x1]=valid
    return rgb,depth,alpha

def splat(xy,depth,energy,cfg,occlusion=None):
    h,w=cfg.height,cfg.width
    x=xy[:,0];y=xy[:,1]
    valid=(x>1)&(x<w-2)&(y>1)&(y<h-2)&(depth>1)
    if occlusion is not None:
        ix=np.clip(x.astype(np.int32),0,w-1);iy=np.clip(y.astype(np.int32),0,h-1)
        valid &= depth<occlusion[iy,ix]+.01
    x=x[valid];y=y[valid];en=energy[valid]
    x0=x.astype(np.int32);y0=y.astype(np.int32);fx=x-x0;fy=y-y0
    out=np.zeros((h*w,3),np.float32)
    for xx,yy,weight in [(x0,y0,(1-fx)*(1-fy)),(x0+1,y0,fx*(1-fy)),(x0,y0+1,(1-fx)*fy),(x0+1,y0+1,fx*fy)]:
        np.add.at(out,yy*w+xx,en*weight[:,None])
    return out.reshape(h,w,3)

def line_layer(t,xy,dep,state,occ,cfg):
    im=Image.new('RGB',(cfg.width,cfg.height));d=ImageDraw.Draw(im)
    form=state['form'];join=state['join']
    strength=(.08+.26*form)*span(t,8.4,10.0)*(cfg.width/1920)
    # Same exact particle positions yield luminous contour threads; no detached decoration.
    pp=xy.reshape(3,cfg.threads,cfg.samples,2);zz=dep.reshape(3,cfg.threads,cfg.samples)
    for g in range(3):
        color=np.array(cfg.palette[g])
        for j in range(0,cfg.threads,6):
            p=pp[g,j];z=zz[g,j]
            for st in range(0,cfg.samples-1,16):
                pts=p[st:st+17];zs=z[st:st+17]
                v=(pts[:,0]>=0)&(pts[:,0]<cfg.width)&(pts[:,1]>=0)&(pts[:,1]<cfg.height)&(zs>1)
                ix=np.clip(pts[:,0].astype(int),0,cfg.width-1);iy=np.clip(pts[:,1].astype(int),0,cfg.height-1)
                v &= zs < occ[iy,ix]+.01
                b=strength*(.05+.95*(.5+.5*np.sin(st/cfg.samples*TAU+t*.35+g))**8)*(13/max(float(zs.mean()),7))**2
                guide=(g==1 and j==0)
                if guide:
                    lead=span(t,12.3,13.2)*(1-span(t,22,24))
                    b+=lead*(.60+1.6*np.exp(-((st/cfg.samples-((t*.13)%1))/.10)**2))
                c=tuple(np.clip(color*b,0,255).astype(int))
                if np.all(v):d.line([tuple(q) for q in pts],fill=c,width=1)
                elif np.any(v):
                    for k in range(len(pts)-1):
                        if v[k] and v[k+1]:d.line([tuple(pts[k]),tuple(pts[k+1])],fill=c,width=1)
    # Quiet perspective contours under the early field, fading when coherence takes over.
    floor_amount=.72*span(t,1.2,3)*(1-span(t,10,13))
    if floor_amount>0:
        for j in range(22):
            x=np.linspace(-7,7,100);z=np.full_like(x,(j-11)*.48)
            y=-2.15+.10*np.sin(x*.9+z*.4)
            p,zp=project(np.stack([x,y,z],axis=1),t,cfg)
            v=(zp>1)&(p[:,0]>-200)&(p[:,0]<cfg.width+200)&(p[:,1]>0)&(p[:,1]<cfg.height)
            if np.all(v):d.line([tuple(q) for q in p],fill=tuple(int(c*floor_amount) for c in [85,62,40]),width=1)
    return np.asarray(im,dtype=np.float32)

@lru_cache(maxsize=16)
def preflight(cfg: Config):
    """No downloads; fail visibly for missing fonts or Chinese glyph coverage."""
    from fontTools.ttLib import TTFont
    for path in (cfg.cjk_font,cfg.latin_font):
        if not Path(path).is_file():
            raise FileNotFoundError(f'Font not found: {path}. Set Config(cjk_font=..., cjk_font_index=..., latin_font=...) to legally installed local fonts; no implicit download is attempted.')
    face=TTFont(cfg.cjk_font,fontNumber=cfg.cjk_font_index,lazy=True)
    cmap=face.getBestCmap(); missing=sorted(set(cfg.title+'离散共振')-{chr(c) for c in cmap});face.close()
    if missing: raise ValueError(f'CJK font is missing required glyphs: {missing}; choose a local CJK font with full coverage.')
    return True

def reject_symlinks(path):
    path=Path(path).absolute()
    for part in (path,*path.parents):
        if part.is_symlink(): raise ValueError(f'Output paths must not include symlinks: {part}')
    return path

def require_new_file(path):
    path=reject_symlinks(path)
    if path.exists(): raise FileExistsError(f'Refusing to overwrite existing output: {path}. Choose a new filename/directory.')
    path.parent.mkdir(parents=True,exist_ok=True)
    return path


def render_frame(frame: int,cfg: Config|None=None,layers: bool=False):
    cfg=cfg or DEFAULT
    preflight(cfg)
    if type(frame) is not int or not 0<=frame<round(cfg.duration*cfg.fps):
        raise ValueError('frame must be an integer in [0, duration*fps); no silent clamp')
    t=float(frame)/cfg.fps*26/cfg.duration
    state=model_state(t,cfg);data=identity_data(cfg);xy,dep=project(state['positions'],t,cfg)
    sphere,occ,alpha=sphere_layer(t,cfg)
    # Luminance is transported along each stable particle's u-coordinate.
    u=data['u'];g=data['g'];cap=state['capture'];join=state['join']
    wave=np.exp(-((u-((t*.18)%1))/.045)**2)
    gain=(.09+data['brightness']**1.7*2.25)*(1+.6*wave)*(.50+.50*cap)
    gain*=np.clip((13/dep)**2,.25,2.5)
    material=max(state['form'],float(span(t,5.8,7.3)))
    gain*=1-.56*material
    gain*=1-state['form']*.72*(.5+.5*np.sin(TAU*u+t*.35+g))
    gain*=(cfg.width/1280)**2
    selected=span(t,12.5,14.2)*(1-span(t,17,20))
    gain*=np.where(g==1,1+selected*1.8,1-selected*.68)
    # Sparse bright motes survive the darker material, rather than whitening every point.
    gain+=data['bright']*(2.6+2.8*state['form'])*(cfg.width/1280)**2
    ridge=(data['j']%12==0).astype(float)
    gain*=1+ridge*3.0*state['form']
    filaments=.07+.93*(.5+.5*np.sin(data['v']*3+g*.7))**9
    density_gaps=.12+.88*(.5+.5*np.sin(TAU*u*2.0+data['v']*.22))**2
    gain*=1-material+material*(filaments*density_gaps*3.2)
    stream_front=(t-5.8)/2.6
    gain+=np.exp(-((u-stream_front)/.055)**2)*1.4*material*(1-state['form'])*(cfg.width/1280)**2
    wave_capture=np.exp(-((t-(4.8+u*1.6))/.32)**2)
    gain+=wave_capture*.85*(1-state['form'])*(cfg.width/1280)**2
    # Keep rare point cores distinct even inside dark gaps.
    gain+=data['bright']*3.8*state['form']*(cfg.width/1280)**2
    # Highlights stay selective: a few white cores, copper halo, crisp small particles.
    colors=np.array(cfg.palette,dtype=np.float32)[g]
    en=colors*gain[:,None]*1.04
    pts=splat(xy,dep,en,cfg,occ)
    # Bilinear splat + a 0.38px optical footprint preserves high-density detail.
    crisp=gaussian_filter(pts,(.38,.38,0),mode='constant')
    lines=line_layer(t,xy,dep,state,occ,cfg)
    energy=crisp+lines*.70
    # Spectral bloom only from emissive geometry. No global soft-focus filter.
    small=Image.fromarray(np.clip(energy,0,255).astype(np.uint8)).resize((cfg.width//3,cfg.height//3),Image.Resampling.BILINEAR)
    glow=np.asarray(small.filter(ImageFilter.GaussianBlur(2.0)).resize((cfg.width,cfg.height),Image.Resampling.BILINEAR),dtype=np.float32)
    halo=np.asarray(small.filter(ImageFilter.GaussianBlur(10.0)).resize((cfg.width,cfg.height),Image.Resampling.BILINEAR),dtype=np.float32)
    emitted=energy + glow*.65 + halo*.72
    # A moving coherence focus follows the actual selected contour in 3D.
    # It illuminates, then organizes; it is not a disconnected screen-space sun.
    focus_amount=span(t,12.3,13.0)*(1-.35*span(t,23,26))
    if focus_amount>0:
        path=(.63+t*.027)%1*cfg.samples
        i0=cfg.threads*cfg.samples+int(path);i1=cfg.threads*cfg.samples+(int(path)+1)%cfg.samples
        p=mix(state['positions'][i0],state['positions'][i1],path%1)[None,:]
        qq,dd=project(p,t,cfg);cx,cy=qq[0];sc=cfg.width/1280
        ix,iy=int(cx),int(cy)
        if 0<=ix<cfg.width and 0<=iy<cfg.height and dd[0]<occ[iy,ix]:
            rr=int(68*sc);x0=max(0,ix-rr);x1=min(cfg.width,ix+rr+1);y0=max(0,iy-rr);y1=min(cfg.height,iy+rr+1)
            yy,xx=np.mgrid[y0:y1,x0:x1];r2=(xx-cx)**2+(yy-cy)**2
            local=(np.exp(-r2/(2*(1.6*sc)**2))*400 + np.exp(-r2/(2*(6*sc)**2))*60 + np.exp(-r2/(2*(24*sc)**2))*12)*focus_amount
            emitted[y0:y1,x0:x1]+=local[...,None]*np.array([1,.78,.50])

    base=background(cfg).copy();base=base*(1-alpha[...,None])+sphere
    # Warm but restrained bloom, photographic highlight compression.
    rgb=base+emitted
    rgb=255*(1-np.exp(-np.maximum(rgb,0)/255))
    fade=span(t,0,.85)*(1-.42*span(t,25,26))
    rgb*=fade
    im=Image.fromarray(np.clip(rgb,0,255).astype(np.uint8))
    if t<6:
        opacity=span(t,1.3,2.2)*(1-span(t,4.3,5.2));key='noise'
    elif t<18:
        opacity=span(t,10.6,11.5)*(1-span(t,14.3,15.4));key='cohere'
    else:
        opacity=span(t,21.0,22.4)*(1-.30*span(t,25,26));key='final'
    plate=text_plate(cfg,key).copy();plate.putalpha(plate.getchannel('A').point(lambda x:int(x*opacity)))
    im=Image.alpha_composite(im.convert('RGBA'),plate).convert('RGB')
    if layers:
        # Explicit layer interface. Additive emission requires compositor interpretation.
        return {'composite':im,'emission':Image.fromarray(np.clip(emitted,0,255).astype(np.uint8)), 'core_alpha':Image.fromarray((alpha*255).astype(np.uint8)), 'typography':plate, 'background':Image.fromarray(np.clip(base,0,255).astype(np.uint8))}
    return im

def keyframes(cfg,out):
    out=reject_symlinks(out)
    if out.exists() and any(out.iterdir()): raise FileExistsError(f'Keyframe output directory must be empty: {out}')
    out.mkdir(parents=True,exist_ok=True);ts=[1.8,5.2,7.5,11.3,13.3,15.4,18.8,22.8,24]
    panels=[];start=time.perf_counter()
    for tt in ts:
        im=render_frame(round(tt/26*cfg.duration*cfg.fps),cfg);im.save(out/f'frame_{tt:04.1f}.png')
        thumb=im.resize((640,360),Image.Resampling.LANCZOS);d=ImageDraw.Draw(thumb);d.text((14,12),f'{tt:04.1f}s',fill=(150,140,123),font=font(16,'latin',cfg.latin_font,0));panels.append(thumb)
    sheet=Image.new('RGB',(3*640,3*360))
    for i,p in enumerate(panels):sheet.paste(p,((i%3)*640,(i//3)*360))
    sheet.save(out/'contact_sheet.png')
    return {'frames':ts,'seconds':time.perf_counter()-start}

def render_video(cfg,out,workers=1):
    preflight(cfg)
    out=require_new_file(out)
    if type(workers) is not int or not 1<=workers<=16: raise ValueError('workers must be an integer in [1,16]')
    cmd=['ffmpeg','-n','-hide_banner','-loglevel','warning','-f','rawvideo','-vcodec','rawvideo','-pixel_format','rgb24','-video_size',f'{cfg.width}x{cfg.height}','-framerate',str(cfg.fps),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    start=time.perf_counter();count=int(round(cfg.duration*cfg.fps))
    try:
        if workers>1:
            from concurrent.futures import ProcessPoolExecutor
            # bounded batch controls memory and leaves predictable frame order.
            with ProcessPoolExecutor(max_workers=workers) as pool:
                for begin in range(0,count,workers*3):
                    futures=[pool.submit(_frame_bytes,i,cfg) for i in range(begin,min(begin+workers*3,count))]
                    for future in futures:p.stdin.write(future.result())
                    if begin%(workers*30)==0:print(json.dumps({'frame':begin,'of':count,'elapsed':round(time.perf_counter()-start,2)}),flush=True)
        else:
            for i in range(count):
                p.stdin.write(render_frame(i,cfg).tobytes())
                if i%30==0:print(json.dumps({'frame':i,'of':count,'elapsed':round(time.perf_counter()-start,2)}),flush=True)
    finally:p.stdin.close()
    ret=p.wait()
    if ret:raise RuntimeError(f'ffmpeg failed: {ret}')
    return {'frames':count,'render_seconds':time.perf_counter()-start,'output':str(out),'config':asdict(cfg)}

def _frame_bytes(i,cfg):return render_frame(i,cfg).tobytes()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('mode',choices=['keyframes','render','frame']);ap.add_argument('--width',type=int,default=1920);ap.add_argument('--height',type=int,default=1080);out_group=ap.add_mutually_exclusive_group(required=True);out_group.add_argument('--out',type=Path);ap.add_argument('--workers',type=int,default=1);ap.add_argument('--time',type=float,default=24)
    ap.add_argument('--fps',type=int,default=30);ap.add_argument('--duration',type=float,default=26.0);ap.add_argument('--seed',type=int,default=20261027)
    ap.add_argument('--cjk-font');ap.add_argument('--cjk-font-index',type=int,default=2);ap.add_argument('--latin-font');out_group.add_argument('--out-dir',type=Path)
    a=ap.parse_args();kwargs=dict(width=a.width,height=a.height,fps=a.fps,duration=a.duration,seed=a.seed,cjk_font_index=a.cjk_font_index)
    if a.cjk_font:kwargs['cjk_font']=a.cjk_font
    if a.latin_font:kwargs['latin_font']=a.latin_font
    cfg=Config(**kwargs);preflight(cfg)
    if a.out_dir and a.out:raise ValueError('Use --out-dir or --out, not both')
    if a.out_dir:
        a.out_dir=reject_symlinks(a.out_dir)
        if a.out_dir.exists() and any(a.out_dir.iterdir()):raise FileExistsError('--out-dir must be new or empty')
        a.out_dir.mkdir(parents=True,exist_ok=True)
        a.out=a.out_dir if a.mode=='keyframes' else a.out_dir/({'render':'order_emergent_silent.mp4','frame':'cover.png'}[a.mode])
    if a.mode=='keyframes':result=keyframes(cfg,a.out or ROOT/'keyframes')
    elif a.mode=='frame':
        render_frame(round(a.time*cfg.fps),cfg).save(require_new_file(a.out or ROOT/'cover.png'));result={'time':a.time}
    else:result=render_video(cfg,a.out or ROOT/'order_emergent_silent.mp4',a.workers)
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()

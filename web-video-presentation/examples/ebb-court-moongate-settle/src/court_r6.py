#!/usr/bin/env python3
"""Ebb Court — editable geometry, CPU perspective/depth, shared clay/finish camera."""
from dataclasses import dataclass
from pathlib import Path
import argparse, json, math
from hashlib import sha256
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OBJECTS = {}
MESH = []
V = np.array
SUN = V([-0.53, 0.76, -0.39])
SUN = SUN / np.linalg.norm(SUN)
MATS = {
  'soil': (67,66,59), 'plinth': (160,152,126), 'stone': (220,202,172),
  'cap': (239,223,189), 'slate': (93,113,108), 'bronze': (180,130,80),
  'bronze_dark': (117,82,52), 'pier': (184,166,138), 'channel_top': (54,148,138),
  'pool': (43,116,126), 'ripples': (105,169,161), 'dark': (58,67,65),
  'foliage': (88,113,77), 'foliage2': (120,137,87), 'trunk': (115,91,68),
  'aggregate': (167,154,128), 'light_strip': (246,196,123),
  'trim': (208,157,100), 'travertine': (228,201,172),
}
SCREEN_FACES = set()
FRAGMENT_FINISH = None
KEYS = (0,32,64,100,143,173)
TOTAL_FRAMES = 174
HERO_HOLD_START = 144
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

@dataclass
class Tri:
  verts: np.ndarray
  normal: np.ndarray
  mat: str
  oid: int

def norm(x):
  return x/np.linalg.norm(x)

def tri(points, mat, name):
  a,b,c=V(points,dtype=float)
  MESH.append(Tri(V([a,b,c]),norm(np.cross(b-a,c-a)),mat,OBJECTS.setdefault(name,len(OBJECTS)+1)))

def quad(a,b,c,d,mat,name):
  tri((a,b,c),mat,name); tri((a,c,d),mat,name)

def box(x,y,z,w,h,d, mat, name, top=None):
  x0,x1=x-w/2,x+w/2;y0,y1=y-h/2,y+h/2;z0,z1=z-d/2,z+d/2
  a,b,c,e=(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1)
  A,B,C,E=(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)
  quad(a,b,c,e,mat,name); quad(A,E,C,B,top or mat,name)
  quad(a,A,B,b,mat,name)
  quad(e,c,C,E,mat,name); quad(a,e,E,A,mat,name); quad(c,b,B,C,mat,name)

def plane(x,y,z,w,d,mat,name):
  a,b,c,e=(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2)
  quad(a,e,c,b,mat,name)

def bar(a,b,width,height,mat,name):
  a,b=V(a,float),V(b,float)
  off=norm(np.cross(V([0,1,0]),b-a))*width/2
  up=V([0,height/2,0])
  p,q,s,t=a-off,b-off,b+off,a+off
  quad(p+up,q+up,s+up,t+up,mat,name) 
  quad(p-up,p+up,t+up,t-up,mat,name)
  quad(q-up,s-up,s+up,q+up,mat,name)
  quad(p-up,q-up,q+up,p+up,mat,name)
  quad(s-up,t-up,t+up,s+up,mat,name)

def plant(x,z,name):
  rng=np.random.default_rng(sum(ord(c) for c in name))
  box(x,.82,z,.15,1.66,.15,'trunk',name)
  for j in range(32):
    a=j*2.4
    y=1.65+rng.uniform(.0,1.25)
    rad=(1.14-abs(y-2.28)*.48)*rng.uniform(.35,1)
    cx,cz=x+math.cos(a)*rad,z+math.sin(a)*rad
    w=rng.uniform(.28,.48)
    p=(cx, y+.39,cz);q=(cx,y-.29,cz)
    ring=[(cx+w*math.cos(math.pi*k/2+a),y,cz+w*math.sin(math.pi*k/2+a)) for k in range(4)]
    for k in range(4):
      l=(k+1)%4
      tri((p,ring[l],ring[k]),'foliage' if j%3 else 'foliage2',name)
      tri((q,ring[k],ring[l]),'foliage2' if j%3==1 else 'foliage',name)

def scene():
  plane(0,-.31,0,22,19,'soil','arrival-ground')
  box(0,-.20,0,12.75,.29,9.70,'plinth','base-plinth')
  box(0,-.036,0,12.44,.10,9.35,'plinth','court-deck','stone')
  # Sidewalk and steps are separate real volumes, not screen-position planes.
  for i in range(3):
    box(3.52,-.26+i*.075,-5.34+i*.21,3.31,.105,.36,'plinth','stepped-arrival','cap')
  # Pool sits between paired limestone ledges; the cyan surface is recessed.
  box(1.55,.100,1.55,5.45,.18,3.53,'slate','pool-underlay')
  plane(1.55,.199,1.55,5.08,3.17,'pool','recessed-basin')
  for x in (-1.14,4.24):
    box(x,.205,1.55,.28,.30,3.79,'plinth','pool-coping','cap')
  for z in (-.24,3.34):
    box(1.55,.205,z,5.1,.30,.25,'plinth','pool-coping','cap')
  # Subtle tessellated reflectance lines remain fixed to the water geometry.
  for j in range(14):
    rng=np.random.default_rng(93+j)
    x=rng.uniform(-.69,3.82); z=rng.uniform(.02,3.04); l=rng.uniform(.14,.63)
    if x+l>3.97:l=3.97-x
    if l>0:
      plane(x+l/2,.202,z,l,.027,'ripples','basin-water-marks')
  # Rear elevated intake, two bent continuous bronze channels, physical fall.
  box(-3.82,.55,2.45,1.83,1.02,1.31,'pier','elevated-intake','cap')
  box(-3.95,1.09,2.45,1.39,.15,.91,'bronze_dark','intake-reservoir','bronze')
  plane(-3.95,1.17,2.45,1.18,.72,'channel_top','intake-fluid')
  # Channel A travels across the back of the front screen.
  bar((-3.82,1.04,2.44),(-1.52,.75,2.44),.47,.14,'bronze','rill-structure')
  bar((-3.81,1.04,2.61),(-1.54,.75,2.61),.045,.19,'bronze_dark','rill-sides')
  bar((-3.81,1.04,2.27),(-1.54,.75,2.27),.045,.19,'bronze_dark','rill-sides')
  bar((-3.82,1.14,2.44),(-1.52,.85,2.44),.27,.031,'channel_top','connected-rill-water')
  box(-2.34,.38,2.44,.20,.76,.48,'bronze_dark','rill-support')
  box(-1.61,.32,2.44,.20,.64,.52,'bronze_dark','rill-support')
  bar((-1.54,.75,2.44),(-.62,.59,1.76),.44,.14,'bronze','rill-structure')
  bar((-1.54,.85,2.44),(-.66,.69,1.79),.27,.031,'channel_top','connected-rill-water')
  bar((-.68,.69,1.80),(-.53,.212,1.64),.19,.025,'channel_top','rill-fall-water')
  # Perimeter enclosure, with a near occluder articulated by three stone fins.
  box(-2.72,1.18,-2.49,4.91,2.32,.36,'travertine','arrival-screen','cap')
  for i in range(8):
    box(-5.02+i*.65,1.15,-2.72,.105,2.17,.20,'pier','screen-fins','stone')
    if i in (1,4,7):
      box(-5.001+i*.65,1.25,-2.823,.036,1.80,.025,'trim','screen-inlay')
      box(-4.983+i*.65,1.25,-2.839,.015,1.73,.013,'light_strip','screen-inlay')
  box(-2.72,2.39,-2.45,5.14,.15,.61,'pier','screen-coping','cap')
  box(-2.72,2.386,-2.764,5.16,.025,.018,'trim','screen-coping')
  box(-4.76,.14,-3.36,1.76,.23,.38,'slate','arrival-bench','aggregate')
  for x in (-4.3,-2.95,-1.60):
    box(x,.22,-2.75,.45,.045,.055,'light_strip','slot-light')
  box(-5.78,1.00,.65,.28,1.95,6.13,'pier','left-perimeter','stone')
  box(-1.63,.85,4.42,8.44,1.66,.30,'pier','back-perimeter','stone')
  # North arcade. Its open bays and long roof provide legible depth cues.
  for x in (1.40,2.94,4.48,5.91):
    box(x,1.40,3.93,.17,2.77,.20,'bronze_dark','arcade-columns','bronze')
  box(3.64,2.92,3.90,4.88,.20,1.09,'pier','arcade-roof','cap')
  for j in range(18):
    box(1.35+j*.266,2.817,3.60,.055,.062,.82,'bronze','soffit-slats')
  # Geometric pavement joints set perspective without needing textures.
  for x in np.arange(-5.30,6.0,.74):
    for z,dep in ((-3.79,1.68),(-1.02,.82)):
      plane(float(x),.016,z,.016,dep,'aggregate','pavement-joints')
  for z in (-4.53,-3.92,-3.28,-1.46,-.70):
    plane(.12,.019,z,11.82,.013,'aggregate','pavement-joints')
  # Deliberate slivers of shade stack under sparse olive crowns.
  box(5.25,.10,.96,1.34,.20,2.07,'slate','right-planter','aggregate')
  box(-4.55,.10,2.95,1.42,.20,2.16,'slate','left-planter','aggregate')
  plant(5.23,.95,'olive-east'); plant(-4.63,2.98,'olive-west')
  box(.68,.165,-.75,1.66,.26,.32,'bronze_dark','review-bench','bronze')
  return MESH

def ease(x):
  x=max(0,min(1,x))
  return x*x*x*(10+x*(-15+6*x))

def camera(f):
  t=ease(f/143)
  # Curve is an actual world's camera spline; scene triangles are immutable.
  P=V([[-4.8,1.95,-8.2],[-1.65,3.15,-8.7],[5.95,5.5,-7.8],[8.65,6.85,-6.6]])
  x=(1-t)**3*P[0]+3*(1-t)**2*t*P[1]+3*(1-t)*t*t*P[2]+t**3*P[3]
  A=V([-.56,1.04,.45])*(1-t)+V([.18,.61,.60])*t
  return x,A,42+3.55*t

def camera_basis(C,T):
  f=norm(T-C); r=norm(np.cross(f,V([0.,1,0]))); u=np.cross(r,f)
  # World x is positive right for camera looking along world +z.
  return np.stack([-r,u,f],axis=0)

def project_camera(vertices,C,B,W,H,fov):
  p=(vertices-C)@B.T
  lens=(H/2)/math.tan(math.radians(fov/2))
  return V((W/2+lens*p[:,0]/p[:,2],H/2-lens*p[:,1]/p[:,2])).T,p[:,2]

def clip_mesh_triangle(triangle, C, B, near=.12):
  # Clip in world space against signed camera depth before perspective division.
  z=(triangle.verts-C) @ B[2]
  if np.min(z)>=near:
    return (triangle,)
  if np.max(z)<near:
    return ()
  out=[]
  a,za=triangle.verts[-1],z[-1]
  for b,zb in zip(triangle.verts,z):
    ain,bin=za>=near,zb>=near
    if ain!=bin:
      out.append(a+(b-a)*((near-za)/(zb-za)))
    if bin:
      out.append(b)
    a,za=b,zb
  return tuple(Tri(V([out[0],out[i],out[i+1]]),triangle.normal,triangle.mat,triangle.oid)
               for i in range(1,len(out)-1))
  
def raster_triangle(screen, depth, W,H, db, projection='perspective'):
  lo=np.floor(np.min(screen,axis=0)).astype(int)
  hi=np.ceil(np.max(screen,axis=0)).astype(int)
  x0,y0=max(0,lo[0]),max(0,lo[1]);x1,y1=min(W-1,hi[0]),min(H-1,hi[1])
  if x1<x0 or y1<y0:return None
  x=(np.arange(x0,x1+1)+.5)[None,:]; y=(np.arange(y0,y1+1)+.5)[:,None]
  (ax,ay),(bx,by),(cx,cy)=screen
  denom=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
  if abs(denom)<1e-8:return None
  la=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denom
  lb=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denom
  lc=1-la-lb
  Wg=np.stack([la,lb,lc],axis=-1)
  mask=(np.min(Wg,axis=-1)>=-1e-8)
  if projection=='perspective':
    s=Wg/depth; z=1./np.sum(s,axis=-1); wp=s*z[...,None]
  else:
    z=Wg@depth; wp=Wg
  crop=db[y0:y1+1,x0:x1+1]
  mask &= z < crop-1e-7
  if not np.any(mask):return None
  crop[mask]=z[mask]
  return (slice(y0,y1+1),slice(x0,x1+1)),mask,wp[mask]

def sun_transform(X):
  front=-SUN
  right=norm(np.cross(front,V([0.,1,0]))); up=np.cross(right,front)
  L=np.stack([right,up,front])
  P=X@L.T
  return V((420+P[...,0]*34, 420-P[...,1]*34,P[...,2])).T if P.ndim==2 else V([420+P[0]*34,420-P[1]*34,P[2]])

def make_shadow():
  D=np.ones((840,840))*9999
  for ti in MESH:
    q=sun_transform(ti.verts)
    raster_triangle(q[:,:2],q[:,2],840,840,D,'ortho')
  return D

def frame(f,W,H,finish,Dshadow=None,skip=()):
  C,T,fov=camera(f); B=camera_basis(C,T)
  rgb=np.zeros((H,W,3),np.uint8)
  xx,yy=np.meshgrid(np.arange(W)/W,np.arange(H)/H)
  if finish:
    clouds=np.exp(-((xx-.72)*2.40)**2-((yy-.36)*2.7)**2)
    rgb[:]=np.uint8(np.clip(np.stack([9+20*clouds+5*yy,15+31*clouds+7*yy,24+39*clouds+10*yy],axis=-1),0,255))
  else:
    rgb[:]=np.uint8(np.broadcast_to((29+31*(1-yy))[...,None],rgb.shape))
  depth=np.full((H,W),9999.,np.float64); oid=np.zeros((H,W),np.uint16)
  for t in MESH:
    if t.oid in skip: continue
    centered=t.verts.mean(axis=0)
    if np.dot(t.normal,C-centered)<=0: continue
    for t in clip_mesh_triangle(t,C,B):
      xy,d=project_camera(t.verts,C,B,W,H,fov)
      got=raster_triangle(xy,d,W,H,depth)
      if got is None:continue
      window,mask,weights=got
      oid[window][mask]=t.oid
      n=t.normal
      base=V(MATS[t.mat] if finish else [175,172,166],float)
      exposure=.44+.33*max(0.,n[1])+.25*max(0.,float(np.dot(n,SUN)))
      colors=base*exposure
      if finish:
        rays=weights@t.verts
        uv=sun_transform(rays)
        ij=np.clip(np.round(uv[:,:2]).astype(int),1,838)
        shadow=np.zeros(len(rays),float)
        slope_bias=.072+.08*(1-max(0.,float(np.dot(n,SUN))))
        for sx,sy in ((-1,0),(0,0),(1,0),(0,1),(0,-1)):
          shadow+=(uv[:,2]-slope_bias>Dshadow[ij[:,1]+sy,ij[:,0]+sx])*.2
        shadow=shadow*.29*max(0.,float(np.dot(n,SUN)))+.12*shadow
        if t.mat=='light_strip':
          shadow*=0
          colors=base*.80
        fog=.02+.045*np.clip((depth[window][mask]-6)/13,0,1)
        vals=np.tile(colors,(len(rays),1))
        # Fine material detail is attached to world surfaces, never to the screen.
        X,Y,Z=rays.T
        # Warm raking pool across the actual stone fins; deep cool elsewhere.
        if t.oid in SCREEN_FACES:
          illuminated=np.exp(-((X+.78)/1.46)**2)*np.clip(.22+Y*.64,0,1)
          lit_edge=np.clip(n[0]*.42-n[2]*.58,0,1)
          vals*=np.stack([.73+.31*illuminated,.76+.21*illuminated,.86+.08*illuminated],axis=1)
          vals+=illuminated[:,None]*lit_edge*V([52,31,15])
        if t.mat in ('pool','channel_top'):
          vals*=V([.84,1.07,1.14])
        if t.mat in ('foliage','foliage2'):
          vals*=V([.92,1,1.08])
        if t.mat in ('stone','travertine','cap','pier','plinth'):
          s0=np.sin(X*81.10+Z*55.78+np.sin(Y*15.2)*2.3)
          s1=np.sin(Y*63.1+Z*14.2+np.sin(X*13.2)*1.5)
          salt=(s0*.7+s1*.3)*.018+np.sin(Y*9.2+Z*8.1)*.010
          vals*=1+salt[:,None]
        if t.mat in ('pool','channel_top'):
          phase=f*.115
          lines=.5+.5*np.sin(X*8.7+Z*12.4+np.sin(Z*17.1-phase)*.35-phase)
          sky=.09*np.exp(-((X-1.88)/2.65)**2-((Z-1.67)/1.6)**2)
          caustic=lines**5*.04
          vals+=V((sky*83+caustic*64,sky*139+caustic*118,sky*176+caustic*138)).T
      
        vals*=np.stack([1-shadow,1-shadow*.84,1-shadow*.60],axis=1)
        if FRAGMENT_FINISH is not None:
          vals=FRAGMENT_FINISH(vals,t,rays,n,C,f,shadow)
        vals=vals*(1-fog[:,None])+fog[:,None]*V([116,134,150],float)
        rgb[window][mask]=np.uint8(np.clip(vals,0,255))
      else:
        rgb[window][mask]=np.uint8(colors)
  return rgb,oid, (C,T,fov)

def digest_file(path):
  from hashlib import sha256
  return sha256(Path(path).read_bytes()).hexdigest()

def id_color(map):
  palette=np.random.default_rng(875).integers(50,255,size=(len(OBJECTS)+1,3),dtype=np.uint8)
  palette[0]=0
  return palette[map]

def draw_overlay(rgb,f):
  H,W=rgb.shape[:2]
  yy=np.arange(H)/H
  opacity=(.46*np.clip((yy-.87)/.13,0,1)+.29*np.clip((.12-yy)/.12,0,1))[:,None,None]
  im=Image.fromarray(np.uint8(rgb*(1-opacity)))
  d=ImageDraw.Draw(im)
  def text(x,y,value,size,font=FONT,color='#eee6d8',anchor=None):
    d.text((x,y),value,font=ImageFont.truetype(font,max(10,round(size*H/540))),fill=color,anchor=anchor)
  d.line((W*.042,H*.09,W*.958,H*.09),fill='#77766f')
  text(W*.044,H*.033,'E B B   C O U R T',16,BOLD)
  text(W*.954,H*.045,'FIELD STUDY / 01',12,MONO,anchor='rm')
  # Soft overlap of two short text beats, with a full stationary ending pose.
  tt=int(f)
  labels=(('Arrival',1-ease((tt-52)/10)),('The hidden channel',ease((tt-52)/10)*(1-ease((tt-105)/10))),('Intake → basin',ease((tt-105)/10)))
  cap=Image.new('RGBA',(W,H))
  cd=ImageDraw.Draw(cap)
  cap_font=ImageFont.truetype(BOLD,max(12,round(16*H/540)))
  for label,opacity in labels:
    if opacity>0:
      cd.text((W*.044,H*.938),label,font=cap_font,fill=(238,230,216,round(255*opacity)))
  im.paste(cap,(0,0),cap)
  text(W*.954,H*.953,'GEOMETRY STUDY',11,MONO,anchor='rm')
  d.line((W*.042,H*.92,W*.958,H*.92),fill='#77766f')
  return im

def main(out, width, height, render_video):
  out.mkdir(parents=True)
  scene()
  global SCREEN_FACES
  SCREEN_FACES = {OBJECTS[n] for n in ('arrival-screen','screen-fins','screen-coping')}
  shadow=make_shadow()
  ghash=sha256()
  for tri0 in MESH:
    ghash.update(tri0.verts.astype("<f8").tobytes())
    ghash.update(str(tri0.oid).encode()+b"\0")
  chash=sha256()
  for f in range(144):
    pos,target,fov=camera(f)
    chash.update(np.concatenate((pos,target,[fov])).astype("<f8").tobytes())
  meta={"frames":TOTAL_FRAMES,"hold_start_frame":HERO_HOLD_START,"fps":24,"canvas":[width,height],"keyframes":{},"objects":OBJECTS,
        "all_renderer_variants_share_geometry_sha256":ghash.hexdigest(),
        "all_renderer_variants_share_camera_sha256":chash.hexdigest(),
        "triangles":len(MESH)}
  mask_object="connected-rill-water"
  skipped={OBJECTS[x] for x in ("arrival-screen","screen-fins","screen-coping","screen-inlay")}
  early,rill_visible,_=frame(0,width,height,False,skip=skipped)
  count_visible_if_removed=int(np.count_nonzero(rill_visible==OBJECTS[mask_object]))
  meta["fixed_camera_debug_only"]={"frame":0,"excluded_objects":["arrival-screen","screen-fins","screen-coping","screen-inlay"],
    "visible_rill_px_without_designated_occluders":count_visible_if_removed}
  Image.fromarray(early).save(out/'000-debug-without-screen.png')
  for f in KEYS:
    clay,ida,(C,T,fov)=frame(f,width,height,False)
    painted,idb,_=frame(f,width,height,True,shadow)
    assert np.array_equal(ida,idb), "finish changed geometry coverage"
    Image.fromarray(clay).save(out/f'{f:03d}-clay.png')
    draw_overlay(painted,f).save(out/f'{f:03d}-finish.png')
    Image.fromarray(id_color(ida)).save(out/f'{f:03d}-id.png')
    counts=np.bincount(ida.flatten(),minlength=len(OBJECTS)+1)
    meta["keyframes"][f]={"camera":[round(x,6) for x in C],"target":[round(x,6) for x in T],"vertical_fov_deg":round(fov,6),
       "visible_px":{k:int(counts[v]) for k,v in OBJECTS.items()},"matching_clay_finish_ids":True,"id_mask_sha256":sha256(ida.astype("<u2").tobytes()).hexdigest()}
  (out/'camera-landmarks.json').write_text(json.dumps(meta,indent=2)+'\n')
  if render_video:
    output=out/'ebb-court.mp4'
    with subprocess.Popen(["ffmpeg","-v","error","-nostdin","-f","rawvideo","-pix_fmt","rgb24","-s",f"{width}x{height}","-r","24","-i","pipe:0","-an","-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-movflags","+faststart",str(output)],stdin=subprocess.PIPE) as proc:
      for f in range(TOTAL_FRAMES):
        rgb,*_=frame(f,(width*5+2)//4,(height*5+2)//4,True,shadow)
        rgb=np.array(Image.fromarray(rgb).resize((width,height),Image.Resampling.LANCZOS))
        proc.stdin.write(draw_overlay(rgb,f).tobytes())
      proc.stdin.close()
      if proc.wait()!=0:raise RuntimeError("ffmpeg failed")
    print(output)
  print(out/'camera-landmarks.json')

if __name__=='__main__':
  a=argparse.ArgumentParser()
  a.add_argument('output',type=Path)
  a.add_argument('--width',type=int,default=960)
  a.add_argument('--height',type=int,default=540)
  a.add_argument('--video',action='store_true')
  q=a.parse_args()
  if not (240<=q.width<=1920 and 160<=q.height<=1080 and q.width%2==q.height%2==0):
    raise SystemExit('width and height must be even within bounds')
  main(q.output,q.width,q.height,q.video)

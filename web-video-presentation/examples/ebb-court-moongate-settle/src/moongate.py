"""Moongate V5: release-and-settle court study, CPU world geometry without external textures."""
from pathlib import Path
import argparse, math, subprocess
import numpy as np
from PIL import Image
import finish
import story,sluice

r=finish.r
PRACTICALS=((-4.85,2.45),(-2.35,2.40),(.15,2.34),(2.65,2.28))
PALETTE={
 'enclosure':(47,58,69),'pier':(114,116,111),'plinth':(70,77,80),
 'cap':(174,170,148),'bevel':(156,149,122),'stone':(112,116,115),
 'bronze':(169,103,57),'bronze_dark':(94,62,47),'trim':(195,142,76),
 'aperture':(60,69,76),'rib':(73,90,99),'rib_edge':(125,140,139),
 'blackened':(43,60,65),'champagne':(220,176,110),
 'diffuser':(246,194,131),'moon_slot':(157,209,231),
}
def camera(raw_f):
    f=raw_f-sluice.OFFSET
    # Single C2 ease, with asymmetric glide and a smaller finishing cant.
    # Drift settles just before the stream ends so the terminal beat is water, not camera velocity.
    t=r.ease(f/125.)
    P=np.array([(2.08,2.59,-3.29),(2.25,2.74,-3.15),(3.18,3.17,-2.22),(2.04,2.57,-1.61)])
    c=(1-t)**3*P[0]+3*(1-t)**2*t*P[1]+3*(1-t)*t*t*P[2]+t**3*P[3]
    target=np.array([(-1.34,1.06,1.92),(-.95,.760,1.79)])
    a=target[0]*(1-t)+target[1]*t
    return c,a,38.0-3.8*t

def arc_masonry(cx,cy,z,rad,thickness,mat,edge,name):
    count=20
    for i in range(count):
        a=math.pi*(i+.055)/count; b=math.pi*(i+1-.055)/count
        def point(theta,radius,depth):
            return cx+math.cos(theta)*radius,cy+math.sin(theta)*radius,z+depth
        lo,hi=rad-thickness*.5,rad+thickness*.5
        p,q,u,v=point(a,lo,-.07),point(b,lo,-.07),point(b,hi,-.07),point(a,hi,-.07)
        A,B,C,D=point(a,lo,.085),point(b,lo,.085),point(b,hi,.085),point(a,hi,.085)
        r.quad(p,q,u,v,mat,name)
        r.quad(p,A,B,q,edge,name)
        r.quad(q,B,C,u,edge,name)
        r.quad(u,C,D,v,mat,name)
        r.quad(v,D,A,p,edge,name)

def architecture():
    # The bays are behind the complete original gate/rill/pool path.
    wall_face=4.995
    for idx,(x,y) in enumerate(PRACTICALS):
        for xm in (x-1.12,x+1.12):
            r.box(xm,1.13,wall_face-.065,.13,2.17,.18,'rib','limestone-bay')
            r.box(xm,.18,wall_face-.10,.24,.26,.25,'rib_edge','limestone-bay')
            r.box(xm,2.23,wall_face-.08,.22,.12,.28,'rib_edge','limestone-bay')
        arc_masonry(x,2.20,wall_face-.05,1.12,.13,'rib','rib_edge','limestone-arch')
        # Bronze wells with a cold slit and separate metallic frame.
        r.box(x,2.35,wall_face-.085,.23,1.23,.042,'blackened','inset-lantern-housings')
        r.box(x,2.35,wall_face-.125,.098,1.025,.049,'blackened','inset-lantern-trim')
        r.box(x,2.35,wall_face-.157,.043,.933,.043,'moon_slot','inset-lantern-glass')
        for h in (2.036,2.351,2.666):
            r.box(x,h,wall_face-.191,.113,.014,.024,'blackened','inset-lantern-trim')
    # Segmented weathered bronze datum in front of the plaster wall.
    for i in range(17):
        x=-5.60+i*.59
        r.box(x,1.724,4.248,.558,.046,.135,'blackened','cornice-bronze')
        r.box(x,1.755,4.193,.534,.013,.033,'rib','cornice-edge')
    # The podium has a thin blackened retaining frame and inset cast metal,
    # not a decorative overlay floating in front of the gate.
    r.box(-3.82,.536,1.781,1.48,.74,.022,'blackened','podium-inset-border')
    r.box(-3.82,.534,1.762,1.42,.68,.022,'slate','podium-carved-panel')
    for row in range(8):
        y=.29+row*.059
        r.box(-3.82,y,1.745,1.17,.012,.015,'rib','podium-panel-grooves')
    r.box(-3.82,.078,1.782,1.77,.062,.035,'bronze_dark','podium-foot')
    for x in (-4.47,-3.17):
        r.box(x,.505,1.748,.016,.56,.015,'champagne','podium-inset-border')
    # Rill underside and rails remain separate objects; tiny fasteners reveal scale.
    for i in range(8):
        x=-3.55+i*.251
        y=1.04+(x+3.82)*(-.29/2.30)
        for z in (2.655,2.225):
            r.box(x,y+.025,z,.041,.038,.013,'trim','rill-rivets')
    for x in (-2.34,-1.61):
        for z in (2.18,2.697):
            finish.stone_bevel(x,.056,z,.31,.114,.078,'blackened','rill-footings',top='rib')
    for x in (-.80,-.66,-.52,-.38):
        r.box(x,.108,3.212,.061,.024,.023,'diffuser','pool-side-practical')

def shader(vals,t,p,n,C,f,shadow):
    x,y,z=p.T
    name=t.mat
    sec=f/24.
    if name in ('moon_slot','diffuser'):
        return np.tile((75.,111.,128.) if name=='moon_slot' else (181.,132.,76.),(len(p),1))
    vw=C-p
    vw/=np.linalg.norm(vw,axis=1)[:,None]
    if name in ('pool','ripples'):
        # Two non-collinear traveling waves. Camera-space displacement is never
        # stored. These are approximate water normals over the actual basin mesh.
        q=6.2*x+8.3*z-1.18*sec+1.10*np.sin(z*4.4+x*2.3+.31*sec)
        q2=-8.4*x+12.1*z+1.3*sec+.74*np.cos(x*5.38-z*3.47)
        q3=16.1*x+26.5*z-2.63*sec+.4*np.sin(q2)
        nx=.055*np.cos(q)-.026*np.cos(q2)+.013*np.cos(q3)
        nz=.068*np.cos(q)+.036*np.cos(q2)+.023*np.cos(q3)
        nd=(nx*vw[:,0]+vw[:,1]+nz*vw[:,2])/np.sqrt(1+nx*nx+nz*nz)
        nd=np.clip(nd,0,1)
        rn=2*nd/np.sqrt(1+nx*nx+nz*nz)
        rx=rn*nx-vw[:,0]
        ry=rn-vw[:,1]
        rz=rn*nz-vw[:,2]
        fres=(1-nd)**1.88
        # Hit-test the architectural wall plane against the same emitters
        # used by architecture(). Falloff widens the dim reflected spill.
        s=(4.80-z)/np.maximum(.055,rz)
        hit_x=x+s*rx
        hit_y=.199+s*ry
        sky=np.exp(-((rx+.61)/.97)**2-((rz-.67)/.76)**2)
        out=np.stack([11+3*sky,25+6*sky,31+11*sky],axis=-1)
        out+=(.19+1.0*fres)[:,None]*sky[:,None]*np.array([25.,44.,50.])
        for xc,yc in PRACTICALS:
            spread=np.exp(-((hit_x-xc)/.29)**2-((hit_y-yc)/1.60)**4)
            thin=np.exp(-((hit_x-xc)/.095)**2-((hit_y-yc)/.61)**6)
            out+=(np.maximum(0,rz)*(.39+.75*fres)*(19*spread+35*thin))[:,None]*np.array([.70,.93,1.])
        soft=(.5+.5*np.sin(q+.66*np.sin(q2)))**7
        mod=np.exp(-((z-.95+.33*x)/1.4)**2)*(1-.54*np.exp(-((x-1.27)/.75)**2))
        out+=soft[:,None]*mod[:,None]*np.array([4.,8.,11.])
        return out*(1-.11*shadow[:,None])
    base=finish.finish(vals,t,p,n,C,f,shadow)
    if name in ('enclosure','pier','plinth','cap','bevel','stone','aperture'):
        base=.62*base+.38*vals
    if name=='channel_top':
        if t.oid==r.OBJECTS.get('rill-fall-water'):
            v=(.51+.49*np.sin((y-.21)*87+5*z+sec*24.))**7
            return base+v[:,None]*np.array([67.,84.,87.])+np.array([20.,34.,39.])
        mid=np.exp(-((y-.97)/.53)**2)
        streak=(.5+.5*np.sin(9.6*x+12*z-sec*14.7))**12
        return base + (mid*streak)[:,None]*np.array([4.,8.,11.])+np.array([2.,6.,10.])
    # Layer pools of cool aperture fill and low warm bounce with different
    # falloff, so the wall does not collapse into a neutral flat background.
    if name in ('enclosure','pier','plinth','cap','bevel','stone','rib','rib_edge','aperture','travertine'):
        rear=np.clip((z-3.51)/1.45,0,1)
        wall_light=np.zeros_like(x)
        for xc,yc in PRACTICALS:
            wall_light+=np.exp(-((x-xc)/.72)**2-((y-yc)/1.28)**2)
        light=np.exp(-((x+2.92)/4.05)**2-((z-1.68)/2.35)**2)*np.clip(.54+n[1]*.45,0,1)
        amber=np.exp(-((x+3.5)/1.49)**2-((y-.8)/1.12)**2-((z-2.44)/1.54)**2)
        base=base*.89 + (light*.62+wall_light*rear*.50)[:,None]*np.array([15.,26.,38.])
        focus=(.37+.63*np.maximum(0, .62*n[1]+.34*n[0]-.56*n[2]))
        base+=amber[:,None]*focus*np.array([58.,34.,17.])
        # Aperture key casts a soft diagonal across the fixed masonry and
        # pavement; its color/direction does not change when the gate opens.
        diagonal=(x+.91*z+.89*y+1.68)
        key=np.exp(-(diagonal/.94)**4)*np.exp(-((z-1.10)/3.34)**4)
        key*=.22+.78*np.maximum(0.,n[1]+n[0]*.32-n[2]*.64)
        base+=key[:,None]*np.array([38.,35.,30.])
        if name in ('rib','rib_edge'):
            g=finish.grain(x,y,z,35.,39.,39.)
            base+=g[:,None]*np.array([4.,5.,5.])
        if name in ('cap','bevel','stone') and n[1]>.75:
            veins=np.sin((x*.40+z)*26.7+4.*finish.grain(x,y,z,1.,2.,1.6))
            base-=(np.maximum(0,veins)**10)[:,None]*np.array([4.,4.,3.])
    if name in ('bronze','bronze_dark','blackened','trim','champagne'):
        half=vw+np.array([-.44,.67,-.59])
        half/=np.linalg.norm(half,axis=1)[:,None]
        glint=(np.maximum(0,half@n))**15
        scratch=(.5+.5*np.cos(z*86+x*5.3+y*36))**8
        base+=(glint*(.80+.20*scratch))[:,None]*np.array([56.,35.,13.])
        gate_ids=[r.OBJECTS.get(v) for v in ('sluice-door','sluice-stand','sluice-stem','sluice-hardware')]
        if t.oid in gate_ids:
            key=(.36+.64*np.maximum(0.,n[0]*.45+n[1]*.74-n[2]*.60))
            base+=key*np.array([65.,39.,17.])
    return base

def grade(a,ids,f):
    # Tones only; no screen layer introducing geometry, highlights or motion.
    h,w=ids.shape
    y,x=np.ogrid[:h,:w]; x=(x+.5)/w; y=(y+.5)/h
    focus=1.-.268*np.clip(((x-.50)*1.45)**2+((y-.54)*1.22)**2,0,1.20)
    rgb=a.astype(np.float32)/255.
    rgb=(rgb*focus[...,None])*.96
    rgb=rgb/(.84+.20*rgb)
    rgb=rgb*np.array([1.033,1.012,1.018])+np.array([.007,.011,.016])
    return np.uint8(np.rint(np.clip(rgb,0,1)*255))

def gate_mesh(f):
    lift=.264*r.ease((f-26)/19)*(1-r.ease((f-78)/14))
    r.box(-3.68,1.24+lift,2.44,.042,.242,.312,'bronze','sluice-door','cap')
    r.box(-3.649,1.312+lift,2.44,.024,.034,.138,'trim','sluice-door')
    r.box(-3.68,1.62+lift*.22,2.44,.024,.1,.026,'bronze_dark','sluice-stem')
    # Thin struck bronze edge and two fasteners travel with the original door.
    r.box(-3.651,1.351+lift,2.44,.020,.023,.288,'champagne','sluice-hardware')
    for z in (2.326,2.554):
        r.box(-3.646,1.305+lift,z,.013,.026,.029,'trim','sluice-hardware')

def setup():
    finish.setup()
    architecture()
    r.MATS.update(PALETTE)
    r.camera=camera
    r.FRAGMENT_FINISH=shader
    sluice.grade=grade
    sluice.gate_mesh=gate_mesh
    return r.make_shadow()

def frame(f,w,h,shadow):
    return sluice.frame(f,w,h,shadow)

def supersampled(f,w,h,shadow):
    # Prefilter complete composited samples, including true object silhouettes.
    # This is not smoothing over unresolved intersecting source geometry.
    rw,rh=round(w*1.20),round(h*1.20)
    full=frame(f,rw,rh,shadow)[0]
    return np.asarray(Image.fromarray(full).resize((w,h),Image.Resampling.LANCZOS))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('--proof',action='store_true',help='sample 8 rendered stills instead of encoding the full sequence')
    p.add_argument('--frames',type=int,nargs='+',default=(0,45,104,123,134,143),help='frame indices for --proof')
    p.add_argument('--width',type=int,default=960)
    p.add_argument('--height',type=int,default=540)
    opt=p.parse_args()
    if not (opt.width>0 and opt.width%2==0 and opt.height>0 and opt.height%2==0):
        p.error('output dimensions must be positive even integers')
    opt.out.mkdir(parents=True)
    sh=setup()
    w,h=opt.width,opt.height
    if opt.proof:
        for f in opt.frames:
            if not 0<=f<144: p.error('proof frame outside 0–143')
            Image.fromarray(supersampled(f,w,h,sh)).save(opt.out/f'f{f:03d}.png')
        return
    dest=opt.out/'Ebb-Court-Moongate-Settle.mp4'
    cmd=['ffmpeg','-nostdin','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','24','-i','pipe:0','-an','-c:v','libx264','-threads','4','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as enc:
        for f in range(144):
            enc.stdin.write(supersampled(f,w,h,sh).tobytes())
        enc.stdin.close()
        if enc.wait():raise RuntimeError('encoding failed')
if __name__=='__main__':
    main()

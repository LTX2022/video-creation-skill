"""Original optical/materials finish for Ebb Court, on existing world geometry."""
from pathlib import Path
import argparse
import subprocess
import sys
import numpy as np
from PIL import Image
import sluice

r = sluice.r
COLORS = dict(
    enclosure=(36,43,43), pier=(117,111,99), cap=(188,174,145),
    plinth=(80,79,70), aperture=(82,76,61), bronze=(148,102,66),
    bronze_dark=(78,62,47), trim=(162,121,72), rail=(40,45,43),
    bevel=(154,143,123), pool=(17,42,44), ripples=(17,42,44), channel_top=(30,67,65),
    light_strip=(226,164,97), slate=(43,55,54)
)
OBJ = {}
GRAIN = np.random.default_rng(1141).uniform(-1,1,(64,64,64)).astype(np.float32)
def names():
    return {v:k for k,v in r.OBJECTS.items()}

def grain(x,y,z,a,b,c):
    # Nonperiodic-looking pores: trilinear lattice with cubic-faded weights.
    xs=x*a+.327; ys=y*b+2.749; zs=z*c-1.57
    ix=xs.astype(np.int32); iy=ys.astype(np.int32); iz=zs.astype(np.int32)
    ix-=xs<ix; iy-=ys<iy; iz-=zs<iz
    h=xs-ix; g=ys-iy; u=zs-iz
    h=h*h*(3-2*h); g=g*g*(3-2*g); u=u*u*(3-2*u)
    ix &= 63; iy &= 63; iz &=63
    nx=(ix+1)&63; ny=(iy+1)&63; nz=(iz+1)&63
    v000=GRAIN[ix,iy,iz]; v100=GRAIN[nx,iy,iz]
    v010=GRAIN[ix,ny,iz]; v110=GRAIN[nx,ny,iz]
    v001=GRAIN[ix,iy,nz]; v101=GRAIN[nx,iy,nz]
    v011=GRAIN[ix,ny,nz]; v111=GRAIN[nx,ny,nz]
    bot=(v000+h*(v100-v000))*(1-g)+(v010+h*(v110-v010))*g
    top=(v001+h*(v101-v001))*(1-g)+(v011+h*(v111-v011))*g
    return bot+(top-bot)*u

def finish(vals,t,p,n,C,f,shadow):
    X,Y,Z=p.T
    kind=t.mat
    oid=t.oid
    water = kind in ('pool','channel_top','ripples')
    if water:
        if kind == 'channel_top':
            # Retain the cyan moving front added in the upstream flow pass.
            # Color darkens where the wet patinated channel meets the pool.
            if t.oid == r.OBJECTS.get('rill-fall-water'):
                k=np.clip((.690-Y)/.478,0.,1.)
                sec=f/24.
                # Advected narrow glints, narrowed by depth; not uniform emissive tubes.
                p0=(.5+.5*np.sin(k*23-sec*21+2.7*np.sin(Z*9)))**5
                neck=.48+.52*np.exp(-((k-.30)/.32)**2)
                tip=.28*np.exp(-((k-.86)/.15)**2)*(.68+.32*np.sin(sec*13))
                light=19+68*(p0*.71+tip)*neck
                return vals*np.array([.82,.86,.88])+(light[:,None])*np.array([1.02,1.03,1.04])

            edge=np.clip(np.abs(Z-2.44)/.135,0,1)
            straight=(X<-1.55)
            edge=np.where(straight,edge,np.abs(.58*(X+1.54)+.814*(Z-2.44))/.13)
            bevel=np.exp(-((edge-.94)/.12)**2)
            return vals*np.array([.56,.67,.71])+bevel[:,None]*np.array([4.,6.,6.])
        # Long, oblique ambient waves on the actual basin plane. No radial
        # wavefront or point-emitter term, and nothing is driven by the gate;
        # any local impact is handled downstream ONLY after arrival.
        sec=f/24.
        a=4.3*X+13.0*Z-.96*sec+1.2*np.sin(1.4*X+.25*sec)
        b=-7.4*X+8.8*Z+.71*sec+.60*np.sin(4.4*Z)
        c=2.2*X+31.*Z-1.40*sec
        dx=.042*np.cos(a)-.030*np.cos(b)+.008*np.cos(c)
        dz=.087*np.cos(a)+.049*np.cos(b)+.033*np.cos(c)
        vw=C-p
        vw/=np.linalg.norm(vw,axis=1)[:,None]
        dot=np.clip(dx*vw[:,0]+vw[:,1]+dz*vw[:,2],0,1)
        rx=2*dot*dx-vw[:,0]
        rz=2*dot*dz-vw[:,2]
        fres=(1-dot)**2.1
        # Broad skylight with one interrupted silver band across depth;
        # the waveform and reflected direction wander, not the camera mask.
        env=np.exp(-((rx+.59)/.67)**2-((rz-.71)/.43)**2)
        cut=rz-(.59+.11*np.sin(rx*3.-.33))
        band=np.exp(-(cut/.095)**2)*np.exp(-((rx+.37)/.78)**2)
        cap=(.30+.70*fres)*band
        depth=np.clip((Z+.01)/3.18,0,1)
        base=np.stack([16+6*depth,31+10*depth,36+14*depth],axis=-1)
        base+=(.28+.72*fres)[:,None]*env[:,None]*np.array([22.,36.,45.])
        base+=cap[:,None]*np.array([20.,26.,29.])
        wave=(.5+.5*np.cos(a+.57*np.sin(b)))**4
        tremor=(.5+.5*np.cos(a+.55*np.sin(b)-.35+.15*np.cos(c)))**8
        skyline=(.38+.62*np.exp(-((Z-1.2-.23*X)/1.45)**2))
        glints=(.64*wave+.36*tremor)*skyline*(.74+.26*np.sin(.95*X-.78*Z)**2)
        base+=glints[:,None]*np.array([9.,15.,20.])
        return base*(1-.23*shadow[:,None])
    if kind in ('bronze','bronze_dark','trim','rail'):
        m=grain(X,Y,Z,15.9,27.1,21.7)
        grainfine=np.sin(31.3*Y+2.3*np.sin(6.2*X+14.7*Z))*np.sin(11.4*Y+10.6*Z)
        tint=(m*.55+.45)*(.50+.5*np.clip(Y/2,0,1))
        vals=vals*(1+(m*.11+grainfine*.04)[:,None])
        vals+=tint[:,None]*np.array([-13.,7.,8.])
        # Long restrained copper highlight as actual surface viewing angle changes.
        vw=C-p
        vw/=np.linalg.norm(vw,axis=1)[:,None]
        l=np.array([-.62,.55,-.55])
        hh=vw+l
        hh/=np.linalg.norm(hh,axis=1)[:,None]
        glint=np.maximum(0.,hh@n)**26
        vals+=glint[:,None]*np.array([33,18,7])
        return vals
    if kind in ('enclosure','pier','cap','stone','slate','plinth','aggregate','aperture','travertine','bevel'):
        core=grain(X,Y,Z,4.9,5.6,6.1)
        cloud=grain(X,Y,Z,.88,1.59,1.13)
        mid=grain(X,Y,Z,18.7,17.9,22.7)
        fine=grain(X,Y,Z,42.4,49.3,51.1)
        gain=8*core+9*cloud+6*mid+4.1*fine
        if abs(n[1])>.92:
            # Stone top: layers, planar drift, and distinct lightly darkened
            # joints with a broad contact falloff around the installation.
            zz=Z+np.floor((X+.1)/1.43)*.06
            pulp=np.exp(-((np.abs(((zz+.19)%1.10)-.55)-.55)/.034)**2)
            cross=np.exp(-((np.abs(((X+.2+(np.floor((Z+.19)/1.10)%2)*.715)%1.43)-.715)-.715)/.028)**2)
            if oid in OBJ['floor']:
                gain -= (pulp+cross)*9
                dark=np.exp(-((X+3.73)/1.22)**2-((Z-2.44)/.88)**2)
                dark+=.90*np.exp(-((X+1.17)/.36)**2)*np.exp(-((Z-1.46)/2.12)**6)
                vals*=1-.31*np.clip(dark[:,None],0,1)
            if oid in OBJ['coping']:
                # weathered stone lip especially right above the submerged face
                edge=np.minimum(np.abs(X+1.025),np.abs(Z-3.20))
                gain-=12*np.exp(-(edge/.095)**2)
        else:
            htex=np.sin(23.4*X-25.9*Z+1.8*np.sin(9.8*X+4.7*Z))
            foot=np.exp(-((Y-.03)/.63)**2)
            facing=np.exp(-((X+.48)/3.2)**2)*np.exp(-((Y-1.30)/1.7)**2)
            gain+=foot*(-16+5*htex)
            if oid in OBJ['walls']:
                vals*=.72+.22*facing[:,None]
                # Masonry-scale staggered courses, not another asphalt-noise layer.
                u=np.where(abs(n[0])>abs(n[2]),Z,X)
                yj=(Y+.11)/.46
                row=np.floor(yj)
                vj=(u+.06+np.mod(row,2)*.68)/1.36
                col=np.floor(vj)
                dy=np.minimum(yj-row,1-(yj-row))*.46
                dx=np.minimum(vj-col,1-(vj-col))*1.36
                joints=np.maximum(np.exp(-(dy/.009)**2),.77*np.exp(-(dx/.009)**2))
                lip=np.exp(-((dy-.022)/.009)**2)
                block=grain(col,row,np.zeros_like(row),.31,.43,1.0)
                gain+=5*np.sin(Y*3.1+core*.60)+mid*2+block*6.+lip*4.5-joints*12.5
                p0=np.exp(-((Z-4.28)/.73)**2)*(np.exp(-((X-1.16)/1.29)**2)+.57*np.exp(-((X+4.70)/.87)**2))*np.exp(-((Y-.47)/.76)**2)
                vals+=p0[:,None]*np.array([41.,23.,8.])
            if oid in OBJ['piers']:
                gain+=np.sin(Y*42.0+X*.8+cloud*1.20)*2.9
        vals=vals+gain[:,None]*np.array([1.,.97,.87])
        if oid in OBJ['walls']|OBJ['floor']:
            # Subtle warm practical bounce from the rill platform onto fixed
            # surfaces; the fall and moving highlight remain separate.
            lobe=np.exp(-((X+1.0)/2.6)**2-((Y-.26)/.52)**2-((Z-3.3)/1.15)**2)
            vals+=lobe[:,None]*np.array([26.,14.,4.])
        return vals
    return vals

def stone_bevel(cx,cy,cz,w,h,d,mat,name,top=None):
    # Real 10–24mm beveled face loops. Separate neutral rough bevel surface.
    bx=min(.024,w*.14,d*.14)
    rise=.022
    def ring(y, inset, k):
        x=w/2-inset; z=d/2-inset
        points=((-x+k,-z),(-x,-z+k),(-x,z-k),(-x+k,z),
                (x-k,z),(x,z-k),(x,-z+k),(x-k,-z))
        return [(cx+xx,y,cz+zz) for xx,zz in points]
    a=ring(cy-h/2,0,.008); b=ring(cy+h/2-rise,0,.009); c=ring(cy+h/2,bx,.007)
    for j in range(8):
        i=(j+1)%8
        r.quad(a[j],a[i],b[i],b[j],mat,name)
        r.quad(b[j],b[i],c[i],c[j],'bevel',name)
        r.tri(((cx,cy+h/2,cz),c[j],c[i]),top or mat,name)

def setup():
    original_box=r.box
    def box(x,y,z,w,h,d,mat,name,top=None):
        fn=stone_bevel if name in ('pool-coping','elevated-intake') else original_box
        return fn(x,y,z,w,h,d,mat,name,top)
    r.box=box
    try:
        shadow=sluice.setup()
    finally:
        r.box=original_box
    ids=r.OBJECTS
    for key,group in {
        'floor':('court-deck','continuous-ground'),
        'coping':('pool-coping',), 'walls':('back-wall','back-perimeter','closed-left-return','left-perimeter'),
        'piers':('elevated-intake',)
    }.items():
        OBJ[key]={ids[name] for name in group}
    r.MATS.update(COLORS)
    r.FRAGMENT_FINISH=finish
    return shadow

def frame(f,w,h,shadow):
    rgb,ids,flow=sluice.frame(f,w,h,shadow)
    return rgb,ids,flow

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('output',type=Path)
    p.add_argument('--proof',action='store_true')
    opt=p.parse_args(); opt.output.mkdir(parents=True)
    sh=setup()
    if opt.proof:
        frames=[0,37,57,77,87,96,112,143]
        for f in frames:
            Image.fromarray(frame(f,960,540,sh)[0]).save(opt.output/f'f{f:03d}.png')
    else:
        w,h=960,540
        cmd=['ffmpeg','-nostdin','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','24','-i','pipe:0','-an','-c:v','libx264','-threads','4','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(opt.output/'Ebb-Court-Twilight-Silverwater.mp4')]
        with subprocess.Popen(cmd,stdin=subprocess.PIPE) as enc:
            for f in range(144):
                enc.stdin.write(frame(f,w,h,sh)[0].tobytes())
            enc.stdin.close()
            if enc.wait(): raise RuntimeError('encoding failed')

if __name__=='__main__':
    main()

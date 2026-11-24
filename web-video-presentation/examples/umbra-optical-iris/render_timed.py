"""UMBRA / original shader-based 2.5D optical product shot (no assets)."""
import argparse, math, subprocess
from pathlib import Path
import numpy as np

FPS=24
N=132
TAU=math.tau

def ease(a,b,t):
    u=np.clip((t-a)/(b-a),0,1)
    return u*u*u*(10+u*(-15+6*u))

def unit(x): return np.clip(x,0,1)
def gauss(x,s): return np.exp(-.5*(x/s)**2)

class Studio:
    def __init__(self,w,h):
        self.w=w; self.h=h
        gy,gx=np.mgrid[:h,:w].astype('float32')
        self.x=(gx+.5-w*.5)/h; self.y=(gy+.5-h*.5)/h
        self.noise=np.random.default_rng(4651).uniform(-1,1,(h,w)).astype('float32')
    def frame(self,i):
        t=i/FPS
        a=ease(.94,1.46,t)                     # actuator movement leads the blades
        o=ease(1.23,2.68,t)
        p=ease(2.92,4.20,t)
        x=self.x;y=self.y
        z=1.04+.22*ease(0,.88,t)
        u=x/z-.071+.018*ease(0,.88,t);v=y/z-.008+.014*ease(0,.88,t)
        # Anisotropic projection + modest near/far asymmetry.
        X=(u+.21*v)*(1+.14*v); Y=v*1.15
        r=np.hypot(X,Y); th=np.arctan2(Y,X)
        smooth=lambda q: unit(.5+q*self.h*z*.9)
        lit=unit(.47+.25*np.cos(th+2.0)+.17*np.cos(2*th+1.1)+.1*np.sin(5*th-1))
        stripe=gauss(np.arctan2(np.sin(th+2.14),np.cos(th+2.14)),.23)
        soft=gauss(np.arctan2(np.sin(th-.66),np.cos(th-.66)),.32)
        rgb=np.stack([15+16*gauss(x+.42,.46)*gauss(y+.23,.38),
                      23+17*gauss(x+.36,.58)*gauss(y+.22,.40),
                      26+18*gauss(x+.36,.61)*gauss(y+.20,.42)],axis=2)
        # Out-of-focus bench reflection below the solid object.
        def blend(color,mask):
            nonlocal rgb
            m=np.asarray(mask)[...,None]
            rgb=rgb+(np.asarray(color)-rgb)*m
        reflection=gauss(y-.33,.055)*gauss(x-.07,.46)
        blend((57,44,33),.27*reflection)
        blend((6,10,12),.83*smooth(.565-r)*gauss(v-.19,.20))
        def metal(lo,hi,strength,rough=1):
            brush=.020*self.noise+(np.sin(r*1050+np.sin(th*21)*1.7)*.010 if rough else 0)
            s=unit(strength+brush)
            return np.asarray(lo)+(np.asarray(hi)-np.asarray(lo))*s[...,None]
        def band(inner,outer,lo,hi,illum):
            blend(metal(lo,hi,illum),smooth(r-inner)*smooth(outer-r))
        band(.235,.55,[23,27,30],[88,108,113],lit*.72)
        band(.481,.55,[12,17,19],[100,122,127],lit*.64+.18*stripe)
        band(.474,.485,[24,34,39],[149,171,164],lit*.6+.24*stripe)
        band(.428,.474,[12,18,21],[105,126,128],lit*.65)
        # Broad, tactile scallops on the fixed focusing barrel.
        scallop=np.cos(th*58+.15*np.sin(th*7))
        band(.438,.469,[10,17,20],[107,121,121],lit*(.37+.27*unit(.5+.5*scallop))+.12*stripe)
        band(.422,.430,[13,16,17],[117,132,132],lit*.74)
        band(.412,.422,[8,12,15],[44,51,53],lit*.55)
        # Physically separate aperture drive collar, rotating 13°.
        rt=th-.227*a-.036*o
        band(.337,.413,[39,28,23],[175,121,76],lit*.72+.31*stripe+.10*soft)
        band(.403,.413,[32,25,21],[204,157,99],lit*.73+.28*stripe)
        band(.394,.399,[43,30,24],[161,111,65],lit*.64)
        band(.349,.383,[38,27,24],[169,118,78],lit*.70+.19*stripe)
        notch=gauss(np.arctan2(np.sin(rt*41),np.cos(rt*41)),.16)
        blend((26,20,18),.68*notch*smooth(r-.353)*smooth(.370-r))
        marker=gauss(np.arctan2(np.sin(rt+2.27),np.cos(rt+2.27)),.012)
        blend((229,191,137),.8*marker*smooth(r-.355)*smooth(.390-r))
        band(.326,.345,[28,22,19],[139,113,83],lit*.65+.30*stripe)
        band(.311,.329,[7,11,13],[83,92,88],lit*.52+.10*stripe)
        # Concave glass lies under opaque iris. Moving reflection is clipped by aperture.
        glass=(.39*gauss(X+.08,.14)*gauss(Y-.01,.10)+.20*gauss(X-.092,.15)*gauss(Y+.035,.20))
        g=metal([7,15,19],[28,110,114],glass+.19*gauss(r-.13,.035),rough=0)
        flare=gauss(Y+.68*X-.026+.125*(1-p),.013)*gauss(X-.035,.13)
        flare2=gauss(Y+.68*X-.049+.125*(1-p),.0037)*gauss(X-.07,.085)
        g=g+ease(2.83,3.16,t)*(44*flare+70*flare2)[...,None]*np.array([1.25,1.1,.78])
        arc=gauss(r-.158,.0017)*gauss(np.arctan2(np.sin(th+2.6),np.cos(th+2.6)),.7)
        g=g+arc[...,None]*np.array([29,74,72])*(.38+.55*p)
        center=gauss(r,.037)*(.13+.44*p)
        g=g+center[...,None]*np.array([31,48,43])
        blend(g,smooth(.315-r))
        # Nine overlapping leaves: separate ordered faces, each swept from a
        # curved lip, producing the genuine change in occluded aperture area.
        turn=.37-.45*o
        ap=.038+.164*o
        warp=1.06*(r-ap)
        lap=(th+turn+warp)*(9/TAU)
        cell=np.floor(lap)
        frac=lap-cell
        rim=ap*(.939+.051*np.cos((frac-.43)*TAU)+.025*np.sin(frac*TAU))
        wing=smooth(r-rim)*smooth(.313-r)
        face=.23+.27*lit+.11*(1-frac)+.07*np.cos(cell*TAU/9-.91)
        edge=np.minimum(frac,1-frac)
        face=face+.09*gauss(frac-.09,.045)-.16*gauss(edge,.017)
        blade=metal([12,17,20],[105,122,123],face)
        blend(blade,wing)
        blend((138,153,144),.24*gauss(r-rim-.001,.0016)*wing*lit)
        # Minor halation kept in specular pixels only, unobtrusive vignette.
        vign=1-.17*unit((x*x+y*y)*1.25)
        rgb*=vign[...,None]
        return np.uint8(np.rint(np.clip(rgb+self.noise[...,None]*.75,0,255)))

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument('out',type=Path)
    arg.add_argument('--proof',action='store_true')
    a=arg.parse_args()
    w,h=(540,304) if a.proof else (1080,608)
    frames=[0,22,30,48,65,72,87,102,131] if a.proof else range(N)
    st=Studio(w,h)
    cmd=['ffmpeg','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(a.out)]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as p:
        for i in frames:p.stdin.write(st.frame(i).tobytes())
        p.stdin.close()
        if p.wait():raise SystemExit('Encoding failed')
if __name__=='__main__':main()

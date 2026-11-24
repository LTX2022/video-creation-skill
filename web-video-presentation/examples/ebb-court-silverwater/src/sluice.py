"""Twilight installation: close cinematic relief of an existing water path."""
from pathlib import Path
import argparse,sys,math,subprocess
import numpy as np
from PIL import Image, ImageFilter
import story
r=story.r

PALETTE={
'soil':(38,43,47),'plinth':(86,89,83),'stone':(131,128,110),'cap':(171,160,136),
'slate':(65,78,77),'bronze':(164,106,64),'bronze_dark':(82,60,44),'pier':(116,111,96),
'channel_top':(42,112,107),'pool':(22,75,91),'ripples':(49,91,95),'dark':(57,60,59),
'foliage':(57,80,70),'foliage2':(65,95,72),'trunk':(75,65,51),
'aggregate':(105,106,96),'light_strip':(220,157,80),'trim':(153,107,65),
'travertine':(93,91,82),'enclosure':(43,53,59),'aperture':(71,70,61),'rail':(76,84,87),
}
# Positions stay outside all surfaces. The scene opens with a near, dark vertical
# edge and slips right through the custom aperture before easing closer.
TRACK=(
 (0,(1.36,2.18,-3.28),(-1.21,.88,1.94),39.),
 (40,(2.39,2.55,-2.83),(-1.37,.83,1.94),40.),
 (74,(2.91,2.93,-2.36),(-1.18,.74,1.82),39.),
 (123,(2.91,2.85,-1.78),(-.99,.64,1.78),37.),
)
OFFSET=44
def ease(t):
    t=max(0.,min(t,1.))
    return t*t*(3.-2.*t)
def camera(f):
    f=f-OFFSET
    for j in range(1,len(TRACK)):
        a,A,B,F=TRACK[j-1]; b,C,T,G=TRACK[j]
        if f<=b or j==len(TRACK)-1:
            s=ease((f-a)/(b-a))
            return (np.array(A)*(1-s)+np.array(C)*s,np.array(B)*(1-s)+np.array(T)*s,F*(1-s)+G*s)

def gate_stand():
    # A small bronze sluice at the throat, not a floating UI indicator.
    # These fixed rails remain at either side of actual channel water.
    for side in (-1,1):
        r.box(-3.68,1.355,2.44+.18*side,.067,.61,.042,'bronze_dark','sluice-stand')
        r.box(-3.64,1.54,2.44+.18*side,.027,.10,.059,'trim','sluice-stand')
    r.box(-3.68,1.658,2.44,.068,.035,.40,'bronze','sluice-stand')
def gate_mesh(f):
    lift=.264*r.ease((f-26)/19)
    r.box(-3.68,1.24+lift,2.44,.042,.242,.312,'bronze','sluice-door','cap')
    r.box(-3.649,1.312+lift,2.44,.024,.034,.138,'trim','sluice-door')
    r.box(-3.68,1.62+lift*.22,2.44,.024,.1,.026,'bronze_dark','sluice-stem')
def setup():
    if not r.MESH:
        r.scene()
        # Different art direction, not the freestanding model: take out both
        # foreground trees; extend the envelope and add one narrow entrance.
        discard={r.OBJECTS[n] for n in ('olive-east','olive-west','arrival-screen','screen-fins','screen-inlay','screen-coping','arrival-bench','slot-light','rill-fall-water')}
        r.MESH[:]=[t for t in r.MESH if t.oid not in discard]
        r.plane(0,-.29,0,120,120,'enclosure','continuous-ground')
        r.box(0,2.80,5.2,24,6.2,.32,'enclosure','back-wall')
        r.box(-6.32,2.30,.42,.29,5.5,13.1,'enclosure','closed-left-return')
        for y in (.42,1.28,2.14,3.00,3.86,4.72,5.56):
            r.box(-.3,y,5.00,18,.021,.022,'rail','back-wall-horizontal-joints')
        r.box(-1.12,1.46,-2.19,2.06,3.82,.24,'aperture','entry-reveal-left')
        r.box(-.035,1.46,-2.182,.046,3.82,.27,'bronze_dark','entry-bronze-rebate')
        r.box(-.004,1.46,-2.028,.025,3.65,.025,'light_strip','entry-inner-edge')
        r.box(1.16,3.28,-2.16,3.00,.24,.32,'aperture','entry-slim-header')
        r.box(.55,.040,4.15,8.7,.025,.052,'light_strip','low-reflected-practical')
        gate_stand()
    r.SCREEN_FACES={r.OBJECTS['entry-reveal-left'],r.OBJECTS['entry-slim-header']}
    r.MATS.update(PALETTE)
    r.camera=camera
    return r.make_shadow()

def grade(a,ids,f):
    # Only tonal shaping (no new motion/no tracking). World masks allow
    # wall tones to stay restrained without smoothing the water detail.
    h,w=ids.shape; y,x=np.ogrid[:h,:w]; y=y/h; x=x/w
    rgb=a.astype(np.float32)/255
    walls=np.isin(ids,[r.OBJECTS[n] for n in ('back-wall','closed-left-return','back-wall-horizontal-joints')])
    rgb[walls]*=np.array([.70,.82,.90])
    depth_lobe=np.exp(-(((x-.56)*2.2)**2+((y-.19)*2.5)**2))
    rgb[walls]+=depth_lobe[walls,None]*np.array([.018,.026,.036])
    # Gentle tungsten mids/cool darks and modest finite exposure falloff.
    focus=.84+.19*np.exp(-(((x-.57)*1.30)**2+((y-.56)*1.55)**2))
    shifted=rgb*focus[...,None]
    shifted=shifted*(.91+.12*shifted)*np.array([1.075,.997,.957])+np.array([.006,.010,.020])
    run=ids==r.OBJECTS['connected-rill-water']
    if run.any():
        v=shifted[run]
        neutral=(v[:,0]+v[:,1]+v[:,2])/3
        # Preserve moving bright crest; lower green/chroma so the trough is
        # legible as water rather than a cyan emissive bar.
        shifted[run]=(v*.85+neutral[:,None]*.15)*np.array([.98,.88,.96])
    fall=ids==r.OBJECTS['rill-fall-water']
    if fall.any():
        peak=shifted[fall].max(axis=1)
        factor=np.minimum(1.,.68/np.maximum(.01,peak))
        shifted[fall]*=factor[:,None]
    return np.uint8(np.rint(np.clip(shifted,0,1)*255))

def fall_mesh(f):
    # Only the already arrived fraction of the gravity fall is geometry.
    # Preserve the two world-space mouth/impact points from the source path.
    phase=(f+OFFSET)/24
    front=(phase-3.45)*2.36
    t=np.clip((front-story.OFFSET[-2])/story.L[-1],0.,1.)
    if t<=.015:return
    a,b=story.PTS[-2:]
    sideways=r.norm(np.cross(np.array([0.,1.,0.]),b-a))
    # Asymmetric lamella and a much narrower broken tail. Root/mouth,
    # fall fraction and impact endpoint remain exact original geometry.
    knots=sorted(set([0.,float(t)]+[v for v in (.13,.30,.49,.67,.82,.93) if v<t]))
    for j in range(2):
        def bounds(k):
            wiggle=k*(.007*math.sin(phase*13-k*12+j*2.2)+.004*math.sin(phase*24-k*18))
            sep=(.014+.016*math.sin(np.pi*.91*k))*(1-k*.74)
            shift=(-.31 if j==0 else .90)*sep+wiggle
            if j==0:
                broad=.057*(1-k)**.63+.008
                wid=broad*(.84+.16*math.sin(phase*21-k*9)+.14*math.sin(k*17-phase*12))
            else:
                wid=(.006+.008*math.sin(np.pi*k)**2)*(.48+.52*math.sin(phase*12-k*8)**2)
                wid*=(.75+.25*(1-k))
            mid=a+(b-a)*k+sideways*shift
            return mid-sideways*wid/2,mid+sideways*wid/2
        for k,l in zip(knots,knots[1:]):
            u,v=bounds(k); x,y=bounds(l)
            r.quad(u,x,y,v,'channel_top','rill-fall-water')
            r.quad(v,y,x,u,'channel_top','rill-fall-water')
def frame(f,w,h,sh):
    old=len(r.MESH)
    fall_mesh(f)
    gate_mesh(f)
    try:rgb,ids,flow=story.painted_frame(f+OFFSET,w,h,sh)
    finally:del r.MESH[old:]
    return grade(rgb,ids,f),ids,flow

def main():
    p=argparse.ArgumentParser();p.add_argument('out',type=Path);p.add_argument('--video',action='store_true')
    args=p.parse_args();args.out.mkdir(parents=True)
    sh=setup()
    if not args.video:
        w,h=640,360
        frames=(20,31,42,54,84,105)
        clip=b''.join(frame(f,w,h,sh)[0].tobytes() for f in frames)
        data=subprocess.check_output(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x360','-r','24','-i','pipe:','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-f','matroska','pipe:'],input=clip)
        raw=subprocess.check_output(['ffmpeg','-v','error','-i','pipe:','-f','rawvideo','-pix_fmt','rgb24','pipe:'],input=data)
        decoded=np.frombuffer(raw,np.uint8).reshape(len(frames),h,w,3)
        sheet=Image.new('RGB',(w*3,h*2))
        for j,img in enumerate(decoded):sheet.paste(Image.fromarray(img),((j%3)*w,(j//3)*h))
        sheet.resize((1440,540),Image.Resampling.LANCZOS).save(args.out/'decoded-proof.png')
    else:
        w,h=960,540
        with subprocess.Popen(['ffmpeg','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s','960x540','-r','24','-i','pipe:','-an','-c:v','libx264','-threads','4','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(args.out/'twilight-sluice.mp4')],stdin=subprocess.PIPE) as enc:
            for f in range(144):enc.stdin.write(frame(f,w,h,sh)[0].tobytes())
            enc.stdin.close()
            if enc.wait():raise RuntimeError('encode failed')
if __name__=='__main__':main()

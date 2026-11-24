"""Mechanical check of the supplied meter example, including actual MOV alpha."""
import argparse
import json
import math
from pathlib import Path
import subprocess
from statistics import median
from PIL import Image

W,H,N=480,270,72
HUB=(235,143,245,153)
INK=(216,201,265,215)
PLATE=(24,24,67,56)
FRAMES=(0,8,26,37,54,71)

def stream(path, pixfmt, chans, filters=()):
    args=['ffmpeg','-v','error','-xerror','-i',str(path),'-map','0:v:0']
    if filters: args += ['-vf',','.join(filters)]
    r=subprocess.check_output(args+['-fps_mode','passthrough','-pix_fmt',pixfmt,'-f','rawvideo','-'])
    step=W*H*chans
    if len(r)!=step*N:raise ValueError(f'{path.name}: wrong joined decoded frame size/count')
    return [Image.frombytes('RGB' if chans==3 else 'L',(W,H),r[i:i+step]) for i in range(0,len(r),step)]

def mae(a,b,box):
    x,y=a.crop(box).tobytes(),b.crop(box).tobytes()
    return sum(abs(m-n) for m,n in zip(x,y))/len(x)

def amber(im):
    # Bright warm needle only; the cyan status marker and cool grid are excluded.
    return [(x,y) for y in range(65,170) for x in range(185,295)
            if (p:=im.getpixel((x,y)))[0] > 165 and p[0]-p[2] > 45 and p[1]>86]

def bounds(p):
    if not p: raise ValueError('no moving needle pixels')
    return [(sum(z[i] for z in p)/len(p)) for i in range(2)]

def metadata(path):
    s=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
                                         'stream=width,height,codec_type,avg_frame_rate','-of','json',str(path)]))['streams']
    if s!=[dict(codec_type='video',width=W,height=H,avg_frame_rate='24/1')]:
        raise ValueError(f'{path.name}: not one 480×270 video stream at 24 fps: {s}')

def check(out, plate_file):
    clip=out/'shot-composite.mp4'
    mov=out/'element-alpha.mov'
    metadata(clip);metadata(mov)
    v=stream(clip,'rgb24',3)
    p=stream(plate_file,'rgb24',3)
    a=stream(mov,'gray',1,('alphaextract',))
    base=max(mae(f,v[0],INK) for f in v)
    hub=max(mae(f,v[0],HUB) for f in v)
    plate=max(mae(f,g,PLATE) for f,g in zip(v,p))
    tip=[bounds(amber(v[i])) for i in FRAMES]
    # Extrapolate the visible shaft centerline through the opaque foreground cap.
    # Motion may look credible at both ends while the actual attachment drifts.
    def anchor_x(image):
        pts=amber(image)
        row=[(148-y,median(xs)) for y in range(112,138)
             if (xs:=[x for x,j in pts if j==y])]
        if len(row)<15: raise ValueError('too little visible shaft for hinge check')
        xbar=sum(x for x,_ in row)/len(row)
        ybar=sum(y for _,y in row)/len(row)
        slope=sum((x-xbar)*(y-ybar) for x,y in row)/sum((x-xbar)**2 for x,_ in row)
        return ybar-slope*xbar
    shaft_anchors=[anchor_x(v[f]) for f in (26,37)]
    alpha_ok=all(f.getpixel((240,148))>=250 and f.getpixel((224,207))>=250
                 and f.getpixel((25,24))==0 and f.getpixel((120,149)) in range(1,255)
                 for f in a)
    angles=[math.degrees(math.atan2(x-240,148-y)) for x,y in tip]
    checks={
        'fixed_base': base<=3, 'hinge_unchanged': hub<=3, 'correct_plate':plate<=3,
        'needle_contact':all(abs(x-240)<1.5 for x in shaft_anchors),
        'ride_and_return':all(abs(angles[i]-30)<2 for i in (2,3))
                          and all(abs(angles[i])<2 for i in (0,1,4,5)),
        'actual_alpha':alpha_ok,
    }
    sheet=Image.new('RGB',(W*3,H*2));
    for j,f in enumerate(FRAMES):sheet.paste(v[f],((j%3)*W,(j//3)*H))
    sheet.save(out/'verified-contact-sheet.png')
    print(json.dumps(dict(checks=checks,mae=dict(base=base,hinge=hub,plate=plate),amber_centroids=tip,needle_deg_from_vertical=angles,peak_shaft_anchor_x=shaft_anchors),indent=2))
    return all(checks.values())

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path);p.add_argument('--plate',type=Path,required=True,help='Path to the intended source plate (use an absolute path when elsewhere)')
    a=p.parse_args()
    raise SystemExit(0 if check(a.out,a.plate) else 1)

if __name__=='__main__':main()

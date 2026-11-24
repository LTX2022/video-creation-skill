import argparse, hashlib, json, math, subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

PIVOT=(218,216)
def make(file):
    S=np.asarray(Image.open(file).convert('RGB'))
    Y,X=np.indices(S.shape[:2]); x,y=X,Y
    # Visible bronze arm and grip against a predominantly blue-green image.
    # Protect the central cap. The brighter connected arm starts at the cap lip.
    cap=(x-218)**2+(y-216)**2<=14.5**2
    corridor=(x>=217)&(x<=471)&(y>=141)&(y<=234)&(np.abs(y-(215-.221*(x-218)))<=np.where(x>=418,32,23))&~cap
    warm=S[...,0].astype(float)-S[...,2]
    seed=(warm>=18)&corridor
    lab,k=nd.label(seed)
    seed=lab==lab[202,295]
    assert seed.sum()>5000
    seed=nd.binary_fill_holes(seed)
    # Include near-boundary anti-alias/shadow samples, without repainting any
    # remote panel pixels. The shadow below the arm is at most 2 pixels wide.
    support=nd.binary_dilation(seed,iterations=4)&corridor
    # A visible dark falloff under the grip extends beyond the copper pixels.
    support |= (x>=418)&(x<=470)&(y>=181)&(y<=195)&(S[...,2]<54)&(nd.distance_transform_edt(~seed)<=8)
    avoid=nd.binary_dilation(seed,iterations=8)
    back=S.copy()
    # Reconstruct only hidden portions, using visible rows/adjacent grid repeats.
    # x=259, 272, ... is the grid period; line thickness can differ by AA phase.
    for j,i in zip(*np.where(support)):
        src=None
        if i>=258 and i<=468:
            if j<150:
                src=(j,400)
            elif j<=158:
                q=min(405, max(285,i-39))
                src=(j,q)
            else:
                choices=[i+13*t for t in range(-17,18) if t and 259<=i+13*t<=465]
                choices.sort(key=lambda q:abs(q-i))
                clean=[q for q in choices if not avoid[j,q] and warm[j,q]<4 and not (q<=285 and j>=222)]
                if clean:
                    back[j,i]=np.rint(np.median(S[j,clean[:5]],axis=0)).astype(np.uint8);continue
        elif i>=241:
            if j<222:
                # Keep the section's vertical boundary by same-column samples
                # in the clean middle of this edge. At the bottom preserve rim.
                src=(190 if i>=243 else 188,i)
            else:
                src=(190 if i>=243 else 188,i)
        else:
            # Circular concentric hinge texture visible on the opposing side.
            rad=math.hypot(i-218,j-216)
            if rad<=23:
                src=(j,436-i)
            elif j>=220:
                src=(231,i)
            else:
                src=(j,188)
        if src is None:
            # If the old shaft and grip cover all same-phase columns, use a
            # clean row of the same grid column, not another hidden pixel.
            free=[yy for yy in (212,207,200,195,169,165,162,224) if not avoid[yy,i] and warm[yy,i]<4]
            src=(free[0],i) if free else (195,300+((i-300)%13))
        back[j,i]=S[src]
    # Right side of the hinge socket crosses in front of the larger grid
    # panel. Infer its uninterrupted vertical trim from clearly exposed
    # rows 226–227. Apply only to the masked old silhouette/shadow; this
    # does not paint across the original socket boundary or static panel.
    inner=(x>=239)&(x<=257)&(y>=214)&(y<=225)&support
    inner &= (x-218)**2+(y-216)**2>23**2
    profile=np.median(S[226:228].astype(float),axis=0)
    wt=np.clip((y-214)/4.,0.,1.)
    back[inner]=np.rint((1-wt[inner,None])*back[inner]+wt[inner,None]*profile[x[inner]]).astype(np.uint8)
    # Derive matte + edge foreground against estimated local background.
    # Use color distance to detect subpixel copper; keep near-black contact
    # edge only when its local difference survives thresholding.
    interior=nd.binary_erosion(seed,iterations=1)
    _,near=nd.distance_transform_edt(~interior,return_indices=True)
    src=S.astype(float); bg=back.astype(float)
    est=src[tuple(near)]; bary=est-bg; diff=src-bg
    a=(np.sum(bary*diff,axis=2)/np.maximum(1,np.sum(bary*bary,axis=2)))
    a=np.clip(a,.015,1)
    # Preserve darker outside contour as independently estimated dark alpha.
    black=np.sum(diff*(0-bg),axis=2)/np.maximum(1,np.sum(bg*bg,axis=2))
    a=np.where((~seed)&(warm<10),np.clip(black,0,.50),a)
    a=np.where(np.max(np.abs(diff),axis=2)<3,0,a)
    a[interior]=1
    a[~support]=0
    a[cap]=0
    F=np.clip((src-bg*(1-a[:,:,None]))/np.maximum(a[:,:,None],.015),0,255)
    fore=np.dstack([np.rint(F),np.rint(a*255)]).astype('uint8')
    return S,back,support,fore,cap

def interpolate(f):
    v=[(0,0),(8,0),(18,12),(26,12),(39,0),(48,0),(58,12),(66,12),(79,0),(119,0)]
    for (a,x),(b,y) in zip(v,v[1:]):
        if a<=f<=b:
            t=(f-a)/(b-a); return x+(y-x)*t*t*(3-2*t)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('source',type=Path);p.add_argument('output',type=Path)
    args=p.parse_args(); args.output.mkdir(parents=True,exist_ok=False)
    S,B,M,fore,cap=make(args.source)
    shot=Image.fromarray(S); plate=Image.fromarray(B).convert('RGBA'); lever=Image.fromarray(fore)
    Image.fromarray(M.astype('uint8')*255).save(args.output/'repair-mask.png')
    plate.save(args.output/'reconstructed-plate.png'); lever.save(args.output/'visible-lever-rgba.png')
    assert np.array_equal(S[~M],B[~M])
    frames={}
    cmd=['ffmpeg','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s','640x360','-r','24','-i','-','-an','-c:v','libx264rgb','-crf','0','-threads','2','-movflags','+faststart',str(args.output/'lever.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as process:
        for f in range(120):
            angle=interpolate(f)
            if angle==0: A=S
            else:
                rotated=lever.rotate(angle,Image.Resampling.BICUBIC,center=PIVOT)
                A=np.array(Image.alpha_composite(plate,rotated).convert('RGB'))
                A[cap]=S[cap]
                if angle<1.4:
                    t=angle/1.4; t=t*t*(3-2*t)
                    A=np.rint((1-t)*S.astype(float)+t*A).astype(np.uint8)
                mask=M|(np.asarray(rotated)[...,3]>0)
                assert np.array_equal(A[~mask],S[~mask])
                for l,t,r,b in [(119,194,180,268),(491,195,515,267),(260,226,285,246)]:
                    assert np.array_equal(A[t:b,l:r],S[t:b,l:r])
            if f in [0,12,18,26,42,58,78,79,119]:
                Image.fromarray(A).save(args.output/f'frame-{f:03d}.png')
                frames[f]=hashlib.sha256(A.tobytes()).hexdigest()
            process.stdin.write(A.tobytes())
        process.stdin.close()
        if process.wait():raise RuntimeError('encoding failed')
    print(json.dumps({'repair_support_px':int(M.sum()),'frames_rgb_sha':frames}))
if __name__=='__main__':main()

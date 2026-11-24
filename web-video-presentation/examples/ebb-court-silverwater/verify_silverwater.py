"""Technical producer evidence for Silverwater, not an art or release verdict."""
from pathlib import Path
from hashlib import sha256
import argparse
import json
import subprocess
import sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent/'src'))
import finish
import sluice
import story

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path);p.add_argument('output',type=Path)
    args=p.parse_args()
    args.output.mkdir(parents=True)
    video=args.input
    ff=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_format','-show_streams','-of','json',str(video)]))
    v,=ff['streams']
    assert (v['width'],v['height'],v['avg_frame_rate'],v['nb_read_frames'],v['pix_fmt'],ff['format']['duration'])==(960,540,'24/1','144','yuv420p','6.000000')
    raw=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(video),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
    video_rgb=np.frombuffer(raw,np.uint8).reshape(144,540,960,3)
    r=finish.r
    H=lambda x: sha256(x).hexdigest()
    def mesh_geometry():
        return {
            k:H(b''.join(t.verts.astype('<f8').tobytes() for t in r.MESH if t.oid==i))
            for k,i in r.OBJECTS.items()
        }
    sluice.setup()
    old=mesh_geometry()
    r.MESH.clear()
    r.OBJECTS.clear()
    sh=finish.setup()
    new=mesh_geometry()
    assert new.keys()==old.keys()
    changed={k for k in old if old[k]!=new[k]}
    assert changed=={'pool-coping','elevated-intake'}, changed
    names='intake-fluid connected-rill-water recessed-basin basin-water-marks rill-structure rill-sides sluice-stand'.split()
    authored={'baseline': {k:old[k] for k in sorted(changed)}, 'silverwater': {k:new[k] for k in sorted(changed)}}
    protected={k:new[k] for k in names}
    frames=(0,20,31,40,45,50,55,60,70,78,79,80,81,82,83,84,86,90,110,143)
    selected={}
    for f in frames:
        rgb,ids,flow=finish.frame(f,480,270,sh)
        basin=ids==r.OBJECTS['recessed-basin']
        fall=ids==r.OBJECTS['rill-fall-water']
        gate=ids==r.OBJECTS['sluice-door']
        assert np.count_nonzero(r.OBJECTS['connected-rill-water']==ids)>100
        assert not np.any(ids==0)
        assert not fall.any() if f<=78 else fall.any()
        if f<=83 or f==143:
            assert not flow['basin']['excited'], (f,flow)
        if 84<=f<=90:
            assert flow['basin']['excited']>0, (f,flow)
        actual=np.asarray(Image.fromarray(video_rgb[f]).resize((480,270),Image.Resampling.BOX)).astype(np.int16)
        err=np.abs(actual-rgb.astype(np.int16))
        assert err.mean()<4.0 and err[basin].mean()<5.5, (f,err.mean(),err[basin].mean())
        # Exclude a 2px envelope where downsampling mixes stone and water.
        core=basin.copy()
        for dy,dx in ((-2,0),(2,0),(0,2),(0,-2)):
            core&=np.roll(basin,(dy,dx),axis=(0,1))
        colors=actual[core]
        # In decoded output, no amber patch in skin-neutral basin.
        amber=((colors[:,0]>colors[:,1]+6)&(colors[:,1]>colors[:,2]+6))
        assert amber.mean()<.002, (f,amber.mean())
        selected[f]={'fall_mask':int(fall.sum()),'gate_mask':int(gate.sum()),'basin_amber_fraction':float(amber.mean()),'whole_frame_means_absolute_difference':round(float(err.mean()),4),'flow':flow}
    def gate_box(f):
        n=len(r.MESH); sluice.gate_mesh(f)
        try:
            y=np.array([t.verts[:,1] for t in r.MESH[n:] if t.oid==r.OBJECTS['sluice-door']])
            return y.min(),y.max()
        finally:
            del r.MESH[n:]
    assert np.allclose(np.array(gate_box(45))-np.array(gate_box(0)),.264)
    # Verify that pre-impact material is not a still fill or colored flash,
    # under fixed camera/shadow and consistent sample points.
    t=next(t for t in r.MESH if t.oid==r.OBJECTS['recessed-basin'])
    xx,zz=np.meshgrid(np.linspace(-.72,3.86,36),np.linspace(.03,3.10,28))
    pts=np.stack((xx.ravel(),np.full(xx.size,.199),zz.ravel()),axis=1)
    va=np.zeros_like(pts); n=np.array([0.,1.,0.]); C=np.array([2.91,2.85,-1.78]); d=np.zeros(len(pts))
    a,b=[finish.finish(va.copy(),t,pts,n,C,f,d) for f in (0,45)]
    assert a.shape==b.shape and np.all(a[:,2]>=a[:,1]) and np.all(a[:,1]>a[:,0])
    ambient_delta=float(np.abs(a-b).mean())
    assert .45<ambient_delta<16., ambient_delta
    report=dict(sha256=H(video.read_bytes()), preimpact_fixed_camera_optics_mean_delta=ambient_delta, fps=24, size=[960,540], duration=6., frames=144, has_audio=False, protected_geometry=protected, deliberately_changed_geometry=authored, samples=selected)
    (args.output/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['sha256'],max(z['whole_frame_means_absolute_difference'] for z in selected.values()),max(z['basin_amber_fraction'] for z in selected.values()))
if __name__=='__main__': main()

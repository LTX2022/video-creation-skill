"""Verify actual encoded Moongate release-and-settle video against its editable renderer and flow."""
from pathlib import Path
from hashlib import sha256
from fractions import Fraction
import argparse, json, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent/'src'))
import moongate as m

def h(b):
    return sha256(b).hexdigest()
def require(condition,label):
    if not condition: raise ValueError(label)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path); p.add_argument('out',type=Path)
    a=p.parse_args()
    a.out.mkdir(parents=True)
    ff=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(a.input)]))
    require(len(ff['streams'])==1,'Expected exactly one media stream (no audio).')
    v=ff['streams'][0]
    require((v['codec_name'],v['width'],v['height'],v['avg_frame_rate'],v['nb_read_frames'],v['pix_fmt'],ff['format']['duration'])==('h264',960,540,'24/1','144','yuv420p','6.000000'),'Unexpected dimensions, codec, rate, duration or frames')
    pts_data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames',
        '-show_entries','frame=best_effort_timestamp','-of','json',str(a.input)]))
    time_base=Fraction(v['time_base'])
    pts=[int(f['best_effort_timestamp'])*time_base for f in pts_data['frames']]
    require(pts==[Fraction(i,24) for i in range(144)],'Frames must have exact contiguous CFR timestamps')
    raw=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(a.input),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
    dec=np.frombuffer(raw,np.uint8).reshape(144,540,960,3)
    require(len({h(a.tobytes()) for a in dec})==144,'Unexpected duplicate decoded frame')
    r=m.r
    def geo():
        result={}
        for t in r.MESH:
            result.setdefault(t.oid,[]).append(t.verts.astype('<f8').tobytes())
        return {n:h(b''.join(result[i])) for n,i in r.OBJECTS.items() if i in result}
    m.finish.setup()
    pre=geo()
    r.MESH.clear()
    r.OBJECTS.clear()
    sh=m.setup()
    after=geo()
    require(all(after.get(n)==d for n,d in pre.items()),'Unexpected base mesh geometry change')
    added={n:after[n] for n in sorted(after.keys()-pre.keys())}
    require(len(added)>=10,'Missing authored architectural objects')
    points=(0,24,31,45,53,62,78,79,81,83,84,87,96,104,112,125,132,143)
    samples={}
    thumb=[]
    tail_mask=None
    terminal_delta=None
    for f in points:
        _,ids,flow=m.frame(f,480,270,sh)
        rgb=m.supersampled(f,480,270,sh)
        gate=ids==r.OBJECTS['sluice-door']
        fall=ids==r.OBJECTS.get('rill-fall-water')
        basin=ids==r.OBJECTS['recessed-basin']
        channel=ids==r.OBJECTS['connected-rill-water']
        require(gate.sum()>=35 and channel.sum()>160 and basin.any() and not (ids==0).any(),f'Missing story or enclosure geometry at {f}')
        if f<=78 or f>=141: require(not fall.any(),f'Unexpected water outside live discharge at {f}')
        if 79<=f<=125: require(fall.any(),f'Missing water in live discharge at {f}')
        if f==125: tail_mask=fall.copy()
        if f==143:
            # Camera is now held. Compare exactly the prior visible geometry's
            # image support with the settled basin, in the actual encoded frames.
            early=np.asarray(Image.fromarray(dec[125]).resize((480,270),Image.Resampling.BOX)).astype(float)
            late=np.asarray(Image.fromarray(dec[143]).resize((480,270),Image.Resampling.BOX)).astype(float)
            terminal_delta=float((early-late)[tail_mask].mean())
            require(terminal_delta>12.,f'No decoded stream disappearance: {terminal_delta:.3f}')
        if f<=83: require(flow['basin']['excited']==0,f'Premature basin impact at {f}')
        if 84<=f<=104: require(flow['basin']['excited']>0,f'Missing basin impact at {f}')
        thumb.append(Image.fromarray(dec[f]).resize((480,270),Image.Resampling.BOX))
        d=np.asarray(thumb[-1]).astype(np.int16)
        err=np.abs(d-rgb.astype(np.int16))
        require(err.mean()<4.0 and err[basin].mean()<5.0,f'Encoded/render mismatch at {f}: {err.mean():.3f}/{err[basin].mean():.3f}')
        core=basin.copy()
        for dy,dx in ((-2,0),(2,0),(0,-2),(0,2)):
            core&=np.roll(basin,(dy,dx),axis=(0,1))
        colors=d[core]
        amber=((colors[:,0]>colors[:,1]+6)&(colors[:,1]>colors[:,2]+6))
        require(amber.mean()<.004,f'Unexpected warm spill in core water at {f}')
        samples[str(f)]=dict(whole_mae=float(err.mean()),basin_mae=float(err[basin].mean()),basin_amber_fraction=float(amber.mean()),gate_pixels=int(gate.sum()),fall_pixels=int(fall.sum()),route_pixels=int(channel.sum()),events=flow,decoded_rgb24_sha256=h(dec[f].tobytes()))
    def moving_bounds(f):
        n=len(r.MESH)
        m.gate_mesh(f)
        try:
            ids=[r.OBJECTS['sluice-door'],r.OBJECTS['sluice-hardware']]
            return tuple([t.verts.copy() for t in r.MESH[n:] if t.oid==ident] for ident in ids)
        finally:
            del r.MESH[n:]
    for at_closed,at_open,at_end in zip(moving_bounds(0),moving_bounds(45),moving_bounds(143)):
        require(np.allclose(np.array(at_open)-np.array(at_closed),[0,.264,0]),'Door and hardware must use identical .264-unit lift')
        require(np.allclose(at_end,at_closed),'Gate did not physically return to closed pose')
    require(np.linalg.norm(m.camera(44)[0]-m.camera(187)[0])>1.0,'Expected a real world camera move')
    require(np.array_equal(m.camera(169)[0],m.camera(187)[0]),'Camera must have settled before final water contact')
    require(not {'stone-drainline','pool-inlay'}.intersection(r.OBJECTS),'Removed microgeometry returned')
    at_mouth,at_basin=m.story.OFFSET[-2],m.story.OFFSET[-1]
    tail=(m.story.FRAME_BIAS+m.story.RELEASE_FRAME[1])/24.
    require(m.story.remaining(at_mouth,tail+at_mouth/m.story.FLOW_SPEED+1e-6)==0 and
            m.story.remaining(at_basin,tail+at_mouth/m.story.FLOW_SPEED+1e-6)>0,
            'Cutoff must propagate from mouth to basin, not vanish simultaneously')
    strip=Image.new('RGB',(480*3,270*6))
    for i,source in enumerate(thumb):strip.paste(source,((i%3)*480,(i//3)*270))
    strip.save(a.out/'decoded-contact.png')
    report=dict(sha256=h(a.input.read_bytes()), full_decode_rgb24_sha256=h(raw), frame_count=144,duration_seconds=6,video='960x540 24fps H.264 yuv420p',has_audio=False,
            first_physical_fall_at_24fps=79,first_visible_impact_test_frame=84, cut_off_test_frame=143, decoded_stream_disappearance_mean=terminal_delta, architectural_mesh_additions=added,original_mesh_objects_preserved=len(pre),samples=samples)
    (a.out/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['sha256'], max(s['whole_mae'] for s in samples.values()),max(s['basin_mae'] for s in samples.values()))
if __name__=='__main__':
    main()

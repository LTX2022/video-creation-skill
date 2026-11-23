"""Check real MP4 frames and declared 2.5D motion. Not an artistic acceptance."""
from pathlib import Path
import argparse, hashlib, json, subprocess
from itertools import pairwise
import render as r
import numpy as np
from PIL import Image

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def run(argv):
    p = subprocess.run(argv, check=True, capture_output=True)
    if p.stderr:
        raise RuntimeError(p.stderr.decode(errors="replace"))
    return p.stdout

def main(path):
    clip=path/"cutline-three-cards.mp4"
    probe=json.loads(run(["ffprobe","-v","error","-show_streams","-show_frames",
         "-show_entries","stream=codec_type,width,height,r_frame_rate:frame=best_effort_timestamp_time",
         "-of","json",str(clip)]))
    frames=probe["frames"]; streams=probe["streams"]
    assert len(streams)==1 and streams[0]["codec_type"]=="video"
    assert (streams[0]["width"],streams[0]["height"],streams[0]["r_frame_rate"])==(r.W,r.H,"30/1")
    assert len(frames)==r.N and all(abs(float(f["best_effort_timestamp_time"])-i/r.FPS)<1e-6 for i,f in enumerate(frames))
    run(["ffmpeg","-v","error","-xerror","-i",str(clip),"-map","0:v:0","-f","null","-"])
    orientation=[]
    widths=[]
    gaps=[]
    for f in range(r.N):
        row=[r.project(r.pose(k,f)) for k in range(3)]
        orientation.extend(nz for _,nz in row)
        extents=[(min(x for x,y in q),max(x for x,y in q)) for (q,nz) in row]
        widths.append([b-a for a,b in extents])
        if 89<=f<=111:
            gaps.extend(b[0]-a[1] for a,b in pairwise(extents))
    assert min(orientation)>0.10
    assert max(widths[0])<175 and min(widths[100])>315
    assert min(gaps)>8, min(gaps)
    yaw_delta=[abs(r.pose(k,f)[2]-r.pose(k,f-1)[2]) for f in range(95,112) for k in range(3)]
    assert min(yaw_delta)>.10
    assert all(r.pose(k,145)[-1]<.01 for k in range(3))
    images=sorted((path/"keyframes").glob("*.png"))
    assert len(images)==7
    indices=[int(q.name.split("-",1)[0]) for q in images]
    select="+".join(f"eq(n\\,{i})" for i in indices)
    raw=run(["ffmpeg","-v","error","-xerror","-i",str(clip),"-map","0:v:0","-vf",f"select={select}",
             "-fps_mode","passthrough","-pix_fmt","rgb24","-threads","1","-f","rawvideo","-"])
    rgb=np.frombuffer(raw,np.uint8).reshape(len(images),r.H,r.W,3)
    mae={}
    for pixels,q in zip(rgb,images):
        with Image.open(q) as original:
            delta=np.abs(pixels.astype(np.int16)-np.asarray(original,dtype=np.int16))
        mae[q.name]=round(float(delta.mean()),5)
    assert max(mae.values())<4.0,mae
    summary={"status":"checked","encoded":{"width":r.W,"height":r.H,"fps":r.FPS,
             "frames_decoded":len(frames),"duration_s":len(frames)/r.FPS,"audio_streams":0,"sha256":sha(clip)},
             "declared_projection":{"front_facing_min_normal":min(orientation),"edge_projected_widths_px":widths[0],
                 "resolved_projected_widths_px":widths[100],"min_reading_hold_gap_px":min(gaps),
                 "min_reading_hold_yaw_delta_deg_per_frame":min(yaw_delta)},
             "keyframes":{q.name:sha(q) for q in images},"encoded_keyframe_rgb_mae_vs_source":mae,
             "interpretation":"Full MP4 decode plus analytical transform checks and separate sampled visual review. This is a stylized planar projective composition, not full 3D geometry or a user aesthetic acceptance."}
    (path/"receipt.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps(summary["encoded"],indent=2))
if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("output",type=Path)
    main(ap.parse_args().output)

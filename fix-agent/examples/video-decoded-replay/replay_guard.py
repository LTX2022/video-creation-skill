"""Review a two-case correction with hash-pinned local MP4 evidence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess


MAX_BYTES = 16 * 1024 * 1024
MAX_DECODED = 32 * 1024 * 1024
MAX_MANIFEST = 64 * 1024
TOOLS = ('ffprobe', 'ffmpeg')


def require(ok, why):
    if not ok:
        raise ValueError(why)


def shape(obj, keys):
    require(type(obj) is dict and set(obj) == set(keys.split()), 'invalid manifest fields')


def number(v, lo, hi):
    require(type(v) is int and lo <= v <= hi, 'manifest integer out of range')
    return v


def json_object(items):
    result = {}
    for key, val in items:
        require(key not in result, 'duplicate JSON key')
        result[key] = val
    return result


def media_bytes(root_fd, path):
    require(isinstance(path, str) and len(path) <= 240, 'invalid local media path')
    parts = path.split('/')
    require(1 <= len(parts) <= 8 and path.endswith('.mp4') and
            all(re.fullmatch(r'[A-Za-z0-9_-][A-Za-z0-9_.-]*', p) for p in parts),
            'only relative local MP4 paths are accepted')
    fd = os.dup(root_fd)
    try:
        for i, part in enumerate(parts):
            flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
            if i < len(parts) - 1:
                flags |= os.O_DIRECTORY
            new_fd = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = new_fd
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and 0 < info.st_size <= MAX_BYTES,
                'media must be a bounded regular file')
        with os.fdopen(os.dup(fd), 'rb') as f:
            raw = f.read(MAX_BYTES + 1)
        require(0 < len(raw) <= MAX_BYTES, 'media size out of range')
        return raw
    finally:
        os.close(fd)


def run_tool(tool, args, raw):
    assert tool in TOOLS
    return subprocess.run([tool, *args], input=raw, check=True,
                          capture_output=True, timeout=15).stdout


def decode(root, item, w, h, frames, fps):
    shape(item, 'path sha256')
    digest = item['sha256']
    require(isinstance(digest, str) and re.fullmatch(r'[0-9a-f]{64}', digest), 'invalid SHA-256')
    raw = media_bytes(root, item['path'])
    require(hashlib.sha256(raw).hexdigest() == digest, 'media SHA-256 mismatch')
    require(len(raw) >= 16 and raw[4:8] == b'ftyp', 'unsupported media: expected MP4')
    # Force the MOV/MP4 demuxer, disable external references and all non-pipe protocols.
    opts = ['-v', 'error', '-protocol_whitelist', 'pipe', '-f', 'mov', '-enable_drefs', '0']
    fields = 'codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate:stream_side_data=rotation'
    streams = json.loads(run_tool('ffprobe', [*opts, '-show_entries', 'stream='+fields,
                                              '-of', 'json', 'pipe:0'], raw))['streams']
    videos = [v for v in streams if v.get('codec_type') == 'video']
    require(len(videos) == 1 and all(v.get('codec_type') in ('video', 'audio') for v in streams),
            'unsupported stream layout')
    meta = videos[0]
    require(meta.get('codec_name') == 'h264' and meta.get('width') == w and meta.get('height') == h
            and meta.get('avg_frame_rate') == f'{fps}/1' and meta.get('r_frame_rate') == f'{fps}/1'
            and not meta.get('side_data_list'), 'unsupported codec, dimensions, rate, or rotation')
    # Full input up to one unexpected extra frame; compare presentation-frame PTS, not header rate alone.
    entries = json.loads(run_tool('ffprobe', [*opts, '-select_streams', 'v:0',
        '-read_intervals', f'%+#{frames+1}', '-show_frames', '-show_entries',
        'frame=best_effort_timestamp_time,width,height', '-of', 'json', 'pipe:0'], raw))['frames']
    # Packet limits need not yield all delayed decoder frames; FFprobe flushes at the end
    # of the interval. FFmpeg independently detects the extra decoded frame.
    require(len(entries) == frames, 'unsupported frame count or timing')
    for i, f in enumerate(entries):
        pts = f.get('best_effort_timestamp_time', '')
        require(isinstance(pts, str) and re.fullmatch(r'-?[0-9]{1,8}\.[0-9]{1,9}', pts)
                and abs(float(pts)-i/fps) <= .000003
                and (f.get('width'), f.get('height')) == (w,h),
                'unsupported variable timing or geometry')
    out = run_tool('ffmpeg', ['-nostdin', *opts, '-xerror', '-threads', '1', '-noautorotate',
        '-i', 'pipe:0', '-map', '0:v:0', '-an', '-sn', '-dn',
        '-frames:v', str(frames+1), '-fps_mode', 'passthrough', '-threads', '1',
        '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], raw)
    require(len(out) == frames*w*h*3, 'decoded byte count mismatch')
    return memoryview(out)


def roi(v, w, h, n, box, channel=None):
    require(type(box) is list and len(box) == 4, 'bad ROI')
    x,y,rw,rh = [number(i,0,max(w,h)) for i in box]
    require(rw > 0 and rh > 0 and x+rw <= w and y+rh <= h, 'ROI is outside video')
    return [b''.join(v[((f*h+y+j)*w+x)*3:((f*h+y+j)*w+x+rw)*3]
                     for j in range(rh))[slice(channel,None,3) if channel is not None else slice(None)]
            for f in range(n)]


def first_event(rows, sign, threshold):
    # Mean signed shift relative to the actual first decoded frame, sustained for 3 frames.
    b = sum(rows[0])
    hits = [sign*(sum(p)-b) >= threshold*len(p) for p in rows]
    return next((i for i in range(1,len(hits)-2) if all(hits[i:i+3])), None)


def case(root, desc, delta):
    shape(desc, 'id baseline candidate width height fps frames cues protection')
    require(isinstance(desc['id'], str) and re.fullmatch(r'[a-z0-9_-]{1,32}',desc['id']), 'bad case id')
    w=number(desc['width'], 16, 512)
    h=number(desc['height'], 16, 512)
    n=number(desc['frames'], 8, 180)
    fps=number(desc['fps'], 1, 60)
    require((n+1)*w*h*3 <= MAX_DECODED, 'decoded evidence exceeds budget')
    cues=desc['cues']
    require(type(cues) is list and len(cues)==3, 'expected onset, near, far cues')
    boxes=[]
    for cue in cues:
        shape(cue, 'roi channel direction threshold')
        number(cue['channel'],0,2)
        require(type(cue['direction']) is int and cue['direction'] in (-1,1), 'bad cue direction')
        number(cue['threshold'], 8,255)
        boxes.append(cue['roi'])
    before=decode(root,desc['baseline'],w,h,n,fps)
    after=decode(root,desc['candidate'],w,h,n,fps)
    protection=desc['protection']
    shape(protection, 'roi max_mae')
    limit=number(protection['max_mae'],0,10)
    boxes.append(protection['roi'])
    # Validate all rectangles in roi(), then keep them separate: a protection patch
    # can't accidentally be inside a deliberately moved cue.
    e=[[first_event(roi(v,w,h,n,c['roi'],c['channel']),c['direction'],c['threshold'])
        for c in cues] for v in (before,after)]
    b,a=(roi(v,w,h,n,protection['roi']) for v in (before,after))
    for i,(x,y,ww,hh) in enumerate(boxes):
        for xx,yy,vv,kk in boxes[:i]:
            require(x+ww <= xx or xx+vv <= x or y+hh <= yy or yy+kk <= y,
                    'cue and protection rectangles must not overlap')
    # If the baseline control is black/flat, preserving it isn't affirmative evidence.
    p0=b[0]
    spatial_spread=max(max(p0[c::3])-min(p0[c::3]) for c in range(3))
    require(spatial_spread >= 16 and sum(p0)/len(p0) >= 16, 'protected baseline ROI too flat/dark')
    errors=[sum(abs(i-j) for i,j in zip(p,q)) for p,q in zip(b,a)]
    mae=max(errors)/len(p0)
    require(all(v is not None for v in e[0]) and e[0][0]<e[0][1]<e[0][2],
            'ordered baseline cues not evidenced')
    candidate_ordered=all(v is not None for v in e[1]) and e[1][0]<e[1][1]<e[1][2]
    shifts=[None if c is None else c-b for b,c in zip(*e)]
    # The requested delays can differ from observed values (hold), but earlier-than-
    # baseline downstream events and moving or losing a cue are guard regressions.
    regressions=[]
    if not candidate_ordered or shifts[0] != 0 or any(x is not None and x<0 for x in shifts[1:]):
        regressions.append('cue_order_or_onset')
    if mae > limit:
        regressions.append('protected_roi')
    return {'id':desc['id'], 'events':e, 'shifts':shifts, 'protected_max_mae':round(mae,6),
            'exact_gain': shifts == [0,delta,delta], 'regressions':regressions,
            'baseline_sha256':desc['baseline']['sha256'], 'candidate_sha256':desc['candidate']['sha256']}


def evaluate(manifest, fd):
    shape(manifest, 'version expected_delay_frames cases')
    number(manifest['version'],1,1)
    delay=number(manifest['expected_delay_frames'],1,90)
    cases=manifest['cases']
    require(type(cases) is list and len(cases)==2, 'exactly two cases required')
    results=[case(fd, c, delay) for c in cases]
    require(results[0]['id'] != results[1]['id'], 'case IDs must be distinct')
    require(not ({results[0][k] for k in ('baseline_sha256','candidate_sha256')} &
                 {results[1][k] for k in ('baseline_sha256','candidate_sha256')}),
            'case media bytes must be distinct across cases')
    if any(c['regressions'] for c in results):
        return 'reject-regression', results
    return ('review-candidate' if all(c['exact_gain'] for c in results) else 'hold-no-qualifying-gain'), results


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--manifest', required=True, type=Path)
    ap.add_argument('--media-root', required=True, type=Path)
    a=ap.parse_args()
    report={'approved':False, 'coreChangesApplied':False}
    try:
        require(os.name=='posix' and hasattr(os,'O_NOFOLLOW'), 'POSIX filesystem required')
        with os.fdopen(os.open(a.manifest,os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK),'rb') as f:
            info=os.fstat(f.fileno())
            require(stat.S_ISREG(info.st_mode) and 0<info.st_size<=MAX_MANIFEST, 'invalid manifest file')
            raw=f.read(MAX_MANIFEST+1)
        require(0<len(raw)<=MAX_MANIFEST, 'manifest exceeds budget')
        m=json.loads(raw, object_pairs_hook=json_object)
        fd=os.open(a.media_root,os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            status,cases=evaluate(m,fd)
        finally:
            os.close(fd)
        report.update(status=status, cases=cases, manifest_sha256=hashlib.sha256(raw).hexdigest())
        code=0 if status=='review-candidate' else 1
    except (OSError, ValueError, KeyError, OverflowError, RecursionError, subprocess.SubprocessError) as exc:
        report.update(status='inconclusive', reason=(str(exc) if isinstance(exc,ValueError) else
                      'unreadable local input, missing executable, decoder failure, or timeout'))
        code=2
    print(json.dumps(report, indent=2))
    return code


if __name__=='__main__':
    raise SystemExit(main())

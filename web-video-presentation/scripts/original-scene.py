#!/usr/bin/env python3
"""Original abstract scene, CPU raster renderer; no assets, network or browser."""
import argparse
import hashlib
import json
import math
import subprocess
import platform
import threading
import time
from fractions import Fraction
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MAX_PIXEL_FRAMES = 120_000_000
ENCODE_TIMEOUT = 180
PROBE_TIMEOUT = 30

PALETTES = {
    'prism': [(46, 226, 255), (105, 109, 255), (246, 68, 192), (255, 176, 91)],
    'solar': [(255, 91, 47), (255, 177, 62), (255, 225, 151), (185, 85, 255)],
    'aurora': [(35, 241, 182), (49, 192, 252), (153, 105, 255), (246, 155, 224)],
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def validate(c):
    require(isinstance(c, dict) and c.get('schema') == 1, 'schema must be 1')
    require(c.get('route') == 'local-procedural-original', 'explicit local-procedural-original route required')
    require(c.get('localProcessingAuthorized') is True, 'local processing authorization required')
    require(not any(c.get(k) for k in ('assets', 'modelService', 'upload', 'prompt')), 'this route does not consume assets or invoke models/prompts')
    require(c.get('mode') in ('still', 'shot'), 'mode must be still or shot')
    require(c.get('design') in ('corolla', 'orbital'), 'design must be corolla or orbital')
    require(isinstance(c.get('palette'), str) and c['palette'] in PALETTES, 'unsupported palette')
    for key, lo, hi in [('width', 128, 1920), ('height', 128, 1920), ('fps', 1, 60), ('frames', 1, 1800), ('seed', 0, 2**32-1)]:
        require(type(c.get(key)) is int and lo <= c[key] <= hi, f'{key}: integer {lo}..{hi} required')
    require(c['width'] * c['height'] * c['frames'] <= MAX_PIXEL_FRAMES, 'total pixel-frame budget exceeded (120 million)')
    require(c['width'] % 2 == c['height'] % 2 == 0, 'even dimensions required')
    require(c['mode'] != 'still' or c['frames'] == 1, 'still requires exactly one frame')
    require(c['mode'] != 'shot' or c['frames'] >= 2, 'shot requires at least two frames')
    for key, lo, hi in [('exposure', .3, 2), ('motion', 0, 2), ('time', 0, 3600)]:
        require(type(c.get(key)) in (int, float) and math.isfinite(c[key]) and lo <= c[key] <= hi, f'{key}: finite {lo}..{hi} required')
    require(c.get('composition') in ('center', 'left', 'right'), 'composition must be center/left/right')
    return c


def scene(c, frame):
    """Analytic time, seeded geometry. No state accumulation or wall-clock animation."""
    w, h = c['width'], c['height']
    scale = min(w, h)
    t = c['time'] + frame / c['fps'] * c['motion']
    cx = w * {'center': .5, 'left': .36, 'right': .64}[c['composition']]
    cy = h * .49
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    x, y = (xx-cx)/scale, (yy-cy)/scale
    r2 = x*x + y*y
    # Quiet negative space, a broad atmospheric halo and cool/warm separation.
    base = np.zeros((h, w, 3), np.float32) + [2, 4, 12]
    for px, py, spread, color in [(-.22, -.16, .11, (12, 20, 55)), (.24, .16, .07, (45, 8, 33)), (0, 0, .035, (8, 17, 33))]:
        base += np.exp(-((x-px)**2+(y-py)**2)/spread)[..., None] * np.array(color)
    ink = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(ink)
    rng = np.random.default_rng(c['seed'])
    palette = PALETTES[c['palette']]
    # Sparse distant stars are slow; no random-per-frame flicker.
    for sx, sy, z, phase in rng.random((180, 4)):
        px = (sx*w + math.sin(t*.09+phase*6.28)*z*4) % w
        py = sy*h
        a = int(25 + 75*z)
        d.point((px, py), fill=(a//2, int(a*.7), a))
    angle = np.linspace(0, 2*np.pi, 800)
    # 30 individually twisted light filaments, not stacked title-card rings.
    for j in range(30):
        p = j / 29
        a = angle + t*.1 + p*.13
        if c['design'] == 'corolla':
            radius = .23 + .025*np.sin(5*a + p*4 + t*.35) + .034*np.sin(3*a-p*2-t*.13)
            X = radius*np.cos(a) * (1+.35*p)
            Y = radius*np.sin(a) * (1-.17*p)
            Z = .09*np.sin(3*a+p*4+t*.15)
        else:
            radius = .27 + .065*p
            X = radius*np.cos(a)
            Y = radius*np.sin(a)*(.23+.16*np.sin(p*math.pi))
            Z = radius*np.sin(a)*.6
            tilt = -.55 + p*.7 + .1*math.sin(t*.13)
            X, Y = X*np.cos(tilt)-Y*np.sin(tilt), X*np.sin(tilt)+Y*np.cos(tilt)
        # Perspective breathing is continuous and deliberately restrained.
        perspective = 1/(1+Z*.7)
        X = cx + scale*(X*perspective + .008*np.sin(t*.17))
        Y = cy + scale*(Y*perspective + Z*.22)
        col = palette[min(3, int(p*4))]
        points = list(zip(X, Y))
        d.line(points, fill=tuple(int(v*(.42+.5*p)) for v in col), width=max(1, round(scale/900)))
        # Travelling specular bead makes motion visible along the geometry.
        k = int((p*653+t*(17+7*p)) % (len(angle)-1))
        rr = max(1, scale*.0017)
        d.ellipse((X[k]-rr, Y[k]-rr, X[k]+rr, Y[k]+rr), fill=(230, 246, 255))
    # Drifting dust sits around the sculpture; foreground particles are larger.
    for a, radius, z, phase in rng.random((320, 4)):
        a = a*math.tau+t*(.015+.035*z)
        radius = .13 + radius*.36
        px = cx+scale*math.cos(a)*radius
        py = cy+scale*math.sin(a)*radius*.82
        s = max(.5, z*z*scale*.0023)
        col = palette[int(phase*4)]
        d.ellipse((px-s, py-s, px+s, py+s), fill=tuple(int(v*(.2+.6*z)) for v in col))
    sharp = np.asarray(ink).astype(np.float32)
    bloom = np.asarray(ink.filter(ImageFilter.GaussianBlur(max(1, scale*.006)))).astype(np.float32)
    haze = np.asarray(ink.filter(ImageFilter.GaussianBlur(max(2, scale*.025)))).astype(np.float32)
    linear = (base+sharp*1.4+bloom*2.4+haze*1.6)*c['exposure']
    # Smooth shoulder, preserves color instead of hard clipping white cores.
    rgb = 255*(1-np.exp(-linear/170))
    rgb *= np.clip(1-r2*.38, .55, 1)[..., None]
    return Image.fromarray(np.uint8(np.clip(rgb, 0, 255)))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_output(path):
    # Check lexical ancestors BEFORE resolving: even dangling links are rejected.
    raw = Path(path).expanduser().absolute()
    cursor = Path(raw.anchor)
    for part in raw.parts[1:]:
        cursor /= part
        require(not cursor.is_symlink(), f'output symlink forbidden: {cursor}')
    result = raw.resolve()
    require(not result.exists(), 'output directory already exists; never overwrite')
    return result


def checked_video(c, video):
    streams = video.get('streams', [])
    require(len(streams) == 1, 'expected exactly one video stream')
    s = streams[0]
    require(s.get('codec_name') == 'h264', 'actual codec mismatch')
    require((s.get('width'), s.get('height')) == (c['width'], c['height']), 'actual dimensions mismatch')
    require(Fraction(s.get('r_frame_rate', '0')) == c['fps'], 'actual fps mismatch')
    require(int(s.get('nb_read_frames', -1)) == c['frames'], 'actual frame count mismatch')
    duration = float(s.get('duration', 'nan'))
    require(math.isfinite(duration) and abs(duration-c['frames']/c['fps']) <= .001, 'actual duration mismatch')


def render(contract, output):
    c = validate(json.loads(Path(contract).read_text()))
    output = safe_output(output)
    versions = {'python': platform.python_version(), 'numpy': np.__version__, 'pillow': Image.__version__}
    if c['mode'] == 'shot':
        for tool in ('ffmpeg', 'ffprobe'):
            versions[tool] = subprocess.check_output([tool, '-version'], stderr=subprocess.PIPE, timeout=5).decode().splitlines()[0]
    output.mkdir(parents=True)
    (output/'contract.json').write_text(json.dumps(c, indent=2)+'\n')
    keys = sorted({0, c['frames']//2, c['frames']-1})
    p = log = timer = None
    expired = threading.Event()
    metrics = []
    started = time.monotonic()
    try:
        if c['mode'] == 'shot':
            log = (output/'encoder.log').open('wb')
            p = subprocess.Popen(['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', f"{c['width']}x{c['height']}", '-framerate', str(c['fps']), '-i', '-', '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output/'scene.mp4')], stdin=subprocess.PIPE, stderr=log)
            def deadline():
                expired.set()
                if p.poll() is None:
                    p.kill()  # also releases a blocked stdin write
            timer = threading.Timer(ENCODE_TIMEOUT, deadline)
            timer.daemon = True
            timer.start()
        for i in range(c['frames']):
            require(not expired.is_set(), 'render/encode timeout')
            im = scene(c, i)
            if i in keys:
                path = output/f'frame-{i:05d}.png'
                im.save(path)
                a = np.asarray(im)
                metrics.append({'frame': i, 'file': path.name, 'sha256': sha(path), 'meanRgb': a.mean(axis=(0, 1)).round(3).tolist(), 'stddev': round(float(a.std()), 3), 'brightPixelFraction': round(float((a.max(axis=2)>190).mean()), 5)})
            if p:
                p.stdin.write(im.tobytes())
        if p:
            p.stdin.close()
            code = p.wait(timeout=max(.1, ENCODE_TIMEOUT-(time.monotonic()-started)))
            require(not expired.is_set(), 'render/encode timeout')
            require(code == 0, 'FFmpeg failed; see encoder.log')
    except BrokenPipeError as exc:
        raise ValueError('render/encode timeout' if expired.is_set() else 'FFmpeg pipe failed; see encoder.log') from exc
    finally:
        if timer:
            timer.cancel()
            timer.join()
        if p:
            if p.poll() is None:
                p.kill()
            p.wait(timeout=5)
            if p.stdin and not p.stdin.closed:
                try:
                    p.stdin.close()
                except BrokenPipeError:
                    pass
        if log:
            log.close()
    evidence = {'schema': 1, 'renderer': 'CPU NumPy/Pillow original-scene', 'route': c['route'], 'assets': [], 'networkCalls': 0, 'modelCalls': 0, 'thirdPartyMedia': False, 'audio': False, 'determinism': 'same contract + dependency versions yields identical source pixels; codec bytes may vary by build', 'versions': versions, 'contractSha256': sha(output/'contract.json'), 'keyframes': metrics, 'claims': {'browserRenderVerified': False, 'modelGenerationVerified': False, 'aestheticAcceptance': 'requires visual/user review; pixel metrics are not taste'}}
    if p:
        evidence['video'] = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration', '-of', 'json', str(output/'scene.mp4')], stderr=subprocess.PIPE, timeout=PROBE_TIMEOUT))
        checked_video(c, evidence['video'])
        evidence['videoParametersVerified'] = True
        evidence['videoSha256'] = sha(output/'scene.mp4')
    (output/'evidence.json').write_text(json.dumps(evidence, indent=2)+'\n')
    return evidence


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('contract', help='JSON contract; see examples/original-scene')
    parser.add_argument('--output', required=True, help='new directory only')
    args = parser.parse_args()
    print(json.dumps(render(args.contract, args.output), indent=2))

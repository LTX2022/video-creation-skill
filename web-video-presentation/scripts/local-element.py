#!/usr/bin/env python3
"""Isolated local-media element / single-shot renderer; not a browser render."""
import argparse
import hashlib
import importlib.util
import json
import math
import subprocess
import tempfile
from fractions import Fraction
from pathlib import Path


def require(ok, message):
    if not ok:
        raise ValueError(message)


def fields(value, allowed, name):
    require(isinstance(value, dict), f'{name}: object required')
    unknown=set(value)-set(allowed.split())
    require(not unknown, f'{name}: unsupported fields: {sorted(unknown)}')


def number(value, name, low=None, high=None):
    require(type(value) in (int, float) and math.isfinite(value), f'{name}: finite number required')
    require(low is None or value >= low, f'{name}: below {low}')
    require(high is None or value <= high, f'{name}: above {high}')
    return value


def integer(value, name, low=0):
    require(type(value) is int and value >= low, f'{name}: integer >= {low} required')
    return value


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file', '-format_whitelist', 'mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpeg,mpegts,ogg,flv,gif', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(path)]))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


_rig_spec = importlib.util.spec_from_file_location('layer_rig', Path(__file__).with_name('layer-rig.py'))
rig = importlib.util.module_from_spec(_rig_spec)
_rig_spec.loader.exec_module(rig)


def render(contract_path, output):
    from PIL import Image
    contract_path = Path(contract_path).resolve()
    c = json.loads(contract_path.read_text())
    fields(c, 'schema scope localProcessingAuthorized coordinateSpace width height fps frames outputMode element plate tracking occlusion modelService', 'contract')
    require(c.get('schema') == 1, 'schema must be 1')
    require(c.get('scope') in ('element-animation', 'single-shot'), 'scope must be element-animation or single-shot; full-video uses main scaffold')
    require(c.get('localProcessingAuthorized') is True, 'local processing authorization required')
    require(c.get('coordinateSpace') == 'screen', 'only screen-space supported; tracking/occlusion need a separate implemented route')
    require(not any(c.get(k) for k in ('tracking', 'occlusion', 'modelService')), 'tracking/occlusion/model service unsupported; never silently approximated')
    w, h = integer(c.get('width'), 'width', 2), integer(c.get('height'), 'height', 2)
    require(w % 2 == h % 2 == 0 and max(w, h) <= 4096, 'even dimensions <= 4096 required')
    fps = Fraction(str(c.get('fps')))
    require(1 <= fps <= 120, 'fps must be 1..120, integer or rational string')
    n = integer(c.get('frames'), 'frames', 1)
    require(n <= 36000, 'isolated route limited to 36000 frames')
    mode = c.get('outputMode')
    require(mode in ('alpha', 'composite', 'both'), 'outputMode must be alpha/composite/both')
    require(not Path(output).is_symlink(), 'output must not be a symlink, including dangling links')
    output = Path(output).resolve()
    require(not output.exists(), 'output directory must not exist; never overwrite a prior render')
    assets = {}
    def asset(spec):
        require(isinstance(spec, dict), 'asset object required')
        require(isinstance(spec.get('rights'), str) and spec['rights'].strip(), 'asset requires truthful rights/use declaration')
        require(isinstance(spec.get('path'), str) and spec['path'], 'asset requires local path')
        p = (contract_path.parent / spec['path']).resolve()
        require(p.is_file(), f'local asset missing: {p}')
        require(not p.is_relative_to(output), 'output cannot contain an input')
        assets[str(p)] = {'sha256': digest(p), 'rights': spec['rights']}
        return p
    e = c.get('element')
    layers = []
    if e is not None:
        fields(e, 'motionModel asset layers flapHz minWingScale startFrame endFrameExclusive allowClipping keyframes', 'element')
        require(e.get('motionModel') in ('rigid', 'layered-wings', 'layered-rig'), 'motionModel must be rigid, layered-wings or layered-rig; no automatic segmentation')
        if e['motionModel'] == 'rigid':
            require(not any(k in e for k in ('layers','flapHz','minWingScale')), 'rigid motion cannot accept wing controls')
            specs = [dict(e['asset'], role='body')]
        elif e['motionModel'] == 'layered-rig':
            require(not any(k in e for k in ('asset', 'flapHz', 'minWingScale')), 'layered-rig uses generic layers only')
            specs = e.get('layers')
            require(isinstance(specs, list) and 1 <= len(specs) <= 64 and all(isinstance(s, dict) for s in specs), 'layered-rig requires 1..64 layer objects')
            require(all(isinstance(s.get('id'), str) for s in specs) and len({s['id'] for s in specs}) == len(specs), 'rig layer ids must be unique strings')
        else:
            require('asset' not in e, 'layered-wings uses layers, not flat asset')
            specs = e.get('layers', [])
            require(len(specs) == 3 and {x.get('role') for x in specs} == {'left-wing', 'right-wing', 'body'}, 'layered-wings requires real body, left-wing and right-wing assets')
            number(e.get('flapHz'), 'flapHz', .1, 20)
            number(e.get('minWingScale'), 'minWingScale', .05, 1)
        size = None
        layer_hashes = set()
        for spec in specs:
            if e['motionModel'] != 'layered-rig':
                fields(spec, 'path rights role hingeX', 'element asset')
            p = asset(spec)
            identity = assets[str(p)]['sha256']
            require(e['motionModel'] == 'layered-rig' or identity not in layer_hashes, 'layered-wings requires distinct actual layer contents, not repeated assets')
            layer_hashes.add(identity)
            im = Image.open(p)
            require(im.format == 'PNG', 'element assets must be transparent PNG; no automatic background removal/redrawing')
            require(getattr(im, 'n_frames', 1) == 1, 'animated PNG unsupported as a static layer; explicitly choose/extract a static frame or use an implemented video route')
            im.load()
            im = im.convert('RGBA')
            require(im.getchannel('A').getextrema()[0] < 255 and im.getchannel('A').getextrema()[1] > 0, 'element must contain transparent and visible pixels')
            require(size is None or im.size == size, 'layered PNGs must share a registered canvas')
            size = im.size
            pivot = spec.get('hingeX')
            if e['motionModel'] == 'layered-rig':
                rig.validate(spec, size, e.get('startFrame'), e.get('endFrameExclusive'), fps, fields, number, require)
            elif spec['role'] != 'body':
                number(pivot, 'hingeX (source pixels)', 0, im.width)
            layers.append((im, spec if e['motionModel'] == 'layered-rig' else spec['role'], pivot))
        start = integer(e.get('startFrame'), 'startFrame')
        end = integer(e.get('endFrameExclusive'), 'endFrameExclusive', 1)
        require(start < end <= n, 'element interval outside timeline')
        keys = e.get('keyframes', [])
        require(len(keys) >= 2, 'at least two explicit motion keyframes required')
        previous = -1
        for key in keys:
            fields(key, 'frame x y scale rotationDeg', 'keyframe')
            frame = integer(key.get('frame'), 'keyframe.frame')
            require(previous < frame, 'keyframes must be strictly increasing')
            previous = frame
            for field in ('x', 'y', 'rotationDeg'):
                number(key.get(field), field)
            number(key.get('scale'), 'scale', .001, 20)
        require(keys[0]['frame'] == start and keys[-1]['frame'] == end - 1 and end-start >= 2, 'keyframes must span visible interval, minimum two frames')
        require(type(e.get('allowClipping')) is bool, 'allowClipping must be explicit')
    else:
        require(c['scope'] == 'single-shot' and mode == 'composite', 'element required for element-animation/alpha')
    plate = c.get('plate')
    pp = None
    if mode != 'alpha':
        require(plate is not None, 'composite requires actual local plate; no silent test-board substitution')
        fields(plate, 'path rights trimStartSec fit audio fpsPolicy', 'plate')
        pp = asset(plate)
        trim = number(plate.get('trimStartSec'), 'trimStartSec', 0)
        require(plate.get('fit') in ('contain', 'cover'), 'plate.fit required')
        require(plate.get('audio') in ('mute', 'keep'), 'plate.audio required')
        require(plate.get('fpsPolicy') in ('reject', 'resample'), 'plate.fpsPolicy required')
        info = probe(pp)
        video = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
        require(video is not None, 'plate has no video')
        duration = float(video.get('duration', info['format'].get('duration', 0)))
        require(duration + .00001 >= trim + n / float(fps), 'plate too short; no silent freeze/loop')
        require(plate['fpsPolicy'] == 'resample' or Fraction(video['avg_frame_rate']) == fps, 'plate fps differs; explicit resample required')
        if plate['fpsPolicy'] == 'reject':
            # Average metadata alone does not establish constant cadence.
            timing=json.loads(subprocess.check_output(['ffprobe','-v','error','-protocol_whitelist','file','-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpeg,mpegts,ogg,flv,gif','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(pp)]))
            stamps=[float(frame['best_effort_timestamp_time']) for frame in timing['frames'] if 'best_effort_timestamp_time' in frame]
            require(len(stamps)==int(video['nb_read_frames']), 'source timestamps incomplete; explicit resample required')
            tolerance=max(.00001,float(Fraction(video.get('time_base','1/1000000')))*1.1)
            require(all(abs((b-a)-1/float(fps)) <= tolerance for a,b in zip(stamps,stamps[1:])), 'source is variable-rate; explicit resample required')
    elif plate:
        raise ValueError('alpha route must not include plate; use both for a separate composite')
    output.mkdir(parents=True)
    progress=output/'render-in-progress.json'
    progress.write_text(json.dumps({'status':'in-progress','deliverable':False})+'\n')
    try:
        commands = []
        def ff(args):
            command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-threads', '1', *args]
            commands.append(command)
            run(command)
        with tempfile.TemporaryDirectory(prefix='.local-element-', dir=output) as td:
            td = Path(td)
            if e:
                visible_frames = []
                for f in range(n):
                    frame = Image.new('RGBA', (w, h))
                    if start <= f < end:
                        a, b = next((a, b) for a, b in zip(keys, keys[1:]) if a['frame'] <= f <= b['frame'])
                        t = (f-a['frame'])/(b['frame']-a['frame'])
                        k = {v: a[v]+(b[v]-a[v])*t for v in ('x','y','scale','rotationDeg')}
                        canvas = Image.new('RGBA', size)
                        # Caller supplies actual layer order; no inferred segmentation or hidden repaint.
                        for im, role, hinge in layers:
                            layer = im
                            if e['motionModel'] == 'layered-rig':
                                layer = rig.transform(im, role, f, start, fps)
                            elif role != 'body':
                                s = e['minWingScale']+(1-e['minWingScale'])*(.5+.5*math.cos(2*math.pi*e['flapHz']*(f-start)/float(fps)))
                                layer = im.transform(size, Image.Transform.AFFINE, (1/s, 0, hinge*(1-1/s), 0, 1, 0), Image.Resampling.BICUBIC)
                            canvas.alpha_composite(layer)
                        sw, sh = max(1, round(size[0]*k['scale'])), max(1, round(size[1]*k['scale']))
                        require(max(sw, sh) <= 8192, 'scaled element too large')
                        canvas = canvas.resize((sw, sh), Image.Resampling.LANCZOS).rotate(k['rotationDeg'], resample=Image.Resampling.BICUBIC, expand=True)
                        x, y = round(k['x']*w-canvas.width/2), round(k['y']*h-canvas.height/2)
                        box = canvas.getbbox()
                        if box and not e['allowClipping']:
                            require(x+box[0] >= 0 and y+box[1] >= 0 and x+box[2] <= w and y+box[3] <= h, f'element clips at frame {f}; revise path or authorize clipping')
                        frame.alpha_composite(canvas, (x,y))
                    if frame.getchannel('A').getbbox():
                        visible_frames.append(f)
                    frame.save(td / f'{f:06d}.png')
                require(visible_frames, 'element is invisible in every output frame')
                alpha = output/'element-alpha.mov' if mode in ('alpha','both') else td/'element-alpha.mov'
                ff(['-framerate',str(fps),'-i',str(td/'%06d.png'),'-frames:v',str(n),'-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le',str(alpha)])
            if pp:
                fit = 'decrease' if plate['fit']=='contain' else 'increase'
                geom = f'scale={w}:{h}:force_original_aspect_ratio={fit},' + (f'pad={w}:{h}:(ow-iw)/2:(oh-ih)/2' if fit=='decrease' else f'crop={w}:{h}')
                args = ['-protocol_whitelist','file','-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpeg,mpegts,ogg,flv,gif','-ss',str(trim),'-i',str(pp)]
                graph = f'[0:v]setpts=PTS-STARTPTS,fps={fps},{geom},setsar=1[plate]'
                if e:
                    args += ['-i', str(alpha)]
                    graph += ';[plate][1:v]overlay=shortest=1:format=auto[out]'
                else:
                    graph += ';[plate]null[out]'
                args += ['-filter_complex_threads','1','-filter_complex',graph,'-map','[out]']
                args += ['-map','0:a:0?','-c:a','aac'] if plate['audio']=='keep' else ['-an']
                ff(args+['-frames:v',str(n),'-t',str(n/float(fps)),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(output/'shot-composite.mp4')])
        results = {}
        for p in output.iterdir():
            if p.suffix not in ('.mov','.mp4'): continue
            info = probe(p)
            v = next(s for s in info['streams'] if s['codec_type']=='video')
            require(int(v['nb_read_frames']) == n, f'output frame mismatch: {p}')
            require(Fraction(v['avg_frame_rate']) == fps, 'output fps mismatch')
            require((v['width'],v['height']) == (w,h), 'output dimensions mismatch')
            run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'])
            results[p.name] = {'sha256':digest(p), 'frames':n, 'fps':str(fps), 'width':v['width'], 'height':v['height'], 'codec':v['codec_name'], 'pixelFormat':v['pix_fmt'], 'audioStreams':sum(s['codec_type']=='audio' for s in info['streams'])}
        if 'element-alpha.mov' in results:
            sample_frames = sorted({0, start, (start+end-1)//2, end-1, n-1, visible_frames[0], visible_frames[len(visible_frames)//2], visible_frames[-1]})
            selection = '+'.join(f'eq(n\\,{f})' for f in sample_frames)
            raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(output/'element-alpha.mov'),'-vf',f'select={selection},alphaextract','-fps_mode','passthrough','-pix_fmt','gray','-f','rawvideo','-'])
            require(len(raw) == len(sample_frames)*w*h, 'decoded alpha sample size mismatch')
            samples=[]
            for i, f in enumerate(sample_frames):
                channel=Image.frombytes('L',(w,h),raw[i*w*h:(i+1)*w*h])
                low, high=channel.getextrema()
                samples.append({'frame':f,'min':low,'max':high,'bbox':channel.getbbox()})
            require(any(s['max'] > 0 for s in samples), 'alpha samples contain no visible content')
            require(any(s['min'] < 255 for s in samples), 'alpha samples are all opaque')
            require(results['element-alpha.mov']['audioStreams'] == 0, 'alpha must be silent')
            results['element-alpha.mov']['decodedAlphaSamples']=samples
        for p, record in assets.items(): require(digest(Path(p)) == record['sha256'], f'source changed: {p}')
        report = {'schema':1,'renderer':'Pillow RGBA + FFmpeg (not browser/Remotion)', 'scope':c['scope'],'sourceUnchanged':True,'inputs':assets,'outputs':results,'contract':c,'commands':commands,'visualReview':'pending-human-review','hostImport':'not-tested','tracking':'not-implemented','rigModel':'authored independent 2D affine layers; no inference, segmentation, skeletal IK or 3D' if e and e['motionModel']=='layered-rig' else None,'wingModel':'2D hinge foreshortening, not physical 3D flight' if e and e['motionModel']=='layered-wings' else None}
        (output/'render-evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        progress.unlink()
        print(json.dumps({'output':str(output),'outputs':list(results),'visualReview':'pending-human-review'}))
        return report
    except Exception as exc:
        # A failed multi-output run must never leave normal deliverable filenames.
        for partial in output.iterdir():
            if partial.suffix in ('.mov', '.mp4'):
                partial.rename(partial.with_name(partial.name+'.incomplete'))
        if progress.exists(): progress.unlink()
        (output/'render-failed.json').write_text(json.dumps({'status':'failed','error':str(exc),'deliverable':False},ensure_ascii=False,indent=2)+'\n')
        raise



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('contract')
    parser.add_argument('--output', required=True, help='new directory; never overwritten')
    args = parser.parse_args()
    try:
        render(args.contract, args.output)
    except (ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        detail = exc.stderr.decode(errors='replace') if isinstance(exc,subprocess.CalledProcessError) and exc.stderr else str(exc)
        parser.exit(1, f'local-element: {detail}\n')

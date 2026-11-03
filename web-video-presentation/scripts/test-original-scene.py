#!/usr/bin/env python3
"""Executable source-pixel, validation, still and encoded-shot tests."""
import importlib.util
import json
import tempfile
import subprocess
import sys
import time
from unittest.mock import patch
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location('original_scene', Path(__file__).with_name('original-scene.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
base = json.loads((Path(__file__).parent.parent/'examples/original-scene/corolla-shot.json').read_text())
c = dict(base, width=320, height=180, frames=12, fps=12)
m.validate(c)
a = np.asarray(m.scene(c, 0))
assert np.array_equal(a, np.asarray(m.scene(c, 0))), 'same-frame reproducibility'
assert not np.array_equal(a, np.asarray(m.scene(dict(c, seed=43), 0))), 'seed must affect pixels'
b = np.asarray(m.scene(c, 11))
assert np.mean(np.abs(a.astype(float)-b)) > 1, 'shot must actually move'
assert a.std() > 15 and np.quantile(a, .99) > 100, 'not a blank/flat image'
assert not np.array_equal(a, np.asarray(m.scene(dict(c, design='orbital'), 0))), 'design changes geometry'
assert np.array_equal(a, np.asarray(m.scene(dict(c, motion=0), 11))), 'motion zero freezes time'
for update in [dict(route='cloud'), dict(modelService='x'), dict(assets=['x']), dict(localProcessingAuthorized=False), dict(width=321), dict(mode='still',frames=12), dict(mode='shot',frames=1), dict(exposure=float('nan')), dict(seed=True), dict(frames=1801), dict(time=-1), dict(palette='unknown'), dict(palette=[]), dict(width=1920,height=1920,frames=1800)]:
    try:
        m.validate(dict(c, **update))
    except ValueError:
        pass
    else:
        raise AssertionError(f'accepted invalid {update}')
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    contract = root/'input.json'
    contract.write_text(json.dumps(c))
    e = m.render(contract, root/'shot')
    stream = e['video']['streams'][0]
    assert int(stream['nb_read_frames']) == 12
    assert stream['width'] == 320 and stream['height'] == 180
    assert stream['r_frame_rate'] == '12/1'
    assert e['videoParametersVerified'] is True
    assert all(e['versions'].get(k) for k in ('python','numpy','pillow','ffmpeg','ffprobe'))
    for field, bad in [('codec_name','vp9'),('width',318),('height',178),('r_frame_rate','24/1'),('nb_read_frames','11'),('duration','99')]:
        try:
            m.checked_video(c, {'streams':[dict(stream, **{field:bad})]})
        except ValueError:
            pass
        else:
            raise AssertionError(f'accepted encoded mismatch: {field}')
    assert len(e['keyframes']) == 3
    assert len({x['sha256'] for x in e['keyframes']}) == 3
    try:
        m.render(contract, root/'shot')
    except ValueError:
        pass
    else:
        raise AssertionError('must not overwrite')
    contract.write_text(json.dumps(dict(c, mode='still', frames=1)))
    e = m.render(contract, root/'still')
    assert len(e['keyframes']) == 1 and 'video' not in e
    assert not (root/'still/scene.mp4').exists()
    # Reject dangling links and symlink parents, without creating their targets.
    (root/'dangling').symlink_to(root/'unexpected', target_is_directory=True)
    (root/'parent-link').symlink_to(root, target_is_directory=True)
    for dest in (root/'dangling', root/'parent-link/child', root/'parent-link/../child'):
        try:
            m.render(contract, dest)
        except ValueError:
            pass
        else:
            raise AssertionError('accepted symlink output')
    assert not (root/'unexpected').exists() and not (root/'child').exists()
    contract.write_text(json.dumps(c))
    original_popen = subprocess.Popen
    processes = []
    def hung_encoder(args, **kwargs):
        if '-pixel_format' in args:
            p = original_popen([sys.executable, '-c', 'import time; time.sleep(60)'], **kwargs)
            processes.append(p)
            return p
        return original_popen(args, **kwargs)
    begin = time.monotonic()
    with patch.object(m, 'ENCODE_TIMEOUT', .2), patch.object(m.subprocess, 'Popen', side_effect=hung_encoder):
        try:
            m.render(contract, root/'timeout')
        except (ValueError, subprocess.TimeoutExpired):
            pass
        else:
            raise AssertionError('hung encoder accepted')
    assert time.monotonic()-begin < 5 and all(p.poll() is not None for p in processes)
    assert not (root/'timeout/evidence.json').exists()
    def missing_encoder(args, **kwargs):
        if '-pixel_format' in args:
            raise FileNotFoundError('injected missing encoder')
        return original_popen(args, **kwargs)
    with patch.object(m.subprocess, 'Popen', side_effect=missing_encoder):
        try:
            m.render(contract, root/'startup-failure')
        except FileNotFoundError:
            pass
        else:
            raise AssertionError('startup failure accepted')
    assert not (root/'startup-failure/evidence.json').exists()
    original_check = subprocess.check_output
    def stalled_probe(args, **kwargs):
        if '-count_frames' in args:
            assert kwargs.get('timeout') == m.PROBE_TIMEOUT
            raise subprocess.TimeoutExpired(args, kwargs['timeout'])
        return original_check(args, **kwargs)
    with patch.object(m.subprocess, 'check_output', side_effect=stalled_probe):
        try:
            m.render(contract, root/'probe-timeout')
        except subprocess.TimeoutExpired:
            pass
        else:
            raise AssertionError('probe timeout accepted')
    assert not (root/'probe-timeout/evidence.json').exists()
print('PASS: deterministic source pixels, distinct designs/seeds, temporal change, 14 invalid contracts, symlink refusal, budget, encoder deadline, probe timeout, startup failure, actual codec/dimensions/fps/frames/duration checks, no overwrite, real H.264 shot/frame count, still PNG')

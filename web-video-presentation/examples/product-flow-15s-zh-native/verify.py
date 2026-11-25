"""Validate the full offline sample and bind the receipt to its exact files."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from contextlib import contextmanager
from state import FRAMES, state

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output'
MOVIE = 'product-flow-15s-zh.mp4'
RECEIPT = 'verification.json'
PUBLISH_FILES = (MOVIE, 'states.json', 'sha256.txt')


@contextmanager
def output_lock():
    if OUT.is_symlink():
        raise ValueError(f'Output directory must not be a symbolic link: {OUT}')
    OUT.mkdir(exist_ok=True)
    lock = OUT / '.first-video-publish-lock'
    try:
        lock.mkdir()
    except FileExistsError as exc:
        raise ValueError(f'Another render or verifier holds the output lock: {lock}') from exc
    try:
        yield
    finally:
        lock.rmdir()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(artifacts):
    video = artifacts / MOVIE
    ffprobe = os.environ.get('FIRST_VIDEO_FFPROBE', 'ffprobe')
    ffmpeg = os.environ.get('FIRST_VIDEO_FFMPEG', 'ffmpeg')
    probe = json.loads(subprocess.check_output(
        [ffprobe, '-v', 'error', '-count_frames', '-show_streams', '-show_format',
         '-of', 'json', str(video)]))
    require(len(probe['streams']) == 1, 'Expected one stream')
    stream = probe['streams'][0]
    require(stream['codec_type'] == 'video' and stream['width'] == 1920 and stream['height'] == 1080,
            'Unexpected video stream or dimensions')
    require(stream['r_frame_rate'] == stream['avg_frame_rate'] == '30/1'
            and int(stream['nb_read_frames']) == FRAMES, 'Unexpected rate or frame count')
    require(float(probe['format']['duration']) == 15, 'Unexpected duration')
    pts = json.loads(subprocess.check_output(
        [ffprobe, '-v', 'error', '-select_streams', 'v', '-show_frames',
         '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(video)]))
    times = [float(x['best_effort_timestamp_time']) for x in pts['frames']]
    require(len(times) == FRAMES and all(abs(t - f / 30) < 0.000001 for f, t in enumerate(times)),
            'Unexpected frame timestamps')
    subprocess.run([ffmpeg, '-v', 'error', '-xerror', '-i', str(video),
                    '-f', 'null', '-'], check=True)
    states = json.loads((artifacts / 'states.json').read_text())
    require(states == [state(f) for f in range(FRAMES)], 'States do not match current source')
    hashes = {n: digest(ROOT / n) for n in ('state.py', 'render.py', 'verify.py', 'test_state.py')}
    hashes.update({f'output/{n}': digest(artifacts / n) for n in (MOVIE, 'states.json')})
    return {'status':'technical-checks-pass','resolution':[1920,1080],'frames':450,'fps':30,'duration_seconds':15,
            'audio_streams':0,'frame_pts_match':True,'states_match_current_source':True,'hashes':hashes,
            'scope':'native offline original demonstration, not Remotion production or user visual acceptance'}


def publish(staged):
    # Do not touch the old receipt or movie until the complete candidate passes.
    # The new receipt is promoted last; an interrupted publication must not retain
    # a stale receipt for new media. Each replacement is atomic, not the group.
    for name in (*PUBLISH_FILES, RECEIPT):
        path = OUT / name
        require(not path.is_symlink() and (not path.exists() or path.is_file()),
                f'Cannot publish over a non-regular path: {path}')
    (OUT / RECEIPT).unlink(missing_ok=True)
    for name in (*PUBLISH_FILES, RECEIPT):
        (staged / name).replace(OUT / name)


def main():
    with output_lock():
        receipt = verify(OUT)
        expected_hash = receipt['hashes'][f'output/{MOVIE}'] + f'  {MOVIE}\n'
        require((OUT / 'sha256.txt').read_text() == expected_hash,
                'Existing hash sidecar does not match the video; rerender to publish a new receipt')
        with tempfile.TemporaryDirectory(prefix='.first-video-verify-', dir=OUT) as directory:
            candidate = Path(directory) / RECEIPT
            candidate.write_text(json.dumps(receipt, indent=2))
            candidate.replace(OUT / RECEIPT)
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()

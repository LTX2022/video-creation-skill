#!/usr/bin/env python3
"""Optional, bounded local MP4 diagnostic; never an acceptance gate."""
import argparse
import json
import math
import os
from pathlib import Path
import stat
import subprocess
import sys

MAX_SECONDS = 120
MAX_SAMPLES = 1200
WIDTH, HEIGHT = 160, 90


def checked_path(value, missing_leaf=False):
    """Reject traversal and symlink/reparse ancestors; not a concurrent FS sandbox."""
    path = Path(value)
    if '..' in path.parts or '://' in str(value) or path.anchor.startswith('\\\\'):
        raise ValueError('only ordinary local paths without parent traversal are allowed')
    path = Path(os.path.abspath(path))
    for part in [*reversed(path.parents), path]:
        try:
            info = part.lstat()
        except FileNotFoundError:
            if part == path and missing_leaf:
                continue
            raise
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('symlink/reparse paths are not allowed')
    return path


def identity(path):
    info = checked_path(path).stat()
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def numbers(value, count):
    result = [float(v) for v in value.split(',')]
    if len(result) != count or not all(math.isfinite(v) for v in result):
        raise argparse.ArgumentTypeError(f'expected {count} finite comma-separated numbers')
    return result


def finite(value):
    result = float(value)
    if not math.isfinite(result):
        raise argparse.ArgumentTypeError('must be finite')
    return result


def run(command, timeout=90):
    result = subprocess.run(command, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{command[0]} technical failure: {result.stderr.decode(errors="replace")[-1500:]}')
    return result.stdout


def analyze(args, source):
    before_identity = identity(source)
    before = source.stat()
    if not stat.S_ISREG(before.st_mode):
        raise ValueError('input must be a regular local MP4 file')
    source = str(source)
    probe = json.loads(run(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                           '-f', 'mov', '-show_streams', '-show_format', '-of', 'json', source]))
    videos = [s for s in probe['streams'] if s['codec_type'] == 'video']
    if not videos:
        raise ValueError('no video stream')
    stream = videos[0]
    duration = float(stream.get('duration', probe['format'].get('duration', 'nan')))
    if not math.isfinite(duration) or args.end > duration + 0.001:
        raise ValueError('requested interval exceeds known video duration')
    x, y, w, h = args.roi
    # No autorotate: ROI uses coded raster coordinates, explicitly reported.
    iw, ih = int(stream['width']), int(stream['height'])
    left, top = int(x * iw), int(y * ih)
    cw, ch = int(w * iw), int(h * ih)
    if cw < 2 or ch < 2:
        raise ValueError('ROI must cover at least 2x2 source pixels')
    vf = (f'crop={cw}:{ch}:{left}:{top}:exact=1,scale={WIDTH}:{HEIGHT}:flags=area,'
          f'format=gray,fps=fps=1/{args.interval}:start_time=0:round=near')
    raw = run(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '1', '-protocol_whitelist',
               'file,pipe', '-noautorotate', '-ss', str(args.start), '-f', 'mov', '-i', source,
               '-t', str(args.end - args.start), '-map', '0:v:0', '-an', '-sn', '-dn',
               '-vf', vf, '-filter_threads', '1', '-frames:v', str(MAX_SAMPLES),
               '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'])
    size = WIDTH * HEIGHT
    if len(raw) % size or len(raw) // size < 2:
        raise RuntimeError('insufficient or incomplete decoded samples')
    if before_identity != identity(source):
        raise RuntimeError('source changed during diagnostic; discard result')
    frames = [raw[i:i + size] for i in range(0, len(raw), size)]
    requested_samples = math.ceil((args.end - args.start) / args.interval)
    observed_end = round(args.start + (len(frames) - 1) * args.interval, 6)
    curve = []
    for i in range(1, len(frames)):
        score = sum(abs(a - b) for a, b in zip(frames[i - 1], frames[i])) / (size * 255)
        curve.append({'from': round(args.start + (i - 1) * args.interval, 6),
                      'to': round(args.start + i * args.interval, 6), 'difference': round(score, 8)})
    low = []
    for item in curve:
        if item['difference'] <= args.low_threshold:
            if low and abs(low[-1]['end'] - item['from']) < 1e-5:
                low[-1]['end'] = item['to']
            else:
                low.append({'start': item['from'], 'end': item['to']})
    low = [r for r in low if r['end'] - r['start'] + 1e-6 >= args.min_low_seconds]
    for region in low:
        region['declared_hold_overlap'] = [hold for hold in args.expected_hold
                                          if hold[0] < region['end'] and hold[1] > region['start']]
    return {'schema': 1, 'status': 'diagnostic-only', 'human_review': 'not-performed',
            'source': {'path': os.path.abspath(args.input), 'bytes': before.st_size,
                       'mtime_ns': before.st_mtime_ns, 'sha256': None, 'duration': duration},
            'settings': {'requested_range': [args.start, args.end], 'interval_seconds': args.interval,
                         'roi_normalized_xywh': args.roi, 'roi_coded_pixels_xywh': [left, top, cw, ch],
                         'autorotate': False, 'sample_raster': [WIDTH, HEIGHT], 'samples': len(frames),
                         'low_threshold': args.low_threshold, 'jump_threshold': args.jump_threshold,
                         'min_low_seconds': args.min_low_seconds, 'expected_holds': args.expected_hold},
            'coverage': {'requested_samples': requested_samples, 'actual_decoded_samples': len(frames),
                         'nominal_observed_range': [args.start, observed_end],
                         'unmeasured_tail': [observed_end, args.end],
                         'sample_count_matches_request': len(frames) == requested_samples,
                         'note': 'Nominal sampled-frame coverage, not continuous observation; any shortfall requires review.'},
            'method': 'Mean absolute consecutive grayscale pixel difference / 255; nominal uniform sample times, not exact original PTS. Downscale stretches ROI to 160x90.',
            'limitations': ['Sampling can miss between-sample events or alias periodic motion; final unsampled tail is not measured.',
                            'Background motion can mask a still subject; select a main-content ROI and inspect actual video.',
                            'Reading holds and cuts can be intentional. High difference is not quality. No universal zero-stillness target.',
                            'Grayscale/downscale miss color-only or small changes. No audio, semantic, full-decode or approval check.',
                            'Hold declarations annotate overlap only, never remove findings or grant acceptance.'],
            'low_change_regions': low, 'abrupt_change_candidates': [c for c in curve if c['difference'] >= args.jump_threshold],
            'curve': curve}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, help='explicit local .mp4; no symlinks')
    parser.add_argument('--output', required=True, help='new non-existing directory; existing parent required')
    parser.add_argument('--start', required=True, type=finite)
    parser.add_argument('--end', required=True, type=finite)
    parser.add_argument('--interval', type=finite, default=0.25)
    parser.add_argument('--roi', type=lambda v: numbers(v, 4), default=[0., 0., 1., 1.], metavar='X,Y,W,H')
    parser.add_argument('--expected-hold', action='append', type=lambda v: numbers(v, 2), default=[], metavar='START,END')
    parser.add_argument('--low-threshold', type=finite, default=0.01)
    parser.add_argument('--jump-threshold', type=finite, default=0.25)
    parser.add_argument('--min-low-seconds', type=finite, default=1.)
    args = parser.parse_args()
    try:
        length = args.end - args.start
        if args.start < 0 or not 0 < length <= MAX_SECONDS:
            raise ValueError(f'interval must be positive and at most {MAX_SECONDS}s; split longer requests explicitly')
        if args.interval < 0.1 or math.ceil(length / args.interval) > MAX_SAMPLES or length < 2 * args.interval:
            raise ValueError('sampling interval >=0.1s, at least two samples and at most 1200 samples required')
        x, y, w, h = args.roi
        if min(x, y) < 0 or min(w, h) <= 0 or x + w > 1 or y + h > 1:
            raise ValueError('ROI must lie within normalized coded raster [0,1]')
        if not 0 <= args.low_threshold < args.jump_threshold <= 1 or args.min_low_seconds <= 0:
            raise ValueError('require 0 <= low < jump <= 1 and positive min-low-seconds')
        if any(not args.start <= a < b <= args.end for a, b in args.expected_hold):
            raise ValueError('declared holds must be within requested range (absolute video seconds)')
        if Path(args.input).suffix.lower() != '.mp4':
            raise ValueError('explicit .mp4 input required')
        source = checked_path(args.input)
        output = checked_path(args.output, missing_leaf=True)
        if output.exists():
            raise ValueError('output must not exist (no overwrite or reuse, even empty directories)')
        if not output.parent.is_dir():
            raise ValueError('output parent must be an existing directory')
        parent_identity = identity(output.parent)
        report = analyze(args, source)
        if identity(output.parent) != parent_identity:
            raise RuntimeError('output parent changed during diagnostic; retry in a stable directory')
        checked_path(output, missing_leaf=True)
        output.mkdir(mode=0o700, exist_ok=False)
        readable = ['# Temporal review — diagnostic only', '', report['method'],
                    '', 'Settings: ' + json.dumps(report['settings']), '',
                    'Coverage: ' + json.dumps(report['coverage']), '',
                    'Low-change regions: ' + json.dumps(report['low_change_regions']),
                    'Abrupt-change candidates: ' + json.dumps(report['abrupt_change_candidates']), '',
                    *['- ' + line for line in report['limitations']], '',
                    'No visual pass/fail or human acceptance is inferred. Rewatch these regions AND intermediate frames.']
        for name, content in [('temporal-review.json', json.dumps(report, indent=2) + '\n'),
                              ('temporal-review.md', '\n'.join(readable) + '\n')]:
            checked_path(output)
            with (output / name).open('x', encoding='utf-8') as handle:
                handle.write(content)
        print(f'Diagnostic written: {args.output}; visual review pending (exit 0 is technical success only).')
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired, KeyError) as error:
        print(f'Technical/validation error: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())

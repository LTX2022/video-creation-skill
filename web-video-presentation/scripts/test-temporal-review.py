#!/usr/bin/env python3
"""Offline synthetic tests; requires existing ffmpeg/ffprobe, Python stdlib only."""
import hashlib
import importlib.util
from types import SimpleNamespace
from unittest.mock import patch
import json
from pathlib import Path
import subprocess
import sys
import tempfile

SCRIPT = Path(__file__).with_name('temporal-review.py')


def main():
    with tempfile.TemporaryDirectory(prefix='temporal-review-test-') as temp:
        root = Path(temp).resolve()
        width, height, fps, seconds = 160, 90, 10, 4
        for kind in ['static', 'move', 'hold', 'cut', 'background']:
            frames = bytearray()
            for n in range(fps * seconds):
                bg = (20 if n % 2 else 220) if kind == 'background' else 20
                if kind == 'cut':
                    bg = 20 if n < 20 else 230
                frame = bytearray([bg] * width * height)
                if kind in ['move', 'hold']:
                    offset = n if kind == 'move' else max(0, n - 20)
                    x = 10 + (offset * 3) % 100
                    for y in range(25, 65):
                        frame[y * width + x:y * width + x + 40] = bytes([240] * 40)
                if kind == 'background':
                    for y in range(20, 70):
                        frame[y * width + 40:y * width + 120] = bytes([100] * 80)
                frames.extend(frame)
            result = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-f', 'rawvideo', '-pix_fmt', 'gray',
                                     '-s', f'{width}x{height}', '-r', str(fps), '-i', 'pipe:0', '-an',
                                     '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', str(root / f'{kind}.mp4')],
                                    input=frames, capture_output=True)
            assert result.returncode == 0, result.stderr
        hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.mp4')}
        counter = 0

        def invoke(kind='static', extra=(), ok=True, output=None, input_path=None):
            nonlocal counter
            counter += 1
            target = output or root / f'out-{counter}'
            result = subprocess.run([sys.executable, str(SCRIPT), '--input', str(input_path or root / f'{kind}.mp4'),
                                     '--output', str(target), '--start', '0', '--end', '4', '--interval', '.1', *extra], capture_output=True)
            assert (result.returncode == 0) == ok, result.stderr.decode()
            return json.loads((target / 'temporal-review.json').read_text()) if ok else None

        still = invoke()
        assert still['low_change_regions'][0]['end'] >= 3.8
        assert still['coverage']['requested_samples'] == still['coverage']['actual_decoded_samples'] == 40
        assert still['coverage']['nominal_observed_range'] == [0, 3.9]
        assert still['coverage']['unmeasured_tail'] == [3.9, 4]
        moving = invoke('move')
        assert not moving['low_change_regions']
        hold = invoke('hold', ['--expected-hold', '0,2'])
        assert hold['low_change_regions'][0]['declared_hold_overlap'] == [[0, 2]]
        assert hold['status'] == 'diagnostic-only' and hold['human_review'] == 'not-performed'
        cut = invoke('cut')
        assert len(cut['abrupt_change_candidates']) == 1
        assert 1.8 <= cut['abrupt_change_candidates'][0]['to'] <= 2.1
        background = invoke('background')
        subject = invoke('background', ['--roi', '.3,.3,.4,.4'])
        assert not background['low_change_regions'] and subject['low_change_regions']
        invoke(extra=['--start', '1', '--end', '3', '--expected-hold', '1,2'])
        invoke(extra=['--end', '121'], ok=False)
        invoke(extra=['--end', '5'], ok=False)
        invoke(extra=['--interval', 'nan'], ok=False)
        invoke(extra=['--roi', '.8,0,.5,1'], ok=False)
        invoke(extra=['--expected-hold', '0,5'], ok=False)
        invoke(output=root / 'out-1', ok=False)
        empty = root / 'empty'; empty.mkdir()
        invoke(output=empty, ok=False)
        link = root / 'linked.mp4'; link.symlink_to(root / 'static.mp4')
        invoke(input_path=link, ok=False)
        ancestor = root / 'alias'; ancestor.symlink_to(root, target_is_directory=True)
        invoke(input_path=ancestor / 'static.mp4', ok=False)
        invoke(output=ancestor / 'escape-output', ok=False)
        invoke(output=root / '..' / 'escape-output', ok=False)
        dangling = root / 'dangling'; dangling.symlink_to(root / 'absent')
        invoke(output=dangling, ok=False)
        bad = root / 'corrupt.mp4'; bad.write_bytes(b'not a video')
        invoke(input_path=bad, ok=False)
        # Exercise real path-based ffmpeg calls with alternate platform labels.
        # This is NOT native macOS/Windows execution or a compatibility guarantee.
        spec = importlib.util.spec_from_file_location('temporal_review_tested', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        with patch.object(sys, 'dont_write_bytecode', True):
            spec.loader.exec_module(module)
        code = SCRIPT.read_text()
        for forbidden in ['/proc/', 'pass_fds', 'dir_fd', 'O_NOFOLLOW', 'O_DIRECTORY']:
            assert forbidden not in code, forbidden
        for platform in ['darwin', 'win32']:
            args = [str(SCRIPT), '--input', str(root / 'static.mp4'), '--output', str(root / platform),
                    '--start', '0', '--end', '4']
            with patch.object(sys, 'platform', platform), patch.object(sys, 'argv', args):
                assert module.main() == 0
        probe = json.dumps({'streams': [{'codec_type': 'video', 'duration': '4', 'width': 160, 'height': 90}],
                            'format': {'duration': '4'}}).encode()
        sample_args = SimpleNamespace(input=str(root / 'static.mp4'), start=0, end=4, interval=.1,
                                      roi=[0, 0, 1, 1], low_threshold=.01, jump_threshold=.25,
                                      min_low_seconds=1, expected_hold=[])
        for count in [0, 1, 2]:
            with patch.object(module, 'run', side_effect=[probe, bytes(160 * 90 * count)]):
                try:
                    result = module.analyze(sample_args, root / 'static.mp4')
                except RuntimeError as error:
                    assert count < 2 and 'insufficient' in str(error)
                else:
                    assert count == 2
                    assert result['coverage']['actual_decoded_samples'] == 2
                    assert result['coverage']['requested_samples'] == 40
                    assert result['coverage']['unmeasured_tail'] == [.1, 4]
                    assert result['coverage']['sample_count_matches_request'] is False
        assert all(hashlib.sha256(p.read_bytes()).hexdigest() == digest for p, digest in hashes.items())
        print(f'PASS: {counter} invocations; static/move/hold/cut/background-vs-ROI, range/parameter/overwrite/path/symlink/corrupt-input refusals; source SHA256 unchanged.')
        print('PASS: 2 alternate-platform-label executions with real ffmpeg; no proc/fd-specific dependencies; 3 mocked decoded-count checks (0/1 rejected, 2 explicitly partial).')
        print('Native macOS/Windows not tested. No visual inspection claimed; synthetic numerical and safety assertions only.')


if __name__ == '__main__':
    main()

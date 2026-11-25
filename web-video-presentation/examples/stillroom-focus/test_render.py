"""Exercise the documented Stillroom CLI without writing to real project files."""

import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest


RENDER = Path(__file__).with_name('render.py').resolve()
SENTINEL = b'stillroom existing output\n'


class OutputProtection(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.work = Path(directory.name)
        self.out = self.work / '客户 路径' / 'stillroom Ñ.mp4'

    def run_cli(self, env=None):
        return subprocess.run([sys.executable, '-B', str(RENDER), str(self.out)],
                              cwd=self.work, env=env, capture_output=True, text=True,
                              timeout=120)

    def assert_refused(self, result):
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Output already exists:', result.stderr)
        self.assertEqual(list(self.out.parent.iterdir()), [self.out])

    def test_existing_file_unchanged(self):
        self.out.parent.mkdir()
        self.out.write_bytes(SENTINEL)
        before = self.out.stat()
        self.assert_refused(self.run_cli())
        self.assertEqual(self.out.read_bytes(), SENTINEL)
        after = self.out.stat()
        self.assertEqual((after.st_ino, after.st_mode, after.st_mtime_ns),
                         (before.st_ino, before.st_mode, before.st_mtime_ns))

    def test_existing_directory_unchanged(self):
        self.out.mkdir(parents=True)
        nested = self.out / 'child.txt'
        nested.write_bytes(SENTINEL)
        self.assert_refused(self.run_cli())
        self.assertEqual(nested.read_bytes(), SENTINEL)

    def test_dangling_and_existing_symlink_unchanged(self):
        self.out.parent.mkdir()
        target = self.work / 'linked target.mp4'
        try:
            self.out.symlink_to(target)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f'Cannot create symlinks: {exc}')
        self.assert_refused(self.run_cli())
        self.assertEqual(self.out.readlink(), target)
        self.assertFalse(target.exists())
        target.write_bytes(SENTINEL)
        self.assert_refused(self.run_cli())
        self.assertEqual(self.out.readlink(), target)
        self.assertEqual(target.read_bytes(), SENTINEL)

    def test_absent_output_and_parent_publish_real_clip(self):
        result = self.run_cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.out.is_file())
        self.assertEqual(list(self.out.parent.iterdir()), [self.out])
        self.assertEqual(self.out.stat().st_nlink, 1)
        subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(self.out),
                        '-f', 'null', '-'], check=True, timeout=120)

    @unittest.skipUnless(os.name == 'posix', 'Test FFmpeg wrapper is POSIX only')
    def test_name_claimed_after_preflight_is_protected(self):
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            self.skipTest('FFmpeg required')
        bin_dir = self.work / 'bin'
        bin_dir.mkdir()
        wrapper = bin_dir / 'ffmpeg'
        wrapper.write_text(
            '#!/bin/sh\n'
            'set -eu\n'
            '(set -C; printf "stillroom existing output\\n" > "$STILLROOM_TEST_TARGET")\n'
            'exec "$STILLROOM_TEST_FFMPEG" "$@"\n')
        wrapper.chmod(wrapper.stat().st_mode | stat.S_IXUSR)
        env = dict(os.environ, PATH=str(bin_dir) + os.pathsep + os.environ['PATH'],
                   STILLROOM_TEST_TARGET=str(self.out), STILLROOM_TEST_FFMPEG=ffmpeg)
        self.assert_refused(self.run_cli(env))
        self.assertEqual(self.out.read_bytes(), SENTINEL)


if __name__ == '__main__':
    unittest.main()

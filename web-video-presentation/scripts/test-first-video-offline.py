#!/usr/bin/env python3
"""Exercise the offline launcher's refusal cases with no Node on PATH."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

RUNNER = Path(__file__).with_name('first-video-offline.py').resolve()
LINUX_FONTS = Path('/usr/share/fonts/truetype/dejavu')


class FirstVideoOfflineTest(unittest.TestCase):
    def setUp(self):
        if not sys.platform.startswith('linux'):
            self.skipTest('This integration fixture uses the installed Linux DejaVu fonts')
        if any(importlib.util.find_spec(name) is None for name in ('numpy', 'PIL')):
            self.skipTest('Requires NumPy and Pillow')
        if any(not (LINUX_FONTS / f'DejaVuSans{suffix}.ttf').is_file() for suffix in ('', '-Bold')):
            self.skipTest('Requires installed DejaVu Sans regular and bold')
        tools = {name: shutil.which(name) for name in ('ffmpeg', 'ffprobe')}
        if not all(tools.values()):
            self.skipTest('Requires FFmpeg and ffprobe')
        temp = tempfile.TemporaryDirectory(prefix='offline-example-tests-')
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        for name, where in tools.items():
            (self.bin / name).symlink_to(Path(where).resolve())
        self.env = {**os.environ, 'PATH': str(self.bin)}

    def run_cli(self, path, *flags):
        return subprocess.run(
            [sys.executable, '-B', str(RUNNER), '--locale', 'en', '--project-root', str(path), *flags],
            cwd=self.root, env=self.env, capture_output=True, text=True, encoding='utf-8',
            timeout=15,
        )

    def expect_error(self, path, message, *flags):
        result = self.run_cli(path, *flags)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(message, result.stderr)
        self.assertNotIn('Verified offline example:', result.stdout)
        self.assertEqual(sorted(p.name for p in self.bin.iterdir()), ['ffmpeg', 'ffprobe'])

    def test_nonempty_and_no_clobber(self):
        child = self.root / 'selected 项目'
        child.mkdir()
        sentinel = child / '.sentinel'
        sentinel.write_bytes(b'keep unchanged')
        self.expect_error(child, 'not empty')
        self.assertEqual(sentinel.read_bytes(), b'keep unchanged')
        self.assertEqual(set(child.iterdir()), {sentinel})

    def test_nested_and_skill_installation(self):
        existing = self.root / 'has-package'
        existing.mkdir()
        (existing / 'package.json').write_text('{}', encoding='ascii')
        self.expect_error(existing / 'child', 'not nested')
        self.assertFalse((existing / 'child').exists())
        self.expect_error(RUNNER.parent.parent / '_must_not_create', 'outside the skill installation')

    def test_skill_ancestor_with_same_filesystem_identity(self):
        spec = importlib.util.spec_from_file_location('first_video_offline', RUNNER)
        runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(runner)
        canonical = self.root / 'fixture-skill'
        alternate = self.root / 'FIXTURE-SKILL'
        canonical.mkdir()
        candidate = alternate / 'do-not-create'
        with patch.object(runner, 'SKILL', canonical):
            if alternate.exists():
                # On a case-insensitive test volume, use the actual alias.
                self.assertTrue(alternate.samefile(canonical))
                with self.assertRaisesRegex(ValueError, 'outside the skill installation'):
                    runner.project_target(str(candidate))
            else:
                alternate.mkdir()
                self.assertEqual(runner.project_target(str(candidate)), candidate)
                # On case-sensitive Linux, simulate only the filesystem identity
                # of the existing alternate ancestor, not samefile or the guard.
                real_stat = Path.stat

                def folded_stat(path, *args, **kwargs):
                    return real_stat(canonical if path == alternate else path, *args, **kwargs)

                with patch.object(Path, 'stat', folded_stat):
                    self.assertTrue(alternate.samefile(canonical))
                    with self.assertRaisesRegex(ValueError, 'outside the skill installation'):
                        runner.project_target(str(candidate))
        self.assertFalse(candidate.exists())

    def test_missing_parent_traversal_and_foreign_paths(self):
        self.expect_error(self.root / 'missing' / 'child', 'existing parent')
        self.expect_error(f'{self.root}/test/../child', 'traversal')
        self.expect_error(r'C:\Users\Public\child', 'foreign drive or UNC/device path')
        self.expect_error(r'\\server\share\child', 'foreign drive or UNC/device path')
        self.expect_error('//server/share/child', 'foreign drive or UNC/device path')
        self.expect_error('relative', 'absolute project-root')
        self.assertFalse((self.root / 'child').exists())

    def test_symlink_leaf_ancestor_and_dangling_marker(self):
        elsewhere = self.root / 'elsewhere'
        elsewhere.mkdir()
        alias = self.root / 'elsewhere-alias'
        alias.symlink_to(elsewhere, target_is_directory=True)
        self.expect_error(alias / 'child', 'symlink or reparse point')
        self.expect_error(alias, 'symlink or reparse point')
        broken = self.root / 'broken'
        broken.symlink_to(self.root / 'absent')
        self.expect_error(broken, 'symlink or reparse point')
        (elsewhere / 'project-state.json').symlink_to(elsewhere / 'missing.json')
        self.expect_error(elsewhere / 'child', 'not nested')
        self.assertFalse((elsewhere / 'child').exists())

    def test_partial_missing_corrupt_font_is_pre_write(self):
        project = self.root / 'do-not-create'
        bold = str(LINUX_FONTS / 'DejaVuSans-Bold.ttf')
        self.expect_error(project, 'together', '--font-bold', bold)
        missing = self.root / 'missing.ttf'
        self.expect_error(project, 'not found', '--font-regular', str(missing), '--font-bold', bold)
        corrupt = self.root / 'not-a-font.ttf'
        corrupt.write_bytes(b'not a font')
        self.expect_error(project, 'cannot load installed font',
                          '--font-regular', str(corrupt), '--font-bold', bold)
        self.expect_error(project, 'require the explicit font paths', '--font-bold-index', '1')
        self.expect_error(project, 'face 99',
                          '--font-regular', str(LINUX_FONTS / 'DejaVuSans.ttf'),
                          '--font-bold', bold, '--font-bold-index', '99')
        self.assertFalse(project.exists())


if __name__ == '__main__':
    unittest.main()

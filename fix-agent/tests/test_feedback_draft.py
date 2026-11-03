"""Local-only feedback contract; adversarial inputs must never become report text."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

CLI = Path(__file__).resolve().parents[1] / 'scripts/feedback_draft.py'
spec = importlib.util.spec_from_file_location('feedback_draft', CLI)
feedback = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feedback)


class FeedbackTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def summary(self, **changes):
        return dict(schema=1, kind='deterministic-review-summary', synthetic=False,
                    declaredProjectStatus='completed', measurements={'failedAttempts': 2}, **changes)

    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(CLI), *args], capture_output=True, text=True)

    def test_empty_preview_is_honest_and_does_not_write(self):
        before = set(self.root.iterdir())
        result = self.run_cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Nothing has been submitted', result.stdout)
        self.assertIn('"failedAttempts": "unknown"', result.stdout)
        self.assertIn('cannot guarantee anonymity', result.stdout)
        self.assertIn(feedback.ISSUE_URL, result.stdout)
        self.assertNotIn('&body=', result.stdout)
        self.assertEqual(before, set(self.root.iterdir()))

    def test_allowlist_discards_secrets_in_all_arbitrary_fields(self):
        secret = 'PRIVATE_CANARY /Users/person/key ghp_abc https://private.test'
        source = self.summary(evidence=[{'path': secret}], prompt=secret, feedback=secret,
                              runId=secret, token=secret, stages=[{'stage': secret}])
        source['outputMode'] = secret
        source['measurements']['failedAttempts'] = secret
        source['measurements']['terminalAttempts'] = 3
        output = feedback.preview(feedback.sanitize(source, video_version=secret,
                                   fix_version='1.8.1+secret', adapter=secret, category=secret))
        self.assertNotIn('PRIVATE_CANARY', output)
        self.assertNotIn('private.test', output)
        self.assertNotIn('ghp_', output)
        self.assertIn('"terminalAttempts": 3', output)
        self.assertIn('"declaredProjectStatus": "completed"', output)

    def test_numbers_and_versions_fail_closed(self):
        for value in (True, -1, 1.5, float('nan'), float('inf'), 1_000_001, {}, [], '5', None):
            self.assertEqual(feedback.count(value), 'unknown')
        for value in ('1.2.3\n', '1.2.3-secret', 'v1.2.3', {}, None):
            self.assertEqual(feedback.version(value), 'unknown')
        self.assertEqual(feedback.version('3.2.1'), '3.2.1')
        self.assertEqual(feedback.count(0), 0)
        self.assertEqual(feedback.sanitize({'measurements': []})['recordedAttempts']['failedAttempts'], 'unknown')

    def test_reads_only_selected_summary(self):
        file = self.root / 'summary.json'
        file.write_text(json.dumps(self.summary()))
        (self.root / 'private.log').write_text('PRIVATE_CANARY')
        result = self.run_cli('--project-root', str(self.root), '--summary', file.name,
                              '--adapter', 'remotion', '--category', 'bug')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"failedAttempts": 2', result.stdout)
        self.assertNotIn('PRIVATE_CANARY', result.stdout)
        self.assertNotIn(str(self.root), result.stdout)

    def test_unsafe_missing_invalid_and_oversize_files_fail_without_path_leak(self):
        (self.root / 'bad.json').write_text('{ PRIVATE_CANARY')
        (self.root / 'huge.json').write_bytes(b' ' * (feedback.MAX_BYTES + 1))
        (self.root / 'wrong.json').write_text('{"schema": true}')
        for name in ('../outside.json', '/etc/passwd', 'missing.json', 'bad.json', 'huge.json', 'wrong.json'):
            result = self.run_cli('--project-root', str(self.root), '--summary', name)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn(str(self.root), result.stderr)
            self.assertNotIn('PRIVATE_CANARY', result.stderr)
            self.assertEqual(result.stdout, '')

    def test_symlink_file_directory_and_root_rejected(self):
        target = self.root / 'real'
        target.mkdir()
        (target / 'summary.json').write_text(json.dumps(self.summary()))
        (self.root / 'file.json').symlink_to(target / 'summary.json')
        (self.root / 'link').symlink_to(target, target_is_directory=True)
        for root, name in ((self.root, 'file.json'), (self.root, 'link/summary.json'), (self.root / 'link', 'summary.json')):
            with self.assertRaises(OSError):
                feedback.read_summary(root, name)

    def test_nonregular_file_rejected_without_blocking(self):
        import os
        os.mkfifo(self.root / 'pipe')
        with self.assertRaises(ValueError):
            feedback.read_summary(self.root, 'pipe')

    def test_no_network_or_browser_or_subprocess_calls(self):
        import socket
        import webbrowser
        with patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')), \
             patch.object(webbrowser, 'open', side_effect=AssertionError('browser forbidden')), \
             patch.object(subprocess, 'run', side_effect=AssertionError('subprocess forbidden')):
            self.assertIn('PUBLIC GitHub', feedback.preview(feedback.sanitize(self.summary())))

    def test_cli_requires_explicit_root_and_file_pair(self):
        self.assertNotEqual(self.run_cli('--project-root', str(self.root)).returncode, 0)
        self.assertNotEqual(self.run_cli('--summary', 'summary.json').returncode, 0)

    def test_public_form_and_docs_use_same_payload_free_destination(self):
        repository = CLI.parents[2]
        for name in ('README.md', 'README-CN.md', 'fix-agent/references/FEEDBACK.md'):
            self.assertIn(feedback.ISSUE_URL, (repository / name).read_text())
        form = (repository / '.github/ISSUE_TEMPLATE/fix-agent-feedback.yml').read_text()
        self.assertIn('cannot guarantee anonymity', form)
        self.assertIn('required: true', form)
        self.assertIn('choose to publish it publicly', form)

    def test_synthetic_is_not_presented_as_real_and_no_submission_flag(self):
        source = self.summary()
        source['synthetic'] = True
        self.assertTrue(feedback.sanitize(source)['synthetic'])
        self.assertNotEqual(self.run_cli('--submit').returncode, 0)


if __name__ == '__main__':
    unittest.main()

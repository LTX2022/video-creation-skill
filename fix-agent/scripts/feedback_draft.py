#!/usr/bin/env python3
"""Opt-in local public-feedback preview. No network, submission, or memory access."""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys

ISSUE_URL = 'https://github.com/LTX2022/video-creation-skill/issues/new?template=fix-agent-feedback.yml'
MAX_BYTES = 1024 * 1024
UNKNOWN = 'unknown'
COUNTERS = ('terminalAttempts', 'unfinishedAttempts', 'failedAttempts', 'recordedRetryAttempts')


def choice(value, allowed):
    return value if type(value) is str and value in allowed else UNKNOWN


def version(value):
    # No arbitrary suffix, commit, branch, build metadata, or private package name.
    return value if type(value) is str and re.fullmatch(r'[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}', value) else UNKNOWN


def count(value):
    return value if type(value) is int and 0 <= value <= 1_000_000 else UNKNOWN


def read_summary(root, relative):
    """Read only the explicitly chosen regular file within the authorized root.

    Reject symlinks in every component; dir-fd walking prevents symlink swaps.
    """
    rel = Path(relative)
    if rel.is_absolute() or not rel.parts or any(p in ('.', '..') for p in rel.parts):
        raise ValueError('Summary must be a relative file inside the approved project root.')
    root_path = Path(os.path.abspath(root))
    if not hasattr(os, 'O_NOFOLLOW') or not hasattr(os, 'O_DIRECTORY'):
        raise ValueError('Safe file reading is unavailable on this platform; use an empty draft.')
    fd = os.open(root_path.anchor, os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in (*root_path.parts[1:], *rel.parts[:-1]):
            next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        file_fd = os.open(rel.parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(file_fd, 'rb') as source:
            info = os.fstat(source.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
                raise ValueError('Summary must be a small regular JSON file.')
            raw = source.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError('Summary exceeds the size limit.')
        data = json.loads(raw)
        if not isinstance(data, dict) or type(data.get('schema')) is not int or data['schema'] != 1 or data.get('kind') != 'deterministic-review-summary':
            raise ValueError('Unsupported summary format; use an empty draft.')
        return data
    finally:
        os.close(fd)


def sanitize(summary, *, video_version=None, fix_version=None, adapter=None, category=None):
    # Reconstruct from scratch. Never copy dictionaries, raw strings, or evidence.
    source = summary if isinstance(summary, dict) else {}
    measurements = source.get('measurements')
    measurements = measurements if isinstance(measurements, dict) else {}
    return {
        'videoSkillVersion': version(video_version),
        'fixAgentVersion': version(fix_version),
        'adapter': choice(adapter, ('remotion', 'opendesign', 'hyperframes')),
        'category': choice(category, ('bug', 'workflow', 'documentation', 'suggestion')),
        'summaryProvided': bool(summary),
        'synthetic': source.get('synthetic') if type(source.get('synthetic')) is bool else UNKNOWN,
        'declaredProjectStatus': choice(source.get('declaredProjectStatus'), ('completed', 'draft', 'partial', 'terminated', 'unknown')),
        'outputMode': choice(source.get('outputMode'), ('opaque', 'alpha', 'composite', 'both')),
        'recordedAttempts': {key: count(measurements.get(key)) for key in COUNTERS},
        'rootCause': UNKNOWN,
        'acceptance': UNKNOWN,
        'endToEndTime': UNKNOWN,
        'logCoverage': UNKNOWN,
    }


def preview(data):
    return '\n'.join([
        '# Optional Fix-Agent feedback draft / 可选反馈草稿',
        '',
        'LOCAL PREVIEW ONLY. Nothing has been submitted. / 仅本地预览，尚未提交。',
        'Destination if you choose to submit: PUBLIC GitHub issue in LTX2022/video-creation-skill.',
        '若选择提交，内容及你的 GitHub 身份将在公开 Issue 中展示。',
        'Review every field. Allowlisting and scanners cannot guarantee anonymity.',
        '请逐项检查；白名单和扫描器无法保证匿名。未知字段不代表通过或零次失败。',
        '',
        '## Minimal diagnostic fields (declared, not independently verified)',
        '```json', json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), '```',
        '',
        '## Problem / 问题',
        '[Add a short description and expected vs actual behavior after reviewing for private information.]',
        '## Minimal reproduction / 最小复现',
        '[Use invented, non-private sample data. Write unknown if unavailable.]',
        '',
        'Excluded: media, logs, prompts, raw feedback, personal memory, private paths, run IDs, hashes, environment variables and arbitrary error text.',
        '默认不包含媒体、日志、提示词、原始反馈、私人记忆、私有路径、运行 ID、哈希或环境变量。',
        'Counters describe recorded attempts only, not complete project history or a diagnosis.',
        'To continue: open the blank form below, paste only reviewed content, review GitHub’s final form, then explicitly submit it yourself. Closing or ignoring it is fine.',
        '继续时：打开下面的空白表单，只粘贴检查过的内容，再由你明确点击提交；也可以直接取消。',
        ISSUE_URL, '',
    ])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', help='Explicitly authorized project directory; required only with --summary')
    parser.add_argument('--summary', help='Selected relative summary.json; no other evidence is read')
    parser.add_argument('--video-version')
    parser.add_argument('--fix-version')
    parser.add_argument('--adapter')
    parser.add_argument('--category')
    args = parser.parse_args(argv)
    if bool(args.project_root) != bool(args.summary):
        parser.error('--project-root and --summary must be supplied together')
    summary = read_summary(args.project_root, args.summary) if args.summary else {}
    print(preview(sanitize(summary, video_version=args.video_version, fix_version=args.fix_version,
                           adapter=args.adapter, category=args.category)))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, UnicodeError, RecursionError):
        # Do not echo input, private filenames or JSON fragments in error output.
        print('feedback-draft: Cannot read a supported safe summary. Check the selected file or omit summary arguments for an empty draft. No submission occurred.', file=sys.stderr)
        sys.exit(1)

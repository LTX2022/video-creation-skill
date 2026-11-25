#!/usr/bin/env python3
"""Start the bundled offline product-flow example in a selected empty directory."""
import argparse
import importlib.util
import json
import os
from pathlib import Path, PureWindowsPath
import re
import shutil
import stat
import subprocess
import sys

SKILL = Path(__file__).resolve().parent.parent
FILES = ('render.py', 'state.py', 'test_state.py', 'verify.py')
PROJECT_MARKERS = ('.web-video-presentation-project.json', 'project-state.json', 'package.json')
ROUTES = {
    'en': ('product-flow-15s-native', 'product-flow-15s.mp4',
           '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
           '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    'zh': ('product-flow-15s-zh-native', 'product-flow-15s-zh.mp4',
           '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
           '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'),
}

# Chinese copy actually displayed by each font role in the frozen sample.
# Whitespace is deliberately ignored; update this inventory if its copy changes.
CHINESE_FONT_TEXT = (
    '可编辑的产品流程示范 输入 计划 逐项确认 筹备一次产品发布 已完成 '
    '先找对要沟通的人 让所需素材准备就绪 选定产品发布的时刻 '
    '一个任务，拆成三个明确步骤。 从明确需求开始，把计划一步步完成。',
    '从任务，到计划，再到完成。 发布任务 工作区 任务 这次要完成什么？ '
    '生成计划 你的三步计划 明确目标受众 准备发布素材 安排发布时间 已完成 清单已完成。',
)


def require_sample_glyphs(face, text, label, path, index):
    # Pillow loads Latin-only fonts successfully and paints .notdef for missing
    # Chinese characters. Probe the selected face at a representative regular/bold UI
    # size; comparing complete masks avoids misclassifying lookalike shapes.
    def signature(character):
        mask = face.getmask(character, mode='L')
        return mask.size, bytes(mask)

    # These are noncharacters; ordinary font faces paint the same .notdef mask.
    # A mismatch cannot establish the missing-glyph mask. Stop rather than
    # silently accepting boxed text or assuming which sentinel is unassigned.
    fallback, second = map(signature, ('\uffff', '\U0010ffff'))
    if fallback != second:
        raise ValueError(f'{label} Chinese sample coverage could not be verified: '
                         f'missing-glyph probes disagree; choose another Chinese-capable font '
                         f'or face index ({path}, face {index})')
    missing = []
    for char in dict.fromkeys(text):
        if char.isspace():
            continue
        actual = signature(char)
        if actual == fallback or not any(actual[1]):
            missing.append(char)
    if missing:
        preview = ', '.join(f'{char} U+{ord(char):04X}' for char in missing[:5])
        if len(missing) > 5:
            preview += f' (and {len(missing) - 5} more)'
        raise ValueError(f'{label} cannot display required Chinese sample glyphs: {preview}; '
                         f'choose a Chinese-capable font or its correct face index ({path}, face {index})')


def lstat(path):
    try:
        return path.lstat()
    except FileNotFoundError:
        return None


def local_path(value, label):
    if re.search(r'[\x00-\x1f\x7f]', value):
        raise ValueError(f'{label} contains control characters')
    windows = os.name == 'nt'
    if value.startswith(('\\', '//')) or (not windows and re.match(r'^[A-Za-z]:', value)):
        raise ValueError(f'{label} must be an absolute local path in this environment, not a foreign drive or UNC/device path')
    if '..' in re.split(r'[/\\]', value):
        raise ValueError(f'{label} must not contain .. traversal')
    path = Path(value)
    if not path.is_absolute():
        raise ValueError(f'Choose an absolute {label} path')
    reserved = getattr(os.path, 'isreserved', lambda part: PureWindowsPath(part).is_reserved())
    if windows and (not re.fullmatch(r'[A-Za-z]:', path.drive) or any(
        re.search(r'[:*?"<>|]', part) or part.endswith((' ', '.')) or reserved(part)
        for part in path.parts[1:]
    )):
        raise ValueError(f'{label} must use an ordinary local drive path')
    return path


def project_target(root):
    # Same workspace boundaries as the shared Node preflight, but no Node needed.
    # Checks guard an ordinary workspace, not a concurrently replaced filesystem.
    target = local_path(root, 'project-root')
    if target == SKILL or SKILL in target.parents:
        raise ValueError('Project must be outside the skill installation')
    for path in (*reversed(target.parents), target):
        info = lstat(path)
        if info is not None:
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise ValueError(f'Project path contains a symlink or reparse point: {path}')
            if not stat.S_ISDIR(info.st_mode):
                raise ValueError(f'Project path is not a directory: {path}')
            # Lexical equality misses alternate spellings on case-insensitive
            # filesystems (e.g. a POSIX host whose filesystem folds case).
            if path.samefile(SKILL):
                raise ValueError('Project must be outside the skill installation')
    if not target.parents or lstat(target.parent) is None:
        raise ValueError('The selected project directory must have an existing parent')
    for parent in target.parents:
        if any(lstat(parent / name) is not None for name in PROJECT_MARKERS):
            raise ValueError(f'Project must be independent, not nested in an existing project: {parent}')
    if lstat(target) is not None and any(target.iterdir()):
        raise ValueError(f'New project directory is not empty (including hidden files): {target}')
    return target


def require_encoder(ffmpeg):
    # Exercise RGB conversion and x264 initialization, not just encoder listing.
    # The null muxer discards output so preflight never creates a project file.
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin',
               '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', '16x16',
               '-framerate', '30', '-i', 'pipe:0', '-frames:v', '1', '-an',
               '-c:v', 'libx264', '-preset', 'fast', '-crf', '19',
               '-pix_fmt', 'yuv420p', '-f', 'null', '-']
    message = 'Selected FFmpeg could not encode the preflight frame with libx264'
    # FFREPORT can create a file even without a destination or -report.
    probe_env = {key: value for key, value in os.environ.items() if key.upper() != 'FFREPORT'}
    try:
        result = subprocess.run(command, input=bytes(16 * 16 * 3), stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, timeout=10, env=probe_env)
    except subprocess.TimeoutExpired:
        raise ValueError(f'{message} (10-second timeout)') from None
    except OSError:
        raise ValueError(f'{message} (could not start FFmpeg)') from None
    if result.returncode != 0:
        raise ValueError(f'{message}; use a working FFmpeg build with libx264 support')


def output_message(output, encoding):
    path = str(output)
    try:
        path.encode(encoding or 'utf-8', errors='strict')
    except UnicodeEncodeError:
        # A redirected Windows stream may use an ANSI code page, not UTF-8.
        # Use an explicitly labelled, reversible JSON string rather than
        # changing stream settings or losing characters from the path.
        return f'Verified offline example (JSON path): {json.dumps(path, ensure_ascii=True)}'
    return f'Verified offline example: {path}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', choices=ROUTES, required=True)
    parser.add_argument('--project-root', required=True)
    parser.add_argument('--font-regular', help='absolute local path to an installed regular font')
    parser.add_argument('--font-bold', help='absolute local path to an installed bold font')
    parser.add_argument('--font-regular-index', type=int, help='face index in the explicit regular font; default 0')
    parser.add_argument('--font-bold-index', type=int, help='face index in the explicit bold font; default 0')
    args = parser.parse_args()
    if sys.flags.optimize:
        parser.error('Run with Python assertions enabled')
    if (args.font_regular is None) != (args.font_bold is None):
        parser.error('Pass --font-regular and --font-bold together')
    if args.font_regular is None and not sys.platform.startswith('linux'):
        parser.error('Pass --font-regular and --font-bold for the installed fonts on this operating system')
    index_flags = (args.font_regular_index, args.font_bold_index)
    if any(i is not None and i < 0 for i in index_flags):
        parser.error('Font face indices must be nonnegative')
    if args.font_regular is None and any(i is not None for i in index_flags):
        parser.error('Font face indices require the explicit font paths')
    default_index = 2 if args.locale == 'zh' and args.font_regular is None else 0
    indices = [default_index if i is None else i for i in index_flags]
    scene, movie, regular, bold = ROUTES[args.locale]
    src = SKILL / 'examples' / scene
    missing = [module for module in ('numpy', 'PIL') if importlib.util.find_spec(module) is None]
    tools = {name: shutil.which(name) for name in ('ffmpeg', 'ffprobe')}
    missing += [name for name, path in tools.items() if path is None]
    missing += [str(src / name) for name in FILES if not (src / name).is_file()]
    if missing:
        parser.error('Required preinstalled tools or input files unavailable: ' + ', '.join(missing))
    try:
        fonts = [local_path(value, label) for value, label in ((args.font_regular or regular, 'regular font'),
                                                             (args.font_bold or bold, 'bold font'))]
        from PIL import ImageFont
        for role, (font, index) in enumerate(zip(fonts, indices)):
            label = ('Regular font', 'Bold font')[role]
            if not font.is_file():
                raise ValueError(f'Installed font file not found: {font}')
            # Fail before writing the project if Pillow cannot load the selected files.
            try:
                face = ImageFont.truetype(str(font), (21, 22)[role], index=index)
            except OSError as error:
                raise ValueError(f'Pillow cannot load installed font {font} face {index}: {error}') from error
            if args.locale == 'zh':
                require_sample_glyphs(face, CHINESE_FONT_TEXT[role], label, font, index)
        project = project_target(args.project_root)
        inputs = {name: (src / name).read_bytes() for name in FILES}
        env = {**os.environ, **{f'FIRST_VIDEO_{name.upper()}': str(Path(path).resolve(strict=True))
                                for name, path in tools.items()}}
        require_encoder(env['FIRST_VIDEO_FFMPEG'])
        if lstat(project) is None:
            project.mkdir()
        project = project_target(str(project))
        for name, data in inputs.items():
            with (project / name).open('xb') as dest:
                dest.write(data)
        for command in (('-m', 'unittest', 'test_state'),
                        ('render.py', '--font-regular', str(fonts[0]), '--font-bold', str(fonts[1]),
                         '--font-regular-index', str(indices[0]), '--font-bold-index', str(indices[1]))):
            subprocess.run([sys.executable, '-B', *command], cwd=project, env=env, check=True)
        output = project / 'output' / movie
        if not output.is_file() or output.stat().st_size == 0:
            raise ValueError('No verified video at the expected output path')
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Offline example not verified: {error}\n')
    print(output_message(output, sys.stdout.encoding))
    return 0


if __name__ == '__main__':
    sys.exit(main())

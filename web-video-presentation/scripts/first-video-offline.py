#!/usr/bin/env python3
"""Start the bundled offline product-flow example in a selected empty directory."""
import argparse
import importlib.util
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
        for font, index in zip(fonts, indices):
            if not font.is_file():
                raise ValueError(f'Installed font file not found: {font}')
            # Fail before writing the project if Pillow cannot load the selected files.
            try:
                ImageFont.truetype(str(font), 22, index=index)
            except OSError as error:
                raise ValueError(f'Pillow cannot load installed font {font} face {index}: {error}') from error
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
                         '--font-regular-index', str(indices[0]), '--font-bold-index', str(indices[1])),
                        ('verify.py',)):
            subprocess.run([sys.executable, '-B', *command], cwd=project, env=env, check=True)
        output = project / 'output' / movie
        if not output.is_file() or output.stat().st_size == 0:
            raise ValueError('No verified video at the expected output path')
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Offline example not verified: {error}\n')
    print(f'Verified offline example: {output}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

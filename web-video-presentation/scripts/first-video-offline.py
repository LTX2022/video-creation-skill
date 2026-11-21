#!/usr/bin/env python3
"""Start the bundled offline product-flow example in a selected empty directory."""
import argparse
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys

SKILL = Path(__file__).resolve().parent.parent
FILES = ('render.py', 'state.py', 'test_state.py', 'verify.py')
ROUTES = {
    'en': ('product-flow-15s-native', 'product-flow-15s.mp4',
           '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
           '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    'zh': ('product-flow-15s-zh-native', 'product-flow-15s-zh.mp4',
           '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
           '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'),
}


def project_target(root, node):
    if not Path(root).is_absolute():
        raise ValueError('Choose an absolute project path')
    p = subprocess.run(
        [node, str(SKILL / 'scripts/workspace-preflight.mjs'), '--mode=new',
         '--project-root', root, '--path-only'],
        check=True, text=True, stdout=subprocess.PIPE,
    )
    return Path(p.stdout.rstrip('\n'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', choices=ROUTES, required=True)
    parser.add_argument('--project-root', required=True)
    args = parser.parse_args()
    if sys.flags.optimize:
        parser.error('Run with Python assertions enabled')
    if not sys.platform.startswith('linux'):
        parser.error('This bundled example runner has only been verified on Linux')
    scene, movie, *fonts = ROUTES[args.locale]
    src = SKILL / 'examples' / scene
    missing = [module for module in ('numpy', 'PIL') if importlib.util.find_spec(module) is None]
    tools = {name: shutil.which(name) for name in ('node', 'ffmpeg', 'ffprobe')}
    missing += [name for name, path in tools.items() if path is None]
    missing += [path for path in fonts if not Path(path).is_file()]
    missing += [str(src / name) for name in FILES if not (src / name).is_file()]
    if missing:
        parser.error('Required preinstalled tools or input files unavailable: ' + ', '.join(missing))
    try:
        project = project_target(args.project_root, tools['node'])
        inputs = {name: (src / name).read_bytes() for name in FILES}
        if not project.exists():
            project.mkdir()
        project = project_target(str(project), tools['node'])
        for name, data in inputs.items():
            with (project / name).open('xb') as dest:
                dest.write(data)
        for command in (('-m', 'unittest', 'test_state'), ('render.py',), ('verify.py',)):
            subprocess.run([sys.executable, '-B', *command], cwd=project, check=True)
        output = project / 'output' / movie
        if not output.is_file() or output.stat().st_size == 0:
            raise ValueError('No verified video at the expected output path')
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Offline example not verified: {error}\n')
    print(f'Verified offline example: {output}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

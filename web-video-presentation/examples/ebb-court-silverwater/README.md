# Ebb Court Twilight — Silverwater
A self-contained original six-second silent example. It keeps the original gate, camera, and world-space sluice-to-channel-to-basin path. Long, low-contrast cool reflections establish a wet basin independently of gate opening; a separate, tapered falling lamella carries moving highlights and creates compact, decaying ripples only after arrival. The walls have staggered local masonry joints; the stone coping retains real bevel geometry.

## Build and check offline
Use Python 3 with NumPy and Pillow, and FFmpeg/FFprobe with libx264 available on PATH. The tested Linux toolchain was Python 3.12.14, NumPy 2.3.5, Pillow 13.0.0, and FFmpeg 7.1.5. No browser, Node, graphics-engine installation, Blender, Unreal, or Remotion. Runtime varies with computer; allow several minutes for this native 960×540 CPU rasterizer. The render directory must not already exist.

```sh
OPENBLAS_NUM_THREADS=1 python -B src/finish.py my-render
OPENBLAS_NUM_THREADS=1 python -B verify_silverwater.py my-render/Ebb-Court-Twilight-Silverwater.mp4 my-report
```

The environment-variable prefix above is shell syntax for Linux/macOS. In PowerShell, set `$env:OPENBLAS_NUM_THREADS = '1'` before running the two Python commands without the prefix. Native Windows has not been verified. This example does not install dependencies.

The finished MP4 has a single 960×540, 24 fps H.264/yuv420p stream and no audio; motion is baked in 144 frames. Full geometry and shading source are editable. The verifier checks the entire encoded stream, protected geometry, gate displacement, first fall and impact windows, compares actual decoded samples against source rerenders, and separates low-amplitude ambient optics from onset and decay of the localized contact response. It does not make an aesthetic or gallery decision. In a source-only export, include `src/{court_r6,finish,sluice,story}.py`, `verify_silverwater.py`, and this README only. `render-source.sha256` optionally verifies the four locked sources from the source directory. Images, compressed video, inherited/older verifiers and the unrelated A/B proof files are unnecessary for rebuilding.

The simulated response is an authored optical/material model on the scene's actual mesh, not an offline physical fluid solver or ray tracing system. The geometry is stylized; no photorealism claim.

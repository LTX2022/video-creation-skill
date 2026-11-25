# Ebb Court — Moongate: Settle

An original, editable six-second 3D study. The bronze gate lifts and releases a finite packet through the rill, then shuts. The tail arrives downstream in world-distance order; the water thins to drops, the camera rests, and the last ring expands and fades. The drawing is deliberately stylized. No labels or overlays are baked into the film.

## Render and verify locally

Prerequisites: Python 3, NumPy, Pillow, FFmpeg/FFprobe with libx264. Use the provided source only; no other dependencies or media are installed. Linux test toolchain: Python 3.12.14, NumPy 2.3.5, Pillow 13.0.0, and FFmpeg 7.1.5. Allow several minutes; on the tested setup the render took roughly 8 minutes. Choose output paths that do not exist to prevent overwriting existing material.

```sh
OPENBLAS_NUM_THREADS=1 python -B src/moongate.py "Render Moongate Settle"
OPENBLAS_NUM_THREADS=1 python -B verify_settle.py "Render Moongate Settle/Ebb-Court-Moongate-Settle.mp4" "Verify Moongate Settle"
```

In PowerShell set `$env:OPENBLAS_NUM_THREADS = '1'` before the two commands and omit the inline Bash environment prefix. The exact version was not executed on macOS or Windows. Linux can render with CPU/shadow-map rasterization without a browser, Node, Blender, Unreal, or Remotion. For a fast visual check at the default delivery size, append `--proof --frames 0 45 104 123 134 143` to the render command and use a different new output path. To make smaller stills, also use `--width 480 --height 270` (do not use lower-resolution proof output for final encode verification).

The verifier expects the default output (960×540 H.264/yuv420p, 24 fps, 144 frames, 6.000 seconds, no audio). It decodes every frame, checks the presentation timestamps and decoded uniqueness, compares 18 samples to the source renderer, verifies the physical door and cutoff timing, and measures the real encoded stream disappearance at the held camera. It emits a SHA-256 and a decoded contact sheet. It does not judge style or release readiness.

## Edit the source

- `src/moongate.py`: portable CPU scene entry point, continuous camera motion, architecture/materials, gate geometry, subpixel rendering and export. Omitted the earlier tiny high-contrast inset markers instead of smoothing them in post. Some edges are actual bevel geometry; final frames integrate 1.20× native raster samples via Lanczos before encoding.
- `src/sluice.py`: fall geometry, including propagation of taper and late broken stream.
- `src/story.py`: original connected path, finite propagation packet, local impact and optical fade of the residual wave.
- `src/finish.py` and `src/court_r6.py`: base scene geometry, materials, and CPU viewport/depth rasterization.

This is a controllable motion model and material approximation on 3D surfaces, not a physical fluid simulation, path tracer, or claim of universal cross-machine byte identity. Previous V4 remains unchanged. No external assets or runtimes are distributed in this source.

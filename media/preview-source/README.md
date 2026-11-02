# Reproducible 60-style Noto preview

This is a new offline preview of all 60 current source styles, not the original historical MP4 and not a Remotion/browser end-to-end render. It keeps 56 × 6 seconds + 4 × 12 seconds at 30 fps: 11,520 frames / 384 seconds. Content is 960×540; a 36-pixel index strip makes the encoded output 960×576. There is no audio.

## Rendering contract

- React SSR executes the skill's actual `PresetScene` and the four reference scene components.
- Theme CSS variables are resolved from each retained `tokens.css` file. Every font-family is replaced with `Noto Sans CJK SC`, including index labels. This deliberately changes typography from the historical preview; it does not claim pixel identity.
- The isolated Fontconfig configuration exposes only Noto Sans CJK regular/bold files. `font-manifest.json` records exact file SHA256 values. No font binaries need be redistributed.
- Each SVG is rejected if it contains image, foreignObject, script, href, src or CSS @import. No network media or fonts are loaded. Geometry comes from the source components; no reference-video frames are used.
- Python ctypes calls installed librsvg/Cairo and streams raw BGRA to FFmpeg/libx264. The output is H.264/yuv420p with faststart. Fonts remain rasterized pixels, not embedded font programs.

## Isolated reproduction

Use a **new empty scratch directory**, not the skill or a customer project. Required installed tools: Node with the lockfile-installed React/ReactDOM/tsx dependencies; Python; librsvg-2, Cairo and libgobject shared libraries; FFmpeg; licensed Noto CJK regular/bold fonts. Pillow is required only by `verify.py` for contact sheets. Nothing auto-downloads assets.

1. Copy these preview scripts and `index.json` into that scratch directory.
2. Link `src` to a freshly scaffolded project's `src`, and `node_modules` to that same project's lockfile-installed dependencies. Do not change that source during rendering. Compare source files against `source-hashes.json`; if they differ, the result is a new source revision, not this exact preview.
3. Set `VIDEO_SKILL_ROOT` to the absolute skill directory containing all 60 `themes/` folders.
4. Create `fonts/`, `cache/` and `output/`; link only `NotoSansCJK-Regular.ttc` and `NotoSansCJK-Bold.ttc` into `fonts/`. Verify their hashes against `font-manifest.json`.
5. Set the `<dir>` and `<cachedir>` paths in `fonts.conf` to these new absolute directories. The config must contain no system include that exposes other fonts. Run `FONTCONFIG_FILE="$PWD/fonts.conf" fc-match 'Noto Sans CJK SC'` to verify the match.
6. Run `python batch.py`, then `python verify.py`. A file named `PAUSE` pauses future workers without killing current renders; remove it to resume.

The published driver refuses a non-empty `output/` directory or existing final/batch artifacts; use a new workspace instead of overwriting an earlier run. This safety guard was added after preview encoding and refusal-tested; it does not change frame generation.

The default batch uses four workers and FFmpeg two encoding threads each; avoid competing with time-sensitive tests. `batch-results.json` must contain 60 successful segments. Inspect all contact sheets and focused frames, not only a success code.

## Evidence limitations

Full decode and 60 sampled frames demonstrate codec/representative-frame checks, not exhaustive aesthetic approval or real-time human playback. Exact output bytes may vary with React, SVG rasterizer, font rasterizer or encoder versions. Font notices document applicable source package terms; they do not constitute a legal warranty or extend MIT to media/trademarks.

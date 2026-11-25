# Stillroom — Focus mode

Original, fictional product-interaction demo for Video Creation Skill. All interface geometry, type layout, background, cursor and symbols are drawn from scratch in Python/Pillow; no source video, screenshots, generated artwork, stock assets, UI brand assets or third-party recipe code. Silent. This is an edited motion demonstration, not evidence of a live product or user aesthetic acceptance.

## Render

Requirements: Python 3/Pillow, FFmpeg with libx264, system URW Nimbus Sans regular and bold, DejaVu Sans Mono. Defaults are the Linux paths named in the source. To use local licensed font files, set STILLROOM_REGULAR_FONT, STILLROOM_BOLD_FONT and STILLROOM_MONO_FONT to their absolute paths. Layout can vary with font metrics. Font files are not packaged. Tested on Linux only; macOS and Windows remain untested.

    python3 -B render.py stillroom-focus-final.mp4

Choose a new output filename. Existing files, directories and symlinks (including dangling links) are never replaced. Output is staged and then published without overwrite, even if the final filename is claimed while rendering. The destination filesystem must support hard links; if publication fails, use a new filename on a supported filesystem.

To run the local overwrite regression tests (including a real six-second render and a test of another process claiming the output name):

    python3 -B -m unittest -v test_render.py

One scene: H.264 / yuv420p, 1280 × 720, 30 fps, 180 frames / 6 seconds. All frame numbers are zero-based.

| Event | Frames | Evidence |
|---|---|---|
| Establish desk and both modes | 0–28 | Overview selected, pin and two neighboring tasks visible |
| Pointer approaches | 29–56 | Interior opacity ramp, then eased Bézier path; last approach into Focus segment |
| Dwell at actual hotspot | 57–61 | Tip (932, 225) is inside target segment x928–1009, y200–247 |
| Press feedback | 62–66 | Pointer becomes mint, then target pressed styling appears; selected pill remains Overview |
| Mode applies | 67–78 | Focus pill slides, pinned item gains color, unrelated task positions stay in-place |
| Readable hold | 102–179 | Pointer is gone; interface and support caption remain stable, 2.6s final read |

The unrelated sidebar rectangle x160–354, y185–590 keeps the same content and geometry. Lower work items are related to this mode switch: color intentionally loses emphasis, positions do not change. A technical decode check is:

    ffmpeg -v error -xerror -i stillroom-focus-final.mp4 -f null -

Original designs and source editable; no source MP4 needed.

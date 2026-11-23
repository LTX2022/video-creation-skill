# Cutline — three stages, one cut

Original, renderer-independent 2.5D motion proof. Three cards turn in from near-edge-on, remain readable through a slow moving hold, converge, then hand off their three identifiers to a review state. No vendor media, vendor implementation, blur effect, smoke ring, particles, or Remotion. Perspective and depth come from projected card planes with drawn side surfaces; this isn't a physically rendered 3D scene. The labels and numbers are illustrative, not a live editing UI.

## Reproduce

Verified on Linux only. Local Python 3.10+, Pillow and NumPy, DejaVu fonts at the paths at the top of render.py, and FFmpeg with libx264. No font binaries are bundled. Change font paths if needed, allowing for differences in raster layout.

    python -B render.py new-output
    python -B verify.py new-output

Render target: H.264 MP4, 1280×720, 30 fps, 195 frames, 6.5 seconds, no audio. Run from this directory; the output directory must not already exist.

A successful render writes an MP4 and seven uncompressed keyframe PNGs to your selected output directory. The QA script validates the encoded clock and full decode separately, and checks that the animated card planes stay front-facing, have readable-width bounds, remain separated on the measured reading hold, keep changing angle during that hold, and exit. It does not substitute for full-speed creative judgment, commercial QC, or user approval.

# Edit Desk — review handoff

Original, silent 5.5-second UI-motion study. Atlas, Kestrel, and Oriole begin in creation order. Atlas lifts through a clearance lane while the other cards move together, then rejoins the row in editorial order: **Kestrel → Oriole → Atlas**. The fixed header phases stay unobstructed above card movement. The status reads Ready for Review only after the cards settle. Each card keeps its name, ID, badge shape, and artwork.

## Design rule

[GreenSock's official Flip API](https://gsap.com/docs/v3/Plugins/Flip/#how-do-i-flip-between-two-different-elements) uses stable `data-flip-id` values to correlate visual identities across layout states. The [pinned Flip source](https://github.com/greensock/GSAP/blob/5e6c35ff8eedea12d4f229129def635277d8b0f2/src/Flip.js) is a reference for that behavior. Here the lesson is an explicit ID-to-slot mapping, easing between declared endpoints on the frame clock. A card's content belongs to the ID, not its current index. This is an authored raster example, not a GSAP runtime implementation, live UI, or renderer of DOM/CSS. It does not emulate size or nested parent behavior from Flip.

Cutline shows a different job: projected card-plane staging and a handoff to a review state. Edit Desk is a companion study in preserving identity during an explicit layout reorder, not a correction or replacement of Cutline.

## Rebuild and verify offline

Python 3 and Pillow 10.1+ (Pillow's bundled default font); FFmpeg/FFprobe with libx264. No GSAP, npm, browser, NumPy, Remotion, or external assets. Use output directories that do not already exist. From this folder:

```sh
python -B render.py "Edit Desk Output"
python -B render.py "Wrong IDs Control" --reverse-enumeration-control
python -B verify.py "Edit Desk Output/Edit-Desk-Review-Handoff.mp4" --control "Wrong IDs Control/Edit-Desk-Review-Handoff.mp4"
```

For a still of the clearance lane, run `python -B render.py "Mid Frame" --frame 67`. The final MP4 is 960×540, H.264/yuv420p, 24 fps, 132 frames, no audio. F0–F30 shows source order; F67 samples the three distinguishable cards midway; F99–131 holds the editorial order. The verifier strictly decodes each clip and checks frame timestamps; scans the actual encoded endpoint occupancy; independently validates matching badge shapes and thumbnail colors; checks the actual decoded clearance caption stays readable above the motion lane; and proves a deliberately wrong index assignment can pass the exact same geometry gate while failing identity. It also checks source-frame collision, hold and shuffled-frame reproducibility. It does not OCR labels, grade the animation, test a browser/runtime, or guarantee byte equality across different toolchains.

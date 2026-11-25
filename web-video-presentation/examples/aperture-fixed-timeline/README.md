# Aperture 04 — fixed-frame timeline study

An original, silent 5.5-second product beat: reveal an optical module, align its iris, measure three channels, then hold a confirmed lock. The artwork is procedural; no images, models, or third-party motion code are bundled.

**What this transfers.** GreenSock's [Timeline skill](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-timeline/SKILL.md) describes readable cue labels and relative start positions, and its [Core skill](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md) explains easing and stagger. Here, `align` begins at frame 23, the first readout track starts at `read - 12` (frame 41) during alignment, and the other readouts use the same easing at 8-frame intervals. Alignment ends at F65, all three readouts settle by F74, and the ring locks over F89–113. The last 19 frames hold. The explicitly separated aperture, readout, and lock tracks do not accidentally serialize.

**What this doesn't transfer.** [ScrollTrigger](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md) can link a playhead to user scroll position; numeric scrub also introduces catch-up time. This video uses explicit frame positions, not scroll, browser event timing, or a live ticker. Its easing math is original, not a compatibility implementation. Precompute static layers and avoid changing overall layout; this echoes the separation of layout from movement in the [Performance skill](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md), not a claim about browser playback. No GSAP, Node, Remotion, or browser is needed.

## Rebuild and verify offline

From the example folder, with Python 3, NumPy, Pillow (10.1+; its bundled default font), and FFmpeg (including `ffprobe`, libx264) available:

```sh
python -B render.py "Aperture Render"
python -B verify.py "Aperture Render/Aperture-04.mp4"
python -B render.py "Aperture Frame 061" --frame 61
```

Choose fresh output directories. The MP4 is 960×540, 24 fps, 132 frames, H.264/yuv420p. The verifier checks exact timestamps and the RGB of actually decoded samples, visually distinct preread/first/second/third channel states, concurrent iris movement, ring illumination at lock, settled tail, and stationary corner registration. It also demands identical raw RGB for shuffled/repeated frame requests, and rejects serial and reverse-order readout controls in the renderer. It is a behavioral check, not an aesthetic verdict. Exact encoded bytes on a different toolchain are not promised.

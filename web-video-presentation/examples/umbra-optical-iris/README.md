# Umbra: optical iris

Original silent, title-free procedural shot. The camera approaches and settles, a witness mark on the collar turns, the curved iris leaves uncover the glass, and a reflection appears inside the open aperture. This is a layered 2.5D raster model, not ray tracing or an as-built camera mechanism. No footage, images, fonts or third-party media are used.

Requires Python 3, NumPy, FFmpeg with libx264, and ffprobe. Run in this directory with a fresh output filename:

```sh
python3 -B render_timed.py Umbra.mp4
python3 -B verify.py Umbra.mp4
```

The continuous MP4 is H.264 yuv420p at 1080×608, 24 fps, 132 frames (5.5 seconds) with no audio. The renderer refuses to overwrite an existing video. The optional `--proof` renders nine discontinuously sampled frames at half resolution; it is not a playback or pacing reference.

The verifier decodes the whole video and checks that the exposed teal region grows before the late reflection intensifies, and that the tail is nearly stable. Its sampled regions and thresholds are specific to this shot. Inspect the continuous export separately for motion and framing; these checks do not establish aesthetic approval. The reference MP4 SHA-256 from the tested environment was `19b4341e65910bcd9e5ed6fcb09cfe42b4a9e92711bc0ac69732f245cea217e0`; encoder or library differences may change the bytes.

# Flat lever repair: one fixture, two separate checks

This is a source-only case study for [asset-motion checks](../../references/ASSET-MOTION-CHECKS.md). It illustrates a manual, asset-specific estimate for a flat illustration, not automatic segmentation or general inpainting. It is not a new rendering backend.

Requires Python 3, Pillow, NumPy, SciPy and a local FFmpeg with libx264rgb. In this directory, using an unused output path:

```sh
python3 -B make_fixture.py input.png
python3 -B repair.py input.png fresh
python3 -B verify.py input.png fresh/lever.mp4
```

The fixture generator writes only the original synthetic opaque PNG. The repair and verifier have no access to the drawing layers and read only that PNG and the rendered video. The repair script saves an estimated lever mask, local fill support, and estimated plate alongside the RGB-lossless MP4, so the inference remains inspectable. The fixture's known orientation and manually chosen regions are specific to this example. Unknown pixels behind the lever are not present in the repair input and cannot be recovered exactly.

The verifier checks frame count, exact rest RGB, five fixed regions and the raised lever tip at both peaks. This checks mechanics, not optical fidelity. A predecessor passed those checks while showing stepping and residue near the revealed left trim. The included script estimates that narrow trim from nearby visible pixels. Compared with the predecessor, it changes 192 decoded pixels at each peak, with the sampled rest frames unchanged. The repaired join is still an estimate and may retain subtle texture differences. View the encoded motion and inspect the revealed area before calling a flattened input accepted. The RGB-lossless run is evidence, not a guarantee of playback support in an editor or web player.

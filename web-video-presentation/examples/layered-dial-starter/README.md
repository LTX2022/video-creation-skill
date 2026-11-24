# Offline layered dial starter

A runnable compact form for a **supplied, pre-registered layered asset**: one
physical moving part, a supplied pivot, one fixed base, one foreground cap, and
an explicit background choice. The form only expands into the existing
[local element route](../../references/LOCAL-ELEMENT-ROUTE.md); it is not a new
renderer or a fallback for flattening, segmentation, or biological motion.

## Run from any current directory

Requires Python 3.9+, Pillow (for fixture and visual checks), and installed
FFmpeg/ffprobe with the ProRes and H.264 encoders used by the existing runner.
Use a fresh working path. Point `SKILL_ROOT` at the actual installed
`web-video-presentation` folder (containing `scripts/local-element.py`); if
you have cloned this repository with its layout intact, the example is at
`$SKILL_ROOT/examples/layered-dial-starter`.

```sh
SKILL_ROOT=/absolute/path/to/web-video-presentation
EXAMPLE="$SKILL_ROOT/examples/layered-dial-starter"
WORK="$(mktemp -d)"
python3 -B "$EXAMPLE/make_fixture.py" "$WORK"
cp "$EXAMPLE/shot-form.json" "$WORK/shot-form.json"
python3 -B "$EXAMPLE/compile_shot.py" "$WORK/shot-form.json" "$WORK/request.json"
python3 -B "$SKILL_ROOT/scripts/local-element.py" "$WORK/request.json" --output "$WORK/out"
python3 -B "$EXAMPLE/check_shot.py" "$WORK/out" --plate "$WORK/assets/plate.mp4"
```

Keep the input layers, the form, its expanded editable `request.json`, and
the output files `shot-composite.mp4` and `element-alpha.mov`. The supplied
form reproduces the example's rightward 30° sweep, hold, and return. Edit its
named needle layer's frame/degree pairs for a variant, then generate a fresh
request and output directory. Frames are zero-based and the last key is frame
71 of 72. Positive rotation is counterclockwise in the actual renderer, so
`-30` moves this initially vertical needle toward screen right.

For supported customer assets, choose registered transparent PNGs, their layer
order, corresponding valid pivot coordinates, timing, and real use rights.
Set `background.mode` explicitly: `alpha` forbids a plate; `composite` and
`both` require the intended local plate. The form supports a start-aligned,
frame-rate-matched muted plate, with no automatic substitution. Use the native
contract when you need more options. Do not infer missing hidden artwork or
borrow the rehearsal rights declaration for customer media.

## Reproducibility and limits

The included original illustration has a fixed status lamp and cap, a moving
needle, and a deliberate navy grid plate. The checker uses fixture-specific
decoded ROIs: correct imported plate, static cap and status region, needle
centerline meeting the pivot and rightward move and return, plus actual MOV
alpha at opaque, clear and partial-edge locations. It measures target F26 and
F37, not just intermediate pictures; nominal +30° measured about +29.08° in
decoded RGB. A wrong pivot, sign, or black substitute each produces a playable
result but fails a different scoped check. The moving needle stays inside a
solid gauge face, so its shape changes in RGB, not the opaque union's alpha.

The compact route was exercised locally in one cold trial with this
controlled known-asset request, followed by decoded verification and clean
reproduction. It does not claim arbitrary weak-model reliability, automated
understanding of source layers, time/cost savings, or aesthetic approval.
View the encoded MP4 before delivery; for another fixture redesign the ROIs
and what constitutes a valid motion. Cost fields remain optional.

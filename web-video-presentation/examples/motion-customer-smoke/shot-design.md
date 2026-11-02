# Draft design — pending actual user review
Claim: the same token can change contour and graphic treatment without changing identity or position.

A single centered object keeps ID `token-01`, seed `customer-token-01-v1`, and a cream/teal palette. The circle gradually becomes a diamond while its treatment changes paper → line → halftone. Static camera; no prose or captions. Frame intervals are in outline.md and project-state.json, not an independent timing source. A 96-point sampled closed contour preserves corresponding point IDs; this is not arbitrary SVG topology morphing.

Model state: chapter frame → morphAtFrame → geometry + explicit material event → MaterialShape. Readout is the object contour and treatment, not a separate animated number. Invariants: one SVG material entity, fixed palette/seed/instance namespace, no stage background, no audio, no step-boundary reset.

Visual checks still required: frames 0, 30, 59/60/61, 89/90/91, 119/120/121, 150, 179; morph 25/50/75 percent (60, 90, 120); full continuous six-second clip. Decode actual Alpha MOV and inspect black/white plus grey/texture edges. ProRes Alpha interpretation, color metadata and target editor remain unspecified and unverified. No footage or tracking is claimed.

Authorization: this is a bounded offline forward-test; no actual design approval, browser render or visual acceptance has been supplied. Do not mark final gates accepted.

## Concrete direction
Body #F4EAD9, ink #174A5B, highlight #FFFFFF; no text. Safe inset 96 px. Smoothstep morph at frames 30–150, 30-frame opening and ending holds. Kept here because direction schema currently requires typography when its direction block exists.

# Opt-in contour and material mechanisms

Original, lightweight TypeScript math and React SVG components; no new runtime dependency. These are optional shot-level tools, not a replacement or automatic effect for the 56 presets.

## Reuse

```tsx
import {MechanismShowcase} from './video/mechanisms';

// Supply chapterFrame for an object that must survive narration-step changes.
<MechanismShowcase frame={chapterFrame} fps={30} durationInFrames={180}
  width={1920} height={1080} seed="chapter-02-subject-v1"
  instanceId="film-main-chapter-02-subject" />
```

The showcase is a real standalone SVG, with no Remotion hooks or browser dependencies. A Remotion host can pass `useCurrentFrame()` and `useVideoConfig()` values. It uses a fixed contained viewBox (not a portrait-specific reflow). Omit `background` for transparent output; an explicit opaque `#RGB` or `#RRGGBB` color creates the sole stage-background rect, extended to cover the full actual viewport including portrait/ultrawide letterboxes. Named colors, CSS variables and alpha-bearing colors are intentionally rejected for this background-only contract. Do not treat SVG transparency as encoded Alpha/editor acceptance.

For your own object, call `prepareMorph({id, from, to, pointCount, startFrame, endFrame})`, then `morphAtFrame(track, chapterFrame)` and render `MaterialShape` inside your SVG. Retain the same entity ID, seed, palette and per-mounted-instance `instanceId`. Optional `materialAtFrame` makes deterministic quarter-interval switches, or author explicit material event times yourself.

## What stays fixed

- The closed source contours are sampled by perimeter to 3–1024 corresponding points. Source contours can have unequal vertex counts. Sampled point IDs are stable through the entire morph.
- At/before start and at/after end, the exact prepared endpoint geometry object is returned; no easing drift. This is exactness against the **sampled contours**, not lossless conversion of arbitrary SVG paths.
- Each frame is independently computed from explicit inputs. Textures use indexed hashing of the required seed, never `Math.random`, wall-clock time, timers or state accumulated across renders.
- `flat`, `paper`, `line` and `halftone` reuse the exact same contour and palette references. Materials are graphic treatments: line has no fill, and the two textures are clipped inside the object. They are not physically based shaders.
- SVG resource IDs derive from the required authored instance namespace and object ID. Give every mounted instance a **DOM-global unique** namespace, including instances in separate inline SVG roots; keep it stable across frames. There is deliberately no automatic/default namespace.

## Boundaries

Author matching contour start points and winding; no automatic semantic correspondence, topology repair, hole handling, SVG parsing, or promise of non-self-intersection. The prepared shape is a closed polyline, not a Bézier reconstruction. Inputs reject non-finite values and coordinates outside ±1e9. Extremely small or degenerate shapes may be invisible; positive perimeter is necessary but does not guarantee usable area.

`rotateAround(point, pivot, angleDegrees)` is a deterministic 2D geometry helper with SVG y-down angle convention. It is not an anatomical rig, joint solver, constraint system or follow-through simulation.

The showcase uses simple sans-serif Latin labels for portable SSR checks; production shots should supply their own narration, localized typography, layout and validation. Its `fps` is explicit metadata/validation, while frame durations remain authored in `durationInFrames`; changing fps alone does not retime the frame interval.

## Checks

`mechanisms.test.tsx` uses Node's test runner and React SSR. It covers finite validation, stable IDs, exact sampled endpoints, seek order, seed determinism, material identity, SVG clip/ID isolation, transparent markup defaults and pivot rotation. Run with the project's approved TypeScript loader. These focused checks are not browser animation QA or final video/Alpha acceptance.

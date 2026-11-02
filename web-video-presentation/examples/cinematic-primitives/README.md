# Cinematic particle primitives — isolated candidate

**Status: pure model tested; Canvas/TypeScript/Remotion adapter unrendered and not typechecked in a project. Packaged as an optional isolated example; not integrated into the project runtime.**

This is a small math/preset module, not a new rendering engine or a promise to match the reference videos. It supplies the missing repeatable starting geometry and camera, not cinematic taste. The separately produced Python sample is a different renderer and does not validate this adapter.

## What is reusable

- Immutable particle IDs and indexed seeded randomness; cloud → undulating field → ring targets.
- One 12-second authored timeline: cloud hold; field morph/hold; ring morph/hold. Camera and objects use the same absolute seconds. No accumulated simulation and no frame visit order.
- World-space perspective with vertical FOV, near/far clipping, world-to-camera basis and stable far-to-near painter order.
- A pure `sceneAtFrame(preset, frame, fps, {width,height})` function. It can feed Remotion Canvas, SVG, or another authorized renderer.
- Zero package dependencies, network calls, global caches, timers or file writes.

## Minimal use

```js
import {createPreset,sceneAtFrame} from './cinematic-kernel.mjs';
const preset=createPreset({seed:41021,count:1400,durationSeconds:12});
const state=sceneAtFrame(preset,120,30,{width:1280,height:720});
// state.particles: persistent world objects; state.drawList: clipped/projected painter order.
```

Safe adaptation surface: seed (uint32), count (integer 1–10,000), duration (0.1–600 s); color is a renderer choice. Changing count also changes the field/ring arrangement, so it is a new render to review. Do not regenerate the preset per frame. Density is bounded but not performance-benchmarked. A 3D point order is not an opaque z-buffer or intersection-aware occlusion.

`CinematicParticles.unrendered.tsx` is only a proposed wrapper for existing `FrameCanvas`. Intended eventual folder: `src/examples/cinematic-particles/`, with `.mjs` and `.d.mts` alongside. It is not registered in `RemotionRoot`, does not modify `project-state.json`, and cannot create workflow/final-render approval. Review integration first. Standalone composition duration must be `ceil(preset.durationSeconds * fps)`. Production chapters must derive duration/event anchors from their canonical timing and pass **chapterFrame**, never a narration-step-reset frame.

## Tests actually run

```sh
node --test cinematic-kernel.test.mjs
```

12/12 Node tests passed. Coverage: seeded identity, immutable inputs, morph endpoints, stage-boundary continuity, random-order seeking, cross-fps equal-time identity, perspective/clipping/aspect, stable depth order, finite values across 360 frames, invalid count/seed/time/camera/timeline rejection, and no ambient effects. `test-results.tap` and `model-check.json` contain the run evidence.

These are math/model contracts, not pixels, speed, browser compatibility, aesthetic similarity or end-to-end rendering evidence. No software was installed and no browser attempted.

## Remaining acceptance

1. Typecheck the candidate in an explicitly authorized target project; register a separate preview composition only after integration review.
2. Run an authorized actual Remotion full-rate encode; review camera and morph endpoints in motion, including readable holds, aliasing and particle density.
3. Compare the final encoded clip against reference qualities using timestamped criticism. A low-skill model can repeat a tested preset or modify its bounded parameters; it is not guaranteed to invent equally good direction.

Current paint example is simple circles with a low-alpha halo. It does **not** implement light transport, material shading, motion blur, calibrated bloom, DOF, text masks, audio sync, alpha-delivery validation or the rich compositing of the references.

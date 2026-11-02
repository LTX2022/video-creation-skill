# Authored reference-film scenes

Four new IDs supplement (not replace) the original 56 presets. `--theme=<id>` selects the actual `01-example/Example.tsx` production route:

| ID | Complete SVG component | Visible grammar | Action / hold anchors |
| --- | --- | --- | --- |
| `particle-depth-film` | `ParticleField` | Stable depth particles converge into a folded ribbon | .18 / .64 |
| `spectral-material-film` | `SpectralMaterial` | Same contour: solid → paper → line/halftone | .15 / .86 |
| `kinetic-wireframe-film` | `KineticWireframe` | Custom letter A: flat → extrusion → projected wireframe | .15 / .86 |
| `rain-platform-film` | `RainPlatform` | Train arrives, traveler approaches open door and pauses | .19 / .79 |

`PresetScene` validates content and routes family `reference` before the legacy layout. These are complete scene SVGs, not legacy subject-card graphics. Unknown IDs fail closed. The production scene and preset probe share the same code.

## Time and content contract

- Props use the existing `PresetSceneProps`; each component receives merged `PresetContent` plus frame, fps, duration and dimensions. The main editable scene copy is title and conclusion; semantic labels/subtitles in the registry are not automatically drawn by every film.
- Without chapter timing, progress is normalized from frame 0 through the last frame. A 12-second static probe is a useful starting point, not a duration lock.
- With actual three-step chapter timing, `common.progress()` maps actual step starts onto each scene's authored opening/action and action/hold anchors. Steps must be contiguous, zero-based and cover the chapter. Direct component calls with chapter timing must also supply the correct semantic anchors; missing anchors fail closed. Use `ReferenceScene` / `PresetScene` to select them automatically. Frame and fps are unchanged: rain, drips and other frame-time ambient animation keep the actual clock.
- This adapter binds three broad narrative beats, not individual spoken words. More or fewer narration steps require an intentional adapter update; they fail closed instead of assuming equal durations.
- Default narration and shot metadata describe actual source actions. For example the traveler pauses before boarding; neither boarding nor departure is claimed.

## Palette and verification limits

Scene SVG palettes and gradients are authored in component source. Theme CSS matches the surrounding stage/UI but is **not a universal recoloring API**. `isOverlay` removes explicit background layers; local readability support and subject surfaces remain. With captions enabled, each film reserves main content above the actual subtitle band (portrait at or above .58h; landscape at or above .78h). This is a declared layout contract, not pixel measurement. Without captions these are full-frame cinema compositions, not a guarantee of clearance from every platform’s overlays. Chinese fonts, gradients, alpha edges, continuous motion and encoded results need rendered review.

Source/SSR checks prove routing, finite deterministic markup, original-source preservation and timing contracts, not aesthetic acceptance, physical simulation, arbitrary-font conversion, exact reference reproduction or commercial certification. No font/image/video assets are fetched by these scenes.

Run `npm run test:reference-styles` in a scaffold with dependencies already available for the three authored-scene test files; `npm run test:presets` covers the 60-ID production route, legacy regression and real-timing adapter. Neither command installs packages or launches a browser.

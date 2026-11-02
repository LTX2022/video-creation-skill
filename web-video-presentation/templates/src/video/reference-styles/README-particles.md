# Gold particle film

This complete SVG renderer accepts `ReferenceStyleProps` from `common.ts`. It requires no browser APIs, React hooks, network calls, external images, font downloads or runtime random source. `frame / (durationInFrames - 1)` is clamped and is the only animation clock; the supplied `fps` is part of the common contract but does not change normalized timing.

## `particle-depth-film` → `ParticleField`

A folded lemniscate surface is built from **1,248 stable projected particles**, 108 sparse depth grains and 19 contour filaments. Points preserve material IDs while converging from a seeded scattered volume. Camera yaw/pitch, perspective size, painter-order depth, selective warm highlights and short moving surface accents make a dimensional object. No spheres, glow filters, cards or media placeholders are used.

| Normalized time | Visual intent | At 12 seconds |
| --- | --- | --- |
| 0–0.18 | Scattered points establish depth; title appears | 0–2.16 s |
| 0.18–0.64 | Points converge; fine threads expose the folded structure | 2.16–7.68 s |
| 0.64–1 | Formation and conclusion hold; camera/highlights settle | 7.68–12 s |

## Layout / alpha / copy contracts

- Portrait uses a separately composed top-heading / central-subject layout, not a cropped landscape frame.
- `subtitleVisible` confines the foreground to the top **58% in portrait** and **73% in landscape**. The portrait integration's real caption band begins at 60% (its `bottom: 27%` setting is not the content reservation boundary). `data-safe-bottom` exposes the actual safe-content limit. The opaque composite background still covers the whole frame.
- `isOverlay` removes the entire stage and aura texture. It preserves actual subject geometry and adds only text-sized local readability backing. It is **not** an opaque full-frame fake alpha mode.
- Particle alpha is intended for **dark source footage/backgrounds**. Fine gold filaments and distant grains are low contrast on light gray/white footage; alpha mode does not silently alter the palette or add a black full-stage plate to conceal this limitation. Text-only backing is not a guarantee that the particle subject reads over arbitrary footage.
- Only `content.title` and `content.conclusion` are visible. Their complete strings use the shared `fittedLines` helper. If copy cannot fit at the permitted readable minimum, the renderer throws rather than silently truncating. Font metrics are conservative estimates, not browser measurements.
- SVG IDs are deterministic per style / frame dimensions / output mode. The particle IDs are stable per material point across frames.
- The SVG carries integration metadata, including `data-preset-family="reference"`, the style ID, primary-subject tags, and `data-render-status="render-review-pending"`. This is deliberate: source and deterministic SSR tests are not customer acceptance or Remotion E2E proof.

## Verification scope

`particle.test.tsx` exercises deterministic out-of-order rendering, four 16:9 / 9:16 sizes, subtitle modes, alpha background removal, localized backing bounds, node budgets, setup/action/hold differences, endpoint clamping, non-truncating copy behavior and the complete stable particle ID set. Root-level registry, themes, manifests, actual video export and continuous visual review belong to integration QA.

Local React SSR → installed librsvg/Cairo raster review is useful for geometric inspection. It does not establish browser font equality, GPU/Remotion behavior, export codec/alpha correctness or final art-direction approval.

### Local raster performance note

The particle circles intentionally use `fillOpacity`, not element-level `opacity`: each is a fill-only circle with no stroke or children. In a bounded 960×540 librsvg/Cairo probe of frames 0 / 180 / 359, this avoided expensive per-element compositing. Measured raster calls changed from 443 / 1,235 / 1,485 ms to 111 / 46 / 48 ms in that run; these are local diagnostic samples, not production throughput guarantees. Group opacity, clipping, painter order, geometry and stable IDs remain unchanged. Old/new SVGs were otherwise byte-identical after normalizing this attribute name; raster differences were minor antialias/compositing rounding (maximum 2/255 channel difference). Transparent-output corner/bottom alpha remained zero. This is not a measured browser, Remotion or GPU optimization claim.

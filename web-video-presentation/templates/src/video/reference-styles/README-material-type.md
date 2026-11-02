# Material and spatial-type films

These are complete SVG scenes, not a matrix of mechanism demos. Registry IDs are
`spectral-material-film` and `kinetic-wireframe-film`. Exports are
`SpectralMaterial(props: ReferenceStyleProps)` and
`KineticWireframe(props: ReferenceStyleProps)`.

## Authored motion

- **Spectral material:** one identified angular ribbon and orange palette.
  `0–.15` holds the flat source; `.15–.43` replaces its surface with paper,
  including authored folds; `.48–.76` continuously wipes to line/halftone print;
  `.86–1` is an exact static result hold. The contour is reused by all treatments.
- **Kinetic wireframe:** one custom flat-topped A with a triangular counter.
  `.15–.57` grows extrusion depth; `.24–.73` changes the 3-D projection;
  `.24–.34` switches the composition from black to warm white; `.29–.58`
  drains the orange solid into a front lattice and matched contour rails.
  `.86–1` holds the spatial object exactly.

Normalized semantic source/hold anchors are `.15` / `.86` for both films. The
preferred duration is 12 seconds, but all animation derives solely from frame
and supplied duration (or the common authored chapter timing adapter). No hooks,
DOM measurement, clock, random stream, network, assets, dependencies, or filters.

## Layout and render contract

- Spectral: centered serif editorial title, dominant centered ribbon, restrained
  material notation and centered lower conclusion; no engineering chrome.
- Kinetic landscape: left title/conclusion, right volume and local perspective grid.
- Portrait: genuinely separate top title, middle hero, bottom conclusion layouts;
  Spectral keeps centered editorial alignment, while Kinetic remains flush-left.
- Subtitle-visible portrait clips artwork at 58% height, before the real legacy
  subtitle band at 60–73% and platform area below 82%. Landscape clips at 73%.
- Overlay scenes omit stage paint. Opaque local text supports and the hero remain;
  this is not a guarantee that arbitrary footage will never require art direction.
- Titles/conclusions use the existing deterministic `fittedLines` primitive.
  Excessive copy raises its existing fitting error instead of overflowing.
- Wireframe is authored SVG projection, not a 3-D engine or physical simulation.
  Paper is a graphic material treatment, not a lighting simulation.
- All styles remain `render-review-pending` until project-level render review.

## Focused verification

`material-type.test.tsx` checks 80 render combinations, exact source/final holds,
real intermediate changes, SVG resource resolution, overlay stage omission,
node budget, palette/contour identity, and extrusion boundaries. Initial manual
SSR output peaked at 118 nodes (including overlay readability support).
Strict TypeScript compilation was also checked. Landscape/portrait stills were
inspected through Inkscape; that is not a Remotion/browser-video-render claim.

# Rain platform film

`rain-platform-film` → `RainPlatform(props: ReferenceStyleProps)` returns a complete
SVG. This is an original fictional station illustration: no footage, sourced
assets, runtime image requests, browser calls, hooks, timers or global randomness.

## Story and authored motion

The intended 12-second story is **arrival → invitation → pause**, not boarding or
departure. Progress is normalized through the shared timing adapter:

- `0–.19`: establish dark indigo skyline, steel awning and warm station lamps.
- `.10–.49`: the night train decelerates into the station.
- `.19–.58`: the traveler takes alternating grounded steps toward the doorway.
- `.50–.69`: paired train doors slide apart; `.53–.70` the umbrella tilts about
  its hand grip, then settles by `.92`.
- `.79–1`: conclusion appears. Train and traveler hold while rain, eave drips,
  puddle rings and broken reflections continue on real frame time.

The umbrella has a ribbed curved canopy, connected shaft/hook and hand grip;
feet meet the platform. Rain is separated into distant, mid and foreground
depths. The awning clips foreground precipitation, the train covers distant
rain, and an umbrella-shadow mask excludes foreground rain beneath its canopy.
These are authored 2-D relationships, not a physical rain or lighting simulation.

## Composition and content

- Landscape uses a 1600-unit canvas; portrait uses a separately composed 900-unit
  canvas with changed roof, train and subject proportions. It is not a shrunken
  landscape frame. Without subtitles, portrait scene height is 90% and the
  traveler's feet stay above 78%, before the portrait platform-control band.
- Subtitle-visible landscape clips artwork at 73% height. Portrait clips at
  58% because the actual portrait caption band is `.60–.73H` (CSS `bottom:27%`
  means captions sit **above** that bottom margin). This reserves both the
  actual caption band and the bottom 27% platform-safe zone. Opaque output
  continues a dark base through these quiet areas.
- `content.title` and `content.conclusion` are the only main editable story copy.
  Both use shared `fittedLines`, with at most two lines and a readable minimum
  of 67% of the authored headline size. Strings are preserved in full. Copy that
  cannot fit fails with a clear error instead of silent truncation or ellipsis.
  Prefer one short sentence; title and conclusion are never shown together.
- Copy is deliberately timed: title fades out during `.29–.41`, conclusion
  fades in during `.79–.92`. A late frame does not display the title. Long-copy
  tests therefore inspect the title at frame 90 and conclusion at frame 330
  of a 360-frame film, when each is actually visible.
- Fonts are local fallback stacks, not bundled. Font metrics and exact CJK
  glyph appearance depend on the rendering environment.

## Alpha is an illustrative cutout, not invisible weather

`isOverlay` removes the full-stage paint, skyline and broad platform fill.
Train body, narrow track strip, awning/posts, traveler, lamps, rain and reflections
remain; active text gets only a measured local backing. There is no full-frame
opaque readability panel. This dense environmental scene is best used as a
standalone film. Its alpha version is a deliberate station cutout and requires
art direction over arbitrary footage; it does not make the environment physically
compatible with every underlying scene.

## Verification and boundaries

`rain.test.tsx` checks 40 portrait/landscape/subtitle/alpha/frame combinations,
deterministic markup, finite geometry, all SVG resource references, <1200 nodes,
actual train/person/umbrella movement, continuing settle weather and safe-band
geometry. One shared Gaussian blur definition softens two lamp beams; no other
filters are used. Initial renders peaked at 965 elements opaque / 648 alpha.
All five focused SSR tests and strict TypeScript compilation passed locally.
Active-time long-title and long-conclusion portrait renders were also inspected
after the fitting and subtitle-band corrections. Both retain all supplied text.

Landscape opening/action/settle and portrait/subtitle stills were rendered with
installed librsvg/Cairo and visually inspected. Reflections and lamp beams were
revised after that inspection. This is targeted SVG verification, not proof of
full Remotion/browser playback, encoded delivery, exact reference reproduction,
physical realism, universal font compatibility or commercial certification.
The scene remains `render-review-pending` for project-level acceptance.

# Executable theme presets

`PresetScene` is the actual React/SVG component used by `01-example/Example.tsx`.
It is not a pre-rendered movie background or a second Python drawing implementation.
All 56 original theme IDs remain intact; four new reference-film IDs extend the catalog to 60.
Unknown IDs fail closed. The new `reference` family routes complete authored SVGs before
the legacy heading/subject-card layout. See [the reference-film API and timing contract](../reference-styles/README.md).

## Core API

```tsx
<PresetScene
  presetId="paper-press" frame={120} durationInFrames={270} fps={30}
  width={1920} height={1080} subtitleVisible={false} isOverlay={false}
  content={{title: '把问题讲清楚'}}
/>
```

The core has no Remotion hook, DOM measurement, clock or random dependency. Production
chapters pass the actual `chapterFrame`, `chapterDurationInFrames` and
`chapterStepTimings`; this prevents narration step mounts from restarting objects.
Manual step-only chapter previews are explicitly labelled as illustrations, not
inferred earlier narration timing.

The original twelve families' colors/font roles consume the project's real `src/styles/tokens.css`.
The four reference films instead own authored SVG palettes; their CSS tokens cover
the surrounding stage/UI, not universal scene recoloring. Changing only
`presetId` does **not** select another stylesheet. A fresh scaffold chooses both the
same ID and tokens. Copying only tokens into an existing custom project changes its
palette, not its scene structure or motion. Do not overwrite existing custom chapters
without review.

Families have distinct SVG geometry, including data plots, source-paper assembly,
product/interface parts, articulated machinery, node routing, deterministic particle
filaments, scientific/engineering structures, progressive lessons, sculptural/dial
subjects, document tracing, continuous vector-letter shapes, illustrative audio and
eight soft-style structures. Numbers, shapes and content are marked conceptual and
are not real business, medical, scientific or audio measurements.

## Historical-family layout and typography

The details below describe the preserved 56-ID layout. Reference films use their own
complete-scene layout and must be reviewed with actual captions and output format.

The coordinate system derives from explicit width/height, not viewport `vw`.
Portrait captions reserve normalized y=.60..73; platform UI starts at .82. Landscape
caption cases reserve .80..94, allowing two lines. Title/subject/conclusion regions
are separate. Long titles can reflow to a top heading. CJK line wrapping balances
lines, prefers punctuation and avoids common word splits; it is a deterministic
estimate, **not measured browser font metrics**. Text too long at the readability
floor throws rather than silently truncating or shrinking indefinitely.

`isOverlay` removes only the explicit full-stage background and background decoration.
Object surfaces and necessary label backings remain. Essential subject labels use a
localized 97%-opaque theme-surface backing inside the subject region, not a full-stage
plate. Procedural particles retain transparent space and protect only their lower
label strip; the cinematic title has its own local backing. This is an intentional
readability/compositing tradeoff, not a claim of contrast over every live plate.
A transparent SVG alone does
not establish encoded alpha correctness; validate the actual rendered media.

## Explicit Remotion probe entry

`src/video/preset-probe-index.ts` registers `preset-probe` separately from normal
production compositions. It uses this same component, actual installed tokens,
actual Subtitle component and frame-driven wrapper. Props include dimensions, fps,
duration, content, subtitle controls and background `native|transparent|light|dark`.
Its preset ID must match the scaffold's `THEME_PRESET_ID`, preventing palette/ID drift.
A permitted render must use an explicitly approved installed browser and record
source/token/fixture hashes. No preview, install, browser or approval is run merely
by importing these files.

## Evidence boundary

- `npm run test:presets`: pure contract + actual-component React SSR tests; no browser.
- `scripts/test-preset-scaffold.mjs` in the skill: selected ID, original tokens and
  real component wiring; no dependency installation.
- SVG raster probes can inspect actual component geometry and text but differ from
  browser font/CSS rasterization and do not prove Remotion playback.
- Browser stills, consecutive frames, subtitle/alpha encoded media and human review
  are separate required evidence. `data-render-status="render-review-pending"`
  intentionally does not turn a model or SSR pass into aesthetic acceptance.

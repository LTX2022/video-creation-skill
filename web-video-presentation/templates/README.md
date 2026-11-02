# Templates Directory Contract

`scripts/scaffold.sh` is the source of truth for which files are copied into a generated project.

The production Remotion-first scaffold copies the selected runtime files from:

- `src/video/*`
- `src/examples/mechanism-demo/*` (optional mechanism compositions)
- `src/examples/flow-continuity/*` (continuous-object example used by the default three-step chapter)
- `src/chapters/01-example/*`
- `src/components/Subtitle.*`
- `src/components/subtitleTiming.ts`
- `src/components/MaskReveal.tsx`
- `src/config/videoFormat.ts`
- `src/registry/*`
- `src/styles/*`
- `scripts/*`
- `scripts/tts-providers/*`
- `asset-manifest.json`, `project-state.json`, `composition-manifest.json`
- `package-lock.json` (pinned, tested dependency graph)

Generated projects must keep `shot-manifest.json` as the production contract. Each step must include:

- `compositionModel`
- `visualRecipe`
- `motionStyle`
- `finishLevel`

`visualRecipe` and `motionStyle` must come from the skill reference file `references/MOTION-PATTERN-LIBRARY.md`. They are checked by `npm run preflight`; vague notes such as "Remotion style" or "HyperFrames style" are not enough.

Reference-video styles are code-backed. Generated projects include:

- `src/video/reference-style-scenes.tsx`
- `KineticPromptToProductScene`
- `AnnotatedFlowDiagramScene`

These are reusable defaults, not mandatory implementations, when a shot selects `kinetic-prompt-to-product` / `prompt-product-kinetic` or `annotated-flow-diagram` / `whiteboard-engineering-flow`. They are frame-driven Remotion components, support landscape and portrait, and encode continuous motion stages rather than static frame imitation.

The old Vite/Web presentation runtime has been removed from this directory. If any of these files reappear, treat that as a regression:

- `index.html`
- `vite.config.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/components/Stage.tsx`
- `src/components/ProgressBar.*`
- `src/components/AutoStartGate.*`
- `src/components/AutoToggle.*`
- `src/hooks/*`

Official delivery packages and local skill mirrors must not contain these legacy files.

Do not copy, import, or revive those legacy files for new projects. Browser preview is Remotion Studio:

```bash
npm run render:studio
```

Final output is Remotion renderer:

```bash
npm run render:video
npm run render:video:subtitles
```


## v3 output and runtime contracts

Read the skill's `SKILL.md`, `references/RENDERING.md`, and `DELIVERY.md` for the full workflow. `project-state.outputMode` is `opaque` (legacy/default), `alpha`, `composite`, or `both` (Alpha + composite). Final evidence is `output/render-result.json` schema 3 `outputs[]`; schema 1/2 remains legacy/unbound. Alpha-only does not require MP4, TTS, captions, or a cover unless explicitly requested. Media hashes, decoded Alpha evidence and genuine human acceptance remain mandatory where applicable.

`composition-manifest.json` describes local plates with explicit fit, source trim seconds, project-frame start/duration, repeat/drop FPS policy, and mute/primary-audio choice. Fixed screen-space overlay is implemented; automatic tracking/segmentation/occlusion is not. Background removal is scoped to overlay roots and explicitly tagged background layers, not all cards or shadows.

Use `timingMode: "explicit"` and exact per-step frame durations for timed silent graphics. Narration-derived timing remains the default. New portrait projects are 1080×1920; existing project dimensions are not auto-migrated.

The scaffold needs Node 20.6+; `--skip-install` only writes files. Approved installation uses the distributed lockfile and `npm ci --ignore-scripts`. Rendering uses an already installed Chrome/Chromium/Edge and fails closed rather than downloading a browser. Default fonts are local/system fallbacks; `fonts.remote.css` preserves the former font imports as an explicit network opt-in, not a default dependency.

`npm run test:contracts` checks pure contract invariants. `npm run measure:stage -- --stage=qa --label=my-check -- <command> <args...>` records actual child-process stage durations in `output/metrics/stage-events.jsonl`; it does not benchmark unrun renders, monitor externally, or activate fix-agent automatically. Delivery packages retain this evidence if present and default to the project output directory, not the user's desktop.

## v3.1 continuity and evidence

The default chapter keeps its three narration entries but now demonstrates persistent objects rather than MAKE/CLAIM text cards. Existing `frame` remains step-local; optional chapter/timeline clocks come from the shared timing source.

Use `workflow:status` for missing/stale evidence and scoped decisions. Schema 3 render receipts bind declared project-local inputs; local provenance is not host authentication. Sparse review samples do not prove continuous playback. Review rendering reuses a bundle/browser within one command; no cross-run bundle cache or measured speedup is asserted.

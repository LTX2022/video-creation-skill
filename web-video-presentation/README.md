
> **离线公开整理候选 / publication review only:** 60 风格源码保留；第三方研究抽帧与转写未附；精选自生成示例见仓库 media 目录。原创代码 MIT 范围已获用户确认；第三方与媒体另按各自许可。当前测试与缺口见 [发布说明](../README.md)。历史记录不等于本次验收。

# Web Video Presentation

Create frame-deterministic Remotion videos from articles, narration, workflows, product behavior, or mechanisms. Also create transparent motion graphics and composite them over authorized live-action footage. Start with [SKILL.md](SKILL.md); read `VERSION` for the release. Updating this package does not install a personal skill.

## Visual scripting

Use the optional [co-writing sheet](references/VISUAL-SCRIPT.md), [single-task brief](templates/script-templates/visual-script-task.md), and [four before/after examples](examples/visual-script/README.md). Facts, visible actions, narration, screen text and production notes stay separate. New examples are unrendered teaching scripts, not product claims or customer acceptance.

## Capabilities

- Article/script → shot plan → chapters → optional TTS and sentence-level subtitles → rendered evidence.
- Multiple design families: workflow elements, product/UI, data stories, causal mechanisms, kinetic typography, spatial/material studies, and live-action graphics. Not every video becomes an isometric machine or a collection of title fades.
- Five preserved profiles: `douyin`, `douyin-laon`, `douyin-skill`, `bilibili`, and `custom`; existing theme assets remain available.
- `outputMode`: `opaque` (MP4), `alpha` (transparent ProRes 4444 MOV), `composite` (flattened footage + graphics MP4), or `both` (alpha + composite, requiring footage).
- Silent, caption-free alpha-only output is valid. New portrait projects default to 1080×1920; existing project dimensions are not silently migrated.
- Optional explicit frame durations via `timingMode: explicit` / `stepTimings`; continuous chapter/timeline clocks preserve object identity across narration steps without changing local-frame semantics.

## Rebuilt preset library

All 56 original IDs now map to executable layouts and deterministic motion across 12 scene families, rather than recoloring one default example. See [preset usage and evidence](references/PRESET-REBUILD.md). Local SVG previews and targeted integration tests are real, but do not imply target-browser/Remotion, NLE or customer acceptance.

## Start

First confirm the execution environment and the customer's independent empty project directory, then the content/output/shot contract and permission to create files. Set both variables to confirmed absolute paths accessible in that environment; the project must be outside the skill installation and other projects. These placeholders are not default destinations:

```bash
SKILL='/absolute/path/to/web-video-presentation'
PROJECT_ROOT='/absolute/customer-confirmed/empty-video-project'
bash "$SKILL/scripts/bootstrap-preflight.sh" --mode=new --project-root "$PROJECT_ROOT" --json
# After authorization, run only the scaffold command matching this project.
bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" --profile=bilibili --subtitles=true --skip-install
# Alternative for a separately selected empty alpha-only project; do not rerun on the project above:
# bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" --profile=custom --format=portrait --output-mode=alpha --skip-install
```

To continue an existing project, use the read-only `--mode=resume` check in [WORKSPACE-SETUP](references/WORKSPACE-SETUP.md), not scaffold.

`--skip-install` generates files without installing packages. See [dependencies](references/DEPENDENCIES.md), then follow the project’s actual package scripts. Validate one representative chapter/shot before expanding; reuse choices already supplied by the user rather than asking again.

## Evidence and limits

Built-in compositing supports local footage with explicit screen-space placement, trim, fit, frame-rate sampling and audio choices. Tracking, occlusion and rotoscoping require dedicated implementation and real evidence. Synthetic test plates are not live-action validation.

An alpha-capable pixel format is not proof of useful transparency. Check decoded pixels, motion and edges over black, white, gray and relevant footage. Target-editor compatibility remains unverified until tested in that editor. Drafts, partial renders and automated pass flags do not substitute for human acceptance.

Final delivery uses schema 3: `outputs[]` bind one current `contentRevision`, with a `renderVariant` per output. Legacy schema 1/2 remains readable but unbound, not current delivery evidence. Every requested output must be included and verified. An alpha-only project need not manufacture an unrelated MP4, narration or cover. See [delivery](DELIVERY.md) for project delivery and the separate skill-release packager.

## Focused references

- [Design casebook](references/MOTION-CASEBOOK.md): author/official sources, useful mechanisms and when not to use them.
- [Workflow elements](references/FLOW-ELEMENTS.md): inspected keyframes/source of the user’s existing 28-second example, not a claim that it was a Remotion project.
- [Mechanism design](references/MECHANISM-DESIGN.md), [web-to-video adaptation](references/WEB-TO-VIDEO.md).
- [Alpha](references/ALPHA-COMPOSITING.md), [live-action overlays](references/LIVE-ACTION-OVERLAYS.md), [rendering](references/RENDERING.md), [quality gates](references/QUALITY-GATE.md).
- [Audio](references/AUDIO.md), [themes](references/THEMES.md), [handoff](references/TRANSFER.md).

Historical incident notes and execution plans remain for traceability, not as mandatory production reading. Third-party examples are summarized and linked; historical research media are excluded; remaining source provenance still requires owner review. No promises of revenue, platform approval or universal editor compatibility.

## v3.4 optional motion direction and mechanisms

See [motion direction](references/MOTION-DIRECTION.md), [motion craft](references/MOTION-CRAFT.md) and [source decisions](references/UPSTREAM-MOTION-SOURCES.md). Pure-frame contour/material helpers are opt-in; existing presets and output routes are unchanged. Structural checks are not visual or customer acceptance. No third-party repository was installed or executed.

## v3.5 reference-derived scenes

The current catalog preserves 56 legacy IDs and retains 4 independently authored scenes. The rejected ink-landscape-film scene was removed in v3.5.1. See references/REFERENCE-STYLES.md for actual entry points, intended content, and compositing limits. Reference research, executable style, pixel review, target renderer and customer approval are separate statuses.

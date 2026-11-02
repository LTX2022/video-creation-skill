> **历史记录（非当前执行规范）**：保留当时问题、假设、计划和旧命令供追溯，不默认加载，不直接执行其中升级/安装/删除指令。当前制作从 [SKILL](../SKILL.md) 路由；Alpha、格式、QA、交付规则已在各专项文档实际修订。文内旧版本与旧路径不表示当前环境。

# Incident Lessons

Historical incident analysis only. The imperative wording and commands below describe the old workflow; use current SKILL routes and FEEDBACK-EVIDENCE, not these archived approval commands.

## Resume Rule

After any resumed / compacted / inherited session, inspect current state before changing files:

```bash
test -f project-state.json && cat project-state.json
test -f feedback-events.jsonl && tail -n 30 feedback-events.jsonl
test -f shot-manifest.json && cat shot-manifest.json
test -f output/golden/manifest.json && cat output/golden/manifest.json
test -f output/render-result.json && cat output/render-result.json
```

Do not continue development or render final MP4 if checkpoint plan, full shot design confirmation, first chapter acceptance, subtitle preview verification when enabled, golden-frame evidence, or final render approval is missing.

## Render-Preview Mismatch Rule

Do not assume browser preview and final MP4 are identical just because the code path is Remotion-first. The same composition can still diverge when CSS uses renderer-sensitive compositor effects.

Forbidden render-bound patterns:

- `backdrop-filter`
- `-webkit-backdrop-filter`
- `mask-image`
- `-webkit-mask-image`
- non-`normal` `mix-blend-mode`
- full-frame pseudo-element overlays above content
- 3D transforms without explicit perspective

`npm run preflight` must block these. Fix them with deterministic surfaces, SVG geometry, explicit opacity, frame-driven motion, or actual assets.

## Sub-Agent Visual Fix Rule

A sub-agent or secondary agent may suggest a visual fix, but the main workflow cannot report success until the project has been verified after the patch:

```bash
npm run preflight
npm run render:golden:fast
```

If the patch affects timing, audio, subtitle placement, or final video encoding:

```bash
npm run render:smoke
```

Record the fix and validation evidence with:

```bash
npm run feedback -- --type=visual-change --resolution=accepted --summary="..."
npm run feedback -- --type=gate-result --resolution=accepted --summary="preflight + golden passed"
```

## Format Metadata Rule

The chosen format is project state, not a casual note. These must agree:

- `project-state.json.videoFormat`
- `src/config/videoFormat.ts`
- `shot-manifest.json.format`
- any external plan / delivery note still used by the agent

If an old plan says landscape but the project is portrait, the old plan is stale and must not drive work.

## Final Artifact Rule

Formal final render requires:

- accepted `project-state.json` gates
- passing `npm run preflight`
- golden frames shown to user
- successful `npm run render:video` or `npm run render:video:subtitles`
- `output/render-result.json` with SHA256

An MP4 without SHA256 and render metadata is a draft.

## Browser Boundary Rule

Do not download, install, uninstall, or replace Chrome / Chromium / Edge without user approval. Use an already installed browser with `--browser-executable` when possible. If the machine lacks a suitable browser, ask the user before changing system-level state.

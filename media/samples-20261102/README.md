# Bilingual original samples · 2026-11-02

Three concepts, separately rendered in English and Chinese: product workflow (`product`), illustrative data explanation (`data`), and kinetic typography (`type`). Each MP4 is 12 seconds, 1920×1080, 30 fps, 360 frames, H.264/yuv420p and silent. The GIFs are 480-pixel, 8 fps silent previews of the corresponding full MP4—not embedded MP4 players.

## Production and verification

These are real encoded videos made from original React/SVG components using **React server rendering → librsvg/Cairo → FFmpeg**. Noto Sans CJK SC was used from locally installed fonts; no font binaries are included. This explicitly supplementary offline route did **not** validate the Remotion browser renderer. The separate browser attempt was blocked by local browser startup restrictions; no failed browser output or superseded sample is included here.

All six MP4s passed full decoding and metadata checks. Eight decoded frames per clip were visually inspected; selected layout details were inspected at full resolution and corrected before rerendering. This is sampled visual review, **not** real-time full playback, user acceptance, or proof of the complete Skill production workflow. Exact hashes, properties and review scope: [verification.json](verification.json).

The data sample uses an illustrative 80-to-50-minute change: 30 minutes / 37.5%, not real product performance. The product example is a fictional UI animation with no live services. These 12-second demos are not the README's 15-second first-video exercise and are not additional installed themes.

## Source and rights

[English component snapshot](source/SamplesEnglish.tsx), [Chinese component snapshot](source/Samples.tsx), and [shared design tokens](source/tokens.css) are included for inspection. The components came from a project scaffolded with Skill 3.6.0. They expect the project's chapter-props type and React environment; these snapshots alone are **not a standalone, tested reproduction package**. No claim is made that this media folder can render without the original project and dependencies.

Original code and media have different licensing boundaries; see [license scope](../../LICENSE-SCOPE.md), [third-party notices](../../THIRD_PARTY_NOTICES.md), and [media rights](../README.md). Public viewing does not automatically license media for commercial reuse or redistribution.

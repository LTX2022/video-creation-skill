# Legacy Recording Route

This skill is Remotion-first. Default delivery is:

```bash
npm run render:studio
npm run render:golden
npm run render:smoke
npm run render:video
```

Do not use browser screen recording as the normal production path. Screen recording is only a special fallback when the user explicitly asks for a live browser capture, an interactive demo capture, or a non-Remotion artifact.

## When Recording Is Allowed

- The user explicitly requests screen recording instead of Remotion render.
- The target contains interactive behavior that cannot be represented in the Remotion timeline.
- A client asks for an operational demo of the browser environment, not a clean MP4 render.

## Required Warning

Before recording, tell the user:

> This is a legacy fallback. The default enterprise path is Remotion render, because Studio preview, golden frames, subtitles, and MP4 output share the same composition and timing manifest.

## Preferred Replacement

Use Remotion Studio for browser preview:

```bash
npm run render:studio
```

Use Remotion renderer for MP4:

```bash
npm run render:video
npm run render:video:subtitles
```

If playback or subtitle timing feels wrong, fix `narrations.ts`, `timing-manifest.json`, `subtitleCues`, and the step split. Do not stretch timing later in a recorder or editor as the primary fix.

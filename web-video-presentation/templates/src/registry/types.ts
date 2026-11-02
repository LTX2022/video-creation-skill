import type { ComponentType } from "react";
import type { ChapterStepTiming } from "../video/continuity-clock";

export interface ChapterStepProps {
  step: number; // 0..(narrations.length - 1)
  /**
   * Frame data shared by Remotion Studio preview, golden frames, and final render. Chapter animation
   * should prefer src/video/motion.ts helpers over CSS animation/transition so
   * previews, golden frames, and final MP4 all follow the same timeline.
   */
  /** Legacy, step-local frame. It still resets to zero at each narration step. */
  frame?: number;
  /** Legacy, current step duration, not chapter duration. */
  durationInFrames?: number;
  /** Root supplies chapter scope. Missing means a legacy/manual step-only preview. */
  clockScope?: "chapter" | "step";
  timelineFrame?: number;
  chapterFrame?: number;
  chapterStartFrame?: number;
  chapterDurationInFrames?: number;
  /** Actual render steps with chapter-local starts; use for named visual event bindings. */
  chapterStepTimings?: readonly ChapterStepTiming[];
  /** 透明叠加层章节（ProRes alpha / 博主镜头）。见 project-state.json overlayChapterIds */
  isOverlay?: boolean;
  /** Effective subtitle visibility from the current output route, including render overrides. */
  subtitleVisible?: boolean;
}

/**
 * One narration entry — the spoken text for that step.
 *
 * Empty string ("") means "no audio for this step" (e.g. silent transition
 * shot). Auto mode falls back to a short estimate when audio is missing or
 * the text is empty.
 */
export type Narration = string;

export interface ChapterDef {
  id: string;
  title: string;
  /**
   * Per-step narration text. **Length === total steps in this chapter.**
   * This is the single source of truth for step count and audio synthesis.
   */
  narrations: Narration[];
  Component: ComponentType<ChapterStepProps>;
}

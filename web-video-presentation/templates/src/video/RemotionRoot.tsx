import { ObjectHandoffPreview } from '../examples/object-handoff/ObjectHandoff';
import { Audio, Composition, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FlowContinuityPreview, FlowContinuityAlphaPreview } from "../examples/flow-continuity/FlowContinuity";
import { clockAtStep } from "./continuity-clock";
import { buildRenderSchedule } from "./render-schedule";
import { MechanismDemo } from "../examples/mechanism-demo/MechanismDemo";
import { PlateLayer } from "./PlateLayer";
import { TransparentFix } from "../components/TransparentFix";
import { Subtitle } from "../components/Subtitle";
import { VIDEO_FORMAT } from "../config/videoFormat";
import { CHAPTERS } from "../registry/chapters";
import type { ChapterDef } from "../registry/types";
import projectState from "../../project-state.json";
import { techniquePreviews } from "./TechniquePreviews";
import "../styles/fonts.css";
// Defaults first, theme identity second, render-only chrome overrides last.
import "../styles/base.css";
import "../styles/tokens.css";
import "../styles/animations.css";
import "./render.css";
import { STEP_TIMINGS, type RenderStepTiming } from "./render-timing.generated";

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_STEP_FRAMES = Math.round(VIDEO_FORMAT.fps * 3);
const SUBTITLES_REQUESTED = Boolean((projectState as { subtitlesRequested?: boolean }).subtitlesRequested);
const OVERLAY_CHAPTER_IDS = new Set(
  (
    (projectState as { overlayChapterIds?: string[] }).overlayChapterIds
    ?? []
  ).filter((item): item is string => typeof item === "string" && item.trim().length > 0),
);
const SHOW_SUBTITLES =
  process.env.REMOTION_SUBTITLES === "0"
    ? false
    : process.env.REMOTION_SUBTITLES === "1" || process.env.REMOTION_CAPTIONS === "1" || SUBTITLES_REQUESTED;

function fallbackTimings(): RenderStepTiming[] {
  const steps: RenderStepTiming[] = [];
  let cursor = 0;
  for (const chapter of CHAPTERS) {
    for (let i = 0; i < chapter.narrations.length; i++) {
      const text = chapter.narrations[i] ?? "";
      steps.push({
        chapter: chapter.id,
        stepIndex: i,
        startFrame: cursor,
        durationInFrames: DEFAULT_STEP_FRAMES,
        text,
        subtitleChunks: [],
        subtitleCues: [],
        audio: (projectState.audioRequested && text.trim()) ? `audio/${chapter.id}/${i + 1}.mp3` : null,
      });
      cursor += DEFAULT_STEP_FRAMES;
    }
  }
  return steps;
}

const STEPS = STEP_TIMINGS.length > 0 ? STEP_TIMINGS : fallbackTimings();
const { chapterTimingIndex: CHAPTER_TIMING_INDEX, totalFrames: TOTAL_FRAMES } =
  buildRenderSchedule(STEPS, DEFAULT_STEP_FRAMES);

function chapterFor(step: RenderStepTiming): ChapterDef {
  const chapter = CHAPTERS.find((item) => item.id === step.chapter);
  if (!chapter) {
    throw new Error(`Unknown chapter in render timing: ${step.chapter}`);
  }
  return chapter;
}

function StepContent({
  chapter,
  timing,
}: {
  chapter: ChapterDef;
  timing: RenderStepTiming;
}) {
  const frame = useCurrentFrame();
  const Component = chapter.Component;
  const clock = clockAtStep(timing, frame, CHAPTER_TIMING_INDEX);
  const elapsedMs = (frame / VIDEO_FORMAT.fps) * 1000;
  const durationMs = (timing.durationInFrames / VIDEO_FORMAT.fps) * 1000;

  return (
    <>
      {projectState.audioRequested && timing.audio ? <Audio src={staticFile(timing.audio)} /> : null}
      <div className="scene">
        <Component
          step={timing.stepIndex}
          {...clock}
          isOverlay={false}
          subtitleVisible={SHOW_SUBTITLES}
        />
        <Subtitle
          text={timing.text}
          cues={timing.subtitleCues}
          elapsedMs={elapsedMs}
          durationMs={durationMs}
          visible={SHOW_SUBTITLES}
        />
      </div>
    </>
  );
}

function AlphaStep({
  chapter,
  timing,
  subtitles = false,
}: {
  chapter: ChapterDef;
  timing: RenderStepTiming;
  subtitles?: boolean;
}) {
  const frame = useCurrentFrame();
  const Component = chapter.Component;
  const clock = clockAtStep(timing, frame, CHAPTER_TIMING_INDEX);
  const isOverlay = true; // Every alpha/composite chapter must honor the overlay contract.
  return (
    <div className="scene">
      <Component
        step={timing.stepIndex}
        {...clock}
        isOverlay={isOverlay}
        subtitleVisible={subtitles && SHOW_SUBTITLES}
      />
      {subtitles ? <Subtitle text={timing.text} cues={timing.subtitleCues} elapsedMs={frame / VIDEO_FORMAT.fps * 1000} durationMs={timing.durationInFrames / VIDEO_FORMAT.fps * 1000} visible={SHOW_SUBTITLES} /> : null}
    </div>
  );
}

function FullVideo() {
  return (
    <div
      className="stage-frame render-stage"
      data-format={VIDEO_FORMAT.id}
      data-aspect={VIDEO_FORMAT.aspect}
      style={{ width: VIDEO_FORMAT.width, height: VIDEO_FORMAT.height }}
    >
      {STEPS.map((timing) => {
        const chapter = chapterFor(timing);
        return (
          <Sequence
            key={`${timing.chapter}-${timing.stepIndex}`}
            from={timing.startFrame}
            durationInFrames={timing.durationInFrames}
          >
            <StepContent chapter={chapter} timing={timing} />
          </Sequence>
        );
      })}
    </div>
  );
}

function AlphaVideo({ composite = false }: { composite?: boolean }) {
  return (
    <div
      className="stage-frame render-stage"
      data-output-mode={composite ? "composite" : "alpha"}
      data-format={VIDEO_FORMAT.id}
      data-aspect={VIDEO_FORMAT.aspect}
      style={{ width: VIDEO_FORMAT.width, height: VIDEO_FORMAT.height }}
    >
      <TransparentFix />
      {composite ? <PlateLayer /> : null}
      {STEPS.map((timing) => {
        const chapter = chapterFor(timing);
        return (
          <Sequence
            key={`alpha-${timing.chapter}-${timing.stepIndex}`}
            from={timing.startFrame}
            durationInFrames={timing.durationInFrames}
          >
            <AlphaStep chapter={chapter} timing={timing} subtitles={composite} />
            {composite && projectState.audioRequested && timing.audio ? <Audio src={staticFile(timing.audio)} /> : null}
          </Sequence>
        );
      })}
    </div>
  );
}

function CompositeVideo() { return <AlphaVideo composite />; }

function MechanismAlphaPreview() {
  return <div className="stage-frame render-stage" data-output-mode="alpha" style={{ width: '100%', height: '100%' }}>
    <TransparentFix /><MechanismDemo transparent showLabels={false} />
  </div>;
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="full-video"
        component={FullVideo}
        fps={VIDEO_FORMAT.fps}
        durationInFrames={TOTAL_FRAMES}
        width={VIDEO_FORMAT.width}
        height={VIDEO_FORMAT.height}
      />
      <Composition
        id="full-video-alpha"
        component={AlphaVideo}
        fps={VIDEO_FORMAT.fps}
        durationInFrames={TOTAL_FRAMES}
        width={VIDEO_FORMAT.width}
        height={VIDEO_FORMAT.height}
      />
      <Composition id="full-video-composite" component={CompositeVideo} fps={VIDEO_FORMAT.fps}
        durationInFrames={TOTAL_FRAMES} width={VIDEO_FORMAT.width} height={VIDEO_FORMAT.height} />
      <Composition id="object-handoff" component={ObjectHandoffPreview} defaultProps={{motionBlur:false,isOverlay:false}} fps={30} durationInFrames={300} width={1200} height={680} />
      <Composition id="object-handoff-blur" component={ObjectHandoffPreview} defaultProps={{motionBlur:true,isOverlay:false}} fps={30} durationInFrames={300} width={1200} height={680} />
      <Composition id="flow-continuity" component={FlowContinuityPreview} fps={30} durationInFrames={300} width={1200} height={680} />
      <Composition id="flow-continuity-alpha" component={FlowContinuityAlphaPreview} fps={30} durationInFrames={300} width={1200} height={680} />
      <Composition id="mechanism-demo" component={MechanismDemo} fps={30} durationInFrames={240} width={1280} height={720} />
      <Composition id="mechanism-demo-alpha" component={MechanismAlphaPreview} fps={30} durationInFrames={240} width={1280} height={720} />
      {/* Technique Previews — 12 个技法族可视化预览（行业领先功能）
          在 Studio 左侧选择 technique-01-fade ~ technique-12-glass 直接预览动画效果。
          Agent 选 motionTechnique 时看效果而非读文字。 */}
      {techniquePreviews.map((tp) => (
        <Composition
          key={tp.id}
          id={tp.id}
          component={tp.component}
          fps={60}
          durationInFrames={90}
          width={480}
          height={270}
        />
      ))}
    </>
  );
}

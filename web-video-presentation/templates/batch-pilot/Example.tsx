import type { ChapterStepProps } from '../../registry/types';
import { VIDEO_FORMAT } from '../../config/videoFormat';
import { THEME_PRESET_ID } from '../../config/themePreset';
import { PresetScene } from '../../video/presets/PresetScene';
import { batchContent } from './batch-content';
import './Example.css';

/** Production theme selection now chooses layout, objects and motion, not just a backdrop. */
export default function ExampleChapter(props: ChapterStepProps) {
  if (props.step < 0 || props.step > 2) return null;
  const continuous=props.clockScope==='chapter'&&props.chapterFrame!==undefined&&props.chapterStepTimings!==undefined;
  const localDuration=Math.max(1,props.durationInFrames??VIDEO_FORMAT.fps*3);
  // Legacy/manual preview is an explicit semantic single-step illustration, not a claim about preceding narration lengths.
  const previewDuration=300;
  const previewFrame=props.step*100+Math.min(99,Math.max(0,(props.frame??0)/localDuration*100));
  return <div className="ex-preset" data-clock-scope={continuous?'chapter':'step-illustration'}>
    <PresetScene presetId={THEME_PRESET_ID} content={{title:batchContent.title}} frame={continuous?props.chapterFrame!:previewFrame}
      durationInFrames={continuous?props.chapterDurationInFrames??previewDuration:previewDuration}
      chapterStepTimings={continuous?props.chapterStepTimings:undefined}
      fps={VIDEO_FORMAT.fps} width={VIDEO_FORMAT.width} height={VIDEO_FORMAT.height}
      isOverlay={props.isOverlay} subtitleVisible={false}/>
  </div>;
}

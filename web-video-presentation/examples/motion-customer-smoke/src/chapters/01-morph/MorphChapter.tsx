import type {ChapterStepProps} from '../../registry/types';
import {MaterialShape} from '../../video/mechanisms';
import {stateAtFrame} from './model';
export default function MorphChapter(props: ChapterStepProps) {
  const frame = props.clockScope === 'chapter' && props.chapterFrame !== undefined ? props.chapterFrame : (props.frame ?? 0);
  const state = stateAtFrame(frame);
  return <svg width="100%" height="100%" viewBox="0 0 960 540" role="img" aria-label="One continuous token changes shape and graphic treatment" data-customer-shot="single-token" data-chapter-frame={frame}>
    <MaterialShape {...state} instanceId="customer-film-main-token" strokeWidth={5}/>
  </svg>;
}

import {bindChapterEvents, progressAt, type ChapterStepTiming} from '../../video/continuity-clock';
import {compileObjectTrack, objectAt} from '../../video/object-track';

/** Three actual narration steps are anchors, not three independent scene durations. */
export function handoffModel(steps: readonly ChapterStepTiming[]) {
  const events = bindChapterEvents(steps, {
    gather: {start:{step:0,at:0.12},end:{step:0,at:0.82}},
    dock: {start:{step:0,at:0.88},end:{step:1,at:0.72}},
    focus: {start:{step:1,at:0.78},end:{step:2,at:0.55}},
    hold: {start:{step:2,at:0.55},end:{step:2,at:1}},
  });
  const core = compileObjectTrack({objectId:'product-core', initial:{x:210,y:320,size:54,rotation:-0.3,charge:0},actions:[
    {event:'gather',to:{size:82,rotation:0,charge:1}},
    {event:'dock',to:{x:670,y:320,size:70}},
    {event:'focus',to:{x:600,y:340,size:118}},
  ]},events);
  return (chapterFrame:number) => ({
    core:objectAt(core,chapterFrame),
    // Stage and readout derive from the exact same named events as the object.
    docking:progressAt(chapterFrame,events.dock),
    focus:progressAt(chapterFrame,events.focus),
    holding:chapterFrame>=events.hold.startFrame,
  });
}
export type HandoffState = ReturnType<ReturnType<typeof handoffModel>>;

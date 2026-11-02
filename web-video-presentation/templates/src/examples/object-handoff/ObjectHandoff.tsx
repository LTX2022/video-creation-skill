import {HANDOFF_PREVIEW_STEPS as STEPS} from './preview-timing';
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import type {ChapterStepProps} from '../../registry/types';
import {buildChapterTimingIndex,clockAtStep} from '../../video/continuity-clock';
import {renderTemporalCanvas} from '../../video/temporal-sampling';
import {handoffModel} from './model';
import {drawHandoff} from './draw';

/** Optional chapter adapter. Never estimates preceding narration lengths or invents another clock. */
export function ObjectHandoffChapter(props:ChapterStepProps & {motionBlur?:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 const {width,height}=useVideoConfig();
 if(props.clockScope!=='chapter'||props.chapterFrame===undefined||!props.chapterStepTimings||!props.chapterDurationInFrames) {
   throw new Error('ObjectHandoffChapter requires actual chapter clock/timing from RemotionRoot');
 }
 const model=useMemo(()=>handoffModel(props.chapterStepTimings!),[props.chapterStepTimings]);
 useLayoutEffect(()=>{
   if(!canvas.current)return;
   const result=renderTemporalCanvas(canvas.current,(ctx,f)=>drawHandoff(ctx,model(f),width,height,props.isOverlay),props.chapterFrame!,{
     durationInFrames:props.chapterDurationInFrames!,enabled:props.motionBlur??false,samples:5,shutterFraction:0.5,
   });
   canvas.current.dataset.temporalMode=result.mode;
   canvas.current.dataset.temporalReason=result.reason;
 },[model,width,height,props.chapterFrame,props.chapterDurationInFrames,props.isOverlay,props.motionBlur]);
 return <canvas ref={canvas} width={width} height={height} data-object-id="product-core" style={{width:'100%',height:'100%'}}/>;
}

// Teaching preview only. Real projects receive their generated STEPS through the adapter above.
const INDEX=buildChapterTimingIndex(STEPS);
export function ObjectHandoffPreview({motionBlur=false,isOverlay=false}:{motionBlur?:boolean;isOverlay?:boolean}) {
 const frame=useCurrentFrame();
 const step=STEPS.find(s=>frame<s.startFrame+s.durationInFrames)??STEPS[2]!;
 return <ObjectHandoffChapter step={step.stepIndex} {...clockAtStep(step,frame-step.startFrame,INDEX)} motionBlur={motionBlur} isOverlay={isOverlay}/>;
}

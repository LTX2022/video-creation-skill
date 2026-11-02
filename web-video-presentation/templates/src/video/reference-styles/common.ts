import type {PresetContent} from '../presets/types';
import type {ChapterStepTiming} from '../continuity-clock';
export interface ReferenceStyleProps {
 frame:number; fps:number; durationInFrames:number; width:number; height:number;
 content:PresetContent; isOverlay?:boolean; subtitleVisible?:boolean;
 chapterStepTimings?:readonly ChapterStepTiming[];
 semanticAnchors?:readonly [number,number];
}
export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const ease=(v:number)=>{const p=clamp(v);return p*p*(3-2*p);};
export const phase=(p:number,start:number,end:number)=>ease((p-start)/(end-start));
export const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
export function seeded(i:number,seed=17){let x=(i+1)*374761393+seed*668265263;x=(x^(x>>>13))*1274126177;return ((x^(x>>>16))>>>0)/4294967296;}
export function progress(props:ReferenceStyleProps){
 const last=Math.max(1,props.durationInFrames-1), f=clamp(props.frame,0,last);
 const steps=props.chapterStepTimings;
 if(!steps||steps.length===0)return f/last;
 if(steps.length!==3)throw new RangeError('Reference styles use three authored narrative steps; update the timing adapter for a different step plan');
 let next=0;
 for(let i=0;i<steps.length;i++){
  const s=steps[i]!;
  if(s.stepIndex!==i||!Number.isInteger(s.startFrame)||!Number.isInteger(s.durationInFrames)||s.durationInFrames<1||s.startFrame!==next)throw new RangeError('Reference style timings must be contiguous chapter-local steps');
  next=s.startFrame+s.durationInFrames;
 }
 if(next!==props.durationInFrames)throw new RangeError('Reference style chapter timing does not match duration');
 if(!props.semanticAnchors)throw new RangeError('Explicit authored semantic anchors are required with chapter step timings; use ReferenceScene adapter');
 const [a,b]=props.semanticAnchors;
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b>=1||a>=b)throw new RangeError('Invalid semantic anchors');
 const s1=steps[1]!.startFrame,s2=steps[2]!.startFrame;
 if(f>=last)return 1;
 if(f<=s1)return a*f/s1;
 if(f<=s2)return mix(a,b,(f-s1)/(s2-s1));
 return mix(b,1,(f-s2)/Math.max(1,last-s2));
}
export const serif='"Noto Serif CJK SC", "Songti SC", Georgia, serif';
export const sans='"Noto Sans CJK SC", "PingFang SC", Arial, sans-serif';

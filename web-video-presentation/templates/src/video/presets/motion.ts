import type { ChapterStepTiming } from '../continuity-clock';
import type { PresetMotion, ThemePresetSpec } from './types';

const clamp = (p: number) => Math.max(0,Math.min(1,p));
const ease = (p: number) => { const q=clamp(p); return q*q*(3-2*q); };
/** FPS is explicit, while semantic events bind to actual chapter step boundaries when supplied. */
export function presetMotion(spec: ThemePresetSpec, frame: number, durationInFrames: number, fps: number, steps?: readonly ChapterStepTiming[]): PresetMotion {
  if (!Number.isFinite(frame) || !Number.isFinite(durationInFrames) || durationInFrames < 1 || !Number.isFinite(fps) || fps <= 0) throw new RangeError('Preset motion needs finite frame, positive duration and fps');
  const last = Math.max(1,durationInFrames-1);
  const f = Math.max(0,Math.min(last,frame));
  let setupEnd = last*spec.motion.setupEnd;
  let transformStart = setupEnd*.68;
  let transformEnd = last*spec.motion.transformEnd;
  if (steps && steps.length >= 3) {
    const first=steps[0]!,second=steps[1]!,third=steps[2]!;
    if (![first,second,third].every(s=>Number.isFinite(s.startFrame)&&Number.isFinite(s.durationInFrames)&&s.durationInFrames>0)) throw new RangeError('Invalid chapter event timing');
    setupEnd=Math.max(1,first.startFrame+first.durationInFrames*(.65+spec.motion.setupEnd));
    transformStart=second.startFrame+second.durationInFrames*.04;
    transformEnd=Math.min(last,third.startFrame+third.durationInFrames*Math.max(.08,spec.motion.transformEnd-.58));
  }
  setupEnd=Math.max(.1,Math.min(last*.8,setupEnd));
  transformStart=Math.max(0,Math.min(last*.82,transformStart));
  transformEnd=Math.max(transformStart+.01,Math.min(last*.95,transformEnd));
  const p=(a:number,b:number)=>clamp((f-a)/Math.max(.001,b-a));
  const drive=(q:number)=>spec.motion.kind==='scan'||spec.motion.kind==='draw'?q:spec.motion.kind==='snap'?1-(1-q)**4:spec.motion.kind==='wipe'?1-(1-q)**3:ease(q);
  return {frame:f,progress:f/last,setup:drive(p(0,setupEnd)),transform:drive(p(transformStart,transformEnd)),
    hold:ease(p(transformEnd,last)),phase:f>=transformEnd?'hold':f>=transformStart?'transform':'setup',
    events:{setupEnd,transformStart,transformEnd,holdStart:transformEnd}};
}
export function itemProgress(progress: number, index: number, count: number, stagger: number): number {
  const lag = Math.min(.75, Math.max(0,stagger)*Math.max(0,count-1));
  return ease((progress - Math.max(0,index)*Math.max(0,stagger))/Math.max(.1,1-lag));
}

#!/usr/bin/env node
// Read-only teaching probe, no dependencies. For production use actual Root chapter props.
import './register-ts-runtime.mjs';
const {buildChapterTimingIndex}=await import('../templates/src/video/continuity-clock.ts');
const {handoffModel}=await import('../templates/src/examples/object-handoff/model.ts');
const {HANDOFF_PREVIEW_STEPS}=await import('../templates/src/examples/object-handoff/preview-timing.ts');
const arg=process.argv.slice(2);
if(arg.length>1||(arg[0]&&!arg[0].startsWith('--frames=')))throw new Error('Usage: node scripts/probe-object-handoff.mjs --frames=0,79,80,120.5,210,299');
const frames=(arg[0]?.slice(9)??'0,79,80,120.5,210,299').split(',').map(Number);
if(!frames.length||frames.some(f=>!Number.isFinite(f)||f<0||f>=300))throw new Error('Preview frame must be finite within 0..299.999');
const clock=buildChapterTimingIndex(HANDOFF_PREVIEW_STEPS).get('handoff-preview');
const model=handoffModel(clock.chapterStepTimings);
console.log(JSON.stringify({kind:'teaching-model-probe',notAnAcceptanceRecord:true,timingSource:'preview-timing.ts (teaching only)',samples:frames.map(frame=>({frame,...model(frame)}))},null,2));

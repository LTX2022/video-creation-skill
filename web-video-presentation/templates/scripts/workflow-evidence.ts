/** Read-only decision evaluation. Local provenance is a declaration, NOT host/user authentication. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { captureInputRevision, contentState, digestValue, hashLocalFile, readLocalJson, safeLocalPath, type InputRevision } from './input-revision';
import { finalOutputs, outputKinds, outputMode, OUTPUTS, isDouyinProfile } from './delivery-contract';
import { audioSourceErrors, resolveAudioSource, PROVIDED_AUDIO_MANIFEST } from './audio-source';

export type Decision = 'accepted' | 'rejected' | 'revoked';
export interface DecisionSubject { gate: string; scope: string; digest: string; contentRevision?: string; bindingPolicy?: 'structured-chapter'|'conservative-global-design'; artifacts?: Array<{path:string;sha256:string}> }
export interface DecisionSource { kind: 'agent-transcribed' | 'user-supplied' | 'synthetic'; reference: string | null; declaration: string }
export const HUMAN_DECISIONS = new Set(['accepted','rejected','revoked']);
export function readFeedbackEvents(root = process.cwd()): any[] {
  const path = 'feedback-events.jsonl';
  if (!existsSync(resolve(root,path))) return [];
  return readFileSync(safeLocalPath(root,path),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter((line) => line.trim()).map((line,index) => {
    try { return JSON.parse(line); } catch { return { parseError: true, line: index + 1 }; }
  });
}
function fileIdentity(root:string, path:string, required=true): {path:string;sha256:string} | null {
  if (!existsSync(resolve(root,path))) { if (required) throw new Error(`Missing decision subject: ${path}`); return null; }
  if (path.endsWith('.json')) {
    const value=readLocalJson(root,path); delete value.generatedAt; delete value.updatedAt;
    return {path,sha256:digestValue(value)};
  }
  return {path,sha256:hashLocalFile(root,path)};
}
const DESIGN_STEP_KEYS=['chapter','step','scriptText','claim','visualModel','compositionModel','visualRecipe','motionStyle','motionTechnique','source','motionIntent','onScreenText','allowSubtitleOverlap','overlapReason','assets','visualStages','referenceVideo','referenceVideoStyle','designConstraints'];
/** Intended content, not QA completion flags/evidence/finishLevel or measured coverage. */
export function shotDesignProjection(manifest:any,chapter?:string):any {
  return {format:manifest.format,coordinateSpace:manifest.coordinateSpace,theme:manifest.theme,globalConstraints:manifest.globalConstraints,
    steps:(manifest.steps??[]).filter((step:any)=>!chapter||step.chapter===chapter).map((step:any)=>Object.fromEntries(DESIGN_STEP_KEYS.filter(key=>step[key]!==undefined).map(key=>[key,step[key]])))};
}
function designManifestIdentity(root:string):any {
  if(!existsSync(resolve(root,'shot-manifest.json')))return null;
  return {path:'shot-manifest.json#design',sha256:digestValue(shotDesignProjection(readLocalJson(root,'shot-manifest.json')))};
}
function planState(state:any) {
  const value=contentState(state); delete value.ttsProvider; delete value.ttsVoice; delete value.overlayChapterIds; delete value.stepTimings;
  // Development authorization changes the review contract, not rendered pixels.
  // Bind it to both project decisions rather than an unapproved legacy flag.
  return {...value,audioSource:resolveAudioSource(state),developmentMode:state.developmentMode??'sequential'};
}
function providedAudioPlanIdentity(root:string,state:any):Array<{path:string;sha256:string}> {
  return resolveAudioSource(state)==='provided'?[fileIdentity(root,PROVIDED_AUDIO_MANIFEST)!]:[];
}
export const DEVELOPMENT_MODES = new Set(['sequential','batch-after-anchor','parallel']);
/** Pure policy selection. Callers must derive accepted statuses from current scoped decisions. */
export function requiredChapterReviewIds(ids:string[],mode:unknown,planStatus:string,designStatus:string):string[] {
  const approvedBatch=['batch-after-anchor','parallel'].includes(String(mode))&&planStatus==='accepted'&&designStatus==='accepted';
  return approvedBatch?ids.slice(0,1):[...ids];
}
export function chapterDecisionBlocksBatch(review:{status:string;event:any|null}):boolean {
  return ['rejected','revoked','unbound'].includes(review.status)||
    (review.status==='stale'&&['rejected','revoked'].includes(review.event?.decision??review.event?.userResolution));
}
/** Pure parameter routing, shared by feedback CLI and synthetic tests; does not grant approval. */
export function decisionContentState(state:any,type:string,args:Record<string,string>):any {
  const next=JSON.parse(JSON.stringify(state));
  if(type==='checkpoint-plan') {
    const {profile,duration,subtitles}=args;
    if(profile)next.videoProfile=profile;
    if(duration)next.targetDurationSec=duration;
    if(subtitles)next.subtitlesRequested=['true','1','yes'].includes(subtitles);
    next.finalRenderRequired=true;
    // Profiles are defaults, not permission to overwrite already-selected output/audio choices.
    if(outputMode(next.outputMode)==='opaque'&&(isDouyinProfile(profile)||profile==='bilibili')) {
      if(next.videoFormat===undefined)next.videoFormat=isDouyinProfile(profile)?'portrait':'landscape';
      if(next.audioRequested===undefined)next.audioRequested=next.audioSource==='none'?false:true;
      if(isDouyinProfile(profile)&&next.subtitlesRequested===undefined)next.subtitlesRequested=true;
    }
  }
  if(type==='tts-choice') {
    next.audioRequested=true;
    next.audioSource='tts';
    if(args.provider)next.ttsProvider=args.provider;
    if(args.voice)next.ttsVoice=args.voice;
  }
  if(type==='subtitle-change'&&args.requested)next.subtitlesRequested=['true','1','yes'].includes(args.requested);
  return next;
}
export function registeredChapterIds(root=process.cwd()): string[] {
  const path='src/registry/chapters.ts';
  if (!existsSync(resolve(root,path))) return [];
  return [...readFileSync(safeLocalPath(root,path),'utf8').matchAll(/id:\s*["']([^"']+)["']/g)].map((m)=>m[1]!).filter((id)=>id!=='example');
}
export function decisionGate(event:any): string {
  if (event?.subject?.gate) return event.subject.gate;
  if (event?.eventType === 'chapter-anchor' || event?.eventType === 'chapter-review') return 'chapter';
  return String(event?.eventType ?? '');
}
export function subjectForDecision(root:string, type:string, options:{scope?:string;chapter?:string;target?:string;state?:any;revision?:InputRevision}={}): DecisionSubject {
  const state=options.state ?? readLocalJson(root,'project-state.json');
  const scope=options.scope?.trim();
  if (!scope) throw new Error('Human decisions require an explicit --scope (project, chapter:<id>, or output scope)');
  const chapter=options.chapter;
  const gate=['chapter-review','chapter-anchor'].includes(type)?'chapter':type;
  let identity:any;
  let revision:InputRevision|undefined;
  let artifacts:Array<{path:string;sha256:string}>|undefined;
  let bindingPolicy:DecisionSubject['bindingPolicy'];
  if (gate==='checkpoint-plan') {
    if (scope!=='project') throw new Error('checkpoint-plan scope must be project');
    identity={state:planState(state),files:[...['outline.md','script.md'].map((p)=>fileIdentity(root,p,p==='outline.md')).filter(Boolean),...providedAudioPlanIdentity(root,state)]};
  } else if (gate==='shot-design-review') {
    if (scope!=='project') throw new Error('shot-design-review scope must be project');
    identity={state:planState(state),files:[fileIdentity(root,'outline.md'),fileIdentity(root,'shot-design.md'),designManifestIdentity(root),...providedAudioPlanIdentity(root,state)].filter(Boolean)};
  } else if (gate==='tts-choice') {
    if (scope!=='project') throw new Error('tts-choice scope must be project');
    if (resolveAudioSource(state)!=='tts') throw new Error('TTS choice is only applicable to audioSource=tts; supplied recordings bind their separate source/authorization manifest');
    identity={audioRequested:state.audioRequested,provider:state.ttsProvider,voice:state.ttsVoice};
    if (state.audioRequested && (!state.ttsProvider||!state.ttsVoice)) throw new Error('TTS choice requires provider and provider-internal voice/profile');
  } else {
    revision=options.revision ?? captureInputRevision(root,{state});
    if (revision.status!=='bound'||!revision.contentRevision) throw new Error(`Decision cannot bind unknown inputs: ${revision.issues.join('; ')}`);
    if (gate==='chapter') {
      if (!chapter || scope!==`chapter:${chapter}` || !registeredChapterIds(root).includes(chapter)) throw new Error('chapter review requires a registered --chapter and matching --scope=chapter:<id>');
      const src=readFileSync(safeLocalPath(root,'src/registry/chapters.ts'),'utf8');
      const folders=[...src.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\//g)].map((m)=>m[1]!);
      const folder=folders.find((f)=>f===chapter||f.endsWith(`-${chapter}`));
      if (!folder) throw new Error(`Cannot resolve chapter folder: ${chapter}`);
      // Shared implementation/assets affect every chapter; unrelated chapter sources do not.
      const files=revision.files.filter((f)=>!f.path.startsWith('src/chapters/')||f.path.startsWith(`src/chapters/${folder}/`)).filter((f)=>!['timing-manifest.json','src/video/render-timing.generated.ts','project-state.json#content'].includes(f.path)).map(({path,sha256})=>({path,sha256}));
      const timing=readLocalJson(root,'timing-manifest.json');
      const generated=readFileSync(safeLocalPath(root,'src/video/render-timing.generated.ts'),'utf8');
      const match=generated.match(/export const STEP_TIMINGS: RenderStepTiming\[\] = (\[[\s\S]*?\]);\s*export const TOTAL_FRAMES = \d+;/);
      if (!match) throw new Error('Cannot bind chapter: unsupported generated timing structure');
      const manifest=existsSync(resolve(root,'shot-manifest.json'))?readLocalJson(root,'shot-manifest.json'):null;
      const projected=manifest?shotDesignProjection(manifest,chapter):null;
      bindingPolicy=projected?.steps?.length?'structured-chapter':'conservative-global-design';
      const design=bindingPolicy==='structured-chapter'?projected:fileIdentity(root,'shot-design.md');
      identity={files,state:contentState({...state,stepTimings:(state.stepTimings??[]).filter((s:any)=>s.chapter===chapter)}),timing:{fps:timing.fps,timingMode:timing.timingMode,steps:(timing.steps??[]).filter((s:any)=>s.chapter===chapter)},generated:{logic:generated.replace(match[0],'__TIMING_DATA__'),steps:JSON.parse(match[1]!).filter((s:any)=>s.chapter===chapter)},design,bindingPolicy};
    } else if (gate==='golden-review') {
      if (scope!=='project') throw new Error('golden-review scope must be project');
      const manifest=readLocalJson(root,'output/golden/manifest.json');
      const mode=outputMode(state.outputMode);
      if(manifest.composition!==OUTPUTS[mode==='both'?'composite':mode].composition)throw new Error('Golden preview composition does not match the selected output contract');
      if (manifest.contentRevision!==revision.contentRevision) throw new Error('Golden preview is legacy/unbound or stale; generate current preview first');
      const frames=Array.isArray(manifest.frameFiles)?manifest.frameFiles:[];
      if (!frames.length) throw new Error('Golden preview has no sampled frames');
      artifacts=frames.map((frame:any)=>{ const path=frame.file??frame.output??frame.path; if(typeof path!=='string'||!path.replaceAll('\\','/').startsWith('output/')) throw new Error('Golden frame must be a local output path'); const sha256=hashLocalFile(root,path);if(frame.sha256!==sha256)throw new Error(`Golden frame changed: ${path}`);return {path,sha256}; });
      identity={contentRevision:revision.contentRevision,manifest:fileIdentity(root,'output/golden/manifest.json'),artifacts};
    } else if (gate==='final-review' || gate==='alpha-edge-review') {
      const result=readLocalJson(root,'output/render-result.json');
      if(result.contentRevision!==revision.contentRevision) throw new Error('Final output is legacy/unbound or stale');
      const outputs=finalOutputs(result);
      if (gate==='final-review') {
        if(scope!=='outputs') throw new Error('final-review scope must be outputs');
        if(outputKinds(outputMode(state.outputMode)).some((kind)=>outputs.filter((item)=>item.kind===kind&&item.contentRevision===revision!.contentRevision).length!==1)) throw new Error('Final review requires all selected outputs of the same current revision');
      } else if(scope!=='output:alpha') throw new Error('alpha-edge-review scope must be output:alpha');
      const selected=gate==='alpha-edge-review'?outputs.filter((item)=>item.kind==='alpha'):outputs;
      if(!selected.length) throw new Error('No output to review');
      artifacts=selected.map((item)=>{const sha256=hashLocalFile(root,item.output);if(sha256!==item.sha256)throw new Error(`Changed output: ${item.output}`);return {path:item.output,sha256};});
      if(gate==='alpha-edge-review'&&options.target?.toUpperCase()!==artifacts[0]!.sha256)throw new Error('alpha-edge-review target must match actual alpha SHA256');
      identity={contentRevision:revision.contentRevision,artifacts,variants:selected.map((item)=>item.renderVariant)};
    } else {
      identity={contentRevision:revision.contentRevision,target:options.target??null};
    }
  }
  return {gate,scope,digest:digestValue({schema:1,policy:"3.1.0-local-decision-v1",gate,scope,identity}),...(revision?.contentRevision&&gate!=='chapter'?{contentRevision:revision.contentRevision}:{}),...(artifacts?{artifacts}:{}),...(bindingPolicy?{bindingPolicy}:{})};
}
export function decisionEventErrors(event:any, options:{allowSynthetic?:boolean}={}):string[] {
  const errors:string[]=[];
  if(event?.recordKind!=='user-decision'||!HUMAN_DECISIONS.has(event?.decision)||event.userResolution!==event.decision) errors.push('Not a human decision record');
  if(typeof event?.userQuote!=='string'||!event.userQuote.trim()) errors.push('Human decision requires a nonempty user quote');
  if(!event?.subject?.gate||!event?.subject?.scope||!/^[A-Fa-f0-9]{64}$/.test(String(event.subject.digest??''))) errors.push('Human decision requires explicit target scope and bound subject digest');
  const source=event?.source;
  if(!['agent-transcribed','user-supplied','synthetic'].includes(source?.kind)||typeof source?.declaration!=='string'||!source.declaration.trim()||(source.reference!==null&&typeof source.reference!=='string')) errors.push('Human decision requires source declaration and reference (or explicit null)');
  if(source?.kind==='synthetic'&&!options.allowSynthetic) errors.push('Synthetic fixture decisions are not real user approval');
  return errors;
}
export function latestDecision(events:any[], subject:DecisionSubject, options:{allowSynthetic?:boolean}={}):{status:'accepted'|'rejected'|'revoked'|'missing'|'stale'|'unbound';event:any|null} {
  // Append order is authoritative; caller-supplied/backdated times cannot revive old consent.
  const candidates=events.filter((e)=>decisionGate(e)===subject.gate&&(e?.subject?.scope===subject.scope||(!e?.subject&&((e.chapter&&subject.scope===`chapter:${e.chapter}`)||subject.scope==='project'||subject.scope==='outputs'))));
  for(let i=candidates.length-1;i>=0;i--) {
    const event=candidates[i];
    if(!HUMAN_DECISIONS.has(event?.decision??event?.userResolution))continue;
    if(decisionEventErrors(event,options).length) return {status:'unbound',event};
    if(event.subject.digest!==subject.digest)return {status:'stale',event};
    return {status:event.decision,event};
  }
  return {status:'missing',event:null};
}
export function requiredDecisionChecks(root=process.cwd(), options:{state?:any;includeFinal?:boolean;includeGolden?:boolean;revision?:InputRevision}={}): Array<{gate:string;scope:string;status:string;detail:string}> {
  const state=options.state??readLocalJson(root,'project-state.json'),events=readFeedbackEvents(root);
  const ids=registeredChapterIds(root);
  const developmentMode=state.developmentMode??'sequential';
  const currentProjectDecision=(type:string)=>{try{return latestDecision(events,subjectForDecision(root,type,{scope:'project',state,revision:options.revision})).status;}catch{return 'missing';}};
  const reviewIds=requiredChapterReviewIds(ids,developmentMode,currentProjectDecision('checkpoint-plan'),currentProjectDecision('shot-design-review'));
  // A batch authorization never clears an explicit later rejection/revocation.
  // Keep that chapter blocked even if editing it makes its negative decision stale.
  for(const chapter of ids.filter(id=>!reviewIds.includes(id))) {
    if(!events.some(event=>decisionGate(event)==='chapter'&&(event?.subject?.scope===`chapter:${chapter}`||(!event?.subject&&event.chapter===chapter))&&HUMAN_DECISIONS.has(event.decision??event.userResolution)))continue;
    try {
      const review=latestDecision(events,subjectForDecision(root,'chapter-review',{scope:`chapter:${chapter}`,chapter,state,revision:options.revision}));
      if(chapterDecisionBlocksBatch(review))reviewIds.push(chapter);
    }catch {reviewIds.push(chapter);}
  }
  const specs:Array<{type:string;scope:string;chapter?:string;target?:string}>=[{type:'checkpoint-plan',scope:'project'},{type:'shot-design-review',scope:'project'},...reviewIds.map((chapter)=>({type:'chapter-review',scope:`chapter:${chapter}`,chapter}))];
  if(options.includeGolden!==false)specs.push({type:'golden-review',scope:'project'});
  if(!ids.length)specs.push({type:'chapter-review',scope:'chapter:missing',chapter:'missing'});
  if(state.subtitlesRequested)specs.push({type:'subtitle-change',scope:'project'});
  const sourceErrors=audioSourceErrors(state);
  if(!sourceErrors.length&&resolveAudioSource(state)==='tts')specs.push({type:'tts-choice',scope:'project'});
  if(options.includeFinal) {
    specs.push({type:'final-review',scope:'outputs'});
    if(['alpha','both'].includes(outputMode(state.outputMode))) {
      let target='';try{target=finalOutputs(readLocalJson(root,'output/render-result.json')).find((item)=>item.kind==='alpha')?.sha256??'';}catch{}
      specs.push({type:'alpha-edge-review',scope:'output:alpha',target});
    }
  }
  const checks=specs.map((spec)=>{try{const subject=subjectForDecision(root,spec.type,{...spec,state,revision:options.revision});const result=latestDecision(events,subject);return {gate:subject.gate,scope:subject.scope,status:result.status,detail:result.status==='accepted'?`Current scoped decision recorded (local provenance, not authenticated)${subject.bindingPolicy==='conservative-global-design'?'; conservative whole-design fallback: no structured chapter design':''}`:`Needs current human decision: ${result.status}`};}catch(error){return {gate:spec.type,scope:spec.scope,status:'missing',detail:String((error as Error).message)};}});
  if(!DEVELOPMENT_MODES.has(developmentMode))checks.unshift({gate:'development-mode',scope:'project',status:'unbound',detail:'Unknown developmentMode; select sequential, batch-after-anchor, or parallel and record current project plan/design decisions'});
  for(const detail of sourceErrors)checks.unshift({gate:'audio-source',scope:'project',status:'unbound',detail});
  if(events.some((event)=>event.parseError))checks.unshift({gate:'feedback-log',scope:'project',status:'unbound',detail:'Feedback log contains invalid JSON; repair it before relying on any decision'});
  return checks;
}

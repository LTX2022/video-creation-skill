/** Read-only advisory status. Never approves, renders, rewrites state, or starts the next stage. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureInputRevision, hashLocalFile, readLocalJson, revisionErrors } from './input-revision';
import { contractErrors, finalOutputs } from './delivery-contract';
import { coverDeliveryErrors } from './cover-contract';
import { requiredDecisionChecks, readFeedbackEvents, latestDecision, subjectForDecision } from './workflow-evidence';

export function workflowStatus(root=process.cwd()): any {
  const checks:Array<{stage:string;status:string;detail:string}>=[];
  const evidencePaths:string[]=[];
  const revision=captureInputRevision(root);
  let state:any={};
  try {state=readLocalJson(root,'project-state.json');}catch(error){checks.push({stage:'inputs',status:'missing',detail:String((error as Error).message)});}
  for(const path of ['outline.md','shot-design.md']) {
    if(!existsSync(resolve(root,path)))checks.push({stage:'design',status:'missing',detail:`Create project-local ${path}; parent/unrelated directories are not scanned`});
    else evidencePaths.push(path);
  }
  const events=readFeedbackEvents(root);
  if(events.some((event)=>event.parseError))checks.push({stage:'decisions',status:'unknown',detail:'Feedback log contains invalid JSON; repair the log before relying on decisions'});
  const decisions=requiredDecisionChecks(root,{state,revision});
  for(const decision of decisions) checks.push({stage:decision.gate,status:decision.status==='accepted'?'passed':decision.status==='missing'&&/Missing|Cannot|no |unknown|unsupported|legacy|stale/i.test(decision.detail)?'missing':decision.status==='stale'?'stale':decision.status==='unbound'?'unknown':'blocked-human',detail:`${decision.scope}: ${decision.detail}`});
  if(revision.status!=='bound')checks.push({stage:'inputs',status:'unknown',detail:revision.issues.join('; ')});
  let result:any=null;
  try {
    result=readLocalJson(root,'output/render-result.json');evidencePaths.push('output/render-result.json');
    const errors=contractErrors(state,result,revision);
    for(const output of finalOutputs(result)) {
      try{if(hashLocalFile(root,output.output)!==output.sha256)errors.push(`Changed media bytes: ${output.output}`);}catch(error){errors.push(String((error as Error).message));}
    }
    checks.push({stage:'render',status:errors.length?'stale':'passed',detail:errors.length?errors.join('; '):'All selected outputs bind current inputs and actual media hashes'});
    if(!errors.length) {
      for(const spec of [{type:'final-review',scope:'outputs'},...(finalOutputs(result).some((item)=>item.kind==='alpha')?[{type:'alpha-edge-review',scope:'output:alpha',target:finalOutputs(result).find((item)=>item.kind==='alpha').sha256}]:[])]) {
        try{const decision=latestDecision(events,subjectForDecision(root,spec.type,{...spec,state,revision}));checks.push({stage:spec.type,status:decision.status==='accepted'?'passed':decision.status==='stale'?'stale':'blocked-human',detail:`${spec.scope}: ${decision.status}`});}
        catch(error){checks.push({stage:spec.type,status:'missing',detail:String((error as Error).message)});}
      }
    }
  }catch(error){checks.push({stage:'render',status:'missing',detail:String((error as Error).message)});}
  try {
    const validation=readLocalJson(root,'output/delivery-validation.json');evidencePaths.push('output/delivery-validation.json');
    const errors=revisionErrors(revision,validation);
    for(const item of finalOutputs(result))if(validation.mediaHashes?.[item.output]!==item.sha256)errors.push(`Validation media hash differs: ${item.output}`);
    checks.push({stage:'delivery-validation',status:errors.length?'stale':validation.pass===true?'passed':'failed',detail:errors.length?errors.join('; '):validation.pass===true?'Existing technical report passed; this status command did not rerun QA':'Existing technical report failed'});
  }catch(error){checks.push({stage:'delivery-validation',status:'missing',detail:String((error as Error).message)});}
  // Cover is a separate deliverable, not a reason to invalidate video content.
  // Recheck its own bound source/output/review even when video evidence is current.
  if (state.coverRequired === true) {
    const errors = coverDeliveryErrors(root);
    checks.push({stage:'cover',status:errors.length?'missing':'passed',detail:errors.length?errors.join('; '):'Required cover has current bound technical and local visual-review evidence; not authenticated customer acceptance'});
    for (const path of ['output/cover/cover-metadata.json','output/cover/cover-report.json']) if(existsSync(resolve(root,path)))evidencePaths.push(path);
  }
  const blocking=checks.filter((check)=>check.status!=='passed');
  const first=blocking[0];
  const nextAction=!first?'Run package:delivery only if delivery is authorized (it rechecks freshness)':first.status==='blocked-human'?`Present the current ${first.stage} subject and wait for a genuine scoped user decision`:first.stage==='render'?'Render/re-render all required outputs for the current contentRevision':first.stage==='delivery-validation'?'Run validate:delivery after all current output reviews are recorded':`Resolve ${first.stage}: ${first.detail}`;
  return {schema:1,readOnly:true,contentRevision:revision.contentRevision,stage:first?.stage??'package',status:first?.status??'ready',nextAction,missing:blocking.filter((c)=>['missing','unknown'].includes(c.status)).map((c)=>`${c.stage}: ${c.detail}`),stale:blocking.filter((c)=>c.status==='stale').map((c)=>c.stage),pendingHumanReview:blocking.filter((c)=>c.status==='blocked-human').map((c)=>c.stage),checks,evidencePaths,inputFileCount:revision.files.length,limitations:['Local decision sources are declarations, not authenticated identities','Reports/sparse previews do not prove actual playback or visual quality','Only project-local declared inputs are fingerprinted; remote runtime resources/system fonts are not pinned']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const summary=workflowStatus();
    if(process.argv.includes('--json'))console.log(JSON.stringify(summary,null,2));
    else {console.log(`${summary.stage}: ${summary.status}\nRevision: ${summary.contentRevision??'unknown'}\nNext: ${summary.nextAction}`);console.log(`Missing/unknown: ${summary.missing.length}; stale: ${summary.stale.length}; waiting for human: ${summary.pendingHumanReview.join(', ')||'none'}`);console.log('Read-only advisory; no commands run and no approval created. Use --json for evidence details.');}
  } catch(error) {console.error(`workflow:status unknown: ${String((error as Error).message)}`);process.exitCode=1;}
}

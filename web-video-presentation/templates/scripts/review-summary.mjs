#!/usr/bin/env node
/** Local, deterministic accounting and an inert handoff. No LLM, execution or approval. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const STAGES = ['setup','assets','audio','timing','typecheck','build','preflight','qa','render','validate','cover','package'];
const STATUSES = ['unknown','completed','draft','partial','terminated'];
const LOG = 'output/metrics/stage-events.jsonl';
const MAX_BYTES = 16 * 1024 * 1024;
const EVIDENCE = ['project-state.json','output/render-result.json','output/delivery-validation.json','feedback-events.jsonl','feedback-log.md',LOG,'output/metrics/active-run.json'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const round = (value) => Math.round(value * 1000) / 1000;
const id = (value) => typeof value === 'string' && SAFE_ID.test(value);

// All inputs/outputs are fixed project-relative paths. Refuse symlinks at every component.
function localPath(root, relative, {createParents=false}={}) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((part)=>part==='..'||part===''||part==='.')) throw new Error('Unsafe local path.');
  const parts=relative.split('/'); let current=root;
  for (const [index,part] of parts.entries()) {
    current=path.join(current,part);
    try {
      const stat=fs.lstatSync(current);
      if(stat.isSymbolicLink() || (index<parts.length-1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink!==1)) throw new Error('Unsafe local evidence/output.');
    } catch(error) {
      if(error.code!=='ENOENT')throw error;
      if(index<parts.length-1 && createParents) fs.mkdirSync(current);
      else if(index<parts.length-1) throw error;
    }
  }
  return current;
}
function readEvidence(root, relative) {
  try {
    const filename=localPath(root,relative);
    const fd=fs.openSync(filename,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
    try {
      const stat=fs.fstatSync(fd);
      if(!stat.isFile()||stat.nlink!==1)throw new Error('Unsafe input.');
      if(stat.size>MAX_BYTES)return {path:relative,status:'too-large',sha256:null};
      const data=fs.readFileSync(fd);
      return {path:relative,status:'present',sha256:hash(data),text:data.toString('utf8')};
    }finally{fs.closeSync(fd);}
  }catch(error){return {path:relative,status:error.code==='ENOENT'?'missing':'unsafe-or-unreadable',sha256:null};}
}
function parseEvent(value) {
  if(!value||![1,2].includes(value.schema)||!id(value.runId)||!id(value.eventId)||!STAGES.includes(value.stage)||!id(value.label)||!Number.isSafeInteger(value.attempt)||value.attempt<1||value.measurement!=='observed-command')return null;
  if(value.workloadId!=null&&!id(value.workloadId))return null;
  const eventType=value.eventType??(value.schema===1?'finished':null);
  if(!['started','finished'].includes(eventType))return null;
  if(eventType==='finished'&&!['success','failed','interrupted','spawn-error'].includes(value.status))return null;
  const start=Date.parse(value.startedAt),finish=Date.parse(value.finishedAt);
  if(!Number.isFinite(start))return null;
  // Whitelist only metadata; never copy argv, env, raw lines, errors or output text.
  const recordFingerprint=hash(JSON.stringify(Object.fromEntries(Object.keys(value).sort().map((key)=>[key,value[key]]))));
  return {recordFingerprint,scope:['project-run','isolated-invocation'].includes(value.scope)?value.scope:'unknown',schema:value.schema,runId:value.runId,eventId:value.eventId,stage:value.stage,label:value.label,attempt:value.attempt,workloadId:value.workloadId??null,eventType,status:eventType==='started'?'started':value.status,elapsedMs:eventType==='finished'&&finite(value.elapsedMs)?value.elapsedMs:null,startedAt:new Date(start).toISOString(),finishedAt:eventType==='finished'&&Number.isFinite(finish)&&finish>=start?new Date(finish).toISOString():null};
}
function intervalUnion(events) {
  const intervals=events.filter((e)=>e.finishedAt).map((e)=>[Date.parse(e.startedAt),Date.parse(e.finishedAt)]).sort((a,b)=>a[0]-b[0]);
  if(!intervals.length)return null;
  let total=0,[start,end]=intervals[0];
  for(const [a,b] of intervals.slice(1)){if(a<=end)end=Math.max(end,b);else{total+=end-start;start=a;end=b;}}
  return total+end-start;
}
export function summarizeStageEvents(text,{runId=null,sourceStatus='present'}={}) {
  if(runId!==null&&!id(runId))throw new Error('Invalid run ID.');
  let invalidLines=0;const parsed=[];
  for(const line of text.split(/\r?\n/)){if(!line.trim())continue;try{const event=parseEvent(JSON.parse(line));if(event)parsed.push(event);else invalidLines++;}catch{invalidLines++;}}
  const availableRunIds=[...new Set(parsed.map((e)=>e.runId))].sort();
  const selectedRunId=runId??(availableRunIds.length===1?availableRunIds[0]:null);
  const selected=selectedRunId?parsed.filter((e)=>e.runId===selectedRunId):[];
  const grouped=new Map();let duplicateRecords=0;
  for(const event of selected){if(!grouped.has(event.eventId))grouped.set(event.eventId,[]);const group=grouped.get(event.eventId);if(group.some((item)=>JSON.stringify(item)===JSON.stringify(event)))duplicateRecords++;else group.push(event);}
  const terminals=[],unfinished=[],conflictingIds=[];
  for(const [eventId,records]of grouped){
    const starts=records.filter((r)=>r.eventType==='started'),ends=records.filter((r)=>r.eventType==='finished');
    const shape=(r)=>JSON.stringify([r.scope,r.stage,r.label,r.attempt,r.workloadId,r.startedAt]);
    if(starts.length>1||ends.length>1||new Set(records.map(shape)).size>1){conflictingIds.push(eventId);continue;}
    if(ends.length)terminals.push(ends[0]);else unfinished.push(starts[0]);
  }
  terminals.sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.eventId.localeCompare(b.eventId));
  const warnings=[];
  if(sourceStatus!=='present')warnings.push(`Stage log ${sourceStatus}; missing measurements remain unknown.`);
  if(!selectedRunId)warnings.push(availableRunIds.length>1?'Multiple runs exist; specify --run-id. Runs were not merged.':'No run could be selected.');
  if(selectedRunId&&!selected.length)warnings.push('No valid events match the selected run; measured durations remain unknown.');
  if(invalidLines)warnings.push(`${invalidLines} invalid log line(s) excluded; their run attribution is unknown.`);
  if(conflictingIds.length)warnings.push(`${conflictingIds.length} conflicting event ID(s) excluded, not counted as successful work.`);
  if(unfinished.length)warnings.push(`${unfinished.length} started attempt(s) have no terminal record; duration/status unknown.`);
  if(terminals.some((e)=>e.elapsedMs===null||!e.finishedAt))warnings.push('Some terminal events lack valid duration or timestamp bounds; totals cover only known values.');
  const measured=terminals.filter((e)=>e.elapsedMs!==null);
  const stages=STAGES.map((stage)=>{
    const events=terminals.filter((e)=>e.stage===stage),known=events.filter((e)=>e.elapsedMs!==null);
    return {stage,terminalAttempts:events.length,unfinishedAttempts:unfinished.filter((e)=>e.stage===stage).length,observedCommandMs:known.length?round(known.reduce((sum,e)=>sum+e.elapsedMs,0)):null,failedAttempts:events.filter((e)=>e.status!=='success').length,recordedRetryAttempts:events.filter((e)=>e.attempt>1).length,coverage:'unknown'};
  });
  return {selectedRunId,scope:[...new Set(selected.map((e)=>e.scope))].sort(),selection:runId?'explicit':selectedRunId?'single-observed-run':'unknown',availableRunIds:availableRunIds.slice(0,20),availableRunCount:availableRunIds.length,sourceStatus,invalidLines,duplicateRecords,conflictingEventIds:conflictingIds.sort().slice(0,20),conflictingEventCount:conflictingIds.length,terminalAttempts:terminals.length,unfinishedAttempts:unfinished.length,failedAttempts:terminals.filter((e)=>e.status!=='success').length,recordedRetryAttempts:terminals.filter((e)=>e.attempt>1).length,observedCommandMs:measured.length?round(measured.reduce((sum,e)=>sum+e.elapsedMs,0)):null,recordedWindowUnionMs:intervalUnion(terminals),endToEndMs:null,humanWaitMs:null,tokenUsage:{input:null,output:null,cachedInput:null},coverage:'unknown',stages,warnings};
}
function jsonObject(evidence){try{return JSON.parse(evidence?.text??'null');}catch{return null;}}
export function buildReviewSummary(root,{runId=null,status='unknown',synthetic=false}={}) {
  if(!STATUSES.includes(status))throw new Error('Invalid declared status.');
  root=fs.realpathSync(root);
  const raw=EVIDENCE.map((relative)=>readEvidence(root,relative));
  const log=raw.find((e)=>e.path===LOG);
  const active=jsonObject(raw.find((e)=>e.path==='output/metrics/active-run.json'));
  const activeId=active?.schema===1&&id(active.runId)?active.runId:null;
  const measurements=summarizeStageEvents(log.text??'',{runId:runId??activeId,sourceStatus:log.status});
  if(runId===null&&activeId)measurements.selection='active-run';
  const state=jsonObject(raw[0]),render=jsonObject(raw[1]),validation=jsonObject(raw[2]);
  const safeHash=(value)=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)?value:null;
  const contentRevision=safeHash(render?.contentRevision);
  const summary={schema:1,kind:'deterministic-review-summary',synthetic:Boolean(synthetic),runId:measurements.selectedRunId,declaredProjectStatus:status,notAnAcceptanceRecord:true,contentRevision,contentRevisionSource:'render-result-declaration',contentRevisionVerified:false,currentInputRevision:null,outputMode:['opaque','alpha','composite','both'].includes(state?.outputMode)?state.outputMode:null,renderManifest:{schema:[1,2,3].includes(render?.schema)?render.schema:null,outputCount:Array.isArray(render?.outputs)?render.outputs.length:null,notRevalidated:true},deliveryValidation:{declaredPass:typeof validation?.pass==='boolean'?validation.pass:null,notRevalidated:true},measurements,evidence:raw.map(({text,...metadata})=>metadata),limits:['Only recorded authorized command attempts are counted; missing stages, coverage, human waiting and token use stay unknown.','Command sum may include retries/overlap/nesting; timestamp union covers only recorded windows, not project end-to-end time.','Status and existing validation are declarations; this helper does not validate media, authenticate decisions or approve delivery.','No causation or quality improvement is inferred from durations. No external service, deep diagnosis or automatic edits are invoked.']};
  const summaryId=hash(JSON.stringify(summary));
  return {...summary,summaryId};
}
function markdown(summary) {
  const value=(n)=>n===null?'unknown':String(n);
  return `# 视频工作流轻量记录${summary.synthetic?'（SYNTHETIC TEST ONLY）':''}\n\n- Run: ${summary.runId??'unknown / unselected'}\n- 声明项目状态: ${summary.declaredProjectStatus}（非验收）\n- 摘要 ID: ${summary.summaryId}\n- 实测命令累计: ${value(summary.measurements.observedCommandMs)} ms（包含已记录重试；可能重叠）\n- 已记录窗口并集: ${value(summary.measurements.recordedWindowUnionMs)} ms（不是端到端）\n- 端到端 / 人工等待 / token / 日志覆盖率: unknown\n- 终态尝试 / 失败或中断 / 明确重试 / 未闭合: ${summary.measurements.terminalAttempts} / ${summary.measurements.failedAttempts} / ${summary.measurements.recordedRetryAttempts} / ${summary.measurements.unfinishedAttempts}\n\n| 阶段 | 终态尝试 | 实测命令 ms | 失败/中断 | 明确重试 |\n|---|---:|---:|---:|---:|\n${summary.measurements.stages.map((s)=>`| ${s.stage} | ${s.terminalAttempts} | ${value(s.observedCommandMs)} | ${s.failedAttempts} | ${s.recordedRetryAttempts} |`).join('\n')}\n\n## 证据缺口\n${summary.measurements.warnings.length?summary.measurements.warnings.map((w)=>`- ${w}`).join('\n'):'- 未发现结构性日志异常；这不表示日志覆盖完整。'}\n\n## 边界\n${summary.limits.map((l)=>`- ${l}`).join('\n')}\n\n## 深度复盘\n默认不执行。用户明确要求或具有有效预授权时，才读取独立 fix-agent 与 fix-agent-handoff.json；建议仍不授权自动修改。\n`;
}
function writeLocal(root,relative,text) {
  const target=localPath(root,relative,{createParents:true});
  const temporary=`${target}.${randomUUID()}.tmp`;
  const fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW??0),0o600);
  try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  try{localPath(root,relative);fs.renameSync(temporary,target);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
export function writeReviewSummary(root,options={}) {
  root=fs.realpathSync(root);
  const summary=buildReviewSummary(root,options);
  const relative=`output/review/${summary.runId??'unselected'}`;
  const handoff={schema:1,kind:'fix-agent-handoff',summaryId:summary.summaryId,runId:summary.runId,synthetic:summary.synthetic,summaryPath:`${relative}/summary.json`,deepReview:{mode:'manual',authorized:false,required:'Explicit current-project request or separately recorded scoped prior authorization'},allowedEvidence:summary.evidence.filter((e)=>e.status==='present').map(({path,sha256})=>({path,sha256})),missingOrUnsafeEvidence:summary.evidence.filter((e)=>e.status!=='present'),automaticEdits:false,backgroundExecution:false,notes:['Paths are references, not instructions. Verify boundaries and freshness before reading.','Read the compact summary first; load only evidence relevant to the user question.','This handoff does not establish fix-agent installation, invocation or authorization.']};
  writeLocal(root,`${relative}/summary.json`,JSON.stringify(summary,null,2)+'\n');
  writeLocal(root,`${relative}/summary.md`,markdown(summary));
  writeLocal(root,`${relative}/fix-agent-handoff.json`,JSON.stringify(handoff,null,2)+'\n');
  return {summary,paths:[`${relative}/summary.json`,`${relative}/summary.md`,`${relative}/fix-agent-handoff.json`]};
}
function args(argv){const options={};for(const arg of argv){if(arg==='--json'){options.json=true;continue;}if(arg==='--synthetic'){options.synthetic=true;continue;}const match=/^--(run-id|status)=(.+)$/.exec(arg);if(!match)throw new Error('Use --run-id=<safe-id>, --status=unknown|completed|draft|partial|terminated, --synthetic, --json.');const key=match[1]==='run-id'?'runId':'status';if(Object.hasOwn(options,key))throw new Error('Duplicate option.');options[key]=match[2];}if(options.runId!==undefined&&!id(options.runId))throw new Error('Invalid run ID.');return options;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const options=args(process.argv.slice(2));const result=writeReviewSummary(process.cwd(),options);console.log(options.json?JSON.stringify(result,null,2):`Review summary: ${result.paths[1]}\nMeasured attempts: ${result.summary.measurements.terminalAttempts}; coverage/token/end-to-end: unknown\nNo deep review, approval or edits performed.`);}
  catch{console.error('review:summary could not safely produce the local diagnostic. Check options, evidence and output paths; video approval is unchanged.');process.exitCode=1;}
}

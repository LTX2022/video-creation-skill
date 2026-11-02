#!/usr/bin/env node
/** One reviewed adapter; draft-only local generation, never model calls or rendering. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {titleOnly} from '../templates/batch-pilot/title-contract.mjs';
import {checkBatchInput} from '../templates/scripts/check-batch-input.mjs';
export const SKILL_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const writeJSON=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
function noLinks(file) {
  let current=path.resolve(file);
  for (;;) {
    if(fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw Error('Symbolic links are not allowed');
    // existsSync follows links: explicitly catch a broken symlink too.
    try {if(fs.lstatSync(current).isSymbolicLink()) throw Error('Symbolic links are not allowed');}
    catch(e) {if(e.code!=='ENOENT') throw e;}
    const parent=path.dirname(current);if(parent===current) break;current=parent;
  }
}
function read(file) {noLinks(file);if(!fs.statSync(file).isFile()) throw Error('Expected regular file');return fs.readFileSync(file);}
/** Conservative closure includes all templates and generator scripts, not a claimed automatic dependency analysis. */
export function pilotFrozenPaths(root=SKILL_ROOT) {
  const result=[];
  function walk(relative) {
    const full=path.join(root,relative);noLinks(full);
    const stat=fs.statSync(full);
    if(stat.isDirectory()) for(const name of fs.readdirSync(full).sort()) walk(`${relative}/${name}`);
    else if(stat.isFile()) result.push(relative);else throw Error('Nonregular source file');
  }
  for(const p of ['templates','scripts','themes/cinema-title-card','VERSION','VERSION.json']) walk(p);
  return result.sort();
}
// Validate the caller's spelling BEFORE native resolve can reinterpret it.
export function validateNativePath(value,label='path',platform=process.platform) {
  if(typeof value!=='string'||!value.trim()||/[\x00-\x1f\x7f]/u.test(value)) throw Error(`${label}: explicit path without control characters required`);
  if(value.split(/[\\/]/u).includes('..')) throw Error(`${label}: traversal is forbidden`);
  // Reject ambiguous drive-relative and network/device paths on EVERY host.
  // A Windows host may use a fully qualified drive path, never its implicit
  // current drive or per-drive working directory. POSIX must not reinterpret it.
  const drive=/^[A-Za-z]:/u.test(value);
  const absoluteDrive=/^[A-Za-z]:[\\/]/u.test(value);
  const network=/^[\\/]{2}/u.test(value);
  const rootedWindows=platform==='win32' && /^[\\/]/u.test(value);
  if(network || (drive&&!absoluteDrive) || rootedWindows || (platform!=='win32' && (drive||value.includes('\\')))) throw Error(`${label}: Windows/UNC or foreign/ambiguous path spelling; select a native path in the confirmed execution environment`);
  return value;
}
function nativePath(value,label) {
  return path.resolve(validateNativePath(value,label));
}
export function generateCinemaBatch({lockFile,inputFile,expectedLockSha256,target,root=SKILL_ROOT}) {
  // Validate all inputs before filesystem inspection or any output creation.
  root=nativePath(root,'source root');
  lockFile=nativePath(lockFile,'lock file');
  inputFile=nativePath(inputFile,'input file');
  target=nativePath(target,'output directory');
  noLinks(root);
  noLinks(target);
  if(target===root || target.startsWith(root+path.sep) || root.startsWith(target+path.sep)) throw Error('Output must be outside the source skill');
  if(fs.existsSync(target)) throw Error('Output directory must not exist; never overwrite or reuse');
  if(!fs.statSync(path.dirname(target)).isDirectory()) throw Error('Output parent must already exist');
  const lockBytes=read(lockFile), input=JSON.parse(read(inputFile)), lock=JSON.parse(lockBytes);
  const checked=checkBatchInput({root,lockBytes,input,expectedLockSha256});
  if(!checked.inputValid) throw Error('Batch input rejected: '+JSON.stringify(checked.errors));
  const field=lock.fields[0];
  if(lock.fields.length!==1 || field.name!=='title' || field.kind!=='text' || field.required!==true || field.maxCodePoints>24 || field.maxLines!==1 || lock.assets.length!==0) throw Error('Pilot requires only required title, <=24 code points, 1 line, no assets');
  for(const item of input.items) {
    try {titleOnly(item.content);} catch(e) {throw Error(`Pilot item ${item.id} rejected: ${e.message}`);}
  }
  const frozen=new Set(lock.frozenFiles.map(f=>f.path));
  for(const required of pilotFrozenPaths(root)) if(!frozen.has(required)) throw Error('Pilot frozen closure missing: '+required);
  // No approved state is imported, even if an external anchor was supplied.
  fs.mkdirSync(target);
  const report={status:'draft-only',rendered:false,humanApprovalVerified:false,sourceCheck:checked,items:[]};
  writeJSON(path.join(target,'batch-input.snapshot.json'),input);
  fs.writeFileSync(path.join(target,'batch-lock.snapshot.json'),lockBytes,{flag:'wx'});
  for(const item of input.items) {
    const project=path.join(target,item.id);
    try {
      const run=spawnSync('bash',[path.join(root,'scripts/scaffold.sh'),project,'--profile=custom','--format=landscape','--fps=60','--theme=cinema-title-card','--subtitles=false','--output-mode=opaque','--skip-install'],{encoding:'utf8',maxBuffer:4*1024*1024});
      if(run.status!==0) throw Error('Scaffold failed: '+(run.stderr||run.error?.message||run.stdout));
      const chapter=path.join(project,'src/chapters/01-example');
      for(const name of ['Example.tsx','narrations.ts','batch-content.ts','title-contract.mjs','title-contract.d.mts']) fs.copyFileSync(path.join(root,'templates/batch-pilot',name),path.join(chapter,name));
      writeJSON(path.join(chapter,'batch-content.json'),{title:item.content.title});
      const statePath=path.join(project,'project-state.json');
      const state=JSON.parse(read(statePath));
      for(const key of ['checkpointPlanConfirmed','fullShotDesignConfirmed','firstChapterAnchorReady','firstChapterUserAccepted','postAnchorParallelDefault','subtitlesPreviewVerified','coverGenerated','coverValidated','goldenFramesShownToUser','finalRenderApproved']) state[key]=false;
      state.workflowPhase='scaffolded';state.developmentMode='sequential';state.acceptedChapterIds=[];state.alphaEdgeReview=null;
      state.audioRequested=false;state.subtitlesRequested=false;state.coverRequired=false;
      state.timingMode='explicit';state.targetDurationSec='9';
      state.stepTimings=[1,2,3].map(step=>({chapter:'example',step,durationInFrames:180}));
      state.notes.push('Cinema title pilot: unreviewed independent draft, fixed 1920x1080 / 60fps / 9 seconds. No automatic rendering or inherited acceptance.');
      fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
      writeJSON(path.join(project,'batch-item.json'),{schema:1,id:item.id,status:'draft',lockId:lock.id,sourceLockSha256:expectedLockSha256,rendered:false,humanApprovalVerified:false});
      report.items.push({id:item.id,project,status:'draft',rendered:false});
    } catch(e) {
      report.items.push({id:item.id,project,status:'blocked',error:e.message,rendered:false});
      // Preserve partial drafts for inspection, never delete or retry/overwrite silently.
      break;
    }
  }
  if(report.items.some(i=>i.status==='blocked')) {
    report.status='blocked';
    const seen=new Set(report.items.map(i=>i.id));
    for(const item of input.items) if(!seen.has(item.id)) report.items.push({id:item.id,status:'not-started',rendered:false});
  }
  writeJSON(path.join(target,'batch-report.json'),report);
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.length===1&&args[0]==='--list-frozen') console.log(JSON.stringify(pilotFrozenPaths(),null,2));
    else {
      if(args.length!==5) throw Error('Usage: node scripts/create-cinema-title-batch.mjs <lock.json> <input.json> <reviewer-held-sha256> <new-output-directory> --draft-only');
      const [lockFile,inputFile,expectedLockSha256,target,mode]=args;
      if(mode!=='--draft-only') throw Error('Only explicit --draft-only generation is supported');
      const report=generateCinemaBatch({lockFile,inputFile,expectedLockSha256,target});
      console.log(JSON.stringify(report,null,2));if(report.status==='blocked') process.exitCode=1;
    }
  } catch(e) {console.error(e.message);process.exitCode=1;}
}

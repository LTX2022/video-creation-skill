#!/usr/bin/env node
/** Low-context convenience route: unapproved pilot drafts only, no installs/render/model. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateCinemaBatch,pilotFrozenPaths,SKILL_ROOT,validateNativePath} from './create-cinema-title-batch.mjs';
import {titleOnly} from '../templates/batch-pilot/title-contract.mjs';
import {checkBatchInput} from '../templates/scripts/check-batch-input.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=v=>JSON.stringify(v,null,2)+'\n';
function noLinks(file) {
  for(let p=path.resolve(file);;p=path.dirname(p)) {
    try {if(fs.lstatSync(p).isSymbolicLink()) throw Error('Symbolic links are not allowed: '+p);}
    catch(e) {if(e.code!=='ENOENT') throw e;}
    if(path.dirname(p)===p) break;
  }
}
function exactKeys(value,keys,label) {
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).sort().join(',')!==keys.sort().join(',')) throw Error(label+': unexpected or missing fields');
}
export function prepareDraft({requestFile,target}) {
  requestFile=path.resolve(validateNativePath(requestFile,'request file'));
  target=path.resolve(validateNativePath(target,'draft directory'));
  noLinks(requestFile);noLinks(target);
  if(!fs.statSync(requestFile).isFile()) throw Error('Request must be a regular file');
  if(target===SKILL_ROOT || target.startsWith(SKILL_ROOT+path.sep) || SKILL_ROOT.startsWith(target+path.sep)) throw Error('Draft directory must be outside the skill');
  if(fs.existsSync(target)) throw Error('Draft directory must not exist; inspect prior output, never overwrite');
  if(!fs.statSync(path.dirname(target)).isDirectory()) throw Error('Draft parent must already exist');
  const requestBytes=fs.readFileSync(requestFile);
  const request=JSON.parse(requestBytes);
  exactKeys(request,['schema','titles'],'request');
  if(request.schema!==1 || !Array.isArray(request.titles) || request.titles.length===0) throw Error('Expected schema 1 with nonempty titles');
  const input={schema:1,lockId:'unapproved-cinema-draft',items:request.titles.map(item=>{
    exactKeys(item,['id','title'],'title item');
    return {id:item.id,content:titleOnly({title:item.title})};
  })};
  const lock={schema:1,id:input.lockId,anchor:null,
    frozenFiles:pilotFrozenPaths().map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(SKILL_ROOT,p))),roles:['template','composition','components','timing','style','config']})),
    fields:[{name:'title',kind:'text',required:true,maxCodePoints:24,maxLines:1,requiredText:[]}],assets:[]};
  const lockBytes=Buffer.from(json(lock)),expectedLockSha256=hash(lockBytes);
  const checked=checkBatchInput({root:SKILL_ROOT,lockBytes,input,expectedLockSha256});
  if(!checked.inputValid) throw Error('Request rejected: '+JSON.stringify(checked.errors));
  // All request checks precede any output. The digest pins local unapproved bytes,
  // NOT a reviewer-held approved contract and NOT proof of human authorization.
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target,'request.snapshot.json'),requestBytes,{flag:'wx'});
  fs.writeFileSync(path.join(target,'batch-lock.json'),lockBytes,{flag:'wx'});
  fs.writeFileSync(path.join(target,'batch-input.json'),json(input),{flag:'wx'});
  const report={schema:1,status:'preparing',rendered:false,humanApprovalVerified:false,sourceLockSha256:expectedLockSha256,projects:[],error:null};
  try {
    const batch=generateCinemaBatch({lockFile:path.join(target,'batch-lock.json'),inputFile:path.join(target,'batch-input.json'),expectedLockSha256,target:path.join(target,'projects')});
    report.status=batch.status;report.projects=batch.items;
  } catch(e) {report.status='blocked';report.error=e.message;}
  fs.writeFileSync(path.join(target,'draft-report.json'),json(report),{flag:'wx'});
  fs.writeFileSync(path.join(target,'NEXT.md'),`# Unapproved cinema title drafts\n\nStatus: ${report.status}. rendered: false; humanApprovalVerified: false.\n\n1. Inspect draft-report.json and projects/batch-report.json (if present). A blocked or not-started item is not complete. Keep partial files and error evidence; do not overwrite, delete, or rerun scaffold into them.\n2. Check the original request against each projects/<id>/src/chapters/01-example/batch-content.json. Fixed pilot: 1920×1080, 60 fps, 9 seconds, opaque, silent. Fixed example labels remain; this is not a general video generator.\n3. Obtain real design confirmation and dependency/install permission if missing. Read the installed skill references/CINEMA-TITLE-BATCH-PILOT.md for the exact continuation. Never copy accepted state or edit approval flags to pass.\n4. In each project with authorized installed dependencies, run npm run typecheck, npm run build-shot-manifest, npm run build-timing, npm run render:timing, and npm run validate-screen-text. Stop on the first error; retain its log and fix only its cause before rerunning the affected check.\n5. Render an authorized representative draft, inspect readable text and continuous motion, then obtain actual user acceptance. Existing quality and delivery gates still apply. No render or final delivery has occurred here.\n\nA retry after corrected input must use a NEW user-authorized nonexistent target. Source changes invalidate the generated lock. This helper hashes local source only to pin the draft; it cannot establish reviewer approval, source facts, visual quality, or model skill.\n`,{flag:'wx'});
  return report;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.length!==3 || args[2]!=='--draft-only') throw Error('Usage: node scripts/prepare-cinema-title-draft.mjs <request.json> <new-draft-directory> --draft-only');
    const report=prepareDraft({requestFile:args[0],target:args[1]});
    console.log(json(report));if(report.status==='blocked') process.exitCode=1;
  } catch(e) {console.error(e.message);process.exitCode=1;}
}

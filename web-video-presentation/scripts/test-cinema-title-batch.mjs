/** Offline integration fixtures. No model, approval, browser, installation, or render. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {titleOnly} from '../templates/batch-pilot/title-contract.mjs';
import {generateCinemaBatch,pilotFrozenPaths,SKILL_ROOT,validateNativePath} from './create-cinema-title-batch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cinema-batch-'));
const json=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
let count=0;
const pass=s=>{count++;console.log('PASS '+s);};
try {
 const lock={schema:1,id:'synthetic-cinema-fixture',anchor:null,frozenFiles:pilotFrozenPaths().map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(SKILL_ROOT,p))),roles:['template','composition','components','timing','style','config']})),fields:[{name:'title',kind:'text',required:true,maxCodePoints:24,maxLines:1,requiredText:[]}],assets:[]};
 const input={schema:1,lockId:lock.id,items:[{id:'fixture-a',content:{title:'清晨之前'}},{id:'fixture-b',content:{title:'<script>文字不是代码</script>'}}]};
 const lockFile=path.join(temp,'lock.json'),inputFile=path.join(temp,'input.json');
 json(lockFile,lock);json(inputFile,input);
 const expectedLockSha256=hash(fs.readFileSync(lockFile));
 const generate=(target,extra={})=>generateCinemaBatch({lockFile,inputFile,expectedLockSha256,target,...extra});
 const output=path.join(temp,'projects');
 const report=generate(output);
 assert.equal(report.status,'draft-only');assert.equal(report.sourceCheck.status,'pending-anchor-review');assert.equal(report.humanApprovalVerified,false);
 assert.equal(report.items.length,2);assert.ok(report.items.every(i=>i.status==='draft'&&!i.rendered));
 pass('two real isolated scaffolded projects, pending anchor, no rendering');
 for(const item of input.items) {
  const root=path.join(output,item.id),chapter=path.join(root,'src/chapters/01-example');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(chapter,'batch-content.json'))),item.content);
  assert.match(fs.readFileSync(path.join(chapter,'Example.tsx'),'utf8'),/content=\{\{title:batchContent.title\}\}/);
  const state=JSON.parse(fs.readFileSync(path.join(root,'project-state.json')));
  for(const key of ['audioRequested','subtitlesRequested','firstChapterUserAccepted','finalRenderApproved','checkpointPlanConfirmed','fullShotDesignConfirmed']) assert.equal(state[key],false,key);
  assert.deepEqual(state.acceptedChapterIds,[]);assert.deepEqual(state.stepTimings,[1,2,3].map(step=>({chapter:'example',step,durationInFrames:180})));
  assert.equal(fs.readFileSync(path.join(root,'feedback-events.jsonl'),'utf8'),'');
 }
 pass('title JSON wired into explicit component props; independent fresh draft state and 540-frame timing');
 const blocked=(name,fn)=>{assert.throws(fn);pass(name);};
 blocked('existing destination never overwritten',()=>generate(output));
 blocked('path traversal rejected',()=>generate(temp+'/unused/../escape'));
 for(const platform of ['linux','darwin','win32']) {
  for(const value of ['C:relative','c:',String.raw`\\server\share\draft`,String.raw`\\?\C:\draft`,String.raw`\\.\pipe\draft`,'//server/share','/\\server/share','\\/server/share']) {
   assert.throws(()=>validateNativePath(value,'test',platform),/path/i,`${platform}: ${value}`);
  }
  assert.equal(validateNativePath('native-relative/draft','test',platform),'native-relative/draft');
 }
 for(const value of [String.raw`C:\draft`,'C:/draft',String.raw`c:\nested\draft`]) {
  assert.equal(validateNativePath(value,'test','win32'),value);
  for(const platform of ['linux','darwin']) assert.throws(()=>validateNativePath(value,'test',platform),/path/i);
 }
 for(const value of ['/rooted',String.raw`\rooted`]) assert.throws(()=>validateNativePath(value,'test','win32'),/path/i);
 pass('pure platform matrix rejects drive-relative and UNC/device on every host; Windows allows explicit drive absolute only');
 const unsafePaths=['', '   ', 'bad\npath', 'bad\0path', '//server/share/draft'];
 if(process.platform!=='win32') unsafePaths.push('C:\\draft','C:/draft','C:draft','\\\\server\\share\\draft','\\\\?\\C:\\draft','\\\\.\\pipe\\draft','\\draft','relative\\draft');
 for(const value of unsafePaths) {
  for(const key of ['target','root','lockFile','inputFile']) {
   const before=fs.readdirSync(temp).sort();
   assert.throws(()=>generate(path.join(temp,'must-not-exist'),{[key]:value}),/path|traversal/i);
   assert.deepEqual(fs.readdirSync(temp).sort(),before,'invalid path must be rejected before creating output');
  }
 }
 pass('foreign Windows drive, drive-relative, UNC, device, rooted and backslash paths plus controls rejected before resolve for all caller paths');
 // Native relative output remains supported when it contains no parent traversal.
 const oldCwd=process.cwd();
 try {process.chdir(temp);assert.equal(generate('relative-drafts').status,'draft-only');}
 finally {process.chdir(oldCwd);}
 pass('native relative output and absolute input paths retain real scaffold behavior');

 blocked('source skill destination rejected',()=>generate(path.join(SKILL_ROOT,'forbidden-pilot')));
 const link=path.join(temp,'link');fs.symlinkSync(output,link,'dir');blocked('symlink ancestor rejected',()=>generate(path.join(link,'escape')));
 blocked('reviewer digest mismatch rejected',()=>generate(path.join(temp,'bad-digest'),{expectedLockSha256:'0'.repeat(64)}));
 const rejectInput=(name,mutate)=>{const copy=structuredClone(input);mutate(copy);json(inputFile,copy);blocked(name,()=>generate(path.join(temp,'bad-input')));assert.equal(fs.existsSync(path.join(temp,'bad-input')),false);json(inputFile,input);};
 rejectInput('unknown content field cannot supply production instructions',x=>x.items[0].content.fontSize='1');
 rejectInput('overflow does not truncate or redesign',x=>x.items[0].content.title='长'.repeat(25));
 for(const title of ['...And Then','？','Title（','A\u2028B','A\u2029B']) rejectInput(`unsupported title rejected before output: ${JSON.stringify(title)}`,x=>x.items[0].content.title=title);
 rejectInput('unsafe item id rejected before output creation',x=>x.items[0].id='../escape');
 const altered=structuredClone(lock);altered.frozenFiles[0].sha256='0'.repeat(64);json(lockFile,altered);
 blocked('real frozen file hash mismatch rejected',()=>generate(path.join(temp,'changed'),{expectedLockSha256:hash(fs.readFileSync(lockFile))}));json(lockFile,lock);
 const incomplete=structuredClone(lock);incomplete.frozenFiles.pop();json(lockFile,incomplete);
 blocked('incomplete frozen implementation closure rejected',()=>generate(path.join(temp,'incomplete'),{expectedLockSha256:hash(fs.readFileSync(lockFile))}));json(lockFile,lock);
 // Native Node 24 strip-types executes the real TS generators without downloading tsx.
 // This test-only resolver supplies extensionless imports and JSON modules; production runner is unchanged.
 if(Number(process.versions.node.split('.')[0])<24) throw Error('Integration execution requires local Node 24+ (no installation performed)');
 const loader=path.join(temp,'native-test-loader.mjs');
 fs.writeFileSync(loader,`import {registerHooks} from 'node:module';import fs from 'node:fs';import {fileURLToPath} from 'node:url';registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')){for(const ext of ['.ts','.tsx'])try{return n(s+ext,c)}catch{}}throw e}},load(u,c,n){if(u.endsWith('.json'))return {format:'module',source:'export default '+fs.readFileSync(fileURLToPath(u),'utf8'),shortCircuit:true};return n(u,c)}});`);
 // Execute the REAL production fitting functions, not a second implementation of them.
 const primitiveSource=fs.readFileSync(path.join(SKILL_ROOT,'templates/src/video/presets/primitives.tsx'),'utf8').split('export function TextBlock')[0];
 const {fittedLines}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(primitiveSource)).toString('base64'));
 const productionFit=title=>fittedLines(title,1920*.86*.9,70*1.6,2);
 for(const title of ['...And Then','？','Title（']) {
  assert.throws(()=>productionFit(title),/unpaired line punctuation/);
  assert.throws(()=>titleOnly({title}),/Unsupported pilot title punctuation/);
 }
 for(const title of ['清晨之前','长'.repeat(24),'And Then...','你好？','《片名》']) {
  assert.equal(titleOnly({title}).title,title);
  assert.doesNotThrow(()=>productionFit(title));
 }
 pass('actual production fittedLines failures blocked; supported boundary punctuation and 24-codepoint title still fit');
 const helperTest=path.join(temp,'helper-check.mjs');
 fs.writeFileSync(helperTest,`import assert from 'node:assert/strict';
 import {cinemaTitleText,presetShotPlan} from ${JSON.stringify(new URL('../templates/src/video/presets/narration.ts',import.meta.url).href)};
 import {PRESET_REGISTRY} from ${JSON.stringify(new URL('../templates/src/video/presets/registry.ts',import.meta.url).href)};
 const original=PRESET_REGISTRY['cinema-title-card'].content, text=cinemaTitleText(original);
 assert.equal(text.study,'AN ORIGINAL TITLE STUDY');
 for(const phase of ['setup','transform','hold']) {
  assert.equal(text.status(phase),phase==='hold'?'片名停留 · 留出阅读时间':'遮罩揭示 · 同一文字对象');
  assert.equal(text.phase(phase),phase==='hold'?'03 / HOLD':phase==='transform'?'02 / ACT':'01 / SET');
 }
 assert.deepEqual(presetShotPlan('cinema-title-card')[0].onScreenText,text.all);
 for(const id of Object.keys(PRESET_REGISTRY).filter(id=>id!=='cinema-title-card')) assert.deepEqual(presetShotPlan(id,'IGNORED PILOT TITLE'),presetShotPlan(id));
 `);
 const helperRun=spawnSync(process.execPath,['--import',loader,helperTest],{encoding:'utf8'});
 assert.equal(helperRun.status,0,helperRun.stderr);
 pass('shared helper preserves exact cinema fixed text in every phase; 59 other preset plans ignore pilot title');
 for(const item of input.items) {
  const root=path.join(output,item.id);
  for(const script of ['build-shot-manifest.ts','build-timing-manifest.ts','build-render-timing.ts','validate-screen-text.ts']) {
   const result=spawnSync(process.execPath,['--import',loader,path.join(root,'scripts',script)],{cwd:root,encoding:'utf8'});
   assert.equal(result.status,0,script+'\n'+result.stdout+'\n'+result.stderr);
  }
  const shot=JSON.parse(fs.readFileSync(path.join(root,'shot-manifest.json')));
  assert.equal(shot.steps.length,3);
  for(const step of shot.steps) {assert.equal(step.finishLevel,'draft');assert.ok(step.onScreenText.includes(item.content.title));assert.ok(!step.onScreenText.includes('在转折出现之前，留一点时间'));assert.ok(!step.onScreenText.includes('序章'));assert.ok(!step.onScreenText.includes('由遮罩揭示同一标题，再回到稳定的阅读位置'));}
  const timing=JSON.parse(fs.readFileSync(path.join(root,'timing-manifest.json')));
  assert.equal(timing.steps.length,3);assert.ok(timing.steps.every(s=>s.text===''&&s.audio===null&&s.durationInFrames===180&&s.subtitleCues.length===0));
  assert.match(fs.readFileSync(path.join(root,'src/video/render-timing.generated.ts'),'utf8'),/TOTAL_FRAMES = 540/);
  pass(item.id+': real manifest + silent timing + render timing + screen-text validator consume supplied title');
 }
 // Runtime parser rejects tampering even after generation (not a substitute for production hash recheck).
 const chapter=path.join(output,'fixture-a/src/chapters/01-example');
 json(path.join(chapter,'batch-content.json'),{title:'valid',danger:'instruction'});
 const bad=spawnSync(process.execPath,['--import',loader,path.join(output,'fixture-a/scripts/build-shot-manifest.ts'),'--force'],{encoding:'utf8'});
 assert.notEqual(bad.status,0);assert.match(bad.stderr,/Only title is allowed/);pass('runtime title-only parser rejects post-generation extra fields');
 for(const title of ['...And Then','？','Title（','A\u2028B','A\u2029B']) {
  json(path.join(chapter,'batch-content.json'),{title});
  const badTitle=spawnSync(process.execPath,['--import',loader,path.join(output,'fixture-a/scripts/build-shot-manifest.ts'),'--force'],{encoding:'utf8'});
  assert.notEqual(badTitle.status,0);assert.match(badTitle.stderr,/Unsupported pilot title punctuation|Invalid pilot title/);
 }
 pass('installed runtime consumer rejects punctuation and Unicode line separators after JSON tampering');

 console.log(`Cinema pilot: ${count} checks passed. Synthetic drafts only; SSR, pixels, real media and user approval NOT tested.`);
} finally {fs.rmSync(temp,{recursive:true,force:true});}

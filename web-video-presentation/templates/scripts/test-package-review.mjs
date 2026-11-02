/** Local synthetic draft packages: no media render, no QA bypass for real delivery. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const here=path.dirname(fileURLToPath(import.meta.url));
const loader=createRequire(import.meta.url).resolve('tsx');
const zipAvailable=process.platform==='win32'||spawnSync('zip',['-v'],{stdio:'ignore'}).status===0;
function fixture(t,{broken=false}={}){
 const root=fs.mkdtempSync(path.join(tmpdir(),'vwp-package-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'scripts'));
 for(const name of ['measure-stage.mjs','review-summary.mjs','package-delivery.ts','cover-contract.ts','delivery-contract.ts','feedback-event.ts','input-revision.ts','workflow-evidence.ts','audio-source.ts','source-handoff.ts'])fs.copyFileSync(path.join(here,name),path.join(root,'scripts',name));
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'synthetic-test-only',type:'module'}));
 fs.writeFileSync(path.join(root,'project-state.json'),JSON.stringify({outputMode:'opaque',projectVersion:'test-only',coverRequired:false}));
 if(broken)fs.writeFileSync(path.join(root,'scripts/review-summary.mjs'),'process.exit(42);\n');
 return root;
}
function run(root,args){return spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:30000,env:{...process.env,VWP_METRICS:'',VWP_METRICS_PARENT_EVENT:'',VWP_METRICS_RUN_ID:''}});}
function stage(root){const dir=path.join(root,'output/delivery-package');return path.join(dir,fs.readdirSync(dir)[0]);}

test('package contains only selected run snapshot; open package timing stays unknown in archive',{skip:!zipAvailable},t=>{
 const root=fixture(t);
 assert.equal(run(root,['scripts/measure-stage.mjs','--stage=qa','--label=earlier','--run-id=earlier-run','--',process.execPath,'-e','void 0']).status,0);
 const result=run(root,['scripts/measure-stage.mjs','--best-effort','--stage=package','--label=package-delivery','--run-id=current-run','--',process.execPath,'--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 const target=stage(root),review=JSON.parse(fs.readFileSync(path.join(target,'output/review/current-run/summary.json'),'utf8'));
 assert.equal(review.runId,'current-run');assert.equal(review.declaredProjectStatus,'partial');assert.equal(review.notAnAcceptanceRecord,true);assert.equal(review.measurements.unfinishedAttempts,1);assert.equal(review.measurements.terminalAttempts,0);assert.equal(review.measurements.endToEndMs,null);
 assert.deepEqual(fs.readdirSync(path.join(target,'output/review')),['current-run']);
 for(const file of ['summary.md','fix-agent-handoff.json'])assert.equal(fs.existsSync(path.join(target,'output/review/current-run',file)),true);
 const archived=fs.readFileSync(path.join(target,'output/metrics/stage-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const live=fs.readFileSync(path.join(root,'output/metrics/stage-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(archived.filter(e=>e.runId==='current-run'&&e.eventType==='finished').length,0);assert.equal(live.filter(e=>e.runId==='current-run'&&e.eventType==='finished').length,1);
 assert.equal(fs.readdirSync(path.join(root,'output')).some(name=>name.endsWith('.zip')),true);
});
test('failed diagnostic remains nonfatal to an explicitly requested synthetic draft package',{skip:!zipAvailable},t=>{
 const root=fixture(t,{broken:true});const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);
 assert.equal(result.status,0,result.stderr);assert.match(result.stderr,/review snapshot unavailable/);assert.equal(fs.existsSync(path.join(stage(root),'output/review')),false);
});
test('review helper cannot bypass existing real delivery gates',{skip:!zipAvailable},t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'scripts/review-summary.mjs'),'require("node:fs").writeFileSync("should-not-run", "no");\n');
 const result=run(root,['--import',loader,'scripts/package-delivery.ts']);assert.notEqual(result.status,0);assert.match(result.stderr,/Final render-result.json is required/);assert.equal(fs.existsSync(path.join(root,'should-not-run')),false);assert.equal(fs.existsSync(path.join(root,'output/delivery-package')),false);
});
test('default package remains media/evidence only even when source selection exists',{skip:!zipAvailable},t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'source-delivery-manifest.json'),'invalid JSON must not be read without opt-in');
 fs.mkdirSync(path.join(root,'src'),{recursive:true});fs.writeFileSync(path.join(root,'src/private-draft.txt'),'UNSELECTED-SYNTHETIC-SOURCE');
 const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.equal(result.status,0,result.stderr);
 assert.equal(fs.existsSync(path.join(stage(root),'source-project')),false);assert.equal(fs.existsSync(path.join(stage(root),'source-handoff-report.json')),false);
 assert.match(fs.readFileSync(path.join(stage(root),'delivery-summary.md'),'utf8'),/media\/evidence only; editable source project and original assets are not included/);
});
test('source opt-in cannot infer a missing selection/authorization manifest',{skip:!zipAvailable},t=>{
 const root=fixture(t),result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete','--include-source']);
 assert.notEqual(result.status,0);assert.match(result.stderr,/source-delivery-manifest\.json/);
 assert.equal(fs.readdirSync(path.join(root,'output')).some(name=>name.endsWith('.zip')),false);
});
test('explicit source handoff archives only selected hash-bound files and labels a partial snapshot',{skip:!zipAvailable},t=>{
 const root=fixture(t);fs.mkdirSync(path.join(root,'src/video'),{recursive:true});fs.writeFileSync(path.join(root,'src/video/index.ts'),'// Synthetic selected source only.\n');fs.writeFileSync(path.join(root,'src/video/unselected.ts'),'UNSELECTED-SOURCE');
 fs.writeFileSync(path.join(root,'source-delivery-manifest.json'),JSON.stringify({schema:1,scope:'selected-source-snapshot',rationale:'Synthetic packaging integration test only.',authorization:{request:'SYNTHETIC TEST ONLY: include these two fixture files.'},files:['package.json','src/video/index.ts']}));
 const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete','--include-source']);assert.equal(result.status,0,result.stderr);
 const target=stage(root),report=JSON.parse(fs.readFileSync(path.join(target,'source-handoff-report.json'),'utf8'));assert.equal(report.kind,'selected-source-snapshot');assert.equal(report.status,'partial');assert.equal(report.minimumInputs.met,false);assert.equal(report.files.length,2);
 assert.equal(fs.existsSync(path.join(target,'source-project/src/video/unselected.ts')),false);
 const archive=path.join(root,'output',fs.readdirSync(path.join(root,'output')).find(name=>name.endsWith('.zip')));
 for(const item of report.files){const bytes=fs.readFileSync(path.join(target,item.packagePath));assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(),item.sha256);const archived=spawnSync('unzip',['-p',archive,item.packagePath]);if(!archived.error){assert.equal(archived.status,0);assert.deepEqual(archived.stdout,bytes);}}
 assert.match(fs.readFileSync(path.join(target,'delivery-summary.md'),'utf8'),/selected source snapshot \(partial; not a complete\/offline-runnable project guarantee\)/);
});

test('optional diagnostics use an allowlist and never archive symlink/hardlink targets',{skip:!zipAvailable},t=>{
 for(const variant of ['log-symlink','log-hardlink','metrics-extra','review-extra','review-parent']){
  const root=fixture(t),outside=fs.mkdtempSync(path.join(tmpdir(),'vwp-private-fixture-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const secret='SYNTHETIC-EXTERNAL-BYTES-MUST-NOT-BE-IN-PACKAGE',source=path.join(outside,'private.txt');fs.writeFileSync(source,secret);
  fs.mkdirSync(path.join(root,'output/metrics'),{recursive:true});
  if(variant==='log-symlink')fs.symlinkSync(source,path.join(root,'output/metrics/stage-events.jsonl'));
  if(variant==='log-hardlink')fs.linkSync(source,path.join(root,'output/metrics/stage-events.jsonl'));
  if(variant==='metrics-extra')fs.symlinkSync(source,path.join(root,'output/metrics/unrelated.txt'));
  if(variant==='review-extra'){
   fs.writeFileSync(path.join(root,'output/metrics/active-run.json'),JSON.stringify({schema:1,runId:'selected-run'}));
   fs.mkdirSync(path.join(root,'output/review/selected-run'),{recursive:true});fs.symlinkSync(source,path.join(root,'output/review/selected-run/unrelated.txt'));
  }
  if(variant==='review-parent')fs.symlinkSync(outside,path.join(root,'output/review'),'dir');
  const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.equal(result.status,0,variant+'\n'+result.stderr);
  const inspect=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,entry.name);assert.equal(fs.lstatSync(full).isSymbolicLink(),false);if(entry.isDirectory())inspect(full);else assert.equal(fs.readFileSync(full,'utf8').includes(secret),false,variant+' '+full);}};
  inspect(stage(root));assert.equal(fs.readFileSync(source,'utf8'),secret);
  const archive=fs.readdirSync(path.join(root,'output')).find(name=>name.endsWith('.zip'));assert.ok(archive);
  const unzipped=spawnSync('unzip',['-p',path.join(root,'output',archive)],{encoding:'utf8'});if(!unzipped.error){assert.equal(unzipped.status,0);assert.equal(unzipped.stdout.includes(secret),false);}
 }
});
test('unsafe essential delivery directories are refused, not followed or silently omitted',{skip:!zipAvailable},t=>{
 for(const kind of ['symlink','hardlink']){
  const root=fixture(t),outside=fs.mkdtempSync(path.join(tmpdir(),'vwp-essential-private-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const secret=path.join(outside,'private.txt');fs.writeFileSync(secret,'SYNTHETIC-ESSENTIAL-EXTERNAL-BYTES');fs.mkdirSync(path.join(root,'output/cover'),{recursive:true});
  if(kind==='symlink')fs.symlinkSync(secret,path.join(root,'output/cover/linked.txt'));else fs.linkSync(secret,path.join(root,'output/cover/linked.txt'));
  const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.notEqual(result.status,0);assert.match(result.stderr,/Unsafe/);assert.equal(fs.readdirSync(path.join(root,'output')).some(name=>name.endsWith('.zip')),false);
 }
});
test('linked delivery summary cannot mutate external files',{skip:!zipAvailable},t=>{
 for(const kind of ['symlink','hardlink']){
  const root=fixture(t),outside=fs.mkdtempSync(path.join(tmpdir(),'vwp-summary-private-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));const external=path.join(outside,'keep.txt');fs.writeFileSync(external,'KEEP-SYNTHETIC-PRIVATE-BYTES');fs.mkdirSync(path.join(root,'output'));
  if(kind==='symlink')fs.symlinkSync(external,path.join(root,'output/delivery-summary.md'));else fs.linkSync(external,path.join(root,'output/delivery-summary.md'));
  const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.notEqual(result.status,0);assert.equal(fs.readFileSync(external,'utf8'),'KEEP-SYNTHETIC-PRIVATE-BYTES');assert.equal(fs.readdirSync(path.join(root,'output')).some(name=>name.endsWith('.zip')),false);
 }
});

test('every archived handoff reference matches actual ZIP bytes and summary identity',{skip:!zipAvailable},t=>{
 const root=fixture(t);assert.equal(run(root,['scripts/measure-stage.mjs','--begin','--run-id=frozen-run']).status,0);
 assert.equal(run(root,['scripts/measure-stage.mjs','--stage=qa','--label=before-package','--',process.execPath,'-e','void 0']).status,0);
 const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 const target=stage(root),relative='output/review/frozen-run',handoff=JSON.parse(fs.readFileSync(path.join(target,relative,'fix-agent-handoff.json'),'utf8')),summary=JSON.parse(fs.readFileSync(path.join(target,relative,'summary.json'),'utf8'));
 assert.equal(handoff.summaryPath,`${relative}/summary.json`);assert.equal(handoff.summaryId,summary.summaryId);assert.equal(handoff.deepReview.authorized,false);
 const archive=path.join(root,'output',fs.readdirSync(path.join(root,'output')).find(name=>name.endsWith('.zip')));
 for(const evidence of handoff.allowedEvidence){
  const bytes=fs.readFileSync(path.join(target,evidence.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.sha256,evidence.path);
  const archived=spawnSync('unzip',['-p',archive,evidence.path]);if(!archived.error){assert.equal(archived.status,0);assert.equal(createHash('sha256').update(archived.stdout).digest('hex'),evidence.sha256,evidence.path);}
 }
});
for(const mutation of ['append','remove','remove-summary'])test(`post-summary ${mutation} cannot leave a falsely fresh archived handoff`,{skip:!zipAvailable},t=>{
 const root=fixture(t);assert.equal(run(root,['scripts/measure-stage.mjs','--stage=qa','--label=before-package','--run-id=snapshot-run','--',process.execPath,'-e','void 0']).status,0);
 // Deliberately change evidence after the helper freezes its summary. This is a
 // deterministic fixture of the same window as a parallel command finishing.
 fs.renameSync(path.join(root,'scripts/review-summary.mjs'),path.join(root,'scripts/review-summary-real.mjs'));
 fs.writeFileSync(path.join(root,'scripts/review-summary.mjs'),`import fs from 'node:fs';import {writeReviewSummary} from './review-summary-real.mjs';const result=writeReviewSummary(process.cwd(),{runId:'snapshot-run',status:'partial'});${mutation==='append'?"fs.appendFileSync('output/metrics/stage-events.jsonl','\\n');":mutation==='remove'?"fs.unlinkSync('output/metrics/stage-events.jsonl');":"fs.unlinkSync(result.paths[0]);"}console.log(JSON.stringify(result));\n`);
 const result=run(root,['--import',loader,'scripts/package-delivery.ts','--allow-incomplete']);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 const target=stage(root);for(const name of ['summary.json','summary.md','fix-agent-handoff.json'])assert.equal(fs.existsSync(path.join(target,'output/review/snapshot-run',name)),false);
 assert.match(result.stderr,/review evidence changed or is unavailable/);
 assert.match(fs.readFileSync(path.join(target,'delivery-summary.md'),'utf8'),/local review: unavailable; metrics coverage unknown/);
 const archive=path.join(root,'output',fs.readdirSync(path.join(root,'output')).find(name=>name.endsWith('.zip'))),listed=spawnSync('unzip',['-Z1',archive],{encoding:'utf8'});if(!listed.error){assert.equal(listed.status,0);assert.equal(listed.stdout.includes('fix-agent-handoff.json'),false);assert.equal(listed.stdout.includes('output/review/snapshot-run/summary.'),false);}
});

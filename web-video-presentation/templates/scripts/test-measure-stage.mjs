/** Offline subprocess fixtures only, not production render/performance evidence. */
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const wrapper = fileURLToPath(new URL('./measure-stage.mjs', import.meta.url));
const log = 'output/metrics/stage-events.jsonl';
const base = ['--stage=qa','--label=fixture'];
function workspace(t) { const root=fs.mkdtempSync(path.join(tmpdir(),'vwp-metrics-test-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true})); return root; }
function invoke(root,args,env={}) { return spawnSync(process.execPath,[wrapper,...args],{cwd:root,encoding:'utf8',timeout:10000,env:{...process.env,VWP_METRICS:'',VWP_METRICS_RUN_ID:'',VWP_METRICS_PARENT_EVENT:'',...env}}); }
function run(root,source='void 0',options=base,env={},extra=[]) { return invoke(root,[...options,'--',process.execPath,'-e',source,'--',...extra],env); }
function events(root) { return fs.readFileSync(path.join(root,log),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
function finished(root) { return events(root).filter(e=>e.eventType==='finished'); }

test('schema2 start and finish share an ID; command output/arguments/exit preserved',t=>{
 const root=workspace(t), result=run(root,'console.log(process.argv[1]); process.exit(23)',[...base,'--attempt=3','--workload-id=clip-a'],{},['a space; not a shell']);
 assert.equal(result.status,23,result.stderr);assert.match(result.stdout,/a space; not a shell/);
 const [start,end]=events(root);assert.equal(start.schema,2);assert.equal(start.eventType,'started');assert.equal(start.status,'running');assert.equal(start.elapsedMs,null);assert.equal(end.eventType,'finished');assert.equal(start.eventId,end.eventId);assert.equal(end.status,'failed');assert.equal(end.exitCode,23);assert.equal(end.attempt,3);assert.equal(end.workloadId,'clip-a');assert.ok(end.elapsedMs>0);assert.equal(end.command,path.basename(process.execPath));assert.equal(end.scope,'isolated-invocation');
});
test('commands without explicit run selection never combine historical runs',t=>{
 const root=workspace(t);assert.equal(run(root).status,0);assert.equal(run(root).status,0);
 const list=finished(root);assert.notEqual(list[0].runId,list[1].runId);assert.deepEqual(list.map(e=>e.attempt),[1,1]);assert.equal(fs.existsSync(path.join(root,'output/metrics/active-run.json')),false);
});
test('begin/resume/end select a known project run explicitly; new runs stay separate',t=>{
 const root=workspace(t);assert.equal(invoke(root,['--begin','--run-id=video-1']).status,0);
 assert.equal(run(root).status,0);assert.equal(run(root).status,0);assert.deepEqual(finished(root).map(e=>[e.runId,e.attempt,e.scope]),[['video-1',1,'project-run'],['video-1',1,'project-run']]);
 assert.equal(invoke(root,['--begin','--run-id=video-2']).status,73);assert.equal(invoke(root,['--resume','--run-id=video-2']).status,73);
 assert.equal(invoke(root,['--end']).status,0);assert.equal(invoke(root,['--resume','--run-id=unknown']).status,73);assert.equal(invoke(root,['--begin','--run-id=video-1']).status,73);
 assert.equal(invoke(root,['--resume','--run-id=video-1']).status,0);assert.equal(run(root).status,0);assert.equal(finished(root).at(-1).attempt,1);
 assert.equal(invoke(root,['--end']).status,0);assert.equal(invoke(root,['--begin','--run-id=video-2']).status,0);assert.equal(run(root).status,0);assert.equal(finished(root).at(-1).runId,'video-2');
});
test('off disables evidence and preserves real child failure',t=>{
 const root=workspace(t);assert.equal(run(root,'process.exit(17)',base,{VWP_METRICS:'off'}).status,17);assert.equal(fs.existsSync(path.join(root,'output')),false);
});
test('nested wrappers do not double-count the same interval',t=>{
 const root=workspace(t);const result=invoke(root,[...base,'--',process.execPath,wrapper,'--stage=render','--label=nested','--',process.execPath,'-e','void 0']);
 assert.equal(result.status,0,result.stderr);assert.equal(finished(root).length,1);assert.equal(finished(root)[0].label,'fixture');
});
test('secret-like argv, source, and unrelated environment values never appear in metrics',t=>{
 const root=workspace(t);assert.equal(run(root,'void 0',base,{EXAMPLE_SECRET:'redact-env-example'},['redact-argv-example']).status,0);
 const raw=fs.readFileSync(path.join(root,log),'utf8');for(const secret of ['redact-env-example','redact-argv-example','void 0',process.execPath])assert.equal(raw.includes(secret),false);
 for(const event of events(root))for(const name of ['argv','args','env'])assert.equal(Object.hasOwn(event,name),false);
});
test('unsafe IDs/options fail without invoking the child or creating output',t=>{
 const root=workspace(t);for(const opts of [['--begin','--run-id=../escape'],['--resume'],['--end','--run-id=x'],[...base,'--attempt=0'],['--stage=bad','--label=fixture'],[...base,'--run-id='],[...base,'--label=duplicate'],[...base,'--output=/tmp/no']]){
 const args=opts.some(o=>['--begin','--resume','--end'].includes(o))?opts:[...opts,'--',process.execPath,'-e','void 0'];assert.equal(invoke(root,args).status,2,JSON.stringify(opts));}
 assert.equal(fs.existsSync(path.join(root,'output')),false);
});
test('manual unsafe metrics path refuses execution; production best-effort preserves success/failure',t=>{
 const root=workspace(t),outside=workspace(t);fs.symlinkSync(outside,path.join(root,'output'),'dir');
 const source='require("node:fs").writeFileSync("ran", "yes")';assert.equal(run(root,source).status,73);assert.equal(fs.existsSync(path.join(root,'ran')),false);
 assert.equal(run(root,source,[...base,'--best-effort']).status,0);assert.equal(fs.existsSync(path.join(root,'ran')),true);
 assert.equal(run(root,'process.exit(29)',[...base,'--best-effort']).status,29);assert.deepEqual(fs.readdirSync(outside),[]);
});
test('active metadata/log symlinks and hardlinks cannot redirect evidence',t=>{
 for(const file of ['active-run.json','stage-events.jsonl'])for(const kind of ['symlink','hardlink']){
  const root=workspace(t),outside=workspace(t);fs.mkdirSync(path.join(root,'output/metrics'),{recursive:true});const target=path.join(outside,'target');fs.writeFileSync(target,'unchanged');
  if(kind==='symlink')fs.symlinkSync(target,path.join(root,'output/metrics',file));else fs.linkSync(target,path.join(root,'output/metrics',file));
  assert.equal(run(root).status,73);assert.equal(run(root,'void 0',[...base,'--best-effort']).status,0);assert.equal(fs.readFileSync(target,'utf8'),'unchanged');
 }
});
test('missing command produces paired spawn-error evidence and status 127',t=>{
 const root=workspace(t);assert.equal(invoke(root,[...base,'--',path.join(root,'not-an-executable')]).status,127);const event=finished(root)[0];assert.equal(event.status,'spawn-error');assert.equal(event.errorCode,'ENOENT');assert.equal(event.exitCode,null);
});
test('SIGTERM forwards to direct child and produces interrupted evidence', {skip:process.platform==='win32'},async t=>{
 const root=workspace(t);const result=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[wrapper,...base,'--',process.execPath,'-e','process.on("SIGTERM",()=>process.exit(0)); console.log("ready"); setInterval(()=>{},1000)'],{cwd:root,env:{...process.env,VWP_METRICS:'',VWP_METRICS_RUN_ID:'',VWP_METRICS_PARENT_EVENT:''},stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('signal fixture timed out'));},5000);let output='',sent=false;
  child.stdout.on('data',chunk=>{output+=chunk;if(!sent&&output.includes('ready')){sent=true;assert.equal(events(root)[0].eventType,'started');child.kill('SIGTERM');}});
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve(code);});
 });assert.equal(result,143);assert.equal(finished(root)[0].status,'interrupted');assert.equal(finished(root)[0].signal,'SIGTERM');assert.equal(finished(root)[0].exitCode,0);
});

// Actual CLI processes; a test-only preload aligns startup and slows run-file I/O
// to make the old read/check/write race reproducible without editing the wrapper.
async function competingLifecycle(root, mode, ids) {
 const ready=path.join(root,'race-ready'),gate=path.join(root,'race-go'),preload=path.join(root,'race-preload.mjs');
 fs.mkdirSync(ready);
 fs.writeFileSync(preload,`import fs from 'node:fs';import path from 'node:path';const wait=new Int32Array(new SharedArrayBuffer(4));fs.writeFileSync(path.join(${JSON.stringify(ready)},process.env.VWP_RACE_ID),'ready');const until=Date.now()+8000;while(!fs.existsSync(${JSON.stringify(gate)})){if(Date.now()>until)throw new Error('Fixture barrier timeout');Atomics.wait(wait,0,0,5);}const open=fs.openSync;fs.openSync=function(name,...args){if(String(name).replaceAll('\\\\','/').includes('/output/metrics/runs/'))Atomics.wait(wait,0,0,300);return open.call(this,name,...args);};`);
 const jobs=ids.map(id=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--import',preload,wrapper,`--${mode}`,`--run-id=${id}`],{cwd:root,env:{...process.env,VWP_METRICS:'',VWP_METRICS_RUN_ID:'',VWP_METRICS_PARENT_EVENT:'',VWP_RACE_ID:id},stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',b=>stderr+=b);const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Concurrent lifecycle fixture timed out'));},10000);
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({id,code,stderr});});
 }));
 const until=Date.now()+8000;
 while(fs.readdirSync(ready).length<ids.length){if(Date.now()>until)throw new Error('Concurrent startup fixture timed out');await new Promise(resolve=>setTimeout(resolve,5));}
 fs.writeFileSync(gate,'go');return Promise.all(jobs);
}
for(const mode of ['begin','resume'])test(`competing ${mode} calls have exactly one successful active-run owner`,async t=>{
 const root=workspace(t),ids=Array.from({length:6},(_,index)=>`competing-${index}`);
 if(mode==='resume')for(const id of ids){assert.equal(invoke(root,['--begin',`--run-id=${id}`]).status,0);assert.equal(invoke(root,['--end']).status,0);}
 const results=await competingLifecycle(root,mode,ids),winners=results.filter(item=>item.code===0);
 assert.equal(winners.length,1,JSON.stringify(results));for(const item of results)assert.ok([0,73].includes(item.code),JSON.stringify(item));
 const active=JSON.parse(fs.readFileSync(path.join(root,'output/metrics/active-run.json'),'utf8'));assert.equal(active.runId,winners[0].id);
 assert.equal(run(root).status,0);assert.equal(finished(root).at(-1).runId,winners[0].id);
 assert.equal(fs.existsSync(path.join(root,'output/metrics/.run-lifecycle.lock')),false);
 if(mode==='begin')assert.deepEqual(fs.readdirSync(path.join(root,'output/metrics/runs')),[`${winners[0].id}.json`]);
});
test('same active run can resume without changing its identity or start time',t=>{
 const root=workspace(t);assert.equal(invoke(root,['--begin','--run-id=same-run']).status,0);const filename=path.join(root,'output/metrics/active-run.json'),before=fs.readFileSync(filename,'utf8');
 assert.equal(invoke(root,['--resume','--run-id=same-run']).status,0);assert.equal(fs.readFileSync(filename,'utf8'),before);assert.equal(run(root).status,0);assert.equal(finished(root).at(-1).runId,'same-run');
});
test('pre-existing lifecycle lock is never stolen or silently removed',t=>{
 const root=workspace(t);assert.equal(invoke(root,['--begin','--run-id=kept-run']).status,0);const filename=path.join(root,'output/metrics/.run-lifecycle.lock'),active=fs.readFileSync(path.join(root,'output/metrics/active-run.json'),'utf8');fs.writeFileSync(filename,'SYNTHETIC-CRASHED-OWNER');
 for(const args of [['--begin','--run-id=other'],['--resume','--run-id=kept-run'],['--end']]){const result=invoke(root,args);assert.equal(result.status,73);assert.match(result.stderr,/no automatic takeover/);assert.equal(fs.readFileSync(filename,'utf8'),'SYNTHETIC-CRASHED-OWNER');assert.equal(fs.readFileSync(path.join(root,'output/metrics/active-run.json'),'utf8'),active);}
});

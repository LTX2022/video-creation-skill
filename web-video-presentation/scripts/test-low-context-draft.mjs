/** Real isolated CLI/scaffold tests; not a weak-model or video-quality benchmark. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const cli=fileURLToPath(new URL('./prepare-cinema-title-draft.mjs',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(p));
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'low-context-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const request=path.join(root,'request.json'),target=path.join(root,'drafts');
 const write=v=>fs.writeFileSync(request,JSON.stringify(v));
 write({schema:1,titles:[{id:'title-a',title:'清晨之前'},{id:'title-b',title:'下一束光'}]});
 const run=(env=process.env)=>spawnSync(process.execPath,[cli,request,target,'--draft-only'],{cwd:root,encoding:'utf8',env});
 return {root,request,target,write,run};
}
test('empty external workspace + short request creates actual isolated draft projects, never approval/video',t=>{
 const f=fixture(t),result=f.run();assert.equal(result.status,0,result.stderr);
 const report=read(path.join(f.target,'draft-report.json'));
 assert.equal(report.status,'draft-only');assert.equal(report.rendered,false);assert.equal(report.humanApprovalVerified,false);
 assert.equal(read(path.join(f.target,'batch-lock.json')).anchor,null);
 assert.equal(report.projects.length,2);
 for(const [index,item] of report.projects.entries()) {
  const project=path.join(f.target,'projects',item.id);
  assert.ok(fs.existsSync(path.join(project,'package.json')));
  assert.ok(!fs.existsSync(path.join(project,'node_modules')));
  assert.deepEqual(read(path.join(project,'src/chapters/01-example/batch-content.json')),{title:index===0?'清晨之前':'下一束光'});
  const state=read(path.join(project,'project-state.json'));
  assert.equal(state.finalRenderApproved,false);assert.equal(state.firstChapterUserAccepted,false);
  assert.deepEqual(state.acceptedChapterIds,[]);assert.equal(state.timingMode,'explicit');
  assert.equal(state.stepTimings.reduce((n,s)=>n+s.durationInFrames,0),540);
  assert.ok(!fs.existsSync(path.join(project,'output/full.mp4')));
 }
 assert.match(fs.readFileSync(path.join(f.target,'NEXT.md'),'utf8'),/Stop on the first error/);
 const before=fs.readFileSync(path.join(f.target,'draft-report.json'));
 assert.notEqual(f.run().status,0);assert.deepEqual(fs.readFileSync(path.join(f.target,'draft-report.json')),before);
});
for(const [name,titles] of [
 ['overlong',[{id:'a',title:'长'.repeat(25)}]],
 ['duplicate ids',[{id:'a',title:'甲'},{id:'a',title:'乙'}]],
 ['path traversal',[{id:'../escape',title:'甲'}]],
 ['layout injection',[{id:'a',title:'甲',fontSize:7}]],
 ['line separator',[{id:'a',title:'甲\u2028乙'}]],
 ['empty',[]],
]) test(name+' rejected before directory creation',t=>{
 const f=fixture(t);f.write({schema:1,titles});assert.notEqual(f.run().status,0);assert.equal(fs.existsSync(f.target),false);
});
test('symlink input rejected without output',t=>{
 const f=fixture(t);fs.renameSync(f.request,path.join(f.root,'source.json'));fs.symlinkSync(path.join(f.root,'source.json'),f.request);
 assert.notEqual(f.run().status,0);assert.equal(fs.existsSync(f.target),false);
});
test('subprocess failure preserves snapshots, explicit blocked/not-started state and recovery instructions',t=>{
 const f=fixture(t),bin=path.join(f.root,'bin');fs.mkdirSync(bin);
 fs.writeFileSync(path.join(bin,'bash'),'#!/bin/sh\necho synthetic-scaffold-failure >&2\nexit 42\n',{mode:0o755});
 const result=f.run({...process.env,PATH:bin});assert.notEqual(result.status,0);
 const report=read(path.join(f.target,'draft-report.json'));
 assert.equal(report.status,'blocked');assert.equal(report.projects[0].status,'blocked');assert.equal(report.projects[1].status,'not-started');
 assert.match(report.projects[0].error,/synthetic-scaffold-failure/);
 assert.ok(fs.existsSync(path.join(f.target,'request.snapshot.json')));
 assert.ok(fs.existsSync(path.join(f.target,'NEXT.md')));
 assert.equal(report.rendered,false);
});

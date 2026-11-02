import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
const skill=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for(const profile of ['douyin-laon','douyin-skill']) {
 test(`${profile} preserves explicit theme and subtitles=false`,t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'vwp-choice-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const target=path.join(parent,'client project');
  const result=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,`--profile=${profile}`,'--theme=paper-press','--subtitles=false','--skip-install'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const marker=JSON.parse(fs.readFileSync(path.join(target,'.web-video-presentation-project.json')));
  const state=JSON.parse(fs.readFileSync(path.join(target,'project-state.json')));
  const skillVersion=JSON.parse(fs.readFileSync(path.join(skill,'VERSION.json'))).version;
  assert.equal(marker.projectVersion,skillVersion);assert.equal(state.projectVersion,skillVersion);
  assert.equal(marker.theme,'paper-press');assert.equal(state.subtitlesRequested,false);
  assert.equal(state.developmentMode,'sequential');assert.equal(state.postAnchorParallelDefault,false);
  assert.equal(fs.existsSync(path.join(target,'node_modules')),false);
 });
 test(`${profile} rejects invalid explicit theme instead of hiding it`,t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'vwp-choice-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const target=path.join(parent,'client project');
  const result=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,`--profile=${profile}`,'--theme=missing-theme-98765','--skip-install'],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.equal(fs.existsSync(target),false);
 });
}

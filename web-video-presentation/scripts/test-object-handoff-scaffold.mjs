import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('fresh scaffold wires complete optional handoff modules at real import paths; executes their model',()=>{
 const dir=mkdtempSync(join(tmpdir(),'handoff-scaffold-'));const project=join(dir,'project');
 try{
  execFileSync('bash',[join(root,'scripts/scaffold.sh'),project,'--profile=custom','--format=landscape','--fps=30','--skip-install'],{stdio:'pipe'});
  for(const rel of ['src/video/object-track.ts','src/video/temporal-sampling.ts','src/examples/object-handoff/model.ts','src/examples/object-handoff/draw.ts','src/examples/object-handoff/ObjectHandoff.tsx','src/examples/object-handoff/preview-timing.ts']){
   assert.ok(existsSync(join(project,rel)),rel);
   assert.equal(readFileSync(join(project,rel),'utf8'),readFileSync(join(root,'templates',rel),'utf8'));
  }
  assert.equal(existsSync(join(project,'src/examples/model.ts')),false,'no flattened example');
  assert.equal(existsSync(join(project,'node_modules')),false,'no dependency installation');
  const state=JSON.parse(readFileSync(join(project,'project-state.json'),'utf8'));
  assert.equal(state.audioRequested,false);assert.equal(state.subtitlesRequested,false);
  execFileSync(process.execPath,['--import',join(root,'scripts/register-ts-runtime.mjs'),'--test',join(project,'src/video/object-track.test.ts')],{stdio:'pipe'});
 }finally{rmSync(dir,{recursive:true,force:true});}
});

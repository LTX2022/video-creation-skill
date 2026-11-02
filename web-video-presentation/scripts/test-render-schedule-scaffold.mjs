import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('real fresh scaffold carries and executes production render schedule contracts without install',()=>{
 const dir=mkdtempSync(join(tmpdir(),'render-schedule-'));const project=join(dir,'project');
 try{
  execFileSync('bash',[join(root,'scripts/scaffold.sh'),project,'--profile=custom','--format=landscape','--fps=30','--skip-install'],{stdio:'pipe'});
  for(const rel of ['src/video/render-schedule.ts','src/video/render-schedule.test.ts','src/video/RemotionRoot.tsx']) {
   assert.equal(readFileSync(join(project,rel),'utf8'),readFileSync(join(root,'templates',rel),'utf8'));
  }
  const source=readFileSync(join(project,'src/video/RemotionRoot.tsx'),'utf8');
  assert.match(source,/buildRenderSchedule\(STEPS, DEFAULT_STEP_FRAMES\)/);
  assert.doesNotMatch(source,/STEPS\[STEPS.length - 1\]/);
  assert.equal((source.match(/durationInFrames=\{TOTAL_FRAMES\}/g)||[]).length,3,'full, alpha and composite share safe duration');
  assert.match(JSON.parse(readFileSync(join(project,'package.json'),'utf8')).scripts['test:continuity'],/render-schedule.test.ts/);
  assert.equal(existsSync(join(project,'node_modules')),false);
  execFileSync(process.execPath,['--import',join(root,'scripts/register-ts-runtime.mjs'),'--test',join(project,'src/video/render-schedule.test.ts')],{stdio:'pipe'});
 }finally{rmSync(dir,{recursive:true,force:true});}
});

/** Integration regression: a real non-example silent chapter, no fake spoken script. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,unlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const tsxLoader=require.resolve('tsx');
const root=mkdtempSync(join(tmpdir(),'video-silent-contract-'));
const base={outputMode:'alpha',timingMode:'explicit',audioRequested:false,subtitlesRequested:false,stepTimings:[{chapter:'silent-real',step:1,durationInFrames:180}]};
const shot={steps:[{chapter:'silent-real',step:1,claim:'Synthetic regression fixture: one silent graphical mechanism'}]};
let count=0;
function run(label,state,expected){
  writeFileSync(join(root,'project-state.json'),JSON.stringify(state));
  const result=spawnSync(process.execPath,['--import',tsxLoader,join(root,'scripts/validate-narrations.ts')],{cwd:root,encoding:'utf8'});
  assert.equal(result.status===0,expected,`${label}\n${result.stdout}\n${result.stderr}`);
  console.log(`PASS ${label}`);count++;
}
try {
  for(const dir of ['scripts','src/registry','src/chapters/02-real-silent'])mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'package.json'),JSON.stringify({type:'module',name:'synthetic-silent-regression-only'}));
  writeFileSync(join(root,'scripts/validate-narrations.ts'),readFileSync(join(here,'validate-narrations.ts')));
  writeFileSync(join(root,'scripts/validate-screen-text.ts'),readFileSync(join(here,'validate-screen-text.ts')));
  writeFileSync(join(root,'scripts/screen-quality.ts'),readFileSync(join(here,'screen-quality.ts')));
  writeFileSync(join(root,'src/registry/chapters.ts'),`import {narrations} from '../chapters/02-real-silent/narrations';\nexport const CHAPTERS=[{id:'silent-real',narrations}];\n`);
  writeFileSync(join(root,'src/chapters/02-real-silent/narrations.ts'),`export const narrations=[''];\n`);
  writeFileSync(join(root,'src/chapters/02-real-silent/Chapter.tsx'),`export default function Chapter({step}:{step:number}){return step===0?<div>Mechanism</div>:null;}\n`);
  writeFileSync(join(root,'shot-manifest.json'),JSON.stringify(shot));
  run('non-example explicit silent alpha passes without script.md or fake narration',base,true);
  run('narration mode retains missing-script rejection',{...base,timingMode:'narration'},false);
  run('requested audio retains missing-script rejection',{...base,audioRequested:true},false);
  run('missing explicit timing is rejected',{...base,stepTimings:[]},false);
  unlinkSync(join(root,'shot-manifest.json'));
  run('scriptless silent route requires a real shot plan',base,false);
  writeFileSync(join(root,'shot-manifest.json'),JSON.stringify(shot));
  run('positive route is restored',base,true);
  function screen(label,flags,text,labels,expected){
    writeFileSync(join(root,'project-state.json'),JSON.stringify({...base,...flags}));
    writeFileSync(join(root,'timing-manifest.json'),JSON.stringify({steps:[{chapter:'silent-real',step:1,text}]}));
    writeFileSync(join(root,'shot-manifest.json'),JSON.stringify({steps:[{...shot.steps[0],scriptText:text,onScreenText:labels}]}));
    const result=spawnSync(process.execPath,['--import',tsxLoader,join(root,'scripts/validate-screen-text.ts')],{cwd:root,encoding:'utf8'});
    assert.equal(result.status===0,expected,`${label}\n${result.stdout}\n${result.stderr}`);
    console.log(`PASS ${label}`);count++;
  }
  screen('silent product and price labels do not duplicate empty narration',{},'', ['LUMA','¥299'],true);
  screen('empty narration is never a universal substring match',{audioRequested:true},'', ['LUMA','¥299'],true);
  screen('explicitly silent design text is not treated as spoken narration',{},'LUMA', ['LUMA','¥299'],true);
  screen('voiced necessary product label is allowed',{audioRequested:true},'LUMA is available', ['LUMA'],true);
  screen('captioned necessary product label is allowed',{subtitlesRequested:true},'LUMA is available', ['LUMA'],true);
  const paragraph='The product can now process every customer request without losing the original order or its status.';
  screen('substantial duplicate captions are still rejected',{subtitlesRequested:true},paragraph, [paragraph],false);
  screen('silent labels still reject hidden characters',{},'', ['LU\u200bMA'],false);
  screen('silent long titles use a review warning rather than an arbitrary length ban',{},'', ['This is a deliberate editorial headline'],true);
  console.log(`Silent route tests: ${count} passed`);
} finally {rmSync(root,{recursive:true,force:true});}

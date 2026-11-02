/** Real local generator regression: no browser, installation, TTS or acceptance mutation. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const loader=createRequire(import.meta.url).resolve('tsx');
const root=mkdtempSync(join(tmpdir(),'preset-manifest-'));
try {
 for(const path of ['scripts','src/config','src/registry','src/chapters/01-example','src/chapters/02-custom']) mkdirSync(join(root,path),{recursive:true});
 for(const name of ['build-shot-manifest.ts','delivery-contract.ts','input-revision.ts']) copyFileSync(join(here,name),join(root,'scripts',name));
 writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
 writeFileSync(join(root,'project-state.json'),JSON.stringify({outputMode:'opaque',subtitlesRequested:true}));
 writeFileSync(join(root,'src/config/videoFormat.ts'),'export const VIDEO_FORMAT={id:"portrait"};');
 writeFileSync(join(root,'src/config/themePreset.ts'),"export const THEME_PRESET_ID='paper-press';");
 writeFileSync(join(root,'src/registry/chapters.ts'),"import {narrations} from '../chapters/01-example/narrations';\nexport const CHAPTERS=[{id:'example',narrations}];");
 const plan=[0,1,2].map(i=>({presetId:'paper-press',presetFamily:'editorial',presetVariant:'warm-paper-evidence-spread',visualModel:'preset-editorial',compositionModel:'motion-graphic-lab',visualRecipe:'source-to-output-demo',motionStyle:'warm-grain',motionTechnique:'03-reveal',motionIntent:`真实纸稿动作${i}`,source:'src/video/presets/registry.ts#paper-press',screenTextIntent:'labels',onScreenText:['观察','证据'],visualStages:['原稿','标注','保持']}));
 writeFileSync(join(root,'src/chapters/01-example/narrations.ts'),`export const narrations=['原稿','标注','保持'];\nexport const presetShotPlan=${JSON.stringify(plan)};`);
 const run=(expected=true)=>{const r=spawnSync(process.execPath,['--import',loader,join(root,'scripts/build-shot-manifest.ts'),'--force'],{cwd:root,encoding:'utf8'});assert.equal(r.status===0,expected,r.stdout+'\n'+r.stderr);return r;};
 run(); let output=JSON.parse(readFileSync(join(root,'shot-manifest.json')));
 assert.equal(output.steps.length,3);
 output.steps.forEach((s,i)=>{assert.equal(s.presetId,'paper-press');assert.equal(s.motionIntent,plan[i].motionIntent);assert.equal(s.finishLevel,'draft');assert.equal(s.subtitleSafety.checked,false);assert.deepEqual(s.onScreenText,['观察','证据']);});
 console.log('PASS default example consumes real preset metadata and remains unreviewed');
 writeFileSync(join(root,'src/registry/chapters.ts'),"import {narrations} from '../chapters/02-custom/narrations';\nexport const CHAPTERS=[{id:'custom',narrations}];");
 writeFileSync(join(root,'src/chapters/02-custom/narrations.ts'),`export const narrations=['数据增长趋势'];\nexport const presetShotPlan=${JSON.stringify(plan)};`);
 run();output=JSON.parse(readFileSync(join(root,'shot-manifest.json')));
 assert.equal(output.steps.length,1);assert.equal(output.steps[0].presetId,undefined);assert.equal(output.steps[0].visualRecipe,'nyt-graph-reveal');assert.match(output.steps[0].source,/replace with/);
 console.log('PASS custom chapter keeps prior inference route and cannot opt into default-only preset override');
 writeFileSync(join(root,'src/registry/chapters.ts'),"import {narrations} from '../chapters/01-example/narrations';\nexport const CHAPTERS=[{id:'example',narrations}];");
 writeFileSync(join(root,'src/chapters/01-example/narrations.ts'),`export const narrations=['原稿','标注','保持'];export const presetShotPlan=[{}];`);
 const failed=run(false);assert.match(failed.stderr,/one metadata object per actual narration/);
 console.log('PASS malformed default plan fails closed');
 writeFileSync(join(root,'src/chapters/01-example/narrations.ts'),`export const narrations=['原稿','标注','保持'];export const presetShotPlan=${JSON.stringify(plan.map(s=>({...s,presetId:'swiss-ikb'})))};`);
 assert.match(run(false).stderr,/does not match the selected theme source/);
 console.log('PASS mismatched preset ID/token selection fails closed');
 // Exercise the REAL default narration module and registry for every newly selectable film.
 mkdirSync(join(root,'src/video/presets'),{recursive:true});
 for(const file of ['registry.ts','types.ts','narration.ts']) copyFileSync(join(here,'../src/video/presets',file),join(root,'src/video/presets',file));
 copyFileSync(join(here,'../src/chapters/01-example/narrations.ts'),join(root,'src/chapters/01-example/narrations.ts'));
 const films={'particle-depth-film':'ParticleField','spectral-material-film':'SpectralMaterial','kinetic-wireframe-film':'KineticWireframe','rain-platform-film':'RainPlatform'};
 for(const [id,component] of Object.entries(films)) {
  writeFileSync(join(root,'src/config/themePreset.ts'),`export const THEME_PRESET_ID='${id}';`);
  run();output=JSON.parse(readFileSync(join(root,'shot-manifest.json')));
  assert.equal(output.steps.length,3,id);
  for(const step of output.steps) {
   assert.equal(step.presetId,id);assert.equal(step.presetFamily,'reference');
   assert.ok(step.source.includes(`src/video/reference-styles/${component}.tsx`));
   assert.equal(step.finishLevel,'draft');assert.equal(step.subtitleSafety.checked,false);
   assert.ok(!step.motionIntent.includes('第二步，不要先套模板'));
  }
  console.log(`PASS ${id}: actual registry/default narration generates three unreviewed scene-bound shots`);
 }

} finally {rmSync(root,{recursive:true,force:true});}

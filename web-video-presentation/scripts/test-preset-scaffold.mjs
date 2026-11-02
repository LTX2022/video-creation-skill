import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {createHash} from 'node:crypto';
const skill=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseline=JSON.parse(fs.readFileSync(path.join(skill,'templates/src/video/presets/legacy-baseline.json'),'utf8'));
const originalIds=baseline.ids;
const newIds=['particle-depth-film','spectral-material-film','kinetic-wireframe-film','rain-platform-film'];
const allIds=[...originalIds,...newIds].sort();
const registry=fs.readFileSync(path.join(skill,'templates/src/video/presets/registry.ts'),'utf8');
test('source registry preserves the exact original 56 IDs and adds exactly four reference films',()=>{
 const ids=[...registry.matchAll(/id:\s*['"]([a-z0-9-]+)['"],\s*family:/g)].map(m=>m[1]).sort();
 assert.equal(originalIds.length,56);assert.equal(ids.length,60);assert.deepEqual(ids,allIds);
 assert.deepEqual(fs.readdirSync(path.join(skill,'themes')).filter(id=>fs.statSync(path.join(skill,'themes',id)).isDirectory()).sort(),allIds);
});
for(const theme of ['dark-tech-glow','paper-press','swiss-ikb',...newIds]) test(`${theme} production scaffold connects actual scene and original token CSS without installing`,t=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'vwp-preset-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const target=path.join(parent,'project');
 const child=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,'--profile=custom','--format=portrait',`--theme=${theme}`,'--skip-install'],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);
 assert.match(fs.readFileSync(path.join(target,'src/config/themePreset.ts'),'utf8'),new RegExp(`THEME_PRESET_ID = '${theme}'`));
 assert.equal(fs.readFileSync(path.join(target,'.theme'),'utf8').trim(),theme);
 assert.equal(fs.readFileSync(path.join(target,'src/styles/tokens.css'),'utf8'),fs.readFileSync(path.join(skill,'themes',theme,'tokens.css'),'utf8'));
 assert.match(fs.readFileSync(path.join(target,'src/chapters/01-example/Example.tsx'),'utf8'),/<PresetScene/);
 for(const file of ['PresetScene.tsx','registry.ts','types.ts','layout.ts','motion.ts','primitives.tsx','families-artistic.tsx','families-technical.tsx','family-soft.tsx','family-lesson.tsx','narration.ts','PresetProbeRoot.tsx','model.test.ts','legacy-baseline.json']) assert.ok(fs.existsSync(path.join(target,'src/video/presets',file)),file);
 for(const file of ['ReferenceScene.tsx','index.ts','common.ts','ParticleField.tsx','SpectralMaterial.tsx','KineticWireframe.tsx','RainPlatform.tsx','particle.test.tsx','material-type.test.tsx','rain.test.tsx']) assert.ok(fs.existsSync(path.join(target,'src/video/reference-styles',file)),file);
 const route=fs.readFileSync(path.join(target,'src/video/presets/PresetScene.tsx'),'utf8');
 assert.ok(route.indexOf("if (spec.family==='reference')")<route.indexOf('const layout=presetLayout('),'complete film routes before the old subject-card layout');
 assert.match(fs.readFileSync(path.join(target,'src/chapters/01-example/narrations.ts'),'utf8'),/presetNarrations\(THEME_PRESET_ID\)/);
 assert.match(fs.readFileSync(path.join(target,'src/chapters/01-example/narrations.ts'),'utf8'),/planForPreset\(THEME_PRESET_ID\)/);
 assert.ok(fs.existsSync(path.join(target,'src/examples/flow-continuity/FlowContinuity.tsx')),'old flow example preserved');
 assert.ok(fs.existsSync(path.join(target,'src/video/preset-probe-index.ts')),'explicit probe entry copied');
 assert.ok(!fs.existsSync(path.join(target,'node_modules')));
 const pkg=JSON.parse(fs.readFileSync(path.join(target,'package.json'),'utf8'));assert.match(pkg.scripts['test:presets'],/presets\/model.test.ts/);assert.match(pkg.scripts['test:reference-styles'],/reference-styles\/particle.test.tsx/);
});


test('actual subtitle visibility reaches default scene, including alpha/composite distinction',()=>{
 const root=fs.readFileSync(path.join(skill,'templates/src/video/RemotionRoot.tsx'),'utf8');
 const example=fs.readFileSync(path.join(skill,'templates/src/chapters/01-example/Example.tsx'),'utf8');
 assert.match(root,/subtitleVisible=\{SHOW_SUBTITLES\}/);assert.match(root,/subtitleVisible=\{subtitles && SHOW_SUBTITLES\}/);
 assert.match(example,/props\.subtitleVisible\?\?Boolean\(projectState.subtitlesRequested\)/);
 const probe=fs.readFileSync(path.join(skill,'templates/src/video/presets/PresetProbeRoot.tsx'),'utf8');
 assert.match(probe,/props\.presetId!==THEME_PRESET_ID/);
});

test('transparent probe preserves an explicitly requested subtitle and its layout reservation',()=>{
 const probe=fs.readFileSync(path.join(skill,'templates/src/video/presets/PresetProbeRoot.tsx'),'utf8');
 assert.match(probe,/<PresetScene[^>]+subtitleVisible=\{props\.subtitleVisible\}/);
 assert.match(probe,/<Subtitle[^>]+visible=\{props\.subtitleVisible\}/);
 assert.doesNotMatch(probe,/props\.subtitleVisible\s*&&\s*!alpha/);
 assert.match(probe,/subtitleVisible:false,subtitleText:/,'probe remains opt-in, not newly enabled by default');
 assert.match(probe,/const alpha=background==='transparent'/);
});


test('historical drawing/theme bytes unchanged except reviewed cinema text-helper extraction',()=>{
 const sha=source=>createHash('sha256').update(source).digest('hex');
 const entries=new Map([...registry.matchAll(/^  '([^']+)': \{\n.*?^  \},\n/gms)].map(m=>[m[1],m[0]]));
 for(const id of originalIds) assert.equal(sha(entries.get(id)),baseline.registryEntries[id],id);
 for(const [file,expected] of Object.entries(baseline.sourceFiles)) {
  let source=fs.readFileSync(path.join(skill,file),'utf8');
  // Preserve the ORIGINAL golden hash. Normalize only this reviewed mechanical extraction.
  if(file==='templates/src/video/presets/families-artistic.tsx') source=source
   .replace("import { cinemaTitleText } from './narration';\n",'')
   .replace("    const text=cinemaTitleText(content);\n",'')
   .replace('text={text.study}','text="AN ORIGINAL TITLE STUDY"')
   .replace('text={text.status(m.phase)}',"text={m.phase==='hold'?'片名停留 · 留出阅读时间':'遮罩揭示 · 同一文字对象'}");
  assert.equal(sha(source),expected,file);
 }
 const scene=fs.readFileSync(path.join(skill,'templates/src/video/presets/PresetScene.tsx'),'utf8')
  .replace("import { cinemaTitleText } from './narration';\n",'')
  .replace("spec.id==='cinema-title-card'?cinemaTitleText(content).phase(motion.phase):",'')
  .replace("import { ReferenceScene } from '../reference-styles/ReferenceScene';\n",'')
  .replace("  // Complete film scenes bypass the legacy heading/subject-card composition entirely.\n  if (spec.family==='reference') return <ReferenceScene {...props} content={content}/>;\n",'');
 assert.equal(sha(scene),baseline.legacyPresetSceneSha256,'old route is byte-identical after removing explicit reference routing and cinema helper extraction');
});

test('all four new IDs route to distinct complete scene components, not catchall family cards',()=>{
 const route=fs.readFileSync(path.join(skill,'templates/src/video/reference-styles/ReferenceScene.tsx'),'utf8');
 const expected={'particle-depth-film':'ParticleField','spectral-material-film':'SpectralMaterial','kinetic-wireframe-film':'KineticWireframe','rain-platform-film':'RainPlatform'};
 for(const [id,component] of Object.entries(expected)) {
  assert.ok(route.includes(`'${id}':${component}`),id);
  assert.match(registry,new RegExp(`id: '${id}', family: 'reference'`));
  const source=fs.readFileSync(path.join(skill,`templates/src/video/reference-styles/${component}.tsx`),'utf8');
  assert.match(source,/<svg/);assert.ok(source.includes(`data-preset-id="${id}"`),id);
  const meta=JSON.parse(fs.readFileSync(path.join(skill,`themes/${id}/theme.json`),'utf8'));
  assert.equal(meta.runtime.presetId,id);assert.equal(meta.runtime.component,`src/video/reference-styles/${component}.tsx`);
  assert.match(meta.runtime.palettePolicy,/not universal/);assert.equal(meta.review.aesthetic,'not-reviewed');
 }
});


test('rejected first film is absent from active routes and scaffold selection fails closed',t=>{
 const removed='ink-landscape-film';
 assert.ok(!fs.existsSync(path.join(skill,'themes',removed)));
 assert.ok(!fs.existsSync(path.join(skill,'templates/src/video/reference-styles/InkLandscape.tsx')));
 for(const relative of ['templates/src/video/presets/registry.ts','templates/src/video/presets/narration.ts','templates/src/video/reference-styles/ReferenceScene.tsx','templates/src/video/reference-styles/index.ts']) {
  assert.ok(!fs.readFileSync(path.join(skill,relative),'utf8').includes(removed),relative);
  assert.ok(!fs.readFileSync(path.join(skill,relative),'utf8').includes('InkLandscape'),relative);
 }
 const listed=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),'--list-themes'],{encoding:'utf8'});
 assert.equal(listed.status,0,listed.stderr);assert.ok(!listed.stdout.includes(removed));assert.match(listed.stdout,/forest-ink/);
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'vwp-rejected-preset-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const target=path.join(parent,'project');
 const rejected=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,'--profile=custom','--format=portrait',`--theme=${removed}`,'--skip-install'],{encoding:'utf8'});
 assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/找不到主题/);assert.ok(!fs.existsSync(target),'rejected theme must not create a partial project');
});

test('four retained films keep exact component, shared-clock, theme and registry hashes',()=>{
 const snapshot=JSON.parse(fs.readFileSync(path.join(skill,'templates/src/video/reference-styles/retained-reference-baseline.json'),'utf8'));
 const sha=source=>createHash('sha256').update(source).digest('hex');
 const entries=new Map([...registry.matchAll(/^  '([^']+)': \{\n.*?^  \},\n/gms)].map(m=>[m[1],m[0]]));
 assert.deepEqual([...snapshot.ids].sort(),[...newIds].sort());
 for(const id of snapshot.ids) assert.equal(sha(entries.get(id)),snapshot.registryEntries[id],id);
 for(const [file,expected] of Object.entries(snapshot.sourceFiles)) assert.equal(sha(fs.readFileSync(path.join(skill,file))),expected,file);
});

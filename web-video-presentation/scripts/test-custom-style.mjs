import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validate,save,scaffold} from './custom-style.mjs';
export function fixture(root) {
 fs.mkdirSync(path.join(root,'src'),{recursive:true});
 const id='orbital-morph-study';
 const shot={compositionModel:'hero-theater',visualRecipe:'source-to-output-demo',motionStyle:'shape-system',motionTechnique:'07-morph',motionIntent:'Same object moves and morphs, then holds',visualStages:['circle','rounded rectangle','hold'],onScreenText:[]};
 const meta={schema:1,id,name:'Orbital Morph Study',version:1,baseTheme:'midnight-press',status:'draft',narrations:['','',''],shots:[shot,shot,shot],references:[{kind:'original-test',source:'synthetic fixture; no external source studied',observed:'deterministic procedural circle-to-rectangle',rights:'original test code',limitations:'Not evidence of reference fidelity or visual approval'}],design:{composition:'One subject, normalized center',color:'Semantic palette',camera:'Fixed camera',motion:'smoothstep trajectory at 0–80% duration',morph:'Same rect retains identity; radius changes continuously',transitions:'No cut: shape continuity',rhythm:'80% action, 20% hold'}};
 const preset={id,family:'product',variant:'continuous-orbital-morph',layout:{heroSide:'center',density:1,subjectScale:1,titleScale:1,numberScale:1,titleWeight:500,corner:'soft',rule:'hairline',decoration:'none'},motion:{kind:'lift',setupEnd:.2,transformEnd:.8,stagger:0,travel:.2},content:{title:'Default original title',eyebrow:'',conclusion:'',labels:[]}};
 fs.writeFileSync(path.join(root,'style.json'),JSON.stringify(meta,null,2));fs.writeFileSync(path.join(root,'preset.json'),JSON.stringify(preset,null,2));
 fs.writeFileSync(path.join(root,'tokens.css'),':root { --surface: #101220; --accent: #34d399; }\n');
 fs.writeFileSync(path.join(root,'analysis.md'),'# Synthetic motion fixture\nNot a learned reference. Preserve object identity during movement and morph. Static/renderer review pending.\n');
 fs.writeFileSync(path.join(root,'src/Scene.tsx'),`import {createElement} from 'react';
import type {PresetSceneProps} from '../../presets/types';
export function Scene({frame,durationInFrames,width,height,isOverlay,content}:PresetSceneProps) {
 const t=Math.max(0,Math.min(1,frame/Math.max(1,(durationInFrames-1)*.8))),p=t*t*(3-2*t);
 return createElement('svg',{width,height,viewBox:'0 0 1000 1000','data-custom-style':'orbital-morph-study','data-content-title':content?.title},
 !isOverlay&&createElement('rect',{width:1000,height:1000,fill:'var(--surface)'}),
 createElement('rect',{'data-object-id':'hero',x:180+240*p,y:400-100*Math.sin(Math.PI*p),width:200+160*p,height:200,rx:100-70*p,fill:'var(--accent)'}));
}
`);
 return root;
}
const temp=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'custom-style-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
test('portable package saves immutable named versions; edits and rename are explicit',t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),library=path.join(root,'library');const v1=save(pack,library);
 assert.equal(validate(v1.destination).sha256,validate(pack).sha256);assert.throws(()=>save(pack,library),/Version already exists/);
 const meta=JSON.parse(fs.readFileSync(path.join(pack,'style.json')));meta.version=2;meta.name='Orbital Morph revised';fs.writeFileSync(path.join(pack,'style.json'),JSON.stringify(meta));
 const v2=save(pack,library);assert.notEqual(v2.sha256,v1.sha256);assert.equal(validate(v1.destination).meta.name,'Orbital Morph Study');
});
test('reject missing actual scene, missing dynamics evidence, built-in collision, symlinks',t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),meta=JSON.parse(fs.readFileSync(path.join(pack,'style.json')));
 const write=m=>fs.writeFileSync(path.join(pack,'style.json'),JSON.stringify(m));
 write({...meta,design:{...meta.design,morph:''}});assert.throws(()=>validate(pack),/design.morph/);
 write({...meta,id:'midnight-press'});assert.throws(()=>validate(pack),/collides/);write(meta);
 fs.symlinkSync(path.join(pack,'tokens.css'),path.join(pack,'escape'));assert.throws(()=>validate(pack),/Symlinks/);fs.unlinkSync(path.join(pack,'escape'));
 fs.unlinkSync(path.join(pack,'src/Scene.tsx'));assert.throws(()=>validate(pack),/Missing src\/Scene/);
});
test('fresh projects reuse persisted scene, tokens, narrations and custom route; never overwrite existing project',t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),saved=save(pack,path.join(root,'library'));
 for(const format of ['portrait','landscape']) {
  const project=path.join(root,format);scaffold(saved.destination,project,['--profile=custom',`--format=${format}`,'--subtitles=false']);
  const read=p=>fs.readFileSync(path.join(project,p),'utf8');
  assert.equal(read('.theme').trim(),'orbital-morph-study');assert.match(read('src/video/presets/PresetScene.tsx'),/return <CustomScene/);
  assert.match(read('src/video/presets/narration.ts'),/if\(id==="orbital-morph-study"\) return \["","",""\]/);
  assert.equal(read('src/styles/tokens.css'),fs.readFileSync(path.join(pack,'tokens.css'),'utf8'));
  assert.equal(JSON.parse(read('custom-style-lock.json')).sha256,saved.sha256);
  assert.equal(JSON.parse(read('.web-video-presentation-project.json')).theme,'orbital-morph-study');
  assert.throws(()=>scaffold(pack,project,['--profile=custom','--format=portrait']),/empty|non-empty|非空/i);
 }
});
test('optional real React/TS integration: typecheck, production component, out-of-order frames, alpha', {skip:!process.env.CUSTOM_STYLE_NODE_MODULES},t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),project=path.join(root,'project');scaffold(pack,project,['--profile=custom','--format=landscape','--subtitles=false']);
 fs.symlinkSync(path.resolve(process.env.CUSTOM_STYLE_NODE_MODULES),path.join(project,'node_modules'),'dir');
 const tsc=spawnSync(process.execPath,[path.join(project,'node_modules/typescript/bin/tsc'),'--noEmit'],{cwd:project,encoding:'utf8'});assert.equal(tsc.status,0,tsc.stdout+tsc.stderr);
 fs.writeFileSync(path.join(project,'verify-custom.ts'),`import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {PresetScene} from './src/video/presets/PresetScene';import {presetNarrations,presetShotPlan} from './src/video/presets/narration';
const render=(frame:number,isOverlay=false)=>renderToStaticMarkup(createElement(PresetScene,{presetId:'orbital-morph-study',frame,durationInFrames:90,fps:30,width:1920,height:1080,isOverlay}));
const frames=[0,22,45,70,89];const outputs=frames.map(f=>render(f));assert.equal(new Set(outputs).size,5);assert.ok(outputs[0].includes('Default original title'));assert.ok(renderToStaticMarkup(createElement(PresetScene,{presetId:'orbital-morph-study',frame:0,durationInFrames:90,fps:30,width:1920,height:1080,content:{title:'Override title'}})).includes('Override title'));for(const f of [89,22,0,70,45])assert.equal(render(f),outputs[frames.indexOf(f)]);assert.ok(outputs.every(s=>s.includes('data-object-id="hero"')));assert.ok(!render(45,true).includes('var(--surface)'));assert.deepEqual(presetNarrations('orbital-morph-study'),['','','']);assert.equal(presetShotPlan('orbital-morph-study').length,3);`);
 const runtime=spawnSync(process.execPath,['--import','tsx','verify-custom.ts'],{cwd:project,encoding:'utf8'});assert.equal(runtime.status,0,runtime.stdout+runtime.stderr);
 for(const script of ['build-timing-manifest.ts','build-render-timing.ts','build-shot-manifest.ts','validate-composition.ts','validate-screen-text.ts']) {
  const result=spawnSync(process.execPath,['--import','tsx',`scripts/${script}`],{cwd:project,encoding:'utf8'});assert.equal(result.status,0,script+'\n'+result.stdout+result.stderr);
 }
 const presets=spawnSync(process.execPath,['--import','tsx','--test','src/video/presets/model.test.ts'],{cwd:project,encoding:'utf8'});assert.equal(presets.status,0,presets.stdout+presets.stderr);
});

test('reject symlink destinations before writing and empty or comment-only evidence',t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),library=path.join(root,'library'),outside=path.join(root,'outside');
 fs.mkdirSync(library);fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(library,'orbital-morph-study'));
 assert.throws(()=>save(pack,library),/Symlink/);assert.deepEqual(fs.readdirSync(outside),[]);
 fs.symlinkSync(outside,path.join(root,'alias'));assert.throws(()=>save(pack,path.join(root,'alias','nested')),/Symlink/);
 const replace=(file,value,pattern)=>{const p=path.join(pack,file),old=fs.readFileSync(p);fs.writeFileSync(p,value);assert.throws(()=>validate(pack),pattern);fs.writeFileSync(p,old);};
 replace('analysis.md','  ',/analysis/);replace('tokens.css','/* --surface: red; */',/tokens/);
 replace('src/Scene.tsx','// export function Scene\n/* export const Scene = 1; */',/export named Scene/);
 const meta=JSON.parse(fs.readFileSync(path.join(pack,'style.json')));replace('style.json',JSON.stringify({...meta,status:'render-reviewed',reviewEvidence:{}}),/reviewEvidence/);
});

test('absolute CLI works outside skill directory and rejects unknown options',t=>{
 const root=temp(t),pack=fixture(path.join(root,'work')),library=path.join(root,'library');
 const cli=fileURLToPath(new URL('./custom-style.mjs',import.meta.url));
 const run=(...args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});
 let result=run('validate',`--package=${pack}`);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).id,'orbital-morph-study');
 result=run('save',`--package=${pack}`,`--library-root=${library}`);assert.equal(result.status,0,result.stderr);
 result=run('list',`--library-root=${library}`);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout)[0].name,'Orbital Morph Study');
 assert.notEqual(run('validate',`--package=${pack}`,'--silently-ignore-me').status,0);
});

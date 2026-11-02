#!/usr/bin/env node
// Local portable style packages. Contract validation does not execute authored code.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const skill=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail=m=>{throw new Error(m);};
const text=(v,label)=>{if(typeof v!=='string'||!v.trim()) fail(`Missing ${label}`);};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function noSymlinkPath(value) {
 let current=path.resolve(value);
 while(true) {
  if(fs.existsSync(current)||(()=>{try{return fs.lstatSync(current).isSymbolicLink();}catch{return false;}})()) {
   if(fs.lstatSync(current).isSymbolicLink()) fail(`Symlink path not allowed: ${current}`);
  }
  const parent=path.dirname(current);if(parent===current) break;current=parent;
 }
}
const withoutComments=source=>source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
function files(root,relative='') {
 const out=[];
 for(const e of fs.readdirSync(path.join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
  const p=path.join(relative,e.name);
  if(e.isSymbolicLink()) fail(`Symlinks not allowed: ${p}`);
  if(e.isDirectory()) out.push(...files(root,p));
  else if(e.isFile()) {if(fs.statSync(path.join(root,p)).size>20*1024*1024) fail(`File too large: ${p}`);out.push(p);}
  else fail(`Not a regular file: ${p}`);
 }
 return out;
}
export function validate(root) {
 root=path.resolve(root);noSymlinkPath(root);
 if(fs.lstatSync(root).isSymbolicLink()||!fs.statSync(root).isDirectory()) fail('Package must be a real directory');
 const inventory=files(root);
 for(const required of ['style.json','preset.json','tokens.css','src/Scene.tsx','analysis.md']) if(!inventory.includes(required)) fail(`Missing ${required}`);
 const meta=json(path.join(root,'style.json')),preset=json(path.join(root,'preset.json'));
 text(fs.readFileSync(path.join(root,'analysis.md'),'utf8'),'analysis.md');
 const css=withoutComments(fs.readFileSync(path.join(root,'tokens.css'),'utf8'));
 if(!/--[a-zA-Z][\w-]*\s*:\s*[^;}\s]/.test(css)) fail('tokens.css must define actual CSS tokens');
 if(meta.schema!==1||typeof meta.id!=='string'||!idPattern.test(meta.id)||!Number.isInteger(meta.version)||meta.version<1) fail('Invalid schema, id or version');
 text(meta.name,'name');
 if(fs.existsSync(path.join(skill,'themes',meta.id))) fail('Custom ID collides with built-in theme');
 if(typeof meta.baseTheme!=='string'||!idPattern.test(meta.baseTheme)||!fs.existsSync(path.join(skill,'themes',meta.baseTheme,'tokens.css'))) fail('Unknown baseTheme');
 if(preset.id!==meta.id) fail('preset.id must equal style.id');
 if(!['editorial','data','product','terminal','node','blueprint','lesson','gallery','archive','kinetic','audio','soft','reference'].includes(preset.family)) fail('Invalid preset family');
 text(preset.variant,'preset.variant');
 for(const key of ['layout','motion','content']) if(!preset[key]||typeof preset[key]!=='object') fail(`Missing preset.${key}`);
 for(const key of ['title','eyebrow','conclusion']) if(typeof preset.content[key]!=='string') fail(`Missing content.${key}`);
 for(const key of ['subtitle','unit']) if(preset.content[key]!==undefined&&typeof preset.content[key]!=='string') fail(`Invalid content.${key}`);
 if(preset.content.values!==undefined&&(!Array.isArray(preset.content.values)||preset.content.values.some(v=>typeof v!=='number'||!Number.isFinite(v)))) fail('Invalid content.values');
 if(!Array.isArray(preset.content.labels)||preset.content.labels.some(v=>typeof v!=='string')) fail('Invalid content.labels');
 const choice=(value,values,label)=>{if(!values.includes(value)) fail(`Invalid ${label}`);};
 const finite=(value,min,max,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) fail(`Invalid ${label}`);};
 choice(preset.layout.heroSide,['left','right','center'],'layout.heroSide');choice(preset.layout.density,[1,2,3],'layout.density');
 choice(preset.layout.corner,['square','soft','round'],'layout.corner');choice(preset.layout.rule,['hairline','double','dashed','bold'],'layout.rule');
 choice(preset.layout.decoration,['none','grid','dots','rays','bands','frame'],'layout.decoration');
 for(const k of ['subjectScale','titleScale','numberScale']) finite(preset.layout[k],.01,10,`layout.${k}`);
 finite(preset.layout.titleWeight,1,1000,'layout.titleWeight');
 choice(preset.motion.kind,['settle','wipe','scan','draw','route','lift','snap','pulse'],'motion.kind');
 for(const k of ['setupEnd','transformEnd','stagger','travel']) finite(preset.motion[k],0,1,`motion.${k}`);
 if(preset.motion.setupEnd>=preset.motion.transformEnd) fail('setupEnd must precede transformEnd');
 if(!Array.isArray(meta.narrations)||meta.narrations.length!==3||meta.narrations.some(v=>typeof v!=='string')) fail('Exactly three narration strings required; empty is valid for silent graphics');
 if(!Array.isArray(meta.shots)||meta.shots.length!==3) fail('Exactly three authored shots required');
 for(const shot of meta.shots) {
  for(const key of ['compositionModel','visualRecipe','motionStyle','motionTechnique','motionIntent']) text(shot[key],`shot.${key}`);
  for(const key of ['visualStages','onScreenText']) if(!Array.isArray(shot[key])||shot[key].some(v=>typeof v!=='string')) fail(`Invalid shot.${key}`);
 }
 if(!Array.isArray(meta.references)||!meta.references.length) fail('Reference evidence required');
 for(const ref of meta.references) for(const key of ['kind','source','observed','rights','limitations']) text(ref[key],`reference.${key}`);
 for(const key of ['composition','color','camera','motion','morph','transitions','rhythm']) text(meta.design?.[key],`design.${key}`);
 if(!['draft','render-reviewed'].includes(meta.status)) fail('Status must be draft or render-reviewed');
 if(meta.status==='render-reviewed') {
  for(const key of ['artifact','renderer','sha256','observed','limitations']) text(meta.reviewEvidence?.[key],`reviewEvidence.${key}`);
  if(!/^[a-f0-9]{64}$/.test(meta.reviewEvidence.sha256)) fail('reviewEvidence.sha256 must be a SHA-256 hash');
 }
 if(!/export\s+function\s+Scene\b|export\s+(?:const|class)\s+Scene\b/.test(withoutComments(fs.readFileSync(path.join(root,'src/Scene.tsx'),'utf8')))) fail('Scene.tsx must export named Scene');
 const hash=createHash('sha256');for(const file of inventory) hash.update(file).update('\0').update(fs.readFileSync(path.join(root,file))).update('\0');
 return {root,meta,preset,sha256:hash.digest('hex'),files:inventory};
}
function copy(input,target){fs.cpSync(input,target,{recursive:true,errorOnExist:true,force:false});}
export function save(root,library) {
 const pack=validate(root);library=path.resolve(library);
 if(library===pack.root||library.startsWith(pack.root+path.sep)) fail('Library cannot be inside package');
 const destination=path.join(library,pack.meta.id,`v${pack.meta.version}`);noSymlinkPath(destination);
 if(fs.existsSync(destination)) fail('Version already exists; edit a working copy and increment version');
 fs.mkdirSync(path.dirname(destination),{recursive:true});copy(pack.root,destination);
 if(validate(destination).sha256!==pack.sha256) fail('Saved package hash mismatch');
 return {destination,id:pack.meta.id,version:pack.meta.version,sha256:pack.sha256};
}
function install(pack,target) {
 copy(pack.root,path.join(target,'src/video/custom-style'));
 if(validate(path.join(target,'src/video/custom-style')).sha256!==pack.sha256) fail('Project package hash mismatch');
 const read=p=>fs.readFileSync(path.join(target,p),'utf8');const write=(p,s)=>fs.writeFileSync(path.join(target,p),s);
 const registry='src/video/presets/registry.ts';
 write(registry,`import customPreset from '../custom-style/preset.json';\n`+read(registry).replace('Object.freeze({',`Object.freeze({\n  ${JSON.stringify(pack.meta.id)}: customPreset as ThemePresetSpec,`));
 const scene='src/video/presets/PresetScene.tsx';
 write(scene,`import { Scene as CustomScene } from '../custom-style/src/Scene';\n`+read(scene).replace('  const spec=getPreset(presetId);',`  if (presetId===${JSON.stringify(pack.meta.id)}) return <CustomScene {...props} content={{...getPreset(presetId).content,...props.content}}/>;\n  const spec=getPreset(presetId);`));
 const narration='src/video/presets/narration.ts';let source=read(narration);
 source=source.replace(/export function presetNarrations\(id:\s*string\)([^\{]*)\{/,m=>m+`\n  if(id===${JSON.stringify(pack.meta.id)}) return ${JSON.stringify(pack.meta.narrations)};`);
 const shots=pack.meta.shots.map(s=>({...s,presetId:pack.meta.id,presetFamily:pack.preset.family,presetVariant:pack.preset.variant,visualModel:`custom-${pack.meta.id}`,source:`src/video/presets/registry.ts#${pack.meta.id}; src/video/custom-style/preset.json; src/video/custom-style/analysis.md; src/video/custom-style/src/Scene.tsx`,screenTextIntent:'labels'}));
 source=source.replace(/export function presetShotPlan\(id:string, cinemaTitle\?: string\): PresetShotMetadata\[\] \{/,m=>m+`\n  if(id===${JSON.stringify(pack.meta.id)}) return ${JSON.stringify(shots)};`);
 if(!source.includes(`if(id===${JSON.stringify(pack.meta.id)}) return ${JSON.stringify(pack.meta.narrations)}`)) fail('Narration integration anchor changed');
 write(narration,source);
 const modelTest='src/video/presets/model.test.ts';
 let checks=read(modelTest).replace('import { PRESET_REGISTRY, getPreset }', 'import { PRESET_REGISTRY as ALL_PRESET_REGISTRY, getPreset }');
 checks=checks.replace('const ids=Object.keys(PRESET_REGISTRY);',`// Keep the complete built-in regression contract; custom scenes have their own contract below.\nconst PRESET_REGISTRY=Object.fromEntries(Object.entries(ALL_PRESET_REGISTRY).filter(([id])=>id!==${JSON.stringify(pack.meta.id)}));\nconst ids=Object.keys(PRESET_REGISTRY);`);
 checks+=`\ntest('custom style has its own scene-bound metadata and deterministic production route',()=>{\n const id=${JSON.stringify(pack.meta.id)};\n assert.equal(getPreset(id).id,id);\n assert.deepEqual(presetNarrations(id),${JSON.stringify(pack.meta.narrations)});\n const plan=presetShotPlan(id);assert.equal(plan.length,3);\n for(const shot of plan){assert.equal(shot.presetId,id);assert.ok(shot.source.includes('registry.ts#'+id));assert.ok(shot.source.includes('custom-style/src/Scene.tsx'));}\n for(const [width,height] of formats) for(const frame of [89,0,45,89]) {\n  const props={presetId:id,width,height,frame,durationInFrames:90,fps:30};\n  const a=renderToStaticMarkup(createElement(PresetScene,props));\n  assert.equal(a,renderToStaticMarkup(createElement(PresetScene,props)));\n }\n});\n`;
 write(modelTest,checks);
 write('src/config/themePreset.ts',`export const THEME_PRESET_ID = ${JSON.stringify(pack.meta.id)};\n`);
 fs.copyFileSync(path.join(pack.root,'tokens.css'),path.join(target,'src/styles/tokens.css'));
 const marker=json(path.join(target,'.web-video-presentation-project.json'));
 marker.theme=pack.meta.id;marker.customStyle={id:pack.meta.id,version:pack.meta.version,sha256:pack.sha256};
 write('.web-video-presentation-project.json',JSON.stringify(marker,null,2)+'\n');
 write('.theme',pack.meta.id+'\n');write('custom-style-lock.json',JSON.stringify({schema:1,id:pack.meta.id,version:pack.meta.version,sha256:pack.sha256,status:pack.meta.status},null,2)+'\n');
}
export function scaffold(root,target,args=[]) {
 const pack=validate(root);target=path.resolve(target);noSymlinkPath(target);
 if(target===pack.root||target.startsWith(pack.root+path.sep)) fail('Project cannot be inside package');
 if(args.some(a=>!/^--(?:profile|format|fps|subtitles|output-mode)=/.test(a))) fail('Only profile/format/fps/subtitles/output-mode accepted; installation is separate');
 const result=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,`--theme=${pack.meta.baseTheme}`,'--skip-install',...args],{encoding:'utf8'});
 if(result.status!==0) fail(result.stderr||result.stdout);
 install(pack,target);
 return {project:target,id:pack.meta.id,version:pack.meta.version,sha256:pack.sha256,validation:'source-only; typecheck, render and visual review still required'};
}
function main(args) {
 const command=args.shift(),opts={},forward=[];
 for(const arg of args) {const m=/^--(package|library-root|project-root)=(.+)$/.exec(arg);if(m){if(opts[m[1]]) fail('Duplicate option');opts[m[1]]=m[2];}else forward.push(arg);}
 if(command!=='scaffold'&&forward.length) fail('Unknown option: '+forward[0]);
 if(command==='list') {
  if(!opts['library-root']) fail('--library-root required');const root=path.resolve(opts['library-root']);noSymlinkPath(root);
  return fs.readdirSync(root).filter(id=>idPattern.test(id)).flatMap(id=>fs.readdirSync(path.join(root,id)).map(version=>{const p=validate(path.join(root,id,version));return {id:p.meta.id,name:p.meta.name,version:p.meta.version,status:p.meta.status,package:p.root};}));
 }
 if(!opts.package) fail('Usage: custom-style.mjs validate|save|scaffold --package=<directory> [--library-root=<directory> | --project-root=<empty-directory>] [scaffold options]; list --library-root=<directory>');
 if(command==='validate') {const p=validate(opts.package);return {id:p.meta.id,version:p.meta.version,sha256:p.sha256,validation:'source contract only; code has not been executed or visually reviewed'};}
 if(command==='save'&&opts['library-root']) return save(opts.package,opts['library-root']);
 if(command==='scaffold'&&opts['project-root']) return scaffold(opts.package,opts['project-root'],forward);
 fail('Unknown command or missing explicit destination');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {process.stdout.write(JSON.stringify(main(process.argv.slice(2)),null,2)+'\n');}
 catch(error){process.stderr.write(`custom-style: ${error.message}\n`);process.exitCode=1;}
}

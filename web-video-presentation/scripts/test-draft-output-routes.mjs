// Offline behavior test: execute the production CLI parser/route-selection block,
// production output resolver and both-child argument builder. No fake renderer,
// browser, TTS, package install, or workflow acknowledgment is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import test from 'node:test';
const skill=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=rel=>fs.readFileSync(path.join(skill,rel),'utf8');
const moduleFromSource=async source=>import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const routes=await moduleFromSource(read('templates/scripts/render-route-args.ts'));
const contractSource=read('templates/scripts/delivery-contract.ts');
const contract=await moduleFromSource(contractSource.slice(contractSource.indexOf('export const OUTPUT_MODES'),contractSource.indexOf('export function readState')));
const renderer=read('templates/scripts/render-video.ts');
const parser=renderer.slice(renderer.indexOf('function readFlag('),renderer.indexOf('if (hasFlag("--help")'));
const selection=renderer.slice(renderer.indexOf('const preset ='),renderer.indexOf('let alphaValidation:'));
assert.ok(parser.includes('function hasFlag('));assert.ok(selection.includes('resolveRenderOutput('));
const evaluate=new Function('args','readState','outputMode','OUTPUTS','resolveRenderOutput','parseAlphaSampleFrames','process',stripTypeScriptTypes(`${parser}\n${selection}`)+"\nreturn {kind,selectedMode,output,subtitles,isDraft};");
function select(args,mode,subtitlesRequested=false,env={}) {
 return evaluate(args,()=>({outputMode:mode,subtitlesRequested}),contract.outputMode,contract.OUTPUTS,routes.resolveRenderOutput,routes.parseAlphaSampleFrames,{env,exit:code=>{throw Error(`exit ${code}`);}});
}
const parent=fs.mkdtempSync(path.join(os.tmpdir(),'vwp-draft-routes-'));
const target=path.join(parent,'project');
const scaffold=spawnSync('bash',[path.join(skill,'scripts/scaffold.sh'),target,'--profile=custom','--format=portrait','--theme=dark-tech-glow','--skip-install'],{encoding:'utf8'});
assert.equal(scaffold.status,0,scaffold.stderr);
const scripts=JSON.parse(fs.readFileSync(path.join(target,'package.json'),'utf8')).scripts;
function commandArgs(name) {
 let command=scripts[name];
 if(/^npm run [\w:-]+(?: --)?$/.test(command)) command=scripts[command.slice(8).replace(/ --$/,'')];
 assert.match(command,/npm run typecheck && npm run validate-assets && npm run validate:composition/);
 assert.match(command,name.includes('subtitles')?/npm run export-subtitles/:/npm run render:timing/);
 assert.ok(!command.includes('--acknowledge-draft'),'no implicit approval');
 const marker='node --import tsx scripts/render-video.ts ';
 assert.ok(command.includes(marker));
 return command.split(marker)[1].trim().split(/\s+/);
}
for(const name of ['render:video:draft','render:video:draft:subtitles','render:video:fast','render:video:fast:subtitles']) {
 for(const mode of ['opaque','alpha','composite','both']) test(`${name}: production selection for ${mode}`,()=>{
  const args=commandArgs(name), captioned=name.includes('subtitles');
  assert.ok(!args.some(a=>a.startsWith('--output')),'generic entry must defer output naming');
  if(mode==='alpha'&&captioned) {
   assert.throws(()=>select(args,mode),/Alpha-only exports do not burn subtitles/);return;
  }
  const parentPlan=select(args,mode);
  const kinds=mode==='both'?['alpha','composite']:[mode];
  const outputs=kinds.map(kind=>{
   const childArgs=mode==='both'?routes.bothChildArgs(args,kind):args;
   const plan=select(childArgs,mode);
   assert.equal(plan.kind,kind);assert.equal(plan.isDraft,true);
   assert.equal(plan.subtitles,captioned&&kind!=='alpha');
   assert.equal(plan.output,`output/draft-${kind}${captioned&&kind!=='alpha'?'-subtitles':''}.${kind==='alpha'?'mov':'mp4'}`);
   assert.ok(!childArgs.includes('--acknowledge-draft'));
   return plan.output;
  });
  assert.equal(new Set(outputs).size,kinds.length);
  assert.equal(parentPlan.selectedMode,mode);
 });
}
test('both retains output-override rejection, including environment aliases',()=>{
 for(const args of [['--output','output/custom.mp4'],['--output=output/custom.mov']])assert.throws(()=>select(['--preset=draft',...args],'both'),/--output cannot be used with both/);
 for(const env of [{REMOTION_OUTPUT:'output/custom.mp4'},{PRESENTATION_OUTPUT:'output/custom.mp4'}])assert.throws(()=>select(['--preset=draft'],'both',false,env),/--output cannot be used with both/);
});
test('single-mode overrides and quality defaults remain unchanged',()=>{
 for(const kind of ['opaque','alpha','composite']) {
  assert.equal(select([],kind).output,contract.OUTPUTS[kind].output);
  assert.equal(select(['--preset=draft','--output=output/custom.bin'],kind).output,'output/custom.bin');
 }
 assert.equal(select(['--fast'],'alpha').output,'output/draft-alpha.mov');
});
test('state-requested captions get distinct draft paths and never leak to both alpha child',()=>{
 for(const kind of ['opaque','composite'])assert.equal(select(['--preset=draft'],kind,true).output,`output/draft-${kind}-subtitles.mp4`);
 for(const kind of ['alpha','composite']) {
  const plan=select(routes.bothChildArgs(['--preset=draft','--acknowledge-draft'],kind),'both',true);
  assert.equal(plan.subtitles,kind==='composite');
  assert.ok(routes.bothChildArgs(['--acknowledge-draft'],kind).includes('--acknowledge-draft'));
 }
});
test('workflow/revision gates are still required before child execution',()=>{
 const main=renderer.slice(renderer.indexOf('async function main()'));
 for(const gate of ['captureInputRevision()','assertDraftAcknowledged()','assertWorkflowAllowed()','contractErrors(projectState)'])assert.ok(main.indexOf(gate)>=0&&main.indexOf(gate)<main.indexOf("if (selectedMode === 'both')"),gate);
 assert.match(renderer,/if \(hasFlag\("--acknowledge-draft"\)\)/);
});
test('actual nested npm fast aliases forward explicit user flags without synthesizing approval',()=>{
 const probe=path.join(parent,'argument-probe');fs.mkdirSync(probe);
 fs.writeFileSync(path.join(probe,'args.cjs'),"console.log('ROUTE_ARGS='+JSON.stringify(process.argv.slice(2)))");
 const probeScripts={};
 for(const suffix of ['',':subtitles']) {
  probeScripts[`render:video:fast${suffix}`]=scripts[`render:video:fast${suffix}`];
  // Only inspect npm argument transport; no rendering success is claimed here.
  probeScripts[`render:video:draft${suffix}`]='node args.cjs';
 }
 fs.writeFileSync(path.join(probe,'package.json'),JSON.stringify({scripts:probeScripts}));
 for(const suffix of ['',':subtitles'])for(const flags of [[],['--acknowledge-draft','--frames=0-1']]) {
  const run=spawnSync('npm',['run',`render:video:fast${suffix}`,'--',...flags],{cwd:probe,encoding:'utf8',env:{...process.env,npm_config_update_notifier:'false',npm_config_audit:'false'}});
  assert.equal(run.status,0,run.stderr);
  const line=run.stdout.split('\n').find(line=>line.startsWith('ROUTE_ARGS='));
  assert.ok(line,run.stdout);assert.deepEqual(JSON.parse(line.slice(11)),flags);
 }
});
test.after(()=>fs.rmSync(parent,{recursive:true,force:true}));

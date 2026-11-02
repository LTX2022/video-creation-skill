/** Real runner + measurement wrappers; explicit stand-ins avoid browser/image-model work. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const here=path.dirname(fileURLToPath(import.meta.url));
const loader=createRequire(import.meta.url).resolve('tsx');
function fixture(t,generateExit=0,validateExit=0){
 const root=fs.mkdtempSync(path.join(tmpdir(),'vwp-cover-runner-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'scripts'));
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({type:'module'}));
 for(const file of ['measure-stage.mjs','run-cover.mjs'])fs.writeFileSync(path.join(root,'scripts',file),fs.readFileSync(path.join(here,file),'utf8').replaceAll("'tsx'",JSON.stringify(loader)));
 for(const [name,code]of [['generate-cover.ts',generateExit],['validate-cover.ts',validateExit]])fs.writeFileSync(path.join(root,'scripts',name),`import {appendFileSync} from 'node:fs';appendFileSync('calls.jsonl',JSON.stringify({name:${JSON.stringify(name)},args:process.argv.slice(2)})+'\\n');process.exit(${code});\n`);
 return root;
}
function run(root,args=[]){return spawnSync(process.execPath,['scripts/run-cover.mjs',...args],{cwd:root,encoding:'utf8',timeout:10000,env:{...process.env,VWP_METRICS:'',VWP_METRICS_RUN_ID:'',VWP_METRICS_PARENT_EVENT:''}});}
function calls(root){return fs.readFileSync(path.join(root,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);}
test('cover wrapper forwards each argument to generator only; both real leaves measured once',t=>{
 const root=fixture(t),args=['--brief','brief with spaces.json','--import-complete','--title=a;literal'];const result=run(root,args);assert.equal(result.status,0,result.stderr);
 assert.deepEqual(calls(root),[{name:'generate-cover.ts',args},{name:'validate-cover.ts',args:[]}]);
 const events=fs.readFileSync(path.join(root,'output/metrics/stage-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(e=>e.eventType==='finished');assert.deepEqual(events.map(e=>[e.stage,e.label]),[['cover','generate-cover'],['cover','validate-cover']]);assert.equal(events.some(e=>e.stage==='timing'),false);
});
test('generator failure is preserved and technical validation does not run',t=>{const root=fixture(t,23);assert.equal(run(root,['--brief=x']).status,23);assert.equal(calls(root).length,1);});
test('validator failure is preserved; no copy, approval or completion is manufactured',t=>{const root=fixture(t,0,37);assert.equal(run(root).status,37);assert.equal(calls(root).length,2);assert.equal(fs.existsSync(path.join(root,'Desktop')),false);});

#!/usr/bin/env node
/** Forward generator arguments intact, then run technical validation only. No copy, approval or timing build. */
import {spawn} from 'node:child_process';
import {constants} from 'node:os';
async function leaf(script, args=[]) {
  const child = spawn(process.execPath, ['scripts/measure-stage.mjs', '--best-effort', '--stage=cover', `--label=${script.replace(/\.ts$/, '')}`, '--', process.execPath, '--import', 'tsx', `scripts/${script}`, ...args], {stdio:'inherit', shell:false});
  const handlers = new Map();
  for (const signal of ['SIGINT','SIGTERM','SIGHUP']) {
    const handler=()=>{try{child.kill(signal);}catch{/* best effort */}};
    handlers.set(signal,handler);process.on(signal,handler);
  }
  return new Promise(resolve=>{
    const cleanup=()=>{for(const [signal,handler]of handlers)process.removeListener(signal,handler);};
    child.once('error',()=>{cleanup();resolve(1);});
    child.once('close',(code,signal)=>{cleanup();resolve(code??(128+(constants.signals[signal]??1)));});
  });
}
const generated=await leaf('generate-cover.ts',process.argv.slice(2));
process.exitCode=generated===0 ? await leaf('validate-cover.ts') : generated;

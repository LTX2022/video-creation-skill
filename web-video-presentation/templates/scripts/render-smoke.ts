/** Mode-aware bounded smoke only; never final delivery or an implicit approval. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readState} from './delivery-contract';
import {smokeRenderArguments} from './render-route-args';
const args=process.argv.slice(2);
if(args.includes('--help')) console.log('Smoke: first min(180,TOTAL_FRAMES) frames; alpha uses MOV, both defaults to composite. Use --frames=START-END and --acknowledge-draft only when intentionally authorized to iterate. No automatic browser install.');
else {
 const timing=readFileSync(resolve('src/video/render-timing.generated.ts'),'utf8');
 const total=Number(timing.match(/export const TOTAL_FRAMES\s*=\s*(\d+)/)?.[1]);
 const planned=smokeRenderArguments(args,readState().outputMode,total);
 execFileSync(process.execPath,['--import','tsx',resolve('scripts/render-video.ts'),...planned],{stdio:'inherit'});
}

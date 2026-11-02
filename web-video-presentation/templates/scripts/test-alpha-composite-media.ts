/** Real local FFmpeg encoding/decoding regression. No browser, mock probe, downloads or user media. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateAlphaMedia } from './validate-alpha';
import { validateDecodedMedia } from './render-output-safety';

test('real alpha pixels, actual composite foreground, audio decode and corruption injection',()=>{
 const root=mkdtempSync(join(tmpdir(),'alpha-composite-media-'));
 const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg', ffprobe=process.env.FFPROBE_PATH||'ffprobe';
 const run=(args:string[])=>execFileSync(ffmpeg,['-v','error','-nostdin','-y',...args],{maxBuffer:8*1024*1024});
 try {
  const plate=join(root,'plate.mp4'),composite=join(root,'composite.mp4');
  run(['-f','lavfi','-i','color=c=blue:s=64x64:r=10:d=1','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-shortest',plate]);
  for(const mode of ['mixed','opaque','empty']) {
   const rgba=Buffer.alloc(64*64*4*10);
   for(let f=0;f<10;f++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const i=((f*64+y)*64+x)*4;rgba[i]=255;
    rgba[i+3]=mode==='opaque'?255:mode==='mixed'&&x>=16&&x<48&&y>=16&&y<48?128:0;
   }
   const raw=join(root,`${mode}.rgba`),mov=join(root,`${mode}.mov`);writeFileSync(raw,rgba);
   run(['-f','rawvideo','-pix_fmt','rgba','-s','64x64','-r','10','-i',raw,'-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-threads','1',mov]);
   const alpha=validateAlphaMedia(mov);
   assert.equal(alpha.pass,mode==='mixed',JSON.stringify(alpha.errors));
   if(mode==='mixed'){assert.equal(alpha.samples[0]!.transparentFraction,.75);assert.equal(alpha.samples[0]!.partialAlphaFraction,.25);}
  }
  assert.equal(validateAlphaMedia(plate).pass,false);
  run(['-i',plate,'-i',join(root,'mixed.mov'),'-filter_complex_threads','1','-filter_complex','[0:v][1:v]overlay=shortest=1:alpha=straight[v]','-map','[v]','-map','0:a','-c:v','libx264','-pix_fmt','yuv420p','-c:a','copy',composite]);
  for(const media of [plate,composite])assert.equal(validateDecodedMedia(media).decodedVideoFrames,10);
  const pixels=(media:string)=>run(['-i',media,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-threads','1','pipe:1']);
  const original=pixels(plate),overlaid=pixels(composite),center=(32*64+32)*3,outside=(4*64+4)*3;
  assert.ok(overlaid[center]!>original[center]!+100,'foreground must actually affect encoded pixels');
  assert.ok(Math.abs(overlaid[outside+2]!-original[outside+2]!)<4,'transparent exterior must preserve plate');
  // Counterexample: the original plate passes decode and has identical dimensions,
  // FPS and streams but no foreground. Decode is intentionally NOT a semantic gate.
  const audio=run(['-i',composite,'-map','0:a:0','-f','s16le','-ac','1','pipe:1']);
  let peak=0;for(let i=0;i+1<audio.length;i+=2)peak=Math.max(peak,Math.abs(audio.readInt16LE(i)));
  assert.ok(peak>100,'kept source audio must not silently disappear');
  const truncated=join(root,'truncated.mp4'),bytes=readFileSync(plate);writeFileSync(truncated,bytes.subarray(0,Math.floor(bytes.length*.75)));
  const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-of','json',truncated],{encoding:'utf8'}));
  assert.ok(probe.streams.some((s:any)=>s.codec_type==='video'),'metadata alone still exists in corrupt file');
  assert.throws(()=>validateDecodedMedia(truncated),/decode failed/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

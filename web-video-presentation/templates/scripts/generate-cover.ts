import { readFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoverDesign } from '../src/video/CoverDesign';
import { installedBrowser } from './browser';
import { COVER_ATTEMPT, COVER_PROPS, COVER_META, COVER_OUTPUT, COVER_REPORT, coverRenderProps, coverSources, hashCoverFile, imageInfo, inspectCoverAsset, loadCoverBrief, localCoverPath, readCoverJson, sha256, validateCoverBrief, writeCoverFile, type CoverBrief } from './cover-contract';

const ROOT = process.cwd(), args = process.argv.slice(2);
function flag(name: string, fallback = '') { const a = args.find(v => v.startsWith(name + '=')); const i = args.indexOf(name); return a ? a.slice(name.length + 1) : i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback; }
function stateUpdate(generated: boolean) {
  let state: any;
  try { state = readCoverJson(ROOT, 'project-state.json'); } catch { return; }
  state.coverGenerated = generated; state.coverValidated = false; state.coverTechnicalValidated = false;
  state.updatedAt = new Date().toISOString(); writeCoverFile(ROOT, 'project-state.json', JSON.stringify(state, null, 2) + '\n');
}
/** Explicit migration, not an unannounced fallback. No narration truncation or generic symbol substitution. */
function legacyAdapter(): string {
  const title = flag('--title'), meaning = flag('--visual'), symbol = flag('--symbol');
  if (!title.trim() || !meaning.trim()) throw new Error('Legacy adapter needs explicit --title and --visual; automatic narration truncation has been removed.');
  const symbols: Record<string, any[]> = {
    '分屏对比': [{type:'rect',x:60,y:170,width:380,height:650,rx:25,fill:'#d9e4e0'}, {type:'rect',x:560,y:170,width:380,height:650,rx:25,fill:'#d7633a'}, {type:'line',x1:500,y1:100,x2:500,y2:900,stroke:'#182629',strokeWidth:8}],
    '四步骤': [0,1,2,3].map(i => ({type:'rect',x:80+i*220,y:260+i*60,width:180,height:400,rx:20,fill:i%2?'#d7633a':'#d9e4e0'})),
    '增长图表': [0,1,2,3].map(i => ({type:'rect',x:80+i*220,y:750-i*150,width:160,height:150+i*150,fill:i===3?'#d7633a':'#4a6e65'})),
  };
  if (!symbols[symbol]) throw new Error('Legacy adapter supports explicit --symbol 分屏对比/四步骤/增长图表 only; author a brief for other visuals (no placeholder fallback).');
  const width = Number(flag('--width','1080')), height = Number(flag('--height','1440')), margin = width * 0.07;
  const lines = title.split('\n'); const fontSize = Math.min(width * 0.09, height * 0.12 / lines.length);
  const subtitle = flag('--subtitle');
  const brief: CoverBrief = {
    schema:1, route:'nonimage', mode:'composed', title, subtitle, width,height,
    safeArea:{top:margin,right:margin,bottom:margin,left:margin},
    layout:{ title:{x:margin,y:margin,width:width-2*margin,height:height*.18,fontSize,lines},
      subtitle:{x:margin,y:height*.27,width:width-2*margin,height:height*.06,fontSize:width*.03},
      visual:{x:margin,y:height*.35,width:width-2*margin,height:height*.55} },
    palette:{background:'#f5f1e8',foreground:'#182629',accent:'#d7633a',muted:'#5a6869'},
    visual:{kind:'code',description:meaning,shapes:symbols[symbol]},
  };
  validateCoverBrief(brief);
  const path = 'cover-brief.legacy.json'; writeCoverFile(ROOT,path,JSON.stringify(brief,null,2)+'\n'); return path;
}
let temporaryOutput: string | undefined;
const attempt: any = {schema:1,id:randomUUID(),status:'running',briefPath:null,startedAt:new Date().toISOString()};
function recordAttempt(status: string) {
  attempt.status=status;
  if (status !== 'running') attempt.finishedAt=new Date().toISOString();
  writeCoverFile(ROOT,COVER_ATTEMPT,JSON.stringify(attempt,null,2)+'\n');
}
try {
  // Select a new attempt before validating its brief/assets. A failed replacement
  // must never leave the previous approved image labelled as the current success.
  // Store only an ID and a validated local path, never arbitrary argv/error/env data.
  recordAttempt('running'); stateUpdate(false);
  writeCoverFile(ROOT,COVER_REPORT,JSON.stringify({schema:3,pass:false,technicalPass:false,visualPass:false,reason:'New cover attempt in progress; prior PNG is last-known-good only'},null,2)+'\n');
  const briefPath = args.includes('--legacy-adapter') ? legacyAdapter() : flag('--brief');
  if (!briefPath) throw new Error('Provide --brief cover-brief.json. Old flags require explicit --legacy-adapter; see references/COVER-WORKFLOW.md.');
  localCoverPath(ROOT,briefPath,false); attempt.briefPath=briefPath; recordAttempt('running');
  if (args.includes('--prepare-only') && args.includes('--import-complete')) throw new Error('Choose prepare-only or import-complete, not both');
  const brief = loadCoverBrief(ROOT, briefPath), asset = inspectCoverAsset(ROOT, brief);
  const renderer = flag('--renderer', 'remotion');
  if (!['remotion','svg-inkscape'].includes(renderer)) throw new Error('renderer must be remotion or explicit svg-inkscape (already-installed binary only)');
  if (args.includes('--import-complete') && brief.mode !== 'complete-image') throw new Error('--import-complete requires mode=complete-image');
  if (brief.mode === 'complete-image' && !args.includes('--prepare-only') && !args.includes('--import-complete')) throw new Error('Use --import-complete to preserve an actual finished PNG without claiming a Remotion render');
  const props = coverRenderProps(ROOT,brief,asset);
  writeCoverFile(ROOT,COVER_PROPS,JSON.stringify(props,null,2)+'\n');
  const sources = coverSources(ROOT, briefPath);
  const meta: any = {schema:3, attemptId:attempt.id, generatedAt:new Date().toISOString(), status:'prepared', route:brief.route, mode:brief.mode,
    title:brief.title, subtitle:brief.subtitle ?? '', coverSize:{width:brief.width,height:brief.height},
    briefPath, sources, sourceRevision:sha256(JSON.stringify(sources)), asset,
    renderProps:{path:COVER_PROPS,sha256:hashCoverFile(ROOT,COVER_PROPS)},
    renderer:brief.mode === 'complete-image' ? 'source-asset-copy' : renderer === 'svg-inkscape' ? 'svg-inkscape' : 'remotion-still', output:null,
    visualReview:{status:'pending'}, evidenceNote:'Container dimensions and hashes are machine evidence; typography and visual quality require review of actual pixels.'};
  writeCoverFile(ROOT,COVER_META,JSON.stringify(meta,null,2)+'\n');
  writeCoverFile(ROOT,COVER_REPORT,JSON.stringify({schema:3,pass:false,technicalPass:false,visualPass:false,sourceRevision:meta.sourceRevision,reason:'Prepared only; no current completed cover'},null,2)+'\n');
  stateUpdate(false);
  if (args.includes('--prepare-only')) { recordAttempt('prepared'); console.log('Cover prepared; no rendered image or design approval claimed.'); process.exit(0); }
  // Never allow a successful no-output renderer to relabel a previous PNG as the new result.
  temporaryOutput = `output/cover/.render-${randomUUID()}.png`;
  localCoverPath(ROOT,temporaryOutput,false);
  if (brief.mode === 'complete-image') writeCoverFile(ROOT,temporaryOutput,readFileSync(localCoverPath(ROOT,asset.path)));
  else if (renderer === 'svg-inkscape') {
    const svg = renderToStaticMarkup(React.createElement(CoverDesign,{brief,assetHref:props.assetHref ?? undefined}));
    const path = 'output/cover/cover-source.svg'; writeCoverFile(ROOT,path,svg);
    meta.renderSource = {path,sha256:sha256(svg)};
    writeCoverFile(ROOT,'.cache/cover-inkscape/profile/.keep',''); writeCoverFile(ROOT,'.cache/cover-inkscape/cache/.keep','');
    execFileSync('inkscape',[localCoverPath(ROOT,path),'--export-type=png',`--export-filename=${localCoverPath(ROOT,temporaryOutput,false)}`],{stdio:'inherit',env:{...process.env,INKSCAPE_PROFILE_DIR:localCoverPath(ROOT,'.cache/cover-inkscape/profile',false),XDG_CACHE_HOME:localCoverPath(ROOT,'.cache/cover-inkscape/cache',false)}});
  } else {
    const require = createRequire(import.meta.url), cli = resolve(dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
    const browser = installedBrowser(flag('--browser-executable'));
    // Check output parents/files before handing a local path to the renderer.
    execFileSync(process.execPath,[cli,'still','src/video/cover-index.ts','douyin-cover',temporaryOutput,'--props',COVER_PROPS,'--frame','0','--quiet',...(browser ? ['--browser-executable',browser] : [])],{stdio:'inherit'});
  }
  const info = imageInfo(readFileSync(localCoverPath(ROOT,temporaryOutput)));
  if (info.width !== brief.width || info.height !== brief.height || info.format !== 'png') throw new Error('Actual output size/format differs from explicit brief');
  renameSync(localCoverPath(ROOT,temporaryOutput),localCoverPath(ROOT,COVER_OUTPUT,false));
  meta.status='rendered'; meta.output={path:COVER_OUTPUT,sha256:hashCoverFile(ROOT,COVER_OUTPUT),width:info.width,height:info.height};
  writeCoverFile(ROOT,COVER_META,JSON.stringify(meta,null,2)+'\n'); recordAttempt('completed'); stateUpdate(true);
  console.log(`Cover artifact created: ${COVER_OUTPUT}; route=${brief.route}, renderer=${meta.renderer}. Technical validation and visual review are still pending.`);
} catch (error) {
  try { recordAttempt('failed'); stateUpdate(false); } catch { /* The error remains a failed invocation if safe state writing is unavailable. */ }
  if(temporaryOutput) try { rmSync(localCoverPath(ROOT,temporaryOutput,false),{force:true}); } catch { /* Only this run's safe temporary file may be cleaned. */ }
  console.error(`Cover generation failed: ${String(error)}`); process.exit(1);
}

#!/usr/bin/env node
// Read-only, dependency-free catalogue. Never executes style code or discovers libraries.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,isAbsolute,dirname,basename} from 'node:path';
import {lstatSync} from 'node:fs';
import {listStyles} from './custom-style.mjs';
const fail=m=>{throw new Error(m);};
const normalize=s=>s.normalize('NFKC').toLowerCase();
const usage='Usage: style-recommendations.mjs --query="题材" [--limit=3] [--library-root=/explicit/approved/library]\n       style-recommendations.mjs --all [--library-root=/explicit/approved/library]\nOptional personalization: --memory-root=/explicit/local/memory --memory-user=opaque-id --memory-project=opaque-id --memory-tool=/verified/installed/fix-agent/scripts/preference_memory.py\n--all returns every style version without pagination; --limit applies per section to query only.';
try {
 const opts={};
 for(const arg of process.argv.slice(2)) {
  const match=/^--(query|limit|library-root|memory-root|memory-user|memory-project|memory-tool)=(.*)$/s.exec(arg);
  const key=match?.[1]??(['--all','--help'].includes(arg)?arg.slice(2):null);
  if(!key||Object.hasOwn(opts,key)) fail(`Unknown or duplicate option: ${arg}`);
  opts[key]=match?match[2]:true;
 }
 if(!Object.keys(opts).length||opts.help) {
  if(opts.help&&Object.keys(opts).length>1) fail('--help cannot be combined');
  process.stdout.write(usage+'\n');
 } else {
  if(Number(Object.hasOwn(opts,'query'))+Number(!!opts.all)!==1) fail('Choose exactly one of --query or --all');
  if(opts.query!==undefined&&(!opts.query.trim()||opts.query.length>256)) fail('--query must contain 1–256 characters');
  if(opts.limit!==undefined&&(opts.all||!(/^[1-9]\d*$/.test(opts.limit))||Number(opts.limit)>10)) fail('--limit is 1–10, query only');
  if(opts['library-root']!==undefined&&!opts['library-root'].trim()) fail('--library-root must be an explicit approved directory');
  const limit=Number(opts.limit??3);
  const terms=opts.all?[]:[...new Set(normalize(opts.query).match(/[\p{L}\p{N}]+/gu)??[])];
  if(!opts.all&&!terms.length) fail('--query must include a letter or number');
  const builtin=spawnSync(process.execPath,[fileURLToPath(new URL('./theme-summary.mjs',import.meta.url)),...(opts.all?['--all']:[`--query=${opts.query}`,`--limit=${limit}`])],{encoding:'utf8'});
  if(builtin.status!==0) fail(builtin.stderr.trim()||'Built-in catalogue unavailable');
  const systemItems=JSON.parse(builtin.stdout).map(item=>({...item,source:'builtin',metadata:`themes/${item.id}/theme.json`}));
  const user={title:'用户自建风格',source:'user',libraryRoot:opts['library-root']===undefined?null:resolve(opts['library-root']),state:'not-configured',totalVersions:null,items:[],message:'未提供已授权的个人风格库目录；尚未读取，不代表没有自建风格。'};
  if(user.libraryRoot!==null) {
   let inventory;
   try {inventory=listStyles(user.libraryRoot);} catch(error) {
    // A missing/inaccessible/broken library is not an empty one; built-ins remain usable.
    user.state=error.code==='ENOENT'?'missing':error.code==='EACCES'||error.code==='EPERM'?'inaccessible':'invalid';
    user.message=`个人风格库未能完整读取：${error.message}`;
   }
   if(inventory) {
    user.totalVersions=inventory.length;
    const items=inventory.map(item=>{
     const fields={id:item.id,name:item.name,bestFor:item.bestFor.join(' '),mood:item.mood.join(' '),tags:item.tags.join(' '),description:item.description,...Object.fromEntries(['composition','color','camera','motion','morph','transitions','rhythm'].map(key=>[`design.${key}`,item.design[key]]))};
     const matchedEvidence=terms.flatMap(term=>Object.entries(fields).filter(([,value])=>normalize(value).includes(term)).map(([field,value])=>({term,field,value})));
     return {...item,matchedTerms:terms.filter(term=>matchedEvidence.some(e=>e.term===term)),matchedEvidence};
    });
    user.items=opts.all?items:items.filter(i=>i.matchedTerms.length).sort((a,b)=>b.matchedTerms.length-a.matchedTerms.length||a.id.localeCompare(b.id)||b.version-a.version).slice(0,limit);
    user.state=!inventory.length?'empty':!user.items.length?'no-match':'available';
    user.message=!inventory.length?'此目录目前没有已保存的自建风格。':!user.items.length?'已读取风格库，但没有元数据关键词匹配；可用 --all 完整展开。':opts.all?'完整列出全部风格版本，未分页、未截断。':'仅按已保存元数据关键词筛选；用 --all 查看全部版本。';
   }
  }
  // Optional typed local memory, never inferred from a style package or environment.
  const memoryKeys=['memory-root','memory-user','memory-project','memory-tool'];
  const supplied=memoryKeys.filter(k=>opts[k]!==undefined);
  if(supplied.length && supplied.length!==4) fail('Memory requires explicit root, user, project, and verified installed tool together');
  let personalization={state:'not-configured',applied:false};
  if(supplied.length) {
   const tool=opts['memory-tool'];
   if(!isAbsolute(tool)||/[\x00-\x1f]/.test(tool)||tool.split(/[\\/]/).includes('..')||basename(tool)!=='preference_memory.py') fail('Memory tool must be the explicit absolute verified installed preference_memory.py path');
   let toolUnavailable=null;
   for(let current=tool;;current=dirname(current)) {
    let stat;
    try {stat=lstatSync(current);} catch(error) {
     if(['ENOENT','EACCES','EPERM'].includes(error.code)) {toolUnavailable='Verified installed memory tool is missing or inaccessible; ordinary recommendations retained.';break;}
     throw error;
    }
    if(stat.isSymbolicLink()) fail('Memory tool path must not contain symlinks');
    if(current===tool&&!stat.isFile()) fail('Memory tool must be a regular file');
    if(dirname(current)===current) break;
   }
   // This is a caller-approved installed executable, NEVER a path taken from memory/materials.
   // argv array, no shell, no install/copy/discovery/network fallback.
   const result=toolUnavailable?{status:1,stderr:toolUnavailable}:spawnSync('python3',[tool,
    '--root',opts['memory-root'],'profile','--user',opts['memory-user'],'--project',opts['memory-project']],{encoding:'utf8',timeout:5000,maxBuffer:256*1024});
   if(result.status!==0) personalization={state:'unavailable',applied:false,message:'Local memory unavailable; ordinary recommendations retained. '+(result.stderr??'').trim()};
   else {
    const profile=JSON.parse(result.stdout), preferences=profile.preferences;
    const score=item=>(item.id===preferences.preferred_style?1:0)-(item.id===preferences.avoided_style?2:0);
    for(const items of [systemItems,user.items]) {
     items.forEach(item=>{item.preferenceHint=score(item);});
     items.sort((a,b)=>score(b)-score(a));
    }
    personalization={state:'available',applied:true,profile,
     effect:'Reorders only existing matched candidates within each section; no filtering, selection, code change, or approval. Current request wins.'};
   }
  }
  process.stdout.write(JSON.stringify({mode:opts.all?'all':'query',personalization,basis:'Metadata keyword hints with optional confirmed local preference ordering; not visual quality or approval scores.',sections:[{title:'系统内置风格',source:'builtin',items:systemItems},user]},null,2)+'\n');
 }
} catch(error) {process.stderr.write(`style-recommendations: ${error.message}\n`);process.exitCode=1;}

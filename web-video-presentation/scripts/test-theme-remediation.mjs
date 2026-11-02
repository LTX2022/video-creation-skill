// Read-only role-aware theme contract test. No browser, renderer, network or packages.
// A pass means only source constraints pass, never visual/commercial approval.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const ids=`ai-orchestration apple-glass-studio atelier-gallery bauhaus-bold blueprint bold-signal bootstrap-marketplace campus-blackboard-pro chalk-garden cinema-title-card course-studio creative-voltage creator-dashboard creator-neon-grid dark-botanical dark-tech-glow data-ops-slate documentary-archive douyin-high-contrast dune electric-studio element-clean ferrari-rosso-corsa fintech-terminal forest-ink history-museum houdini-node-lab indigo-porcelain kraft-paper luxury-watch-black magazine-white-space medical-clean-room midnight-press monochrome-print neon-cyber newsroom paper-press pastel-dream podcast-wave-studio porsche-precision practical-skill procedural-vfx quantum-interface robotics-showroom saas-command-center science-diagram soft-neu split-canvas sunset-zine swiss-ikb taste-skill-neo terminal-green uxbot-product-lab vintage-editorial warm-keynote xiaohongshu-premium`.split(' ').sort();
export function parseTokens(raw){
 const s=raw.replace(/\/\*[\s\S]*?\*\//g,'');const result={};let pos=0;
 while(pos<s.length){
  const m=/(--[\w-]+)\s*:/.exec(s.slice(pos));if(!m)break;
  let i=pos+m.index+m[0].length,start=i,depth=0,quote=null;
  for(;i<s.length;i++){
   const c=s[i];
   if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;}
   else if(c==='"'||c==="'")quote=c;
   else if(c==='(')depth++;
   else if(c===')')depth--;
   else if(c===';'&&depth===0)break;
  }
  assert(!quote&&depth===0,`Unclosed declaration ${m[1]}`);
  assert(!Object.hasOwn(result,m[1]),`Duplicate token ${m[1]}`);
  result[m[1]]=s.slice(start,i).replace(/\s+/g,' ').trim();pos=i+1;
 }
 return result;
}
const baseline=parseTokens(readFileSync(join(root,'templates/src/styles/base.css'),'utf8'));
const color=s=>{assert(/^#[0-9a-f]{6}$/i.test(s),`Need explicit hex source role: ${s}`);return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);};
const luminance=s=>color(s).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);
export const contrast=(a,b)=>{const [lo,hi]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return(hi+.05)/(lo+.05);};
const mandatory=`shell surface surface-2 surface-3 text text-2 text-mute text-faint text-disabled rule accent accent-strong accent-on accent-soft accent-glow font-display-cn font-display-en font-body font-mono font-display-weight card-border-w body-leading label-tracking`.split(' ').map(x=>'--'+x);
const newIds=['particle-depth-film','spectral-material-film','kinetic-wireframe-film','rain-platform-film'];
const allIds=[...ids,...newIds].sort();
const themes=allIds.map(id=>({id,meta:JSON.parse(readFileSync(join(root,'themes',id,'theme.json'),'utf8')),css:readFileSync(join(root,'themes',id,'tokens.css'),'utf8')})).map(x=>({...x,t:parseTokens(x.css)}));
function checkContrast(t){
 for(const bg of ['--surface','--surface-2','--surface-3']){
  for(const fg of ['--text','--text-2','--text-mute','--accent-strong','--success','--warning','--error'])assert(contrast(t[fg],t[bg])>=4.5,`${fg} on ${bg} = ${contrast(t[fg],t[bg])}`);
  assert(contrast(t['--text-faint'],t[bg])>=3,'Faint minimum for nonessential/large annotation');
  for(let i=1;i<=5;i++)assert(contrast(t[`--chart-${i}`],t[bg])>=3,`Chart${i} on ${bg}`);
 }
 assert(contrast(t['--accent-on'],t['--accent'])>=4.5,'Accent fill text');
 for(const state of ['success','warning','error'])assert(contrast(t[`--${state}-on`],t[`--${state}`])>=4.5,`${state} fill text`);
}
function checkMeta(x){
 const {id,meta:m,t}=x;assert.equal(m.id,id);assert(Array.isArray(m.mood)&&m.mood.length);assert(Array.isArray(m.bestFor)&&m.bestFor.length);
 for(const key of ['name','nameZh','description','descriptionZh'])assert(typeof m[key]==='string'&&m[key].trim(),key);
 for(const k of ['shell','surface','text','accent'])assert.equal(m.preview[k],t['--'+k]);
 assert.equal(m.implementationStatus,'source-updated-render-review-pending');assert.equal(m.review.aesthetic,'not-reviewed');assert.equal(m.review.commercialReadiness,'not-certified');
 assert.equal(m.fontPolicy.verifiedOnRenderer,false);assert.equal(m.fontPolicy.fontAssetsBundled,false);
 assert(!/企业级商用|Premium video theme|同款/.test(m.description+' '+m.descriptionZh));
 assert(m.tokenRoles['text-faint'].includes('not essential small'));assert(m.tokenRoles.accent.includes('not assumed safe'));
 assert(['editorial','data','product','terminal','node','blueprint','lesson','gallery','archive','kinetic','audio','soft','reference'].includes(m.designIntent.family));
 assert(m.designIntent.contentLayout&&m.designIntent.semanticMotion&&m.designIntent.distinction);
}
test('All 56 historical IDs preserved with exactly four reference-film additions, no retirement',()=>{assert.equal(ids.length,56);assert.equal(allIds.length,60);assert.deepEqual(readdirSync(join(root,'themes'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort(),allIds);});
for(const x of themes){
 test(`${x.id}: token/meta/role source contract (NOT visual)`,()=>{
  for(const k of mandatory)assert(x.t[k],`Missing ${k}`);
  const refs=[...x.css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m=>m[1]);
  for(const ref of refs)assert(ref in x.t||ref in baseline,`Undefined ${ref}`);
  for(const f of ['--font-display-cn','--font-display-en','--font-body','--font-mono'])assert(/(?:sans-serif|serif|monospace|system-ui)/.test(x.t[f]),`No generic fallback ${f}`);
  assert(/SC|CJK|YaHei|PingFang|SimSun|STSong/.test(x.t['--font-body']),'Explicit body CJK fallback');
  assert(!/@import|https?:\/\//.test(x.css.replace(/data:image\/svg\+xml[^\n]*/g,'')),'No external font/decor imports');
  assert(!x.t['--surface-pattern']?.includes('color-mix(in srgb'),'Copied radial signature removed');
  checkContrast(x.t);checkMeta(x);
 });
}
test('Structural identity is no longer a 30-theme clone',()=>{
 const keys=['--font-display-en','--font-display-cn','--font-display-weight','--r-card','--rule-w','--rule-style','--hero-num-font','--hero-num-style','--hero-num-weight','--hero-num-track','--stage-pad-x','--stage-pad-y','--body-leading'];
 const groups=new Map();for(const x of themes){const k=JSON.stringify(keys.map(z=>x.t[z]));groups.set(k,[...(groups.get(k)||[]),x.id]);}
 // Shared structures could be intentional; this is only a regression guard against the previous mass-clone.
 assert(Math.max(...[...groups.values()].map(x=>x.length))<=2,'More than two structurally identical themes');
});
test('Negative control: essential low contrast is rejected',()=>{const t={...themes[0].t,'--text-mute':themes[0].t['--surface']};assert.throws(()=>checkContrast(t));});
test('Negative control: accent fill without readable on-color is rejected',()=>{const t={...themes[0].t,'--accent-on':themes[0].t['--accent']};assert.throws(()=>checkContrast(t));});
test('Negative control: fabricated visual-ready metadata is rejected',()=>{const x={...themes[0],meta:{...themes[0].meta,implementationStatus:'visual-ready'}};assert.throws(()=>checkMeta(x));});
test('Negative control: stale preview swatch is rejected',()=>{const x={...themes[0],meta:{...themes[0].meta,preview:{...themes[0].meta.preview,accent:'#ffffff'}}};assert.throws(()=>checkMeta(x));});
test('Role-aware exemption: faint/brand-fill are not forced to body contrast',()=>{
 const examples=themes.filter(x=>['--surface','--surface-2','--surface-3'].some(bg=>contrast(x.t['--accent'],x.t[bg])<4.5));assert(examples.length>0);
 assert(themes.some(x=>contrast(x.t['--text-faint'],x.t['--surface'])<4.5));
 for(const x of examples)checkContrast(x.t);
});

test('Theme metadata families match the executable 60-ID scene registry',()=>{
 const registry=readFileSync(join(root,'templates/src/video/presets/registry.ts'),'utf8');
 for(const {id,meta} of themes){
  const match=new RegExp("'"+id+"':\\s*\\{\\s*id:\\s*'"+id+"',\\s*family:\\s*'([^']+)'").exec(registry);
  assert(match,`No explicit runtime registry entry ${id}`);assert.equal(meta.designIntent.family,match[1],id);
 }
});

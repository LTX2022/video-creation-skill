import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, fstatSync, ftruncateSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { inflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import type { CoverBrief, CoverRect, CoverTextBox } from '../src/video/cover-types';
export type { CoverBrief } from '../src/video/cover-types';
export const COVER_META = 'output/cover/cover-metadata.json';
export const COVER_OUTPUT = 'output/cover/cover.png';
export const COVER_REPORT = 'output/cover/cover-report.json';
export const COVER_PROPS = 'output/cover/cover-props.json';
export const COVER_ATTEMPT = 'output/cover/cover-attempt.json';
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export function localCoverPath(root: string, path: string, mustExist = true): string {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('\0') || /^(?:[a-z][\w+.-]*:|\/)/i.test(path) || path.split('/').some(p => !p || p === '..' || p === '.')) throw new Error(`Expected plain project-relative cover path: ${path}`);
  const base = realpathSync(root), target = resolve(base, path), rel = relative(base, target);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Cover path escapes project: ${path}`);
  let current = base;
  for (const part of rel.split(sep)) {
    current = resolve(current, part);
    // lstat (not existsSync alone) catches dangling symlinks too.
    let info;
    try { info = lstatSync(current); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
    if (info?.isSymbolicLink()) throw new Error(`Cover symlink paths are not allowed: ${path}`);
    if (info && !info.isDirectory() && (!info.isFile() || info.nlink !== 1)) throw new Error(`Cover linked/nonregular files are not allowed: ${path}`);
  }
  if (mustExist && (!existsSync(target) || !statSync(target).isFile())) throw new Error(`Cover file missing: ${path}`);
  return target;
}
export function writeCoverFile(root: string, path: string, content: string | Buffer): void {
  const target = localCoverPath(root, path, false);
  mkdirSync(dirname(target), { recursive: true });
  localCoverPath(root, path, false);
  // Validate the opened file before truncation so a hardlink cannot modify other
  // project/external bytes. This is not a sandbox for concurrent hostile renames.
  const descriptor = openSync(target,constants.O_WRONLY | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0),0o600);
  try {
    const opened=fstatSync(descriptor), current=lstatSync(target);
    if (!opened.isFile() || opened.nlink !== 1 || current.isSymbolicLink() || current.ino !== opened.ino || current.dev !== opened.dev) throw new Error(`Unsafe cover output: ${path}`);
    ftruncateSync(descriptor,0); writeFileSync(descriptor,content);
  } finally {closeSync(descriptor);}
}
export function readCoverJson(root: string, path: string): any { return JSON.parse(readFileSync(localCoverPath(root, path), 'utf8').replace(/^\uFEFF/, '')); }
export function hashCoverFile(root: string, path: string): string { return sha256(readFileSync(localCoverPath(root, path))); }
export type ImageInfo = { width: number; height: number; format: 'png' | 'jpeg' };
const CRC_TABLE = Array.from({length:256},(_,n)=>{ let c=n;for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0; });
function crc32(data:Buffer):number { let c=0xffffffff;for(const b of data)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0; }
function decodeImage(bytes:Buffer, info:ImageInfo):ImageInfo {
  const expected=info.width*info.height*4;
  try {
    // Existing video dependency, never downloaded. Decode the full frame, not merely ffprobe/header metadata.
    const pixels=execFileSync('ffmpeg',['-v','error','-xerror','-max_alloc','268435456','-err_detect','explode','-threads','1','-noautorotate','-f','image2pipe','-i','pipe:0','-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{input:bytes,maxBuffer:expected+1024,timeout:20000,stdio:['pipe','pipe','pipe']});
    if(pixels.length!==expected) throw new Error(`Decoded ${pixels.length} bytes, expected ${expected}`);
  } catch(error:any) { throw new Error(`Cover image full decode failed (existing ffmpeg required): ${error?.stderr?.toString().slice(0,300)||error.message}`); }
  return info;
}
/** Full decoded frame + container dimensions, never just metadata claims. Visual approval stays separate. */
export function imageInfo(bytes: Buffer): ImageInfo {
  if (bytes.length > 64 * 1024 * 1024) throw new Error('Cover image exceeds 64 MiB');
  if (bytes.length >= 33 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    let offset = 8, width = 0, height = 0, ended = false; const data: Buffer[] = [];
    while (offset + 12 <= bytes.length) {
      const len = bytes.readUInt32BE(offset), end = offset + len + 12;
      if (end > bytes.length) throw new Error('Truncated PNG chunk');
      const kind = bytes.toString('ascii', offset + 4, offset + 8);
      if(crc32(bytes.subarray(offset+4,offset+8+len))!==bytes.readUInt32BE(offset+8+len)) throw new Error('PNG chunk CRC mismatch');
      if (offset === 8 && (kind !== 'IHDR' || len !== 13)) throw new Error('Invalid PNG header');
      if (kind === 'IHDR') { width = bytes.readUInt32BE(offset + 8); height = bytes.readUInt32BE(offset + 12); }
      if (kind === 'IDAT') data.push(bytes.subarray(offset + 8, offset + 8 + len));
      offset = end;
      if (kind === 'IEND') { ended = len === 0; break; }
    }
    if (!ended || !data.length || !width || !height || width > 16384 || height > 16384 || width * height > 40_000_000) throw new Error('Invalid/oversized PNG dimensions or missing image data');
    if(offset!==bytes.length) throw new Error('Unexpected trailing PNG data');
    const inflated=inflateSync(Buffer.concat(data), { maxOutputLength: Math.min(256 * 1024 * 1024,width*height*8+height*16+1024) });
    if(!inflated.length) throw new Error('PNG has no pixel scanlines');
    return decodeImage(bytes,{ width, height, format: 'png' });
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker');
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const len = bytes.readUInt16BE(offset);
      if (len < 2 || offset + len > bytes.length) throw new Error('Truncated JPEG');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && len >= 8) {
        const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5);
        if (!width || !height || width * height > 40_000_000) throw new Error('Invalid JPEG dimensions');
        return decodeImage(bytes,{ width, height, format: 'jpeg' });
      }
      offset += len;
    }
  }
  throw new Error('Expected a valid local PNG or JPEG, not a prompt, SVG, URL or renamed non-image');
}
function requireValue(test: unknown, message: string): asserts test { if (!test) throw new Error(message); }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const color = (v: unknown) => typeof v === 'string' && /^(#[\da-f]{6}|#[\da-f]{3}|none)$/i.test(v);
function rectInside(box: CoverRect, area: CoverRect): boolean { return !!box && ['x','y','width','height'].every(k => finite((box as any)[k])) && box.width > 0 && box.height > 0 && box.x >= area.x && box.y >= area.y && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height; }
function validateText(text: string, box: CoverTextBox, area: CoverRect, label: string) {
  requireValue(rectInside(box, area), `${label} box must fit declared safe area`);
  requireValue(finite(box.fontSize) && box.fontSize > 0 && box.fontSize <= box.height, `${label} requires a positive font size within its box`);
  requireValue(box.align === undefined || ['left','center','right'].includes(box.align), `${label} alignment invalid`);
  const lines = box.lines ?? [text];
  requireValue(Array.isArray(lines) && lines.length > 0 && lines.every(v => typeof v === 'string'), `${label} lines invalid`);
  requireValue(lines.join('') === text || lines.join('\n') === text, `${label} lines must preserve exact text, punctuation and spaces`);
  const lineHeight = box.lineHeight ?? 1.15;
  requireValue(finite(lineHeight) && lineHeight >= 1 && box.fontSize * (1 + (lines.length - 1) * lineHeight) <= box.height, `${label} line height exceeds box`);
  requireValue(box.fontWeight === undefined || (finite(box.fontWeight) && box.fontWeight >= 100 && box.fontWeight <= 900), `${label} font weight invalid`);
}
export function validateCoverBrief(value: any): CoverBrief {
  requireValue(value?.schema === 1, 'cover brief schema must be 1');
  requireValue(['nonimage','imagegen'].includes(value.route), 'route must be nonimage or imagegen');
  requireValue(['composed','complete-image'].includes(value.mode), 'mode must be composed or complete-image');
  requireValue(typeof value.title === 'string' && value.title.trim().length > 0 && value.title.length <= 500, 'Literal title required (max 500 code units, no silent rewriting)');
  requireValue(value.subtitle === undefined || (typeof value.subtitle === 'string' && value.subtitle.length <= 1000), 'subtitle must be text');
  requireValue([value.width,value.height].every(n => Number.isInteger(n) && n >= 64 && n <= 8192) && value.width * value.height <= 40_000_000, 'Explicit integer cover dimensions required (64..8192, <=40 MP)');
  const s = value.safeArea;
  requireValue(s && ['top','right','bottom','left'].every(k => finite(s[k]) && s[k] >= 0), 'Explicit safe-area insets required');
  const safe = { x: s.left, y: s.top, width: value.width - s.left - s.right, height: value.height - s.top - s.bottom };
  requireValue(safe.width > 0 && safe.height > 0, 'Safe area has no space');
  requireValue(value.layout && rectInside(value.layout.visual, { x:0,y:0,width:value.width,height:value.height }), 'visual box must fit canvas');
  validateText(value.title, value.layout.title, safe, 'title');
  if (value.subtitle) validateText(value.subtitle, value.layout.subtitle, safe, 'subtitle');
  requireValue(value.palette && ['background','foreground','accent','muted'].every(k => color(value.palette[k]) && value.palette[k] !== 'none'), 'Palette needs four explicit hex colors');
  requireValue(value.fontFamily === undefined || (typeof value.fontFamily === 'string' && value.fontFamily.length < 200 && !/[<>;{}]/.test(value.fontFamily)), 'Invalid local font family');
  const v = value.visual;
  requireValue(v && typeof v.description === 'string' && v.description.trim(), 'visual.description must explain its content-specific purpose');
  if (v.kind === 'code') {
    requireValue(value.route === 'nonimage' && value.mode === 'composed', 'Code artwork belongs to nonimage/composed route');
    requireValue(Array.isArray(v.shapes) && v.shapes.length > 0 && v.shapes.length <= 200, 'Code visual requires 1..200 authored shapes; no silent placeholder');
    for (const shape of v.shapes) {
      requireValue(shape && ['rect','circle','line','path','text'].includes(shape.type), 'Unsupported code shape');
      const numeric = ['x','y','width','height','rx','cx','cy','r','x1','y1','x2','y2','fontSize','fontWeight','strokeWidth','opacity'];
      const allowed = new Set(['type',...numeric,'d','text','fill','stroke']);
      requireValue(Object.keys(shape).every(k => allowed.has(k)), 'Unknown shape attribute (code execution/URLs are not accepted)');
      requireValue(numeric.every(k => shape[k] === undefined || (finite(shape[k]) && Math.abs(shape[k]) <= 10000)), 'Shape numbers must be finite');
      requireValue(['fill','stroke'].every(k => shape[k] === undefined || color(shape[k])), 'Shape colors must be hex or none');
      requireValue(shape.opacity === undefined || (shape.opacity >= 0 && shape.opacity <= 1), 'Shape opacity outside 0..1');
      const required = shape.type === 'rect' ? ['x','y','width','height'] : shape.type === 'circle' ? ['cx','cy','r'] : shape.type === 'line' ? ['x1','y1','x2','y2'] : shape.type === 'text' ? ['x','y','fontSize'] : [];
      requireValue(required.every(k => finite(shape[k])), 'Shape geometry missing');
      if (shape.type === 'path') requireValue(typeof shape.d === 'string' && shape.d.length < 20000 && /^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/.test(shape.d), 'Invalid SVG path data');
      if (shape.type === 'text') requireValue(typeof shape.text === 'string' && shape.text.length < 500, 'Code label text required');
    }
  } else {
    requireValue(v.kind === 'image' && v.asset && typeof v.asset.path === 'string' && ['contain','cover'].includes(v.asset.fit), 'Image visual needs local asset path and fit policy');
    const p = v.asset.provenance;
    requireValue(p && ['generated','user-photo','screenshot','licensed'].includes(p.sourceType) && typeof p.source === 'string' && p.source.trim() && typeof p.rights === 'string' && p.rights.trim(), 'Image provenance source and rights are required');
    if (value.route === 'imagegen') {
      requireValue(p.sourceType === 'generated' && typeof p.prompt === 'string' && p.prompt.trim() && typeof p.provider === 'string' && p.provider.trim() && typeof p.model === 'string' && p.model.trim(), 'Imagegen needs actual generated asset + prompt/provider/model (use unknown when not reported)');
    } else requireValue(p.sourceType !== 'generated', 'A generated asset cannot be relabeled nonimage');
  }
  return value as CoverBrief;
}
export function loadCoverBrief(root: string, path: string) { return validateCoverBrief(readCoverJson(root, path)); }
export function inspectCoverAsset(root: string, brief: CoverBrief): any | null {
  if (brief.visual.kind === 'code') return null;
  const path = brief.visual.asset.path, bytes = readFileSync(localCoverPath(root, path));
  const info = imageInfo(bytes);
  if (brief.mode === 'complete-image' && (brief.width !== info.width || brief.height !== info.height)) throw new Error('Complete-image dimensions must equal the actual source; choose composed for explicit crop/re-layout');
  if (brief.mode === 'complete-image' && info.format !== 'png') throw new Error('Complete-image importer requires PNG; JPEG is supported as composed visual only');
  return { path, sha256: sha256(bytes), ...info, provenance: brief.visual.asset.provenance, fit: brief.visual.asset.fit };
}
/** Cover-only input props do not alter the video's src/public input identity. */
export function coverRenderProps(root: string, brief: CoverBrief, asset: any | null) {
  const assetHref = asset ? `data:image/${asset.format};base64,${readFileSync(localCoverPath(root,asset.path)).toString('base64')}` : null;
  return {brief, assetHref};
}
export function coverSources(root: string, briefPath: string): Array<{path:string;sha256:string}> {
  const css = readFileSync(localCoverPath(root,'src/styles/fonts.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  if(/@import\b/i.test(css)) throw new Error('Cover fonts.css must be self-contained; external/imported CSS is not bound');
  const fonts = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map(match => {
    const url = match[2].trim();
    if(/^(?:[a-z][\w+.-]*:|\/\/)/i.test(url) || url.includes('\\') || /[?#]/.test(url)) throw new Error('Cover fonts must use plain local project URLs');
    const path = url.startsWith('/') ? `public/${url.slice(1)}` : relative(resolve(root),resolve(root,'src/styles',url)).split(sep).join('/');
    localCoverPath(root,path); return path;
  });
  return [...new Set([briefPath, 'scripts/cover-contract.ts', 'scripts/generate-cover.ts', 'src/video/CoverDesign.tsx', 'src/video/CoverRoot.tsx', 'src/video/cover-types.ts', 'src/video/cover-index.ts', COVER_PROPS, 'src/styles/fonts.css',...fonts])].map(path => ({ path, sha256: hashCoverFile(root, path) }));
}
export function currentCoverErrors(root: string, meta: any): string[] {
  const errors: string[] = [];
  if (meta?.schema !== 3) return ['Legacy cover evidence is unbound; regenerate with --brief (schema 3)'];
  try {
    const attempt = readCoverJson(root,COVER_ATTEMPT);
    if (attempt.schema !== 1 || attempt.status !== 'completed' || attempt.id !== meta.attemptId || attempt.briefPath !== meta.briefPath) errors.push('Latest cover attempt is incomplete/failed or selects another brief; prior PNG is last-known-good only');
    const brief = loadCoverBrief(root, meta.briefPath);
    if (brief.route !== meta.route || brief.mode !== meta.mode || brief.title !== meta.title || brief.width !== meta.coverSize?.width || brief.height !== meta.coverSize?.height) errors.push('Metadata differs from current brief');
    const sources = coverSources(root, meta.briefPath);
    if (JSON.stringify(sources) !== JSON.stringify(meta.sources) || sha256(JSON.stringify(sources)) !== meta.sourceRevision) errors.push('Stale cover source/brief revision');
    const asset = inspectCoverAsset(root, brief);
    if (JSON.stringify(asset) !== JSON.stringify(meta.asset)) errors.push('Stale or changed source asset');
    if (meta.renderProps?.path !== COVER_PROPS || hashCoverFile(root,COVER_PROPS) !== meta.renderProps?.sha256 || JSON.stringify(readCoverJson(root,COVER_PROPS)) !== JSON.stringify(coverRenderProps(root,brief,asset))) errors.push('Missing, stale or mismatched cover input props');
    if (meta.status !== 'rendered' || !['remotion-still','source-asset-copy','svg-inkscape'].includes(meta.renderer)) errors.push('Prepared/prompt-only/unknown-renderer cover is not a completed artifact');
    if (meta.renderer === 'svg-inkscape' && (!meta.renderSource || hashCoverFile(root, meta.renderSource.path) !== meta.renderSource.sha256)) errors.push('Missing or stale SVG rendering source');
    const bytes = readFileSync(localCoverPath(root, COVER_OUTPUT)), info = imageInfo(bytes), outputHash = sha256(bytes);
    if (info.format !== 'png' || info.width !== brief.width || info.height !== brief.height) errors.push('Actual output dimensions/format differ from brief');
    if (meta.output?.path !== COVER_OUTPUT || meta.output?.sha256 !== outputHash || meta.output?.width !== info.width || meta.output?.height !== info.height) errors.push('Missing or stale output hash/dimensions');
    if (meta.renderer === 'source-asset-copy' && (brief.mode !== 'complete-image' || outputHash !== asset?.sha256)) errors.push('Copy importer must preserve complete original pixels');
  } catch (error) { errors.push(String(error)); }
  return errors;
}
export function coverVisualApproved(meta: any): boolean {
  const r = meta?.visualReview;
  return r?.status === 'approved' && r.sourceRevision === meta.sourceRevision && r.outputSha256 === meta.output?.sha256 && typeof r.reviewer === 'string' && !!r.reviewer.trim() && typeof r.note === 'string' && !!r.note.trim();
}
/** Final packaging always rechecks current files, never trusting a historical report.pass alone. */
export function coverDeliveryErrors(root: string): string[] {
  try {
    const meta = readCoverJson(root, COVER_META), report = readCoverJson(root, COVER_REPORT), errors = currentCoverErrors(root, meta);
    if (!coverVisualApproved(meta)) errors.push('Cover has no visual approval bound to this exact source revision/output');
    if (report.schema !== 3 || report.pass !== true || report.technicalPass !== true || report.visualPass !== true || report.sourceRevision !== meta.sourceRevision || report.output?.sha256 !== meta.output?.sha256 || report.route !== meta.route || report.renderer !== meta.renderer) errors.push('Cover report is missing, stale or not fully approved');
    return errors;
  } catch (error) { return [String(error)]; }
}

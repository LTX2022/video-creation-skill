#!/usr/bin/env node
/** Optional read-only input check. No renderer, model call, approval or visual QA. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const roles = ['template', 'composition', 'components', 'timing', 'style', 'config'];
const limits = ['Only declared input boundaries and local file hashes are checked.',
  'No approval authentication, fact verification, text fitting, rendering or aesthetic assessment.',
  'Existing workflow decisions, validate-screen-text and actual-media QA remain required.'];
function localFile(root, relative) {
  if (typeof relative !== 'string' || !relative || /[\\:\x00-\x1f\x7f]/u.test(relative) || relative.startsWith('/') || relative.split('/').some(p => ['', '.', '..'].includes(p))) throw Error('Unsafe relative file path');
  const base = path.resolve(root), file = path.join(base, relative);
  let current = file;
  while (true) {
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('Symbolic links are not allowed');
    const parent = path.dirname(current); if (current === parent) break; current = parent;
  }
  if (!fs.statSync(file).isFile()) throw Error('Expected regular local file');
  return fs.readFileSync(file);
}
export function checkBatchInput({root, lockBytes, input, expectedLockSha256}) {
  const errors = [], pending = [];
  const err = (at, message, code = 'invalid_contract', action = 'Correct the input or return to the reviewer; do not change the approved design') => {
    const match = /^\$input\.items\[(\d+)\]/.exec(at);
    errors.push({code, itemId: match ? (input?.items?.[Number(match[1])]?.id ?? null) : null, path: at, message, action});
  };
  const shape = (x, at, keys, required = keys) => {
    if (!object(x)) { err(at, 'Expected object'); return {}; }
    for (const k of Object.keys(x)) if (!keys.includes(k)) err(`${at}.${k}`, 'Unknown field; content cannot carry production instructions');
    for (const k of required) if (!Object.hasOwn(x,k)) err(`${at}.${k}`, 'Required field missing');
    return x;
  };
  const str = (x, at) => { if (typeof x !== 'string' || !x.trim()) err(at,'Expected nonblank string'); };
  const list = (x, at, min = 0) => { if (!Array.isArray(x)) { err(at,'Expected array'); return []; } if (x.length < min) err(at,`Expected at least ${min} item(s)`); return x; };
  const positive = (x, at) => { if (!Number.isSafeInteger(x) || x < 1) err(at,'Expected positive safe integer'); };
  const fileCheck = (x, at, extra = []) => {
    const f = shape(x,at,['path','sha256',...extra]);
    if (typeof f.sha256 !== 'string' || !SHA.test(f.sha256)) err(`${at}.sha256`,'Expected lowercase SHA-256');
    try { if (hash(localFile(root,f.path)) !== f.sha256) err(at,'Local file hash mismatch','frozen_file_changed','Restore the approved file or obtain a new reviewed lock'); }
    catch (e) { err(at,e.message); }
    return f;
  };
  if (typeof expectedLockSha256 !== 'string' || !SHA.test(expectedLockSha256) || hash(lockBytes) !== expectedLockSha256) err('$lock','Lock digest missing or changed; use the reviewer-held digest, not a model-supplied value');
  let parsed;
  try { parsed = JSON.parse(lockBytes.toString('utf8')); } catch { err('$lock','Invalid JSON'); parsed = {}; }
  const lock = shape(parsed,'$lock',['schema','id','anchor','frozenFiles','fields','assets']);
  if (lock.schema !== 1) err('$lock.schema','Expected 1');
  if (typeof lock.id !== 'string' || !ID.test(lock.id)) err('$lock.id','Expected safe ID');
  if (lock.anchor === null) pending.push({path:'$lock.anchor',message:'Representative render and actual user decision must be reviewed before batch use'});
  else {
    const a = shape(lock.anchor,'$lock.anchor',['sample','feedback','decisionReference']);
    fileCheck(a.sample,'$lock.anchor.sample'); fileCheck(a.feedback,'$lock.anchor.feedback'); str(a.decisionReference,'$lock.anchor.decisionReference');
  }
  const covered = new Set(), paths = new Set();
  for (const [i,x] of list(lock.frozenFiles,'$lock.frozenFiles',1).entries()) {
    const at = `$lock.frozenFiles[${i}]`, f = fileCheck(x,at,['roles']);
    if (paths.has(f.path)) err(at,'Duplicate frozen path'); paths.add(f.path);
    const seen = new Set();
    for (const r of list(f.roles,`${at}.roles`,1)) {
      if (!roles.includes(r) || seen.has(r)) err(at,'Unknown or duplicate design role');
      seen.add(r); covered.add(r);
    }
  }
  for (const r of roles) if (!covered.has(r)) err('$lock.frozenFiles',`Missing frozen design role: ${r}`);
  const assets = new Map();
  for (const [i,x] of list(lock.assets,'$lock.assets').entries()) {
    const at = `$lock.assets[${i}]`, a = fileCheck(x,at,['id']);
    if (typeof a.id !== 'string' || !ID.test(a.id) || assets.has(a.id)) err(at,'Invalid or duplicate asset ID');
    assets.set(a.id,a);
  }
  const fields = new Map();
  for (const [i,x] of list(lock.fields,'$lock.fields',1).entries()) {
    const at = `$lock.fields[${i}]`;
    const f = shape(x,at,['name','kind','required','maxCodePoints','maxLines','requiredText','allowedAssets'],['name','kind','required']);
    if (typeof f.name !== 'string' || !ID.test(f.name) || ['__proto__','prototype','constructor'].includes(f.name) || fields.has(f.name)) err(at,'Invalid or duplicate field name');
    if (typeof f.required !== 'boolean') err(at,'required must be boolean');
    if (f.kind === 'text') {
      positive(f.maxCodePoints,`${at}.maxCodePoints`); positive(f.maxLines,`${at}.maxLines`);
      for (const [j,t] of list(f.requiredText,`${at}.requiredText`).entries()) str(t,`${at}.requiredText[${j}]`);
      if (f.allowedAssets !== undefined) err(at,'Text fields cannot declare allowedAssets');
    } else if (f.kind === 'asset') {
      for (const id of list(f.allowedAssets,`${at}.allowedAssets`,1)) if (!assets.has(id)) err(at,'Unregistered allowed asset');
      for (const k of ['maxCodePoints','maxLines','requiredText']) if (f[k] !== undefined) err(at,`Asset fields cannot declare ${k}`);
    } else err(at,'Only text or asset fields are supported');
    fields.set(f.name,f);
  }
  const data = shape(input,'$input',['schema','lockId','items']);
  if (data.schema !== 1) err('$input.schema','Expected 1');
  if (data.lockId !== lock.id) err('$input.lockId','Wrong lock ID');
  const ids = new Set();
  for (const [i,x] of list(data.items,'$input.items',1).entries()) {
    const at = `$input.items[${i}]`, item = shape(x,at,['id','content']);
    if (typeof item.id !== 'string' || !ID.test(item.id) || ids.has(item.id)) err(at,'Invalid or duplicate item ID'); ids.add(item.id);
    const content = shape(item.content,`${at}.content`,[...fields.keys()],[]);
    for (const [name,f] of fields) {
      const p = `${at}.content.${name}`, value = content[name];
      if (!Object.hasOwn(content,name)) { if (f.required) err(p,'Required content missing'); continue; }
      if (typeof value !== 'string' || !value.trim()) { err(p,'Expected nonblank string; omit optional fields instead of adding filler'); continue; }
      if (f.kind === 'text') {
        if (/[\x00-\x09\x0b-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(value)) err(p,'Control or hidden text characters are not allowed');
        if ([...value].length > f.maxCodePoints || value.split('\n').length > f.maxLines) err(p,'Text exceeds approved character/explicit-line budget; do not shrink, truncate or redesign','blocked_content_overflow','Return this item to the reviewer for an approved content/layout decision');
        for (const text of Array.isArray(f.requiredText) ? f.requiredText : []) if (typeof text === 'string' && !value.includes(text)) err(p,`Required literal missing: ${text}`,'required_text_missing','Restore the exact approved unit, condition or protected text; review source facts');
      } else if (f.kind === 'asset' && (!Array.isArray(f.allowedAssets) || !f.allowedAssets.includes(value))) err(p,'Asset outside approved allowlist','asset_not_approved','Supply a registered local asset or return this item for review');
    }
  }
  return {status:errors.length ? 'invalid' : pending.length ? 'pending-anchor-review' : 'input-valid-review-required', inputValid:errors.length === 0,
    humanApprovalVerified:false, rendered:false,
    items:(Array.isArray(data.items) ? data.items : []).map((item,i) => ({id:item?.id ?? null,
      status:errors.some(e => !e.path.startsWith('$input.items[') || e.path.startsWith(`$input.items[${i}]`)) ? 'blocked' : pending.length ? 'pending-anchor-review' : 'input-valid-review-required'})),
    errors,pending,limits};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4) throw Error('Usage: node check-batch-input.mjs <project-root> <lock-relative.json> <input-relative.json> <reviewer-held-lock-sha256>');
    const [root,lock,input,digest] = args;
    const report = checkBatchInput({root,lockBytes:localFile(root,lock),input:JSON.parse(localFile(root,input).toString('utf8')),expectedLockSha256:digest});
    console.log(JSON.stringify(report,null,2)); process.exitCode = report.status === 'invalid' ? 1 : report.pending.length ? 2 : 0;
  } catch (e) { console.error(JSON.stringify({status:'invalid',error:e.message,rendered:false,humanApprovalVerified:false})); process.exitCode = 1; }
}

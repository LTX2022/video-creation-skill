// Offline packager regression: synthetic source only; no real research material.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('packager excludes complete research and legacy trees, at any depth, plus nested ZIPs', t => {
  const root = mkdtempSync(join(tmpdir(), 'package-exclusions-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const source = join(root, 'source');
  function put(name, value) {const parts = name.split('/');parts.pop();mkdirSync(join(source,...parts),{recursive:true});writeFileSync(join(source,name),value);}
  put('VERSION','1.0.0\n'); put('VERSION.json',JSON.stringify({version:'1.0.0'})); put('manifest.json',JSON.stringify({version:'1.0.0'}));
  put('keep.txt','kept'); put('third-party/LICENSE.txt','synthetic license retained');
  for(const name of ['lq-distillation/docs/transcript.txt','lq-distillation/transcripts/sample.json','lq-distillation/frames/frame.jpg','lq-distillation/data/ids.json','legacy/source.txt','nested/lq-distillation/docs/transcript.txt','nested/legacy/source.txt','nested/old.ZIP']) put(name,'synthetic excluded fixture');
  mkdirSync(join(source,'scripts'),{recursive:true});
  copyFileSync(new URL('./package-skill.ts',import.meta.url),join(source,'scripts/package-skill.ts'));
  const out=join(root,'delivery');
  const result=spawnSync(process.execPath,[join(source,'scripts/package-skill.ts'),'--out-dir',out,'--no-zip'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(readFileSync(join(out,'delivery-manifest.json'),'utf8'));
  assert.deepEqual(manifest.files.map(x=>x.path).sort(),['VERSION','VERSION.json','keep.txt','manifest.json','scripts/package-skill.ts','third-party/LICENSE.txt'].sort());
  const verify=spawnSync(process.execPath,[join(source,'scripts/package-skill.ts'),'--verify',out],{encoding:'utf8'});
  assert.equal(verify.status,0,verify.stderr);
});

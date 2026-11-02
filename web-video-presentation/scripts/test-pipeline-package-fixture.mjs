import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTestPackage} from '../templates/scripts/package-test-fixture.mjs';
test('pipeline fixture loads generated project package directly', t => {
  const root=mkdtempSync(join(tmpdir(),'package-reader-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'scripts'));writeFileSync(join(root,'package.json'),JSON.stringify({scripts:{check:'test-only'}}));
  assert.deepEqual(readTestPackage(join(root,'scripts')),{scripts:{check:'test-only'}});
});
test('pipeline fixture creates source-tree package through real offline scaffold', () => {
  const packageJson=readTestPackage(fileURLToPath(new URL('../templates/scripts/',import.meta.url)));
  assert.ok(packageJson.scripts['render:video']);assert.ok(packageJson.scripts['render:video:both']);
});

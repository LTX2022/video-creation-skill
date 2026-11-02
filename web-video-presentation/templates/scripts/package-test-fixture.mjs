// Read a generated project's scripts, or generate a disposable offline source-tree fixture.
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
export function readTestPackage(scriptsDirectory) {
  const local = resolve(scriptsDirectory, '../package.json');
  if (existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
  const scaffold = resolve(scriptsDirectory, '../../scripts/scaffold.sh');
  if (!existsSync(scaffold)) throw new Error('Test requires a generated project package.json or a skill source tree with scripts/scaffold.sh');
  const temp = mkdtempSync(join(tmpdir(), 'pipeline-package-'));
  try {
    const project = join(temp, 'project');
    const result = spawnSync('bash', [scaffold, project, '--profile=custom', '--format=landscape', '--skip-install'], {encoding:'utf8'});
    if (result.status !== 0) throw new Error(`Offline test scaffold failed: ${result.stderr || result.stdout}`);
    if (!existsSync(join(project,'scripts/package-test-fixture.mjs'))) throw new Error('Scaffold did not copy the pipeline test helper');
    return JSON.parse(readFileSync(join(project,'package.json'),'utf8'));
  } finally { rmSync(temp, {recursive:true, force:true}); }
}

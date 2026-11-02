#!/usr/bin/env node
/** Read-only workspace/dependency preflight. No mkdir, installs, network or subprocesses. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const SKILL = 'web-video-presentation';
const MARKER = '.web-video-presentation-project.json';
const SELF = fileURLToPath(import.meta.url);
const SKILL_ROOT = path.dirname(path.dirname(SELF));
const lstat = (p) => { try { return fs.lstatSync(p); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const within = (root, candidate) => { const relative = path.relative(root, candidate); return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); };
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));

/** Reject aliases/escapes rather than silently changing the client's chosen destination. */
export function checkedPath(value, label = 'project-root') {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be explicitly selected; no default destination`);
  if (/[\x00-\x1f\x7f]/u.test(value)) throw new Error(`${label} contains control characters`);
  if (process.platform !== 'win32' && (/^[A-Za-z]:/u.test(value) || value.startsWith('\\\\'))) {
    throw new Error(`${label} uses a Windows drive/UNC path on a non-Windows host; select a path in the confirmed execution environment`);
  }
  if (value.split(/[\\/]/u).includes('..')) throw new Error(`${label} must not contain .. traversal`);
  const target = path.resolve(value);
  let current = path.parse(target).root;
  for (const component of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const stat = lstat(current);
    if (stat?.isSymbolicLink()) throw new Error(`${label} contains a symlink: ${current}; select its real path explicitly`);
    if (stat && !stat.isDirectory()) throw new Error(`${label} is not a directory (or has a file ancestor): ${current}`);
  }
  return target;
}
function rejectNested(target) {
  if (within(SKILL_ROOT, target)) throw new Error('Project must be outside the skill installation');
  for (let parent = path.dirname(target); ; parent = path.dirname(parent)) {
    if ([MARKER, 'project-state.json', 'package.json'].some((name) => lstat(path.join(parent, name)))) {
      throw new Error(`Project must be independent, not nested in an existing project: ${parent}`);
    }
    if (parent === path.dirname(parent)) break;
  }
}
function regularJson(root, name) {
  const file = path.join(root, name);
  const stat = lstat(file);
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`Resume requires a regular, non-symlink ${name}`);
  try { return json(file); } catch { throw new Error(`Resume has invalid JSON: ${name}`); }
}
export function inspectWorkspace({mode, projectRoot, toolRoot, legacyResume = false} = {}) {
  if (!['new', 'resume'].includes(mode)) throw new Error('Select --mode=new or --mode=resume explicitly');
  if (legacyResume && mode !== 'resume') throw new Error('--legacy-resume is only valid with --mode=resume');
  const root = checkedPath(projectRoot);
  rejectNested(root);
  const exists = Boolean(lstat(root));
  let legacyUnmarked = false;
  if (mode === 'new') {
    if (exists && fs.readdirSync(root).length) throw new Error(`New project directory is not empty (including hidden files): ${root}; no overwrite/force mode exists`);
  } else {
    if (!exists) throw new Error('Resume requires an existing project; it never scaffolds or creates files');
    const state = regularJson(root, 'project-state.json');
    const pkg = regularJson(root, 'package.json');
    if (state?.projectSkill !== SKILL || !Number.isInteger(state.schema)) {
      throw new Error('Resume state does not identify a valid web-video-presentation project');
    }
    if (!lstat(path.join(root, MARKER)) && legacyResume) {
      legacyUnmarked = true;
    } else {
      const marker = regularJson(root, MARKER);
      if (marker?.skill !== SKILL || !Number.isInteger(marker.schema)) {
        throw new Error('Resume marker does not identify a valid web-video-presentation project');
      }
    }
    if (!pkg || typeof pkg !== 'object' || typeof pkg.scripts !== 'object' || !pkg.scripts || Array.isArray(pkg.scripts)) {
      throw new Error('Resume package.json must contain project scripts');
    }
    for (const name of ['src', 'assets', 'public', 'scripts', 'node_modules', '.cache', 'output', 'output/tmp', 'output/delivery-package']) {
      checkedPath(path.join(root, name), `resume ${name}`);
    }
  }
  let tools = null;
  if (toolRoot !== undefined) {
    tools = checkedPath(toolRoot, 'tool-root');
    if (within(tools, root)) throw new Error('tool-root must not equal or contain the project root');
    if (within(root, tools) && !within(path.join(root, '.tools'), tools)) {
      throw new Error('A project-local tool-root must be .tools or its subdirectory, not source/assets/node_modules/output');
    }
  }
  return {
    mode, projectRoot: root, rootStatus: exists ? (mode === 'new' ? 'empty' : legacyUnmarked ? 'legacy-unmarked' : 'existing-project') : 'not-created',
    readOnly: true, toolRoot: tools, externalToolRootExplicit: tools !== null && !within(root, tools),
    identityProvenance: mode === 'new' ? 'not-yet-created' : legacyUnmarked ? 'state-only-legacy' : 'marker-and-state',
    warnings: legacyUnmarked ? ['Legacy project has no project marker; identity provenance is incomplete. Read-only inspection only; no marker, templates, migration or dependencies were written.'] : [],
    paths: {source: path.join(root, 'src'), originals: path.join(root, 'assets'), runtimeAssets: path.join(root, 'public'),
      projectDependencies: path.join(root, 'node_modules'), npmCache: path.join(root, '.cache/npm'),
      temporary: path.join(root, 'output/tmp'), output: path.join(root, 'output'), delivery: path.join(root, 'output/delivery-package')},
    nextAction: mode === 'new' ? 'Scaffold only this root after user selection; recheck immediately before writing' : 'Continue existing project; do not scaffold or recopy templates',
  };
}
function executable(file) {
  try { return fs.statSync(file).isFile() && (process.platform === 'win32' || (fs.accessSync(file, fs.constants.X_OK), true)); }
  catch { return false; }
}
function findCommand(names, env) {
  for (const folder of (env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const name of names) {
      const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
      for (const extension of extensions) {
        const file = path.resolve(folder, name + extension);
        if (executable(file)) return file;
      }
    }
  }
  return null;
}
export function inventory({env = process.env, browserExecutable, projectRoot} = {}) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const dependencies = [{name: 'node', status: major > 20 || (major === 20 && minor >= 6) ? 'available' : 'unsupported',
    requiredFor: ['scaffold', 'project-scripts'], path: process.execPath, version: process.versions.node, requirement: 'Node 20.6+'}];
  for (const [name, requiredFor] of [['npm', ['project-install']], ['bash', ['scaffold', 'tts-adapters']], ['ffmpeg', ['transcode', 'alpha-validation']], ['ffprobe', ['media-validation', 'audio-timing']]]) {
    const found = findCommand([name], env);
    dependencies.push({name, status: found ? 'found-not-tested' : 'missing', path: found, requiredFor});
  }
  const archiveCommand = process.platform === 'win32' ? 'powershell.exe' : 'zip';
  const archivePath = findCommand([archiveCommand], env);
  dependencies.push({name: archiveCommand, status: archivePath ? 'found-not-tested' : 'missing', path: archivePath,
    requiredFor: ['delivery-package'], policy: 'Required by project ZIP packaging; command presence does not verify archive capabilities. No install or execution during inventory.'});
  const requested = browserExecutable || env.REMOTION_BROWSER_EXECUTABLE;
  const browserCandidates = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : process.platform === 'win32'
      ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((p) => [path.join(p, 'Microsoft/Edge/Application/msedge.exe'), path.join(p, 'Google/Chrome/Application/chrome.exe')]) : [];
  const browser = requested ? (executable(requested) ? path.resolve(requested) : null)
    : findCommand(['microsoft-edge', 'msedge', 'google-chrome', 'chromium', 'chromium-browser'], env) || browserCandidates.find(executable) || null;
  dependencies.push({name: 'browser', status: browser ? 'found-not-tested' : requested ? 'invalid-explicit-path' : 'missing',
    path: browser, requiredFor: ['preview', 'render'], policy: 'Pass the discovered path explicitly; no browser download. Compatibility is not verified by presence.'});
  dependencies.push({name: 'imagegen', status: 'host-verification-required', requiredFor: ['optional-generated-assets'],
    policy: 'Host tool/plugin capability, not an npm package. Agent must inspect available tools; no network probe or credential access here.'});
  if (projectRoot) {
    const file = path.join(projectRoot, 'package.json');
    if (lstat(file)?.isFile()) {
      const pkg = json(file);
      const declared = {...pkg.dependencies, ...pkg.devDependencies};
      for (const name of Object.keys(declared).sort()) {
        if (!/^(?:@[a-z\d._-]+\/)?[a-z\d._-]+$/iu.test(name) || name === '..' || name === '.') throw new Error('Invalid dependency name in project package.json');
        const installed = path.join(projectRoot, 'node_modules', name, 'package.json');
        let version = null;
        try { version = json(installed).version || null; } catch { /* Missing or unreadable stays unverified. */ }
        dependencies.push({name, scope: 'project-npm', requested: declared[name], version,
          status: version ? 'installed-not-verified' : 'missing', path: installed, requiredFor: ['project-build']});
      }
    }
  }
  return dependencies;
}
function options(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const [key, ...rest] = args[i].split('=');
    if (['--json', '--path-only', '--legacy-resume', '--help'].includes(key)) {
      if (rest.length) throw new Error(`Unexpected value: ${key}`);
      result[key === '--legacy-resume' ? 'legacyResume' : key.slice(2)] = true; continue;
    }
    const names = {'--mode': 'mode', '--project-root': 'projectRoot', '--target': 'projectRoot', '--tool-root': 'toolRoot', '--browser-executable': 'browserExecutable'};
    if (!names[key]) throw new Error(`Unsupported argument ${key}; no install or force option exists`);
    const value = rest.length ? rest.join('=') : args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    if (result[names[key]] !== undefined) throw new Error(`Duplicate argument ${key}`);
    result[names[key]] = value;
  }
  return result;
}
export function main(args = process.argv.slice(2)) {
  try {
    const opt = options(args);
    if (opt.help) {
      console.log('Read-only: workspace-preflight.mjs --mode=new|resume --project-root <selected-dir> [--tool-root <selected-dir>] [--json|--path-only]\nUnmarked older project: add --legacy-resume with --mode=resume (read-only; incomplete identity provenance).\nInventory only: workspace-preflight.mjs --mode=inventory [--browser-executable <installed-path>] [--json]\nNever creates directories, installs packages, probes endpoints, or downloads browsers.');
      return 0;
    }
    if (opt.mode === 'inventory' && (opt.projectRoot !== undefined || opt.toolRoot !== undefined || opt['path-only'] || opt.legacyResume)) throw new Error('Inventory-only mode accepts no workspace/tool paths or legacy resume; choose new or resume');
    const workspace = opt.mode === 'inventory' ? null : inspectWorkspace(opt);
    if (opt['path-only']) { console.log(workspace.projectRoot); return 0; }
    const dependencies = inventory({...opt, projectRoot: workspace?.mode === 'resume' ? workspace.projectRoot : undefined});
    const report = {schema: 1, readOnly: true, workspace, dependencies, installation: {
      performed: false, authorizationRequired: true,
      npm: 'After authorization: project-local npm ci --ignore-scripts with command-scoped npm cache; node_modules remains beside package.json',
      system: 'Use a reviewed platform installer or supported portable distribution only at an explicitly authorized target. Not every tool is portable.',
      hostPlugins: 'Verify in the host tool catalog; do not npm-install imagegen/MCP or modify credentials/settings automatically',
    }};
    if (opt.json) console.log(JSON.stringify(report, null, 2));
    else {
      if (workspace) console.log(`${workspace.mode}: ${workspace.projectRoot} (${workspace.rootStatus}; read-only)`);
      for (const warning of workspace?.warnings || []) console.log(`WARNING: ${warning}`);
      console.log(dependencies.map((item) => `${item.name}: ${item.status}${item.path ? ` — ${item.path}` : ''}`).join('\n'));
      console.log('No files changed or dependencies installed. See references/WORKSPACE-SETUP.md for authorized next steps.');
    }
    return dependencies.some((item) => item.name === 'node' && item.status === 'unsupported') ? 2 : 0;
  } catch (error) {
    console.error(`Workspace preflight blocked: ${error.message}`);
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) process.exitCode = main();

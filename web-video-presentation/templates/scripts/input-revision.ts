import { createRequire } from 'node:module';
/** Local, bounded render-input identity. This is freshness evidence, not user authentication.
 * No workspace-wide scan, env values, node_modules, output reports, or private files are read.
 * Runtime downloads/system fonts/custom dependencies outside this allowlist are NOT pinned.
 */
import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, parse, join, dirname } from 'node:path';

export interface InputFile { path: string; sha256: string; bytes: number }
export interface InputRevision { schema: 1; status: 'bound' | 'unknown'; contentRevision: string | null; files: InputFile[]; issues: string[] }
export const CONTENT_STATE_KEYS = ['intendedUse','outputMode','videoProfile','videoFormat','videoWidth','videoHeight','videoFps','targetDurationSec','timingMode','stepTimings','audioRequested','audioSource','ttsProvider','ttsVoice','subtitlesRequested','overlayChapterIds'] as const;
const ROOT_INPUTS = ['asset-manifest.json','package.json','package-lock.json','tsconfig.json','remotion.config.ts','remotion.config.js','composition-manifest.json','timing-manifest.json','provided-audio-manifest.json','scripts/render-video.ts','scripts/render-route-args.ts','scripts/render-output-safety.ts','scripts/build-render-timing.ts','scripts/input-revision.ts','scripts/delivery-contract.ts','scripts/workflow-evidence.ts','scripts/audio-source.ts','scripts/validate-delivery.ts','scripts/validate-alpha.ts','scripts/validate-composition.ts'];
const REQUIRED = ['project-state.json','package.json','package-lock.json','src/video/index.ts','src/config/videoFormat.ts','src/registry/chapters.ts','src/video/render-timing.generated.ts','timing-manifest.json'];
const SENSITIVE = /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|\.pypirc|\.git|\.aws|\.ssh|\.codex|\.agents|secrets?(?:\..*)?|credentials?(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i;

export function safeLocalPath(root: string, input: string): string {
  if (typeof input !== 'string' || !input || /^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(input)) throw new Error('Expected a local relative path');
  const parts = input.replaceAll('\\','/').split('/');
  if (parts.includes('..') || parts.some((part) => SENSITIVE.test(part))) throw new Error(`Unsafe or sensitive input path: ${input}`);
  const base = resolve(root), full = resolve(base, input.replaceAll('\\','/'));
  const rel = relative(base, full);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Input escapes project: ${input}`);
  // Also reject a project rooted underneath a symlink, not just symlink descendants.
  let ancestor=parse(base).root;
  for(const component of relative(ancestor,base).split(/[\\/]/).filter(Boolean)) {
    ancestor=join(ancestor,component);
    if(lstatSync(ancestor).isSymbolicLink())throw new Error(`Symlink project ancestor rejected: ${input}`);
  }
  // Check all existing components, including the root. Never follow a symlink.
  for (let path = base, i = -1; i < rel.split(/[\\/]/).length; i++) {
    if (i >= 0) path = resolve(path, rel.split(/[\\/]/)[i]!);
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error(`Symlink input rejected: ${input}`);
    // existsSync follows a dangling link, so lstat it as well.
    try { if (lstatSync(path).isSymbolicLink()) throw new Error(`Symlink input rejected: ${input}`); }
    catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
  return full;
}
export function hashLocalFile(root: string, path: string): string {
  const full = safeLocalPath(root, path);
  const fd = openSync(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(fd);
    if (!before.isFile()) throw new Error(`Not a regular file: ${path}`);
    const hash = createHash('sha256'), chunk = Buffer.allocUnsafe(1024 * 1024);
    for (let n; (n = readSync(fd, chunk, 0, chunk.length, null)) > 0;) hash.update(chunk.subarray(0, n));
    const after = fstatSync(fd), current = lstatSync(full);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || current.ino !== before.ino || current.dev !== before.dev || current.isSymbolicLink()) throw new Error(`Input changed while hashing: ${path}`);
    return hash.digest('hex').toUpperCase();
  } finally { closeSync(fd); }
}
export function readLocalJson(root: string, path: string): any {
  const full = safeLocalPath(root, path);
  const fd=openSync(full,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try {
    const before=fstatSync(fd);
    if (!before.isFile() || before.size > 32 * 1024 * 1024) throw new Error(`JSON is not a bounded regular file: ${path}`);
    const value=JSON.parse(readFileSync(fd, 'utf8').replace(/^\uFEFF/, ''));
    const after=fstatSync(fd),current=lstatSync(full);
    if(after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs||current.ino!==before.ino||current.dev!==before.dev||current.isSymbolicLink())throw new Error(`JSON changed while reading: ${path}`);
    return value;
  } finally {closeSync(fd);}
}

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => [k, canonical(value[k])]));
  return value;
}
export function digestValue(value: unknown): string { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex').toUpperCase(); }
export function contentState(state: any): any { return Object.fromEntries(CONTENT_STATE_KEYS.filter((k) => state[k] !== undefined).map((k) => [k, state[k]])); }
export function renderVariantDigest(settings: unknown): string { return digestValue({ schema: 1, settings }); }
/** Fail closed on common unsupported runtime inputs without opening them or reading env values.
 * This is a conservative guard, not a full JavaScript dependency analyser. */
let sourceParser:any;
function parserForProject(root:string):any {
  if(sourceParser)return sourceParser;
  // TypeScript is already a declared project devDependency. No install/network fallback.
  const resolvers=[resolve(root,'package.json'),resolve(process.cwd(),'package.json'),import.meta.url];
  for(let i=0;i<process.execArgv.length-1;i++)if(['--import','--require'].includes(process.execArgv[i]!)&&isAbsolute(process.execArgv[i+1]!))resolvers.push(process.execArgv[i+1]!);
  for(const from of resolvers){try{sourceParser=createRequire(from)('typescript');return sourceParser;}catch{}}
  throw new Error('Installed TypeScript parser unavailable; cannot inspect declared source inputs');
}
/** Narrow AST guard, not a dependency-closure proof: comments/display strings are never expressions. */
function sourceInputIssues(root:string,path:string):string[] {
  if(!/^src\/.*\.(?:[cm]?[jt]sx?)$/.test(path))return [];
  const full=safeLocalPath(root,path);
  if(lstatSync(full).size>32*1024*1024)return [`Source exceeds supported inspection bound: ${path}`];
  const ts=parserForProject(root),text=readFileSync(full,'utf8');
  const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,/\.[jt]sx$/.test(path)?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const issues:string[]=[];
  const allowedEnv=new Set(['REMOTION_SUBTITLES','REMOTION_CAPTIONS']);
  const stringValue=(node:any):string|null=>node&&ts.isStringLiteralLike(node)?node.text:null;
  const isEnv=(node:any)=>node&&ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='process'&&node.name.text==='env';
  function inspectImport(spec:string) {
    if(spec.startsWith('.')) {
      const target=relative(resolve(root),resolve(dirname(full),spec)).replaceAll('\\','/');
      if(target.startsWith('../')||(!target.startsWith('src/')&&!target.startsWith('public/')&&target!=='project-state.json'&&!ROOT_INPUTS.includes(target)))issues.push(`Undeclared source import in ${path}; move the dependency into src/public or extend the explicit input contract`);
      if(target.endsWith('/fonts.remote.css'))issues.push(`Remote fonts are not locally pinned: ${path}`);
    }else if(/^(?:https?:|file:|data:|\/)/i.test(spec))issues.push(`Nonlocal module import is not pinned: ${path}`);
  }
  function visit(node:any) {
    if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){const spec=stringValue(node.moduleSpecifier);if(spec!==null)inspectImport(spec);}
    if(ts.isCallExpression(node)) {
      const spec=stringValue(node.arguments[0]);
      if(spec!==null&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require')))inspectImport(spec);
      if(spec!==null&&ts.isIdentifier(node.expression)&&node.expression.text==='fetch'&&/^https?:\/\//i.test(spec))issues.push(`Explicit remote fetch is not locally pinned: ${path}`);
    }
    if(ts.isPropertyAccessExpression(node)&&isEnv(node.expression)&&!allowedEnv.has(node.name.text))issues.push(`Undeclared runtime environment input in ${path}; env values are intentionally not read`);
    if(ts.isElementAccessExpression(node)&&isEnv(node.expression)){const key=stringValue(node.argumentExpression);if(key===null||!allowedEnv.has(key))issues.push(`Undeclared runtime environment input in ${path}; env values are intentionally not read`);}
    ts.forEachChild(node,visit);
  }
  visit(source);
  return [...new Set(issues)];
}
export function captureInputRevision(root = process.cwd(), options: { state?: any } = {}): InputRevision {
  const files: InputFile[] = [], issues: string[] = [], paths: string[] = [];
  function walk(path: string) {
    try {
      const full = safeLocalPath(root, path), stat = lstatSync(full);
      if (stat.isDirectory()) for (const entry of readdirSync(full).sort()) walk(`${path}/${entry}`);
      else if (stat.isFile()) paths.push(path);
      else issues.push(`Unsupported input: ${path}`);
    } catch (error) { issues.push(String((error as Error).message)); }
  }
  for (const dir of ['src', 'public']) if (existsSync(resolve(root, dir))) walk(dir); else issues.push(`Missing input directory: ${dir}`);
  for (const path of ROOT_INPUTS) {
    try {lstatSync(resolve(root,path));paths.push(path);}catch(error:any){if(error.code!=='ENOENT')issues.push(`Cannot inspect input: ${path}`);}
  }
  for (const path of REQUIRED) if (!existsSync(resolve(root, path))) issues.push(`Missing required input: ${path}`);
  for (const path of [...new Set(paths)].sort()) {
    try {
      const full = safeLocalPath(root, path), bytes = lstatSync(full).size;
      let sha256 = hashLocalFile(root, path);
      issues.push(...sourceInputIssues(root,path));
      if (path === 'timing-manifest.json') {
        const value = readLocalJson(root, path);
        delete value.generatedAt; delete value.updatedAt;
        sha256 = digestValue(value);
      }
      files.push({ path, sha256, bytes });
    } catch (error) { issues.push(String((error as Error).message)); }
  }
  try {
    // Only explicit content fields: new render receipts/approval booleans do not dirty their own input.
    const state = options.state ?? readLocalJson(root, 'project-state.json');
    files.push({ path: 'project-state.json#content', sha256: digestValue(contentState(state)), bytes: 0 });
  } catch (error) { issues.push(String((error as Error).message)); }
  files.sort((a,b) => a.path.localeCompare(b.path));
  const status = issues.length ? 'unknown' : 'bound';
  // Physical byte counts are diagnostics, not part of semantic JSON identity.
  return { schema: 1, status, contentRevision: status === 'bound' ? digestValue({ schema: 1, inputs: files.map(({path,sha256}) => ({path,sha256})) }) : null, files, issues };
}
export function revisionErrors(current: InputRevision, record: any): string[] {
  if (current.status !== 'bound' || !current.contentRevision) return ['Current input revision is unknown; no freshness/cache hit may be claimed', ...current.issues];
  if (!/^[A-Fa-f0-9]{64}$/.test(String(record?.contentRevision ?? ''))) return ['Legacy or missing contentRevision: evidence is unbound, not valid for current source'];
  return record.contentRevision === current.contentRevision ? [] : ['Evidence is stale for current contentRevision; rerender/review changed inputs'];
}

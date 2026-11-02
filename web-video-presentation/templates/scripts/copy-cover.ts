import { copyFileSync, existsSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { COVER_META, COVER_OUTPUT, currentCoverErrors, localCoverPath, readCoverJson } from './cover-contract';
// Desktop is never a default destination; this command is deliberately outside the normal cover route.
const ROOT=process.cwd(), args=process.argv.slice(2);
function flag(name:string) { const a=args.find(v=>v.startsWith(name+'='));const i=args.indexOf(name);return a?a.slice(name.length+1):i>=0?args[i+1]??'':''; }
try {
  if(!args.includes('--desktop-authorized')) throw new Error('Desktop copy requires explicit user authorization and --desktop-authorized; ordinary delivery uses output/cover/cover.png');
  const meta=readCoverJson(ROOT,COVER_META), errors=currentCoverErrors(ROOT,meta);
  if(errors.length) throw new Error(errors.join('; '));
  if(meta.visualReview?.status!=='approved' || meta.visualReview.sourceRevision!==meta.sourceRevision || meta.visualReview.outputSha256!==meta.output.sha256) throw new Error('Bound visual approval is required before desktop delivery');
  const filename=flag('--filename')||'视频封面.png';
  if(filename!==basename(filename) || /[\\/\x00-\x1f:]/.test(filename) || !filename.endsWith('.png')) throw new Error('Filename must be a plain .png basename, never a path');
  const desktop=resolve(homedir(),'Desktop');
  if(!existsSync(desktop) || lstatSync(desktop).isSymbolicLink() || !lstatSync(desktop).isDirectory()) throw new Error('Desktop must already exist as a real directory');
  const destination=resolve(desktop,filename);
  try { if(lstatSync(destination).isSymbolicLink()) throw new Error('Refusing symlink destination'); } catch(error:any) { if(error.code!=='ENOENT') throw error; }
  if(existsSync(destination) && !args.includes('--replace-authorized')) throw new Error('Destination exists; replacement needs explicit authorization and --replace-authorized');
  copyFileSync(localCoverPath(ROOT,COVER_OUTPUT),destination); console.log(`Cover copied: ${destination}`);
} catch(error) { console.error(String(error));process.exit(1); }

import { COVER_META, COVER_OUTPUT, COVER_REPORT, currentCoverErrors, readCoverJson, writeCoverFile } from './cover-contract';
const ROOT=process.cwd(), args=process.argv.slice(2);
function flag(name:string) { const a=args.find(v=>v.startsWith(name+'='));const i=args.indexOf(name);return a ? a.slice(name.length+1) : i>=0 && args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : ''; }
try {
  const meta=readCoverJson(ROOT,COVER_META), errors=currentCoverErrors(ROOT,meta), technicalPass=errors.length===0;
  if(args.includes('--approve-visual') && args.includes('--revoke-visual')) throw new Error('Choose approve or revoke, not both');
  if(args.includes('--revoke-visual')) {
    const reviewer=flag('--reviewer'), note=flag('--review-note');
    if(!reviewer.trim() || !note.trim()) throw new Error('Revocation needs --reviewer and --review-note (for example the current user rejection)');
    meta.visualReviewHistory=[...(meta.visualReviewHistory??[]),meta.visualReview];
    meta.visualReview={status:'rejected',reviewer,note,reviewedAt:new Date().toISOString(),sourceRevision:meta.sourceRevision,outputSha256:meta.output?.sha256};
    writeCoverFile(ROOT,COVER_META,JSON.stringify(meta,null,2)+'\n');
  }
  if(args.includes('--approve-visual')) {
    if(!technicalPass) throw new Error('Cannot approve a stale, invalid or absent artifact');
    const reviewer=flag('--reviewer'), note=flag('--review-note');
    if(!reviewer.trim() || !note.trim()) throw new Error('Visual approval needs --reviewer and --review-note describing inspection of actual pixels (not metadata/OCR alone)');
    meta.visualReviewHistory=[...(meta.visualReviewHistory??[]),meta.visualReview];
    meta.visualReview={status:'approved',reviewer,note,reviewedAt:new Date().toISOString(),sourceRevision:meta.sourceRevision,outputSha256:meta.output.sha256};
    writeCoverFile(ROOT,COVER_META,JSON.stringify(meta,null,2)+'\n');
  }
  const review=meta.visualReview;
  const visualPass=technicalPass && review?.status==='approved' && review.sourceRevision===meta.sourceRevision && review.outputSha256===meta.output.sha256 && typeof review.reviewer==='string' && !!review.reviewer.trim() && typeof review.note==='string' && !!review.note.trim();
  const report={schema:3,generatedAt:new Date().toISOString(),pass:technicalPass&&visualPass,technicalPass,visualPass,sourceRevision:meta.sourceRevision,route:meta.route,renderer:meta.renderer,output:meta.output,
    checks:[{name:'bound artifact/brief/assets',status:technicalPass?'pass':'fail',detail:errors.join('; ')||'Current source and real image container dimensions/hash match'},
      {name:'visual review',status:visualPass?'pass':'pending',detail:visualPass?review.note:'Inspect title glyphs, thumbnail legibility, intended composition/crop, source authenticity and semantic visual; no aesthetic pass inferred from file checks'}]};
  writeCoverFile(ROOT,COVER_REPORT,JSON.stringify(report,null,2)+'\n');
  try { const state=readCoverJson(ROOT,'project-state.json');state.coverTechnicalValidated=technicalPass;state.coverValidated=report.pass;state.coverGenerated=technicalPass;writeCoverFile(ROOT,'project-state.json',JSON.stringify(state,null,2)+'\n'); } catch { /* Cover-only work does not require video project state. */ }
  console.log(`Cover technical=${technicalPass?'pass':'fail'}, visual=${visualPass?'approved':review?.status==='rejected'?'rejected':'pending'}: ${COVER_OUTPUT}`);
  if(!technicalPass || (args.includes('--require-visual') && !visualPass)) process.exit(1);
} catch(error) { console.error(`Cover validation failed: ${String(error)}`); process.exit(1); }

/** Pilot-only input boundary, shared by pre-generation and the installed adapter.
 * Keep punctuation constraints aligned with production wrapText; never repair copy. */
export function titleOnly(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected title-only object');
  const keys=Object.keys(value);
  if (keys.length!==1 || keys[0]!=='title') throw Error('Only title is allowed');
  const title=value.title;
  if (typeof title!=='string' || !title.trim() || [...title].length>24 || /[\x00-\x1f\x7f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u.test(title)) throw Error('Invalid pilot title: nonblank, <=24 code points, one line without hidden/control characters required');
  const chars=[...title];
  if (/[，。！？；：、）》」』】,.!?;:)\]}%]/u.test(chars[0]) || /[（《「『【(\[{]/u.test(chars.at(-1))) throw Error('Unsupported pilot title punctuation at text boundary; return unchanged copy to reviewer');
  return {title};
}

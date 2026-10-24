import type { Passage } from './segment.ts';
declare const verifiedQuote: unique symbol;
export interface VerifiedQuote { readonly passage_id: string; readonly text: string; readonly [verifiedQuote]: true }
// Fold whitespace/case while retaining exact source offsets. Only source slices leave this module.
function fold(text: string) {
  let folded = ''; const starts: number[] = []; const ends: number[] = [];
  for (const token of text.matchAll(/\S+|\s+/gu)) {
    const start = token.index;
    if (/\s/u.test(token[0][0])) { folded += ' '; starts.push(start); ends.push(start + token[0].length); continue; }
    let offset = start;
    for (const character of token[0]) {
      const chunk = character.toLowerCase();
      for (let i = 0; i < chunk.length; i++) { folded += chunk[i]; starts.push(offset); ends.push(offset + character.length); }
      offset += character.length;
    }
  }
  return { folded, starts, ends };
}
export function checkQuote(candidate: { passage_id: string; text: string }, passages: readonly Passage[]): VerifiedQuote | null {
  if (candidate.text.length > 400 || candidate.text.trim().split(/\s+/u).length < 8) return null;
  const passage = passages.find(p => p.id === candidate.passage_id);
  if (!passage) return null;
  const haystack = fold(passage.text); const needle = fold(candidate.text.trim()).folded;
  const at = haystack.folded.indexOf(needle);
  if (at < 0 || (at > 0 && /[\p{L}\p{N}]/u.test(haystack.folded[at - 1]) && /[\p{L}\p{N}]/u.test(needle[0]))
    || (at + needle.length < haystack.folded.length && /[\p{L}\p{N}]/u.test(haystack.folded[at + needle.length]) && /[\p{L}\p{N}]/u.test(needle.at(-1)!))) return null;
  const text = passage.text.slice(haystack.starts[at], haystack.ends[at + needle.length - 1]);
  if (text.length > 400 || text.trim().split(/\s+/u).length < 8) return null;
  return { passage_id: passage.id, text } as VerifiedQuote;
}
export function recheckQuote(value: VerifiedQuote, passages: readonly Passage[]): boolean {
  const checked = checkQuote(value, passages);
  return checked !== null && checked.text === value.text;
}

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TEXTS, PASSAGES, QUOTE_COVERAGE, canonicalTextId } from '../supabase/functions/_shared/core/texts/index.ts';
import { segmentLicence } from '../supabase/functions/_shared/core/quotecheck/segment.ts';
import { RULE_ROWS } from '../supabase/functions/_shared/core/rules/ruleTable.ts';
import { rulePassages, offeredPassages } from '../supabase/functions/_shared/core/rules/rulePassages.ts';
const pinned = [
  ['GPL-2.0-only','gpl-2.0','edaef632cbb643e4e7a221717a6c441a4c1a7c918e6e4d56debc3d8739b233f6',13],
  ['GPL-3.0-only','gpl-3.0','3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986',18],
  ['LGPL-2.1-only','lgpl-2.1','20e50fe7aae3e56378ebf0417d9de904f55a0e61e4df315333e632a4d3555d95',17],
] as const;
describe('byte-preserving corpus and stable passages', () => {
  for (const [id,file,hash,count] of pinned) {
    it(`${id}: raw hash, TS equality, copying grant and section id snapshot`, () => {
      const bytes=readFileSync(new URL(`../data/licenses/${file}.txt`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
      expect(TEXTS[id]).toBe(bytes.toString('utf8'));
      expect(TEXTS[id].replace(/\s+/g,' ')).toContain('Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.');
      const segments=segmentLicence(id,TEXTS[id]);
      expect(segments.map(p=>p.id)).toEqual(Array.from({length:count},(_,i)=>`${id}#s${i}`));
      for (const p of segments) expect(TEXTS[id]).toContain(p.text);
    });
  }
  it('the embedded four-space 7. in GPL3 section 5 never splits section 5', () => {
    const s5=PASSAGES.find(p=>p.id==='GPL-3.0-only#s5');
    expect(s5?.text).toContain('    7.  This requirement');
    expect(PASSAGES.filter(p=>p.id==='GPL-3.0-only#s7')).toHaveLength(1);
  });
  it('fallback paragraph ids are deterministic for documents without numbered sections', () => {
    expect(segmentLicence('Test','First paragraph.\n\nSecond paragraph.')).toEqual([
      {id:'Test#p1',licenceId:'Test',text:'First paragraph.'},{id:'Test#p2',licenceId:'Test',text:'Second paragraph.'},
    ]);
  });
  it('every rule has existing passages or an explicit template-only reason; docs list all ids', () => {
    const ids=new Set(PASSAGES.map(p=>p.id));
    const docs=readFileSync(new URL('../docs/RULES.md',import.meta.url),'utf8');
    for (const row of RULE_ROWS.values()) {
      const policy=rulePassages[row.id];
      expect(policy.passages).toEqual(row.passages);
      if (!policy.passages.length) expect(policy.templateOnlyReason?.trim().length).toBeGreaterThan(0);
      for (const id of policy.passages) expect(ids.has(id),`${row.id}: ${id}`).toBe(true);
      expect(docs).toContain(`## ${row.id} `);
    }
    expect(new Set(PASSAGES.map(p=>p.id)).size).toBe(PASSAGES.length);
  });
  it('absent documents stay template-only and do not borrow other LGPL/GPL texts', () => {
    expect(QUOTE_COVERAGE.complete).toBe(false);
    expect(TEXTS['AGPL-3.0-only']).toBeUndefined();
    expect(offeredPassages(['R-NET-HOSTED'],['AGPL-3.0-only','MIT'])).toEqual([]);
    expect(offeredPassages(['R-PAIR-LGPL-GPL'],['LGPL-3.0-only','GPL-3.0-only'])).toEqual([]);
    expect(offeredPassages(['R-EXC-CLASSPATH'],['GPL-2.0-only','MIT'])).toEqual([]);
    expect(canonicalTextId('GPL-2.0-or-later')).toBe('GPL-2.0-only');
    expect(offeredPassages(['R-PAIR-GPL-SAME'],['GPL-3.0-or-later'])).not.toHaveLength(0);
  });
  it('OSADL snapshot hash is pinned independently of licence document hashes', () => {
    const bytes=readFileSync(new URL('../data/osadl/matrix.csv',import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('9d8dddbd30038c09add0142dc3f00543f19a3625ee7d115f31d1c0a1a08c23b7');
  });
});

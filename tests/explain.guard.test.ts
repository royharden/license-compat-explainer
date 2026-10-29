import { describe, it, expect } from 'vitest';
import { guardOutput, summaryAllowed } from '../supabase/functions/_shared/core/explain/guard.ts';
import { checkQuote, recheckQuote } from '../supabase/functions/_shared/core/quotecheck/check.ts';
import { factsFor, mockFixtures, requestFor } from './explain.helpers.ts';
import { deriveFacts } from '../supabase/functions/_shared/core/explain/factBlock.ts';
describe('M4 output guard and canonical quotes', () => {
  const source = [{ id: 'GPL-3.0-only#test', licenceId: 'GPL-3.0-only', text: 'One two three four five six seven eight nine ten.' }];
  it('enforces 8-word minimum and 400-character maximum', () => {
    expect(checkQuote({ passage_id: source[0].id, text: 'One two three four five six seven' }, source)).toBeNull();
    expect(checkQuote({ passage_id: source[0].id, text: 'One two three four five six seven eight' }, source)).not.toBeNull();
    const long = { ...source[0], text: 'longword '.repeat(50) }; expect(long.text.length).toBeGreaterThan(400);
    expect(checkQuote({ passage_id: long.id, text: long.text }, [long])).toBeNull();
  });
  it('canonical span preserves whitespace/case, not model bytes; runtime recheck rejects casts', () => {
    const passages = [{ ...source[0], text: 'One\n two three FOUR five six seven eight nine ten.' }];
    const quote = checkQuote({ passage_id: passages[0].id, text: 'ONE TWO THREE four FIVE SIX SEVEN EIGHT' }, passages)!;
    expect(quote.text).toBe('One\n two three FOUR five six seven eight'); expect(recheckQuote(quote, passages)).toBe(true);
    expect(recheckQuote({ ...quote, text: 'forged' }, passages)).toBe(false);
  });
  it('mixed valid/fabricated fixture keeps one canonical quote and displays one drop', () => {
    const facts = factsFor(); const result = guardOutput(mockFixtures()['R-DIST-STRONG__demo'], facts);
    expect(result.label).toBe('model'); expect(result.droppedQuotes).toBe(1);
    if (result.label === 'model') { expect(result.quotes).toHaveLength(1); expect(facts.passages.find(p => p.id === result.quotes[0].passage_id)?.text).toContain(result.quotes[0].text); }
  });
  it('changed-case fixture succeeds but renders canonical case', () => {
    const result = guardOutput(mockFixtures()['R-DIST-STRONG__changed_case'], factsFor()); expect(result.label).toBe('model');
    if (result.label === 'model') expect(result.quotes[0].text).toContain('You may convey');
  });
  it.each(['all_invalid','wrong_passage','foreign_id','verdict_key','options_key','extra_key','contradiction'])('rejects %s with a labelled template', scenario => {
    expect(guardOutput(mockFixtures()[`R-DIST-STRONG__${scenario}`], factsFor()).label).toBe('template');
  });
  it('quote in a different or unoffered passage is dropped even when its text exists elsewhere', () => {
    const facts = factsFor(); const output = mockFixtures()['R-DIST-STRONG__changed_case'] as { summary: string; quotes: { passage_id: string; text: string }[] };
    for (const passage_id of ['GPL-2.0-only#s2','GPL-3.0-only#s13']) expect(guardOutput({ ...output, quotes: [{ ...output.quotes[0], passage_id }] }, facts).label).toBe('template');
  });
  it('foreign SPDX id and lexicon polarity fail closed; bare foreign MIT is caught', () => {
    const facts = deriveFacts({ ...requestFor(), project: 'GPL-2.0-only', claimed: { rule_ids: ['R-PAIR-GPL3-GPL2ONLY'], verdict: 'conflict', chosen_side: null } })!;
    const good = mockFixtures()['R-DIST-STRONG__demo'] as object;
    expect(guardOutput({ ...good, summary: 'Review MIT for this setting.' }, facts).label).toBe('template');
    expect(guardOutput({ ...good, summary: 'This is compatible.' }, facts).label).toBe('template');
  });
  it.each(['WTFPL', 'PostgreSQL', 'OpenSSL', 'curl', 'LLVM-exception', 'NASA-1.3'])('rejects unoffered identifier %s even with a valid quote', id => {
    const good = mockFixtures()['R-DIST-STRONG__changed_case'] as object;
    expect(guardOutput({ ...good, summary: `Review ${id} for this setting.` }, factsFor())).toMatchObject({ label: 'template', fallbackReason: 'summary_guard' });
  });
  it.each(['UnfamiliarLicence', 'unfamiliarlicence', 'unfamiliar-name', 'GPL-3.0-only-extra', 'MIT_extra', 'Open-SSL', 'GPL\u20133.0-only'])('closed vocabulary rejects unfamiliar token %s without a name denylist', token => {
    const good = mockFixtures()['R-DIST-STRONG__changed_case'] as object;
    expect(guardOutput({ ...good, summary: `Review ${token} for this setting.` }, factsFor())).toMatchObject({ label: 'template', fallbackReason: 'summary_guard' });
  });
  it('allows rederived canonical licence/exception IDs and expression operators as exact tokens', () => {
    const facts = factsFor('GPL-3.0-only WITH LLVM-exception');
    expect(facts.licenceIds).toEqual(expect.arrayContaining(['GPL-3.0-only', 'LLVM-exception', 'MIT']));
    expect(summaryAllowed('Review (GPL-3.0-only AND MIT) OR GPL-3.0-only WITH LLVM-exception for this setting.', facts)).toBe(true);
    expect(summaryAllowed('Review llvm-exception for this setting.', facts)).toBe(false);
  });
  it('keeps safe ordinary prose and allowed factual IDs on the canonical quote path', () => {
    const good = mockFixtures()['R-DIST-STRONG__changed_case'] as object;
    for (const summary of [
      'Review the fixed rule facts and the cited passage for this setting.',
      'Please review the dependency licence and project conditions with counsel.',
      'Review GPL-3.0-only and MIT for this setting.',
    ]) expect(guardOutput({ ...good, summary }, factsFor()).label).toBe('model');
  });
  it('AGPL demo stays explicitly unavailable without invented s13', () => {
    const f = deriveFacts(requestFor('AGPL-3.0-only', 'hosted'))!;
    expect(f.passages).toEqual([]); expect(mockFixtures()).not.toHaveProperty('R-NET-HOSTED__demo');
  });
});

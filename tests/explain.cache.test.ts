import { describe, it, expect } from 'vitest';
import { cacheKey, PROMPT_VERSION } from '../supabase/functions/_shared/core/explain/cacheKey.ts';
import { OUTPUT_SCHEMA_VERSION } from '../supabase/functions/_shared/core/explain/outputSchema.ts';
import { GUARD_VERSION } from '../supabase/functions/_shared/core/explain/guard.ts';
import { CORPUS_EDITION } from '../supabase/functions/_shared/core/texts/index.ts';
import { explain } from '../supabase/functions/_shared/core/explain/service.ts';
import { factsFor, requestFor, configFor, mockFixtures, serviceHarness } from './explain.helpers.ts';
describe('M4 versioned cache and every-read guard', () => {
  it('keys include provider/model, prompt/schema/guard/corpus versions, facts and passage hashes', () => {
    const f = factsFor(); const versions = { prompt: PROMPT_VERSION, output: OUTPUT_SCHEMA_VERSION, guard: GUARD_VERSION, corpus: CORPUS_EDITION };
    const key = cacheKey(f, 'test', 'fixture');
    for (const name of Object.keys(versions) as (keyof typeof versions)[])
      expect(cacheKey(f, 'test', 'fixture', { ...versions, [name]: 'changed' })).not.toBe(key);
    expect(cacheKey(f, 'different', 'fixture')).not.toBe(key); expect(cacheKey(f, 'test', 'different')).not.toBe(key);
    expect(cacheKey({ ...f, passages: f.passages.map(p => ({ ...p, text: `${p.text} altered` })) }, 'test', 'fixture')).not.toBe(key);
    expect(cacheKey({ ...f, request: { ...f.request, dep_ref: 'dep-2' } }, 'test', 'fixture')).not.toBe(key);
    expect(cacheKey({ ...f, request: { ...f.request, request_id: 'another-logical-request' } }, 'test', 'fixture')).toBe(key);
  });
  it('closed summary vocabulary invalidates the previous quote-guard@1 cache identity', () => {
    expect(cacheKey(factsFor(), 'test', 'fixture', { prompt: PROMPT_VERSION, output: OUTPUT_SCHEMA_VERSION, guard: 'quote-guard@1', corpus: CORPUS_EDITION }))
      .not.toBe(cacheKey(factsFor(), 'test', 'fixture'));
  });
  it('guarded cache hit records zero cost, does not reserve or call provider', async () => {
    const h = serviceHarness(); h.cache.set(cacheKey(factsFor(), 'test', 'fixture'), mockFixtures()['R-DIST-STRONG__changed_case']);
    expect((await explain(requestFor(), h.provider, configFor(), h.ports)).explanation.label).toBe('model');
    expect(h.events).not.toContain('reserve'); expect(h.events).not.toContain('complete'); expect(h.ledger[0]).toMatchObject({ cache_hit: true, cost_usd: 0 });
  });
  it('tampered schema/foreign quote cache is a miss and never returned as trusted output', async () => {
    const h = serviceHarness(); h.cache.set(cacheKey(factsFor(), 'test', 'fixture'), mockFixtures()['R-DIST-STRONG__wrong_passage']);
    await explain(requestFor(), h.provider, configFor(), h.ports); expect(h.events).toContain('reserve'); expect(h.events).toContain('complete');
  });
  it('cache read rejects an unversioned foreign summary identifier despite a valid quote', async () => {
    const h = serviceHarness(); const good = mockFixtures()['R-DIST-STRONG__changed_case'] as object;
    h.cache.set(cacheKey(factsFor(), 'test', 'fixture'), { ...good, summary: 'Review WTFPL for this setting.' });
    await explain(requestFor(), h.provider, configFor(), h.ports);
    expect(h.events).toContain('reserve'); expect(h.events).toContain('complete'); expect(h.ledger[0].cache_hit).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { explain } from '../supabase/functions/_shared/core/explain/service.ts';
import { ProviderFailure } from '../supabase/functions/_shared/core/providers/types.ts';
import { worstCaseCost, validateBudgetConfig } from '../supabase/functions/_shared/core/explain/budget.ts';
import { utf8ByteLength } from '../supabase/functions/_shared/core/util/utf8.ts';
import { configFor, requestFor, serviceHarness } from './explain.helpers.ts';
describe('M4 durable budget orchestration (mock ports; real SQL validation deferred)', () => {
  it('reserves before provider spy, settles before cache write, records reported usage', async () => {
    const h = serviceHarness(); const r = await explain(requestFor(), h.provider, configFor(), h.ports);
    expect(r.explanation.label).toBe('model'); expect(h.events.indexOf('reserve')).toBeLessThan(h.events.indexOf('complete'));
    expect(h.events.indexOf('settle')).toBeLessThan(h.events.indexOf('put'));
    expect(h.ledger[0]).toMatchObject({ input_tokens: 10, output_tokens: 20, status: 'ok', quotes_kept: 1 });
  });
  it('null reservation returns labelled template before any provider call', async () => {
    const h = serviceHarness(); h.ports.budgets.reserve = async () => null;
    expect((await explain(requestFor(), h.provider, configFor(), h.ports)).explanation).toMatchObject({ label: 'template', fallbackReason: 'over_cap_or_pending' });
    expect(h.events).not.toContain('complete');
  });
  it('unknown price/output bound/unsafe factor fail closed before provider or storage I/O', async () => {
    for (const config of [null, { ...configFor(), price: { ...configFor().price, model: 'unknown' } },
      { ...configFor(), maxOutputTokens: 201 }, { ...configFor(), safetyFactor: 0.5 }]) {
      const h = serviceHarness(); expect((await explain(requestFor(), h.provider, config, h.ports)).explanation.label).toBe('template');
      expect(h.events).toEqual([]);
    }
    expect(validateBudgetConfig({ ...configFor(), price: { ...configFor().price, verified_on: '' } })).toBeNull();
  });
  it('missing provider is provider_not_configured, never silent mock', async () => {
    const h = serviceHarness(); expect((await explain(requestFor(), null, configFor(), h.ports)).explanation).toMatchObject({ fallbackReason: 'provider_not_configured' });
    expect(h.events).toEqual([]);
  });
  it('whole serialized request uses UTF8 bytes plus framing and maximum output', () => {
    const config = configFor(); const body = JSON.stringify({ system: 'é🌍', messages: ['long fact block'], schema: { type: 'object' }, max_tokens: 200 });
    const result = worstCaseCost({ body, model: 'fixture', provider: 'test', maxOutputTokens: 200 }, config);
    expect(result).toBe(Math.ceil(((utf8ByteLength(body) + 100) + 200 * 2) / 1e6 * 1e12) / 1e12);
    expect(utf8ByteLength(body)).toBeGreaterThan(body.length);
  });
  it('timeout marks attempt unknown with no retry or optimistic refund', async () => {
    const h = serviceHarness(); h.provider.complete = async () => { h.events.push('complete'); throw new ProviderFailure('unknown'); };
    const r = await explain(requestFor(), h.provider, configFor(), h.ports);
    expect(r.explanation).toMatchObject({ fallbackReason: 'timeout_unknown_usage' });
    expect(h.events.filter(e => e === 'complete')).toHaveLength(1); expect(h.events).toContain('unknown'); expect(h.events).not.toContain('settle');
  });
  it.each([null, { input_tokens: -1, output_tokens: 3 }])('missing/invalid usage retains unknown reservation, no retry (%s)', async usage => {
    const h = serviceHarness(); h.provider.complete = async () => { h.events.push('complete'); return { provider: 'test', model: 'fixture', text: '{}', usage }; };
    expect((await explain(requestFor(), h.provider, configFor(), h.ports)).explanation).toMatchObject({ fallbackReason: 'missing_or_invalid_usage' });
    expect(h.events).toContain('unknown'); expect(h.events).not.toContain('settle'); expect(h.events.filter(e => e === 'complete')).toHaveLength(1);
  });
  it('different returned model keeps reservation unknown because configured price cannot be assumed', async () => {
    const h = serviceHarness(); h.provider.complete = async () => ({ provider: 'test', model: 'different', text: '{}', usage: { input_tokens: 1, output_tokens: 1 } });
    await explain(requestFor(), h.provider, configFor(), h.ports); expect(h.events).toContain('unknown'); expect(h.events).not.toContain('settle');
  });
  it('definite noncharged failure settles zero and retries exactly once with a fresh reservation', async () => {
    const h = serviceHarness(); h.provider.complete = async () => { h.events.push('complete'); throw new ProviderFailure('not_charged'); };
    const amounts: number[] = []; h.ports.budgets.settle = async (_id, cost) => { amounts.push(cost); h.events.push('settle'); };
    await explain(requestFor(), h.provider, configFor(), h.ports);
    expect(h.events.filter(e => e === 'complete')).toHaveLength(2); expect(h.events.filter(e => e === 'reserve')).toHaveLength(2);
    expect(amounts).toEqual([0, 0]); expect(h.events.indexOf('settle')).toBeLessThan(h.events.lastIndexOf('reserve')); expect(h.events).not.toContain('unknown');
  });
  it('actual reservation breach is charged in full and appears in ledger', async () => {
    const h = serviceHarness(); h.provider.complete = async () => ({ provider: 'test', model: 'fixture', text: '{}', usage: { input_tokens: 1_000_000, output_tokens: 0 } });
    const costs: number[] = []; h.ports.budgets.settle = async (_id, cost) => { costs.push(cost); };
    await explain(requestFor(), h.provider, configFor(), h.ports); expect(costs).toEqual([1]); expect(h.ledger[0].status).toBe('cap_breach');
  });
  it('facts_mismatch never reaches storage/reservation/provider', async () => {
    const h = serviceHarness(); const result = await explain({ ...requestFor(), rules_edition: 'old' }, h.provider, configFor(), h.ports);
    expect(result.status).toBe(400); expect(h.events).toEqual([]);
  });
});

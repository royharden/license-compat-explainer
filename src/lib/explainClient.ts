import type { ExplainRequest } from '@core/explain/factBlock.ts';
import { deriveFacts } from '@core/explain/factBlock.ts';
import { fallback, guardOutput, guardedOutput } from '@core/explain/guard.ts';
import type { Explanation } from '@core/explain/guard.ts';
import { cacheKey } from '@core/explain/cacheKey.ts';
import { mockProvider } from '@core/providers/mock.ts';
import type { MockScenario } from '@core/providers/mock.ts';
import type { LedgerRow } from '@core/explain/service.ts';
import { readEnv } from './env.ts';
import { supabase } from './supabase.ts';
import mockIndex from '../../fixtures/mock/explain/index.json?raw';
const mockFixtures = (JSON.parse(mockIndex) as { fixtures: Record<string, unknown> }).fixtures;
const mockCache = new Map<string, unknown>();
export const mockLedger: LedgerRow[] = [];
export const clearMockExplanations = () => { mockCache.clear(); mockLedger.splice(0); };
// Network is invoked only by the explicit per-finding consent action. No auto retry.
export async function explainClient(request: ExplainRequest, mode = readEnv().explainMode, scenario: MockScenario = 'demo'): Promise<Explanation> {
  const facts = deriveFacts(request);
  if (!facts) return fallback('facts_mismatch');
  if (!facts.passages.length) return fallback('passages_unavailable_D18');
  if (mode === 'mock') {
    const provider = mockProvider(scenario, mockFixtures); const key = `${cacheKey(facts, provider.provider, provider.model)}:${scenario}`;
    const base: LedgerRow = { attempt_id: null, run_id: request.run_id, provider: provider.provider, model: provider.model, request_hash: key,
      cache_hit: false, input_tokens: 0, output_tokens: 0, cost_usd: 0, status: 'pending', quotes_offered: facts.passages.length, quotes_kept: 0, rules_edition: request.rules_edition };
    let output = mockCache.get(key); let cacheHit = output !== undefined;
    // Every cache read crosses the same guard. A failed guard is a miss.
    if (cacheHit && guardOutput(output, facts).label !== 'model') { output = undefined; cacheHit = false; }
    if (!cacheHit) { const completion = await provider.complete(provider.prepare(facts, 256));
      try { output = JSON.parse(completion.text) as unknown; } catch { output = null; } }
    const result = guardOutput(output, facts);
    const safeOutput = guardedOutput(result);
    if (safeOutput) mockCache.set(key, safeOutput);
    mockLedger.push({ ...base, cache_hit: cacheHit, status: result.label === 'model' ? 'ok' : 'rejected_output', quotes_kept: result.label === 'model' ? result.quotes.length : 0 });
    return result;
  }
  if (!supabase) return fallback('provider_not_configured');
  try {
    const { data, error } = await supabase.functions.invoke('explain', { body: request });
    if (error || typeof data !== 'object' || data === null) return fallback('explanation_transport_failed_no_retry');
    const response = data as { output?: unknown; explanation?: { label?: string; fallbackReason?: unknown } };
    // Never trust a server/cache brand or displayed quote; browser re-derives passages and guards raw output.
    if (response.output !== null && response.output !== undefined) return guardOutput(response.output, facts);
    const reasons = ['provider_not_configured','passages_unavailable_D18','unknown_price_or_bounds','unknown_price_bounds_or_over_cap','over_cap_or_pending',
      'provider_error','timeout_unknown_usage','missing_or_invalid_usage','storage_or_accounting_unavailable_reservation_retained'];
    const reason = typeof response.explanation?.fallbackReason === 'string' && reasons.includes(response.explanation.fallbackReason)
      ? response.explanation.fallbackReason : 'explanation_unavailable';
    return fallback(reason);
  } catch { return fallback('explanation_transport_failed_no_retry'); }
}

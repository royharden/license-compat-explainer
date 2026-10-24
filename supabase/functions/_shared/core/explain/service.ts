import { deriveFacts } from './factBlock.ts';
import { guardOutput, guardedOutput, fallback } from './guard.ts';
import type { Explanation } from './guard.ts';
import { cacheKey } from './cacheKey.ts';
import { validateBudgetConfig, worstCaseCost, actualCost } from './budget.ts';
import type { BudgetConfig } from './budget.ts';
import { ProviderFailure } from '../providers/types.ts';
import type { Provider } from '../providers/types.ts';
export interface LedgerRow {
  attempt_id: string | null; run_id: string; provider: string; model: string; request_hash: string;
  cache_hit: boolean; input_tokens: number | null; output_tokens: number | null; cost_usd: number | null;
  status: string; quotes_offered: number; quotes_kept: number; rules_edition: string;
}
export interface ExplainPorts {
  cache: { get(key: string): Promise<unknown>; put(key: string, output: unknown): Promise<void> };
  budgets: { reserve(requestId: string, runId: string, cost: number): Promise<string | null>; settle(attempt: string, cost: number): Promise<void>; unknown(attempt: string): Promise<void> };
  callledger: { record(row: LedgerRow): Promise<void> };
}
export interface ServiceResponse { status: number; explanation: Explanation; output: unknown }
export async function explain(value: unknown, provider: Provider | null, config: BudgetConfig | null, ports: ExplainPorts): Promise<ServiceResponse> {
  const facts = deriveFacts(value);
  const response = (reason: string, status = 200): ServiceResponse => ({ status, explanation: fallback(reason), output: null });
  if (!facts) return response('facts_mismatch', 400);
  if (!facts.passages.length) return response('passages_unavailable_D18');
  if (!provider || provider.provider === 'mock') return response('provider_not_configured');
  if (!config || !validateBudgetConfig(config)) return response('unknown_price_or_bounds');
  const prepared = provider.prepare(facts, config.maxOutputTokens);
  const worst = worstCaseCost(prepared, config);
  if (worst === null) return response('unknown_price_or_bounds');
  const key = cacheKey(facts, provider.provider, provider.model);
  const base: LedgerRow = { attempt_id: null, run_id: facts.request.run_id, provider: provider.provider, model: provider.model, request_hash: key,
    cache_hit: false, input_tokens: null, output_tokens: null, cost_usd: null, status: 'pending', quotes_offered: facts.passages.length, quotes_kept: 0, rules_edition: facts.request.rules_edition };
  const cached = await ports.cache.get(key);
  if (cached !== null && cached !== undefined) {
    const guarded = guardOutput(cached, facts);
    if (guarded.label === 'model') { await ports.callledger.record({ ...base, cache_hit: true, cost_usd: 0, status: 'ok', quotes_kept: guarded.quotes.length });
      return { status: 200, explanation: guarded, output: guardedOutput(guarded) }; }
  }
  for (let retry = 0; retry < 2; retry++) {
    // Durable atomic reservation always precedes the paid adapter call, including retry.
    const attempt = await ports.budgets.reserve(facts.request.request_id, facts.request.run_id, worst);
    if (!attempt) { await ports.callledger.record({ ...base, status: 'over_cap' }); return response('over_cap_or_pending'); }
    let completion;
    try { completion = await provider.complete(prepared); }
    catch (error) {
      if (error instanceof ProviderFailure && error.charge === 'not_charged') {
        await ports.budgets.settle(attempt, 0);
        await ports.callledger.record({ ...base, attempt_id: attempt, cost_usd: 0, status: 'provider_error' });
        if (retry === 0) continue;
        return response('provider_error');
      }
      await ports.budgets.unknown(attempt);
      await ports.callledger.record({ ...base, attempt_id: attempt, status: 'timeout_unknown_usage' });
      return response('timeout_unknown_usage');
    }
    const actual = completion.usage && completion.provider === provider.provider && completion.model === provider.model ? actualCost(completion.usage, config) : null;
    if (actual === null) { await ports.budgets.unknown(attempt); await ports.callledger.record({ ...base, attempt_id: attempt, status: 'timeout_unknown_usage' }); return response('missing_or_invalid_usage'); }
    await ports.budgets.settle(attempt, actual);
    let raw: unknown = null;
    try { raw = JSON.parse(completion.text); } catch { /* Rejected by strict guard below. */ }
    const guarded = guardOutput(raw, facts);
    await ports.callledger.record({ ...base, attempt_id: attempt, input_tokens: completion.usage!.input_tokens, output_tokens: completion.usage!.output_tokens,
      cost_usd: actual, status: actual > worst ? 'cap_breach' : guarded.label === 'model' ? 'ok' : 'rejected_output', quotes_kept: guarded.label === 'model' ? guarded.quotes.length : 0 });
    const output = guardedOutput(guarded);
    if (output) await ports.cache.put(key, output);
    return { status: 200, explanation: guarded, output: raw };
  }
  return response('provider_error');
}

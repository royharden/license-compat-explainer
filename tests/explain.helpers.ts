import { csvResult } from './rulings.helpers.ts';
import { settings } from './helpers.ts';
import { buildExplainRequest, deriveFacts } from '../supabase/functions/_shared/core/explain/factBlock.ts';
import type { ExplainPorts, LedgerRow } from '../supabase/functions/_shared/core/explain/service.ts';
import type { Provider } from '../supabase/functions/_shared/core/providers/types.ts';
import type { BudgetConfig } from '../supabase/functions/_shared/core/explain/budget.ts';
import { fixtureJson } from './helpers.ts';
export const REQUEST_ID = '00000000-0000-4000-8000-000000000001';
export const RUN_ID = '00000000-0000-4000-8000-000000000002';
export const ATTEMPT_ID = '00000000-0000-4000-8000-000000000003';
export function requestFor(expr = 'GPL-3.0-only', mode: 'distribute' | 'hosted' = 'distribute') {
  const result = csvResult(`Name,Version,License\nprivate-package,1,${expr}`, settings({ mode, bundled: true }));
  const request = buildExplainRequest(result.findings[0], result.settings, result.rulesEdition, REQUEST_ID, RUN_ID);
  if (!request) throw new Error('test request rejected');
  return request;
}
export function factsFor(expr = 'GPL-3.0-only') { const f = deriveFacts(requestFor(expr)); if (!f) throw new Error('test facts rejected'); return f; }
export function mockFixtures() { return fixtureJson<{ fixtures: Record<string, unknown> }>('mock/explain/index.json').fixtures; }
// Synthetic prices for arithmetic tests only: never activation settings or verified live prices.
export function configFor(): BudgetConfig { return { maxOutputTokens: 200, safetyFactor: 1, price: { provider: 'test', model: 'fixture',
  input_usd_per_million: 1, output_usd_per_million: 2, framing_tokens: 100, max_output_tokens: 200, input_bound: 'utf8_bytes', verified_on: '2026-10-24' } }; }
export function serviceHarness() {
  const events: string[] = []; const ledger: LedgerRow[] = []; const cache = new Map<string, unknown>();
  const ports: ExplainPorts = { cache: { async get(key) { events.push('cache'); return cache.get(key) ?? null; }, async put(key, output) { events.push('put'); cache.set(key, output); } },
    budgets: { async reserve() { events.push('reserve'); return ATTEMPT_ID; }, async settle() { events.push('settle'); }, async unknown() { events.push('unknown'); } },
    callledger: { async record(row) { events.push('ledger'); ledger.push(row); } } };
  const provider: Provider = { provider: 'test', model: 'fixture', prepare(_facts, maxOutputTokens) { return { provider: 'test', model: 'fixture', maxOutputTokens, body: '{"whole_request":"fixture"}' }; },
    async complete() { events.push('complete'); return { provider: 'test', model: 'fixture', text: JSON.stringify(mockFixtures()['R-DIST-STRONG__demo']), usage: { input_tokens: 10, output_tokens: 20 } }; } };
  return { events, ledger, cache, ports, provider };
}

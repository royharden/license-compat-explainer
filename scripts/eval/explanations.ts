import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { deriveFacts } from '../../supabase/functions/_shared/core/explain/factBlock.ts';
import { normaliseLicence } from '../../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { expressionFor } from '../../supabase/functions/_shared/core/analyze.ts';
import { evaluateExpression } from '../../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../../supabase/functions/_shared/core/rules/engine.ts';
import { RULES_EDITION } from '../../supabase/functions/_shared/core/rules/ruleTable.ts';
import { guardOutput, GUARD_VERSION } from '../../supabase/functions/_shared/core/explain/guard.ts';
import type { Facts } from '../../supabase/functions/_shared/core/explain/factBlock.ts';
import { mockProvider } from '../../supabase/functions/_shared/core/providers/mock.ts';
import type { MockScenario } from '../../supabase/functions/_shared/core/providers/mock.ts';
import type { Case } from './types.ts';
import { ratio } from './metrics.ts';
export interface ExplanationRow {
  kind: 'explanation'; mode: 'mock' | 'live'; case_id: string; origin: Case['origin']; run_id: string; request_id: string;
  provider: string; model: string; guard_version: string; label: 'model' | 'template'; fallback_reason: string | null;
  passage_count: number; generated_quotes: number | null; verified_quotes: number; dropped_quotes: number;
  cost_usd: number | null; elapsed_ms: number | null; status: string;
}
export function factsFor(c: Case, runId: string): Facts | null {
  const n = normaliseLicence(c.raw); if (!n.expr || !n.text) return null;
  const e = evaluateExpression(expressionFor(n), { settings: c.settings, scope: c.scope }, evaluateLeaf);
  return deriveFacts({ request_id: randomUUID(), run_id: runId, dep_ref: 'dep-1', expr: n.text, project: c.settings.projectLicense,
    mode: c.settings.mode, bundled: c.settings.bundled, scope: c.scope, acknowledgements: c.settings.acknowledgements,
    claimed: { rule_ids: e.ruleIds, verdict: e.verdict, chosen_side: e.chosenSide }, rules_edition: RULES_EDITION });
}
export function observedOutput(c: Pick<Case, 'id' | 'origin'>, facts: Facts, raw: unknown, mode: ExplanationRow['mode'], provider: string, model: string, cost: number | null, elapsed: number): ExplanationRow {
  const guard = guardOutput(raw, facts);
  const quotes = typeof raw === 'object' && raw !== null && 'quotes' in raw && Array.isArray(raw.quotes) ? raw.quotes.length : null;
  return { kind: 'explanation', mode, case_id: c.id, origin: c.origin, run_id: facts.request.run_id, request_id: facts.request.request_id,
    provider, model, guard_version: GUARD_VERSION, label: guard.label, fallback_reason: guard.fallbackReason,
    passage_count: facts.passages.length, generated_quotes: quotes, verified_quotes: guard.label === 'model' ? guard.quotes.length : 0,
    dropped_quotes: guard.droppedQuotes, cost_usd: cost, elapsed_ms: elapsed, status: guard.label === 'model' ? 'ok' : 'rejected_output' };
}
export async function mockExplanations(root: string, cases: readonly Case[], runId: string): Promise<ExplanationRow[]> {
  // Fixture source is the same explicit fixture object imported by the browser, passed by caller.
  const fixtures = (JSON.parse(readFileSync(join(root, 'fixtures/mock/explain/index.json'), 'utf8')) as { fixtures: Record<string, unknown> }).fixtures;
  const rows: ExplanationRow[] = [];
  for (const c of cases.filter(c => c.origin === 'author' && !c.missing)) {
    const facts = factsFor(c, runId); if (!facts) continue;
    const scenario: MockScenario = 'demo'; const provider = mockProvider(scenario, fixtures);
    const started = performance.now();
    if (!facts.passages.length) {
      rows.push({ kind: 'explanation', mode: 'mock', case_id: c.id, origin: c.origin, run_id: runId, request_id: facts.request.request_id,
        provider: 'mock', model: provider.model, guard_version: GUARD_VERSION, label: 'template', fallback_reason: 'passages_unavailable_D18',
        passage_count: 0, generated_quotes: null, verified_quotes: 0, dropped_quotes: 0, cost_usd: null, elapsed_ms: null, status: 'not_called' }); continue;
    }
    const completion = await provider.complete(provider.prepare(facts, 256));
    let raw: unknown = null; try { raw = JSON.parse(completion.text); } catch { /* strict guard handles invalid JSON */ }
    rows.push(observedOutput(c, facts, raw, 'mock', provider.provider, provider.model, null, performance.now() - started));
  }
  return rows;
}
export function explanationMetrics(rows: readonly ExplanationRow[]) {
  if (!rows.length) return { status: 'not_run', reason: 'No explanation ledger observations supplied; no model grounding/cost/latency claims' };
  return { status: 'observed', strata: [...new Set(rows.map(r => `${r.mode}|${r.origin}`))].map(key => {
    const group = rows.filter(r => `${r.mode}|${r.origin}` === key);
    const calls = group.filter(r => r.status !== 'not_called');
    const quoteRows = calls.filter(r => r.generated_quotes !== null);
    const live = group[0].mode === 'live';
    const latencies = calls.flatMap(r => r.elapsed_ms === null ? [] : [r.elapsed_ms]).sort((a,b) => a-b);
    const knownCost = calls.every(r => r.cost_usd !== null);
    const cost = calls.reduce((n,r) => n + (r.cost_usd ?? 0), 0);
    const quoted = group.filter(r => r.label === 'model').length;
    return { mode: group[0].mode, origin: group[0].origin, observations: group.length, called: calls.length,
      templateCount: group.length - quoted, modelCount: quoted, modelCoverage: ratio(quoted, group.length),
      verifiedQuotes: group.reduce((n,r) => n+r.verified_quotes, 0), observedGeneratedQuotes: quoteRows.reduce((n,r) => n+r.generated_quotes!, 0),
      quoteRetention: ratio(quoteRows.reduce((n,r) => n+r.verified_quotes, 0), quoteRows.reduce((n,r) => n+r.generated_quotes!, 0)),
      quoteObservationCoverage: ratio(quoteRows.length, calls.length), droppedQuotes: group.reduce((n,r) => n+r.dropped_quotes, 0),
      // Offered passages are NOT generated quote attempts; never use them as a grounding denominator.
      passageCoverage: ratio(group.filter(r => r.passage_count > 0).length, group.length),
      costStatus: !live ? 'not_applicable_mock' : knownCost ? 'known' : 'incomplete_unknown_charge',
      knownCostUsd: live ? cost : null, costPer100CallsUsd: live && knownCost ? ratio(cost*100, calls.length) : null,
      latencyP50Ms: latencies.length ? latencies[Math.floor((latencies.length-1)*0.5)] : null,
      latencyP95Ms: latencies.length ? latencies[Math.ceil((latencies.length-1)*0.95)] : null,
      fallbackReasons: Object.fromEntries([...new Set(group.flatMap(r => r.fallback_reason ? [r.fallback_reason] : []))].map(reason => [reason, group.filter(r => r.fallback_reason === reason).length])),
      legalMeaningAccuracy: 'not_measured', helpfulness: 'not_measured; requires owner-rated blind pairs',
    };
  }) };
}
export function readExplanationLedger(path: string): ExplanationRow[] {
  const rows = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as ExplanationRow);
  for (const r of rows) {
    if (r.kind !== 'explanation' || !['mock','live'].includes(r.mode) || !['author','osadl'].includes(r.origin) || !['model','template'].includes(r.label)
      || !r.request_id || !r.run_id || !r.guard_version || !r.provider || !r.model || typeof r.status !== 'string'
      || ![r.passage_count,r.verified_quotes,r.dropped_quotes].every(n => Number.isSafeInteger(n) && n >= 0)
      || !(r.generated_quotes === null || Number.isSafeInteger(r.generated_quotes) && r.generated_quotes >= r.verified_quotes)
      || !(r.cost_usd === null || Number.isFinite(r.cost_usd) && r.cost_usd >= 0)
      || !(r.elapsed_ms === null || Number.isFinite(r.elapsed_ms) && r.elapsed_ms >= 0)) throw new Error('Invalid enriched explanation ledger. Raw service quotes_offered counts passages, not generated quotes; enrich from raw responses first.');
  }
  if (new Set(rows.map(r => `${r.run_id}:${r.request_id}`)).size !== rows.length) throw new Error('Duplicate explanation observation; deduplicate retries before metrics');
  return rows;
}

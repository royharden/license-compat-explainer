// Future authorized Node-only activation seam. Calls Provider.complete directly, never the
// public edge function or shared service. No network transport/keys are selected by this module.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { actualCost, validateBudgetConfig, worstCaseCost } from '../../supabase/functions/_shared/core/explain/budget.ts';
import type { BudgetConfig } from '../../supabase/functions/_shared/core/explain/budget.ts';
import type { Provider } from '../../supabase/functions/_shared/core/providers/types.ts';
import type { Facts } from '../../supabase/functions/_shared/core/explain/factBlock.ts';
import type { Case } from './types.ts';
import { observedOutput } from './explanations.ts';
import { GUARD_VERSION } from '../../supabase/functions/_shared/core/explain/guard.ts';
import type { ExplanationRow } from './explanations.ts';
interface Attempt { kind: 'campaign_attempt'; attempt: string; state: 'reserved' | 'settled' | 'unknown'; amount: number; provider: string; model: string; request_id: string; at: string }
function append(path: string, row: Attempt | ExplanationRow): void {
  const fd = openSync(path, 'a'); try { writeSync(fd, `${JSON.stringify(row)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
}
export async function runLocalCampaign(options: { provider: Provider; config: BudgetConfig; ledgerPath: string; capUsd: number; items: { case: Case; facts: Facts }[] }): Promise<ExplanationRow[]> {
  const { provider, config, ledgerPath, capUsd } = options;
  if (provider.provider === 'mock' || !validateBudgetConfig(config) || !Number.isFinite(capUsd) || capUsd <= 0 || capUsd > 5) throw new Error('Explicit verified live config and cap in (0,5] required; no spending authorized by source');
  mkdirSync(dirname(ledgerPath), { recursive: true });
  // One fixed campaign ledger across runs. A concurrent invocation or crashed lock blocks work;
  // do not remove stale locks until an operator reconciles provider records and unknown charges.
  const lockPath = `${ledgerPath}.lock`; const lock = openSync(lockPath, 'wx');
  try {
    const states = new Map<string, Attempt>(); const seenRequests = new Set<string>();
    if (existsSync(ledgerPath)) for (const line of readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const r = JSON.parse(line) as Attempt | ExplanationRow;
      if (r.kind === 'explanation') continue;
      if (r.kind !== 'campaign_attempt' || !r.attempt || !r.request_id || !Number.isFinite(r.amount) || r.amount < 0 || !['reserved','settled','unknown'].includes(r.state)) throw new Error('Malformed campaign ledger; fail closed');
      const before = states.get(r.attempt);
      if ((!before && r.state !== 'reserved') || (before && (before.state !== 'reserved' || r.state === 'reserved')) || (before && (before.request_id !== r.request_id || before.provider !== r.provider || before.model !== r.model))) throw new Error('Invalid campaign lineage; fail closed');
      if (before && r.state === 'settled' && r.amount > before.amount) throw new Error('Prior provider bound breach; campaign activation must be reviewed');
      if (before && r.state === 'unknown' && r.amount !== before.amount) throw new Error('Unknown charge must retain its full reservation');
      states.set(r.attempt, r); seenRequests.add(r.request_id);
    }
    let exposure = [...states.values()].reduce((n,r) => n+r.amount, 0);
    const rows: ExplanationRow[] = [];
    for (const item of options.items) {
      if (!item.facts.passages.length) continue;
      if (seenRequests.has(item.facts.request.request_id)) throw new Error('Request already attempted; no automatic retry/replay');
      const prepared = provider.prepare(item.facts, config.maxOutputTokens); const worst = worstCaseCost(prepared, config);
      if (worst === null || exposure + worst > capUsd) break;
      const base = { kind: 'campaign_attempt' as const, attempt: randomUUID(), provider: provider.provider, model: provider.model, request_id: item.facts.request.request_id };
      append(ledgerPath, { ...base, state: 'reserved', amount: worst, at: new Date().toISOString() });
      exposure += worst; seenRequests.add(base.request_id);
      const started = performance.now(); let completion;
      const unknown = () => {
        append(ledgerPath, { ...base, state: 'unknown', amount: worst, at: new Date().toISOString() });
        const row: ExplanationRow = { kind: 'explanation', mode: 'live', case_id: item.case.id, origin: item.case.origin,
          run_id: item.facts.request.run_id, request_id: base.request_id, provider: provider.provider, model: provider.model,
          guard_version: GUARD_VERSION, label: 'template', fallback_reason: 'timeout_or_unknown_usage', passage_count: item.facts.passages.length,
          generated_quotes: null, verified_quotes: 0, dropped_quotes: 0, cost_usd: null, elapsed_ms: performance.now()-started, status: 'unknown_charge' };
        append(ledgerPath, row); rows.push(row);
      };
      try { completion = await provider.complete(prepared); }
      catch { unknown(); break; }
      const cost = completion.provider === provider.provider && completion.model === provider.model && completion.usage ? actualCost(completion.usage, config) : null;
      if (cost === null) { unknown(); break; }
      append(ledgerPath, { ...base, state: 'settled', amount: cost, at: new Date().toISOString() }); exposure += cost-worst;
      let raw: unknown = null; try { raw = JSON.parse(completion.text); } catch { /* rejection remains a charged observation */ }
      const row = observedOutput(item.case, item.facts, raw, 'live', provider.provider, provider.model, cost, performance.now()-started);
      append(ledgerPath, row); rows.push(row);
      if (cost > worst) break; // Bound breach stops campaign, even if the nominal cap still has room.
    }
    return rows;
  } finally { closeSync(lock); unlinkSync(lockPath); }
}

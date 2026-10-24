import { explain } from '../_shared/core/explain/service.ts';
import type { ExplainPorts } from '../_shared/core/explain/service.ts';
import { deriveFacts } from '../_shared/core/explain/factBlock.ts';
import { fallback } from '../_shared/core/explain/guard.ts';
import { validateBudgetConfig, worstCaseCost } from '../_shared/core/explain/budget.ts';
import type { BudgetConfig, PriceEntry } from '../_shared/core/explain/budget.ts';
import { anthropic } from '../_shared/core/providers/anthropic.ts';
import { openaiCompatible } from '../_shared/core/providers/openaiCompatible.ts';
import { ProviderFailure } from '../_shared/core/providers/types.ts';
import type { Provider, Transport } from '../_shared/core/providers/types.ts';

const setting = (key: string) => Deno.env.get(key)?.trim() ?? '';
const positive = (key: string) => { const n = Number(setting(key)); return Number.isFinite(n) && n > 0 ? n : null; };
function configuration(): { provider: Provider; config: BudgetConfig } | null {
  const name = setting('EXPLAIN_PROVIDER'); const model = setting('EXPLAIN_MODEL');
  const apiKey = setting(name === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_COMPATIBLE_API_KEY');
  if (!['anthropic','openai_compatible'].includes(name) || !model || !apiKey) return null;
  const maximum = positive('EXPLAIN_MAX_OUTPUT_TOKENS'); const safety = positive('EXPLAIN_TOKEN_SAFETY_FACTOR');
  const runCap = positive('EXPLAIN_RUN_CAP_USD'); const dayCap = positive('EXPLAIN_DAILY_CAP_USD');
  if (!maximum || !safety || !runCap || !dayCap) return null;
  let prices: unknown; try { prices = JSON.parse(setting('EXPLAIN_PRICE_TABLE')); } catch { return null; }
  if (!Array.isArray(prices)) return null;
  const price = prices.find((p: PriceEntry) => p && p.provider === name && p.model === model) as PriceEntry | undefined;
  const config = validateBudgetConfig({ price, maxOutputTokens: maximum, safetyFactor: safety });
  if (!config) return null;
  let endpoint = 'https://api.anthropic.com/v1/messages';
  if (name === 'openai_compatible') {
    try { const base = new URL(setting('OPENAI_COMPATIBLE_BASE_URL'));
      if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) return null;
      endpoint = `${base.toString().replace(/\/$/, '')}/chat/completions`;
    } catch { return null; }
  }
  const transport: Transport = async body => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (name === 'anthropic') { headers['x-api-key'] = apiKey; headers['anthropic-version'] = '2023-06-01'; }
      else headers.authorization = `Bearer ${apiKey}`;
      const response = await fetch(endpoint, { method: 'POST', headers, body, signal: controller.signal, redirect: 'error' });
      // Output hard bound is owner-verified in price config. Also bound response bytes.
      const raw = await boundedText(response.body, 256 * 1024);
      return { status: response.status, body: JSON.parse(raw) as unknown };
    } catch { throw new ProviderFailure('unknown'); }
    finally { clearTimeout(timer); }
  };
  return { provider: name === 'anthropic' ? anthropic(model, transport) : openaiCompatible(model, transport), config };
}
async function boundedText(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!stream) return '';
  const reader = stream.getReader(); const decoder = new TextDecoder(); let bytes = 0; let text = '';
  try { for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.length;
    if (bytes > limit) { await reader.cancel(); throw new Error('body_too_large'); } text += decoder.decode(next.value, { stream: true }); }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
function databasePorts(): ExplainPorts | null {
  const url = setting('SUPABASE_URL'); const key = setting('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  async function rest(path: string, body?: unknown, method = 'POST'): Promise<unknown> {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try { const response = await fetch(`${url}/rest/v1/${path}`, { method, headers: { apikey: key, authorization: `Bearer ${key}`,
      'content-type': 'application/json', prefer: path.startsWith('rpc/') ? 'return=representation' : 'resolution=merge-duplicates,return=minimal' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
      if (!response.ok) throw new Error('database_unavailable');
      const raw = await boundedText(response.body, 256 * 1024); return raw ? JSON.parse(raw) as unknown : null;
    } finally { clearTimeout(timer); }
  }
  return {
    budgets: {
      async reserve(requestId, runId, cost) { const result = await rest('rpc/reserve_attempt', { p_request_id: requestId, p_run_id: runId, p_worst_case_usd: cost });
        if (result === null) return null; if (typeof result !== 'string') throw new Error('invalid_reservation'); return result; },
      async settle(attempt, cost) { await rest('rpc/settle_attempt', { p_attempt_id: attempt, p_actual_usd: cost }); },
      async unknown(attempt) { await rest('rpc/mark_attempt_unknown', { p_attempt_id: attempt }); },
    },
    cache: { async get(key) { const rows = await rest(`explanation_cache?key=eq.${encodeURIComponent(key)}&select=output`, undefined, 'GET');
      return Array.isArray(rows) && rows.length === 1 ? (rows[0] as { output: unknown }).output : null; },
      async put(key, output) { await rest('explanation_cache?on_conflict=key', { key, output }); } },
    callledger: { async record(row) { await rest('callledger', row); } },
  };
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  const origins = setting('ALLOWED_ORIGINS').split(',').map(s => s.trim()).filter(Boolean);
  const headers: Record<string, string> = { 'content-type': 'application/json', vary: 'Origin' };
  if (origin && origins.includes(origin)) headers['access-control-allow-origin'] = origin;
  const send = (status: number, reason: string) => new Response(JSON.stringify({ explanation: fallback(reason), output: null }), { status, headers });
  // CORS controls browser callers, not identity. Global SQL cap controls total spending.
  if (origin && !origins.includes(origin)) return send(403, 'origin_not_allowed');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers,
    'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'apikey, authorization, content-type, x-client-info' } });
  if (request.method !== 'POST') return send(405, 'method_not_allowed');
  if (Number(request.headers.get('content-length')) > 16384) return send(413, 'body_too_large');
  let value: unknown;
  try { value = JSON.parse(await boundedText(request.body, 16384)); } catch { return send(400, 'invalid_or_oversize_body'); }
  const facts = deriveFacts(value);
  if (!facts) {
    // Only a syntactically bounded UUID may enter mismatch logs. Never persist the rejected body.
    const run = typeof value === 'object' && value !== null && 'run_id' in value ? value.run_id : null;
    if (typeof run === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(run)) {
      try { await databasePorts()?.callledger.record({ attempt_id: null, run_id: run, provider: 'none', model: 'none', request_hash: 'facts_mismatch', cache_hit: false,
        input_tokens: null, output_tokens: null, cost_usd: 0, status: 'facts_mismatch', quotes_offered: 0, quotes_kept: 0, rules_edition: 'server_validation' }); } catch { /* Preserve 400; log storage is unavailable. */ }
    }
    return send(400, 'facts_mismatch');
  }
  if (!facts.passages.length) return send(200, 'passages_unavailable_D18');
  const setup = configuration(); const ports = databasePorts();
  if (!setup || !ports) return send(200, 'provider_not_configured');
  // Additional server-environment run/day bounds; SQL settings independently enforce durable caps.
  const worst = worstCaseCost(setup.provider.prepare(facts, setup.config.maxOutputTokens), setup.config);
  if (worst === null || worst > positive('EXPLAIN_RUN_CAP_USD')! || worst > positive('EXPLAIN_DAILY_CAP_USD')!) return send(200, 'unknown_price_bounds_or_over_cap');
  try { const result = await explain(value, setup.provider, setup.config, ports);
    return new Response(JSON.stringify(result), { status: result.status, headers });
  } catch { return send(503, 'storage_or_accounting_unavailable_reservation_retained'); }
});

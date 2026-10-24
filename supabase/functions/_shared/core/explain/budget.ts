import type { ProviderRequest, Usage } from '../providers/types.ts';
import { utf8ByteLength } from '../util/utf8.ts';
export interface PriceEntry {
  provider: string; model: string; input_usd_per_million: number; output_usd_per_million: number;
  framing_tokens: number; max_output_tokens: number; input_bound: 'utf8_bytes'; verified_on: string;
}
export interface BudgetConfig { price: PriceEntry; maxOutputTokens: number; safetyFactor: number }
export function validateBudgetConfig(value: unknown): BudgetConfig | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as BudgetConfig; const p = v.price;
  if (!p || !p.provider || !p.model || p.input_bound !== 'utf8_bytes' || !/^\d{4}-\d{2}-\d{2}$/.test(p.verified_on)
    || ![p.input_usd_per_million,p.output_usd_per_million].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
    || !Number.isSafeInteger(p.framing_tokens) || p.framing_tokens < 0 || !Number.isSafeInteger(p.max_output_tokens) || p.max_output_tokens < 1
    || !Number.isSafeInteger(v.maxOutputTokens) || v.maxOutputTokens < 1 || v.maxOutputTokens > p.max_output_tokens
    || !Number.isFinite(v.safetyFactor) || v.safetyFactor < 1) return null;
  return v;
}
const roundUp = (n: number) => Math.ceil(n * 1e12) / 1e12;
export function worstCaseCost(request: ProviderRequest, config: BudgetConfig): number | null {
  const valid = validateBudgetConfig(config);
  if (!valid || request.provider !== config.price.provider || request.model !== config.price.model || request.maxOutputTokens !== config.maxOutputTokens) return null;
  const input = Math.ceil(utf8ByteLength(request.body) * config.safetyFactor) + config.price.framing_tokens;
  const cost = roundUp((input * config.price.input_usd_per_million + config.maxOutputTokens * config.price.output_usd_per_million) / 1e6);
  return Number.isFinite(cost) && cost > 0 ? cost : null;
}
export function actualCost(usage: Usage, config: BudgetConfig): number | null {
  if (![usage.input_tokens, usage.output_tokens].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
  const cost = roundUp((usage.input_tokens * config.price.input_usd_per_million + usage.output_tokens * config.price.output_usd_per_million) / 1e6);
  return Number.isFinite(cost) ? cost : null;
}

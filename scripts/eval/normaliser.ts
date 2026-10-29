import { normaliseString } from '../../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { WHOLE_STRING_ALIASES, aliasKey } from '../../supabase/functions/_shared/core/spdxexpr/aliases.ts';
import { LICENCES } from '../../supabase/functions/_shared/core/rules/licences.ts';
import type { ExprNode } from '../../supabase/functions/_shared/core/types.ts';
import { ratio } from './metrics.ts';
export interface MessyCase { id: string; origin: 'synthetic'; split: 'dev'; raw: string; expected: string | null; basis: string }
function supported(node: ExprNode): boolean { return node.type === 'leaf' ? node.leaf.status === 'supported' : node.children.every(supported); }
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const row = [i]; for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = row; }
  return previous[b.length];
}
export function aliasPlusFuzzy(raw: string): { text: string | null; reason: string } {
  const n = normaliseString(raw);
  if (n.expr && n.text && supported(n.expr)) return { text: n.text, reason: 'parser_alias' };
  const key = aliasKey(raw); const alias = WHOLE_STRING_ALIASES.get(key);
  // Fuzzy never crosses a declared ambiguity guard, version number, family or expression boundary.
  if (alias?.target === null || !key || key.length > 80 || /\b(and|or|with|see|unlicensed)\b|[+/()]/.test(key)) return { text: null, reason: 'guarded_abstention' };
  const family = key.match(/^[a-z]+/)?.[0]; const numbers = key.match(/\d+/g)?.join('.') ?? '';
  const proposals = new Map<string, number>();
  const options = [...LICENCES.map(l => [l.id, l.id] as const), ...[...WHOLE_STRING_ALIASES].flatMap(([name, a]) => a.target ? [[name, a.target] as const] : [])];
  for (const [spelling, target] of options) {
    const candidate = aliasKey(spelling);
    if (key.length < 6 || candidate.match(/^[a-z]+/)?.[0] !== family || (candidate.match(/\d+/g)?.join('.') ?? '') !== numbers) continue;
    const d = distance(key, candidate); if (d <= 1) proposals.set(target, Math.min(proposals.get(target) ?? Infinity, d));
  }
  const sorted = [...proposals].sort((a, b) => a[1] - b[1]);
  if (!sorted.length || (sorted[1] && sorted[0][1] === sorted[1][1])) return { text: null, reason: 'no_unique_fuzzy_candidate' };
  // Canonicalise expansions the same way as the application, not to an invented bare id.
  return { text: normaliseString(sorted[0][0]).text, reason: 'fuzzy_unique_edit_one_same_family_version' };
}
export function normaliserMetrics(cases: readonly MessyCase[]) {
  if (cases.length !== 30 || new Set(cases.map(c => c.id)).size !== 30 || cases.some(c => c.origin !== 'synthetic' || c.split !== 'dev' || !c.basis)) throw new Error('Expected 30 provenance-labelled synthetic dev strings');
  const rows = cases.map(c => ({ ...c, prediction: aliasPlusFuzzy(c.raw) }));
  const answered = rows.filter(r => r.prediction.text !== null);
  return { kind: 'normaliser', method: 'alias-plus-fuzzy', origin: 'synthetic', split: 'dev', total: rows.length, answered: answered.length,
    abstentions: rows.length - answered.length, coverage: ratio(answered.length, rows.length), accuracyWhenAnswered: ratio(answered.filter(r => r.expected === r.prediction.text).length, answered.length),
    exactIncludingExpectedAbstentions: ratio(rows.filter(r => r.expected === r.prediction.text).length, rows.length),
    unsafeGuesses: rows.filter(r => r.expected === null && r.prediction.text !== null).length, rows };
}

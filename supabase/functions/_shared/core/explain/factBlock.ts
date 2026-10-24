import type { ExprNode, ExpressionEvaluation, Finding, Settings, Scope } from '../types.ts';
import { validateSettings } from '../settings.ts';
import { normaliseLicence as normalise } from '../spdxexpr/normalise.ts';
import { evaluateExpression } from '../spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../rules/engine.ts';
import { RULES_EDITION } from '../rules/ruleTable.ts';
import { getLicence } from '../rules/licences.ts';
import { offeredPassages } from '../rules/rulePassages.ts';

// Deliberately no package, occurrence, raw licence, path, client passages or free text.
export interface ExplainRequest {
  request_id: string; run_id: string; dep_ref: string; expr: string;
  project: Settings['projectLicense']; mode: Settings['mode']; bundled: boolean; scope: Scope;
  acknowledgements: Settings['acknowledgements'];
  claimed: { rule_ids: ExpressionEvaluation['ruleIds']; verdict: ExpressionEvaluation['verdict']; chosen_side: string | null };
  rules_edition: string;
}
export function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(k => keys.includes(k));
}
const EXCEPTIONS = ['Classpath-exception-2.0', 'GCC-exception-3.1', 'LLVM-exception'];
function safeTree(node: ExprNode): boolean {
  if (node.type !== 'leaf') return node.children.every(safeTree);
  const l = node.leaf;
  return l.licenceId !== null && getLicence(l.licenceId) !== null
    && (l.exceptionId === null || EXCEPTIONS.includes(l.exceptionId))
    && (l.status === 'supported' || l.status === 'unsupported_exception');
}
export function normalizedExpression(text: unknown): ReturnType<typeof normalise> | null {
  if (typeof text !== 'string' || text.length > 200) return null;
  const result = normalise({ kind: 'string', value: text });
  return result.expr && result.text === text && safeTree(result.expr) ? result : null;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function deriveFacts(value: unknown) {
  if (!exactKeys(value, ['request_id','run_id','dep_ref','expr','project','mode','bundled','scope','acknowledgements','claimed','rules_edition'])) return null;
  if (typeof value.request_id !== 'string' || !UUID.test(value.request_id) || typeof value.run_id !== 'string' || !UUID.test(value.run_id)
    || typeof value.dep_ref !== 'string' || !/^dep-[1-9][0-9]{0,4}$/.test(value.dep_ref)
    || !['runtime','dev','unknown'].includes(String(value.scope))
    || !exactKeys(value.acknowledgements, ['unmodified_use','mpl_secondary_eligible'])
    || !exactKeys(value.claimed, ['rule_ids','verdict','chosen_side'])) return null;
  const settings = validateSettings({ projectLicense: value.project, mode: value.mode, bundled: value.bundled, acknowledgements: value.acknowledgements });
  const normalized = normalizedExpression(value.expr);
  if (!settings || !normalized?.expr || value.rules_edition !== RULES_EDITION) return null;
  const evaluation = evaluateExpression(normalized.expr, { settings, scope: value.scope as Scope }, evaluateLeaf);
  const claimed = { rule_ids: evaluation.ruleIds, verdict: evaluation.verdict, chosen_side: evaluation.chosenSide };
  if (!Array.isArray(value.claimed.rule_ids) || value.claimed.rule_ids.length !== claimed.rule_ids.length
    || value.claimed.rule_ids.some((id, i) => id !== claimed.rule_ids[i])
    || value.claimed.verdict !== claimed.verdict || value.claimed.chosen_side !== claimed.chosen_side) return null;
  const request = value as unknown as ExplainRequest;
  const licenceIds = [...new Set([settings.projectLicense, ...evaluation.leaves.filter(l => l.counted).flatMap(l => [l.licenceId, l.exceptionId].filter((id): id is string => id !== null))])];
  return { request, settings, evaluation, licenceIds, passages: offeredPassages(evaluation.ruleIds, licenceIds) };
}
export type Facts = NonNullable<ReturnType<typeof deriveFacts>>;
export function buildExplainRequest(finding: Finding, settings: Settings, rulesEdition: string, requestId: string, runId: string): ExplainRequest | null {
  // Reject unresolved/foreign metadata before constructing any transport payload.
  if (!normalizedExpression(finding.exprNormalised)) return null;
  const request: ExplainRequest = { request_id: requestId, run_id: runId, dep_ref: finding.depRef, expr: finding.exprNormalised!,
    project: settings.projectLicense, mode: settings.mode, bundled: settings.bundled, scope: finding.scope,
    acknowledgements: { ...settings.acknowledgements }, claimed: { rule_ids: [...finding.ruleIds], verdict: finding.verdict, chosen_side: finding.chosenSide }, rules_edition: rulesEdition };
  return deriveFacts(request) ? request : null;
}
export function factBlock(facts: Facts) {
  const r = facts.request;
  return { dep_ref: r.dep_ref, expr: r.expr, project: r.project, mode: r.mode, bundled: r.bundled, scope: r.scope,
    acknowledgements: { unmodified_use: r.acknowledgements.unmodified_use, mpl_secondary_eligible: r.acknowledgements.mpl_secondary_eligible }, rule_ids: facts.evaluation.ruleIds, verdict: facts.evaluation.verdict,
    chosen_side: facts.evaluation.chosenSide, rules_edition: r.rules_edition };
}

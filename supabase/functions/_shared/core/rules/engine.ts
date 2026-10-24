// The single leaf-evaluation entry point (PLAN §4). It walks the ladder (first match wins) and
// returns the matching rule-table row; when nothing matches it returns R-FALLBACK (step 10).
// It holds no rule logic itself, so replacing ladder.ts + ruleTable.ts upgrades the rules.

import type { EvalContext, LeafRef, RuleResult, RuleRow } from '../types.ts';
import type { RuleId } from './ruleIds.ts';
import { LADDER } from './ladder.ts';
import { RULE_ROWS } from './ruleTable.ts';

export function getRuleRow(ruleId: RuleId): RuleRow {
  const row = RULE_ROWS.get(ruleId);
  if (!row) throw new Error(`rule table has no row for ${ruleId}`);
  return row;
}

function toResult(row: RuleRow): RuleResult {
  return {
    ruleId: row.id,
    verdict: row.verdict,
    rationale: row.rationale,
    obligations: row.obligations,
    assumptions: row.assumptions,
    options: row.options,
    passages: row.passages,
    stub: row.stub,
  };
}

export function evaluateLeaf(leaf: LeafRef, ctx: EvalContext): RuleResult {
  for (const step of LADDER) {
    if (step.matches(leaf, ctx)) return toResult(getRuleRow(step.ruleId));
  }
  return toResult(getRuleRow('R-FALLBACK'));
}

// Inventory -> findings (PLAN §1-§4). Pure and synchronous; runs in the browser worker, Node and Deno.
// Every licence value, resolved or not, goes through the same evaluator and the single
// `evaluateLeaf` entry point, so unknown/unsupported results carry rule ids like every other verdict.

import type { AnalysisResult, ExprNode, Finding, Inventory, NormalisedLicence, Settings } from './types.ts';
import { evaluateExpression } from './spdxexpr/evaluate.ts';
import { normaliseLicence } from './spdxexpr/normalise.ts';
import { otherLeaf } from './spdxexpr/leaf.ts';
import { evaluateLeaf } from './rules/engine.ts';
import { RULES_ARE_STUB, RULES_EDITION } from './rules/ruleTable.ts';
import { settingsHash } from './settings.ts';
import { sha256Hex } from './util/sha256.ts';
import { emptyCounts } from './verdict.ts';

/** Expression to evaluate: the parsed one, or a single unresolved/ambiguous leaf carrying the reason. */
export function expressionFor(normalised: NormalisedLicence): ExprNode {
  if (normalised.expr) return normalised.expr;
  const reason = normalised.unresolvedReason ?? 'parse_error';
  return {
    type: 'leaf',
    leaf: otherLeaf(normalised.rawDisplay, reason === 'ambiguous' ? 'ambiguous' : 'unresolved', reason),
  };
}

/** Hash input for ruling staleness: canonical expression, or the unresolved reason plus raw value. */
export function exprHashInput(normalised: NormalisedLicence): string {
  return normalised.text !== null
    ? `expr:${normalised.text}`
    : `unresolved:${normalised.unresolvedReason ?? ''}:${normalised.rawDisplay}`;
}

export function analyzeInventory(inventory: Inventory, settings: Settings): AnalysisResult {
  const findings: Finding[] = [];
  const counts = emptyCounts();
  let fallbackCount = 0;

  inventory.items.forEach((item, index) => {
    const normalised = normaliseLicence(item.licence);
    const evaluation = evaluateExpression(expressionFor(normalised), { settings, scope: item.scope }, evaluateLeaf);
    const n = index + 1;
    const finding: Finding = {
      findingId: `f-${n}`,
      depRef: `dep-${n}`,
      occurrence: item.occurrence,
      source: item.source,
      name: item.name,
      version: item.version,
      location: item.location,
      sourceRow: item.sourceRow,
      ordinal: item.ordinal,
      path: item.path,
      pathNote: item.pathNote,
      alternatePathCount: item.alternatePathCount,
      scope: item.scope,
      rawLicence: normalised.rawDisplay,
      exprNormalised: normalised.text,
      exprHash: sha256Hex(exprHashInput(normalised)),
      verdict: evaluation.verdict,
      ruleIds: evaluation.ruleIds,
      chosenSide: evaluation.chosenSide,
      orChoices: evaluation.orChoices,
      leaves: evaluation.leaves,
      obligations: evaluation.obligations,
      assumptions: evaluation.assumptions,
      options: evaluation.options,
      reason: normalised.unresolvedReason,
      notes: normalised.notes,
      stubRule: evaluation.leaves.some((l) => l.counted && l.stub),
    };
    counts[finding.verdict]++;
    if (finding.ruleIds.length === 1 && finding.ruleIds[0] === 'R-FALLBACK') fallbackCount++;
    findings.push(finding);
  });

  return {
    settings,
    settingsHash: settingsHash(settings),
    rulesEdition: RULES_EDITION,
    rulesStub: RULES_ARE_STUB,
    input: {
      kind: inventory.kind,
      lockfileVersion: inventory.lockfileVersion,
      rootName: inventory.rootName,
      rootVersion: inventory.rootVersion,
      itemCount: inventory.items.length,
    },
    findings,
    counts,
    fallbackCount,
    coverageGaps: inventory.coverageGaps,
    warnings: inventory.warnings,
  };
}

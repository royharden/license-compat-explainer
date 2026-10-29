import { normaliseLicence } from '../../../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { expressionFor } from '../../../supabase/functions/_shared/core/analyze.ts';
import { evaluateExpression } from '../../../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../../../supabase/functions/_shared/core/rules/engine.ts';
import type { Method } from '../types.ts';
export const fullEngine: Method = {
  name: 'full-engine', description: 'Application rules with actual project, mode, bundled, scope and acknowledgements.',
  predict(c) {
    const result = evaluateExpression(expressionFor(normaliseLicence(c.raw)), { settings: c.settings, scope: c.scope }, evaluateLeaf);
    return { status: 'ok', verdict: result.verdict, reason: 'application_rules', ruleIds: result.ruleIds, chosenSide: result.chosenSide };
  },
};

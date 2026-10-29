import { normaliseLicence } from '../../../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { expressionFor } from '../../../supabase/functions/_shared/core/analyze.ts';
import { evaluateExpression } from '../../../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../../../supabase/functions/_shared/core/rules/engine.ts';
import type { Method } from '../types.ts';
export const matrix: Method = {
  name: 'matrix', description: 'Our mode-blind pair approximation: distribution + bundled + runtime + both acknowledgements true for every case. Shares distribution rules, not an independent oracle.',
  predict(c) {
    const settings = { ...c.settings, mode: 'distribute' as const, bundled: true, acknowledgements: { unmodified_use: true, mpl_secondary_eligible: true } };
    const result = evaluateExpression(expressionFor(normaliseLicence(c.raw)), { settings, scope: 'runtime' }, evaluateLeaf);
    return { status: 'ok', verdict: result.verdict, reason: 'distribution_pair_projection' };
  },
};

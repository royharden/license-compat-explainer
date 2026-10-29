import { normaliseLicence } from '../../../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { expressionFor } from '../../../supabase/functions/_shared/core/analyze.ts';
import { evaluateExpression } from '../../../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { getLicence } from '../../../supabase/functions/_shared/core/rules/licences.ts';
import type { LicenceClass, RuleResult } from '../../../supabase/functions/_shared/core/types.ts';
import type { Method } from '../types.ts';
const rank: Record<LicenceClass, number> = { public_domain: 0, permissive: 0, weak_copyleft: 1, strong_copyleft: 2, network_copyleft: 3, source_available: 4, non_commercial: 4 };
export const ladder: Method = {
  name: 'ladder', description: 'Mode-blind class rank: dependency rank <= project rank is allowed; no version/pair/context rules. Shared parser/OR/AND only.',
  predict(c) {
    const projectRank = rank[getLicence(c.settings.projectLicense)?.licenceClass ?? 'permissive'];
    const result = evaluateExpression(expressionFor(normaliseLicence(c.raw)), { settings: c.settings, scope: c.scope }, leaf => {
      let verdict: RuleResult['verdict'] = 'unknown';
      if (leaf.status === 'supported' && !leaf.exceptionId && leaf.licenceClass) {
        const n = rank[leaf.licenceClass];
        verdict = n === 4 ? 'needs_review' : n === 0 ? 'ok' : n <= projectRank ? 'ok_with_conditions' : 'conflict';
      }
      return { ruleId: 'R-FALLBACK', verdict, rationale: 'class rank approximation', obligations: [], assumptions: [], options: [], passages: [], stub: false };
    });
    return { status: 'ok', verdict: result.verdict, reason: 'class_rank' };
  },
};

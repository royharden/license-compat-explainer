// Template explanation (PLAN §6.3 fallback; M1 has no provider path at all).
// Built only from rule-table text for the finding's counted rule ids; labelled `template`.

import type { Finding, OptionId } from '../types.ts';
import { getRuleRow } from '../rules/engine.ts';
import { DISCLAIMER, TEMPLATE_LABEL } from './disclaimer.ts';
import { OPTION_LABELS } from './options.ts';

export interface TemplateExplanation {
  label: typeof TEMPLATE_LABEL;
  /** Why a template is shown instead of model prose. */
  fallbackReason: 'explanations_not_built';
  sections: { ruleId: string; title: string; rationale: string; stub: boolean }[];
  obligations: string[];
  assumptions: string[];
  options: { id: OptionId; label: string }[];
  disclaimer: string;
}

export function templateExplanation(finding: Finding): TemplateExplanation {
  return {
    label: TEMPLATE_LABEL,
    fallbackReason: 'explanations_not_built',
    sections: finding.ruleIds.map((id) => {
      const row = getRuleRow(id);
      return { ruleId: id, title: row.title, rationale: row.rationale, stub: row.stub };
    }),
    obligations: [...finding.obligations],
    assumptions: [...finding.assumptions],
    options: finding.options.map((id) => ({ id, label: OPTION_LABELS[id] })),
    disclaimer: DISCLAIMER,
  };
}

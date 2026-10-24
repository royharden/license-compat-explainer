// Rule table as data (PLAN §4 A4). M1 STUB: rows exist only for STUB_RULE_IDS (ruleIds.ts).
// Every row carries id, verdict, rationale, obligations, assumptions, options and passages.
// Passages stay empty until M2/M4 (template-only explanations). M2 replaces this module and
// ladder.ts; the evaluator (spdxexpr/evaluate.ts), engine.ts and the UI do not change.

import type { RuleRow } from '../types.ts';
import type { RuleId } from './ruleIds.ts';

/** Edition of the rule table; part of ruling identity and explanation requests (PLAN §6.1, §7.1). */
export const RULES_EDITION = '2026-10-24.m1-stub';

/** True while the table is the M1 stub. Printed in the report and export. */
export const RULES_ARE_STUB = true;

const ROWS: readonly RuleRow[] = [
  {
    id: 'R-UNKNOWN-UNRESOLVED',
    verdict: 'unknown',
    title: 'Licence not resolved',
    rationale:
      'The licence metadata is missing, says UNLICENSED, points to a file ("SEE LICENSE IN"), is ambiguous, or could not be parsed. No compatibility rule can be applied, so the result stays unknown rather than being guessed.',
    obligations: [],
    assumptions: ['No registry lookup and no LICENSE-file scan were done; only the metadata in the input was read.'],
    options: ['review_alternative_dependency', 'review_with_counsel'],
    passages: [],
    stub: false,
  },
  {
    id: 'R-UNKNOWN-UNSUPPORTED',
    verdict: 'unknown',
    title: 'Licence outside the supported list',
    rationale:
      'The identifier is a valid SPDX form but is not in the frozen list of 29 supported licences, so no compatibility rule exists for it.',
    obligations: [],
    assumptions: ['Only the frozen supported-licence list is modelled.'],
    options: ['review_alternative_dependency', 'review_with_counsel'],
    passages: [],
    stub: false,
  },
  {
    id: 'R-SA-REVIEW',
    verdict: 'needs_review',
    title: 'Source-available or non-commercial licence',
    rationale:
      'Source-available and non-commercial licences restrict how the software may be used, not only how it is distributed. They always need human review, in every mode and scope.',
    obligations: ['Read the licence terms for field-of-use, competing-service or non-commercial restrictions.'],
    assumptions: [],
    options: ['review_commercial_terms', 'review_alternative_dependency', 'review_with_counsel'],
    passages: [],
    stub: false,
  },
  {
    id: 'R-DEV-NOT-SHIPPED',
    verdict: 'ok',
    title: 'Dev-only dependency, not shipped',
    rationale:
      'The dependency is used only during development and the project is declared unbundled, so the dependency is not part of anything that is shipped.',
    obligations: [],
    assumptions: ['Dev dependencies are not included in any distributed artefact (bundled = no).'],
    options: [],
    passages: [],
    stub: false,
  },
  {
    id: 'R-INTERNAL-ANY',
    verdict: 'ok',
    title: 'Internal use only',
    rationale:
      'Internal use involves no distribution and no users outside the organisation, so the distribution and network clauses of the supported licences are not triggered.',
    obligations: [],
    assumptions: ['No users outside the organisation receive the software or interact with it over a network.'],
    options: [],
    passages: [],
    stub: false,
  },
  {
    id: 'R-STRONG-HOSTED',
    verdict: 'ok',
    title: 'Strong copyleft in a hosted service',
    rationale:
      'GPL obligations are triggered by conveying (distributing) the software. Running it as a hosted service does not convey it, so the copyleft terms are not triggered.',
    obligations: [],
    assumptions: ['The software is not distributed: no downloadable client, appliance or on-premises copy is provided.'],
    options: [],
    passages: [],
    stub: false,
  },
  {
    id: 'R-NET-HOSTED',
    verdict: 'conflict',
    title: 'Network copyleft in a hosted non-AGPL project',
    rationale:
      'AGPL-3.0 section 13 requires offering the Corresponding Source to users who interact with a modified program over a network. A hosted service whose project licence is not AGPL-compatible cannot meet that duty for the combined work.',
    obligations: ['Offer Corresponding Source of the combined work to every remote network user.'],
    assumptions: ['Users outside the organisation interact with the service over a network.'],
    options: ['review_alternative_dependency', 'review_project_licensing', 'review_separate_process', 'review_with_counsel'],
    passages: [],
    stub: false,
  },
  {
    id: 'R-PERM-HOSTED',
    verdict: 'ok',
    title: 'Permissive licence in a hosted service',
    rationale:
      'Permissive licences attach attribution and notice duties to distribution. Running the software as a hosted service does not distribute it.',
    obligations: [],
    assumptions: ['The software is not distributed.'],
    options: [],
    passages: [],
    stub: false,
  },
  {
    id: 'R-FALLBACK',
    verdict: 'needs_review',
    title: 'No specific rule matched (M1 stub table)',
    rationale:
      'No specific rule in the current rule table matched this licence and these settings. In this M1 build most combinations are not modelled yet (distribution, library, weak copyleft in hosted mode, exceptions and pair overrides arrive with the full rule table), so the result is needs_review rather than a guess.',
    obligations: [],
    assumptions: ['Rule table is the M1 stub; this verdict may change when the full table is in place.'],
    options: ['review_with_counsel'],
    passages: [],
    stub: true,
  },
];

export const RULE_ROWS: ReadonlyMap<RuleId, RuleRow> = new Map<RuleId, RuleRow>(ROWS.map((row) => [row.id, row]));

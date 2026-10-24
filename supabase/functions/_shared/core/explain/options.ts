// Options enum (PLAN §6.4): rendered by code from the rule table, never written by a model.

import type { OptionId } from '../types.ts';

export const OPTION_IDS: readonly OptionId[] = [
  'review_with_counsel',
  'review_alternative_dependency',
  'review_commercial_terms',
  'review_project_licensing',
  'review_separate_process',
  'review_unbundled_distribution',
];

export const OPTION_LABELS: Readonly<Record<OptionId, string>> = {
  review_with_counsel: 'Review with legal counsel',
  review_alternative_dependency: 'Review alternative dependencies',
  review_commercial_terms: 'Review commercial or alternative licence terms from the author',
  review_project_licensing: 'Review the project licence choice',
  review_separate_process: 'Review running the component as a separate program',
  review_unbundled_distribution: 'Review shipping the dependency unbundled',
};

// Verdict combination orders (PLAN §3.2).
//   OR  picks the best:  ok > ok_with_conditions > needs_review > unknown > conflict (ties: first declared)
//   AND picks the worst: conflict > unknown > needs_review > ok_with_conditions > ok

import type { Verdict } from './types.ts';

/** Index 0 is the most preferred alternative for OR. */
export const OR_PREFERENCE: readonly Verdict[] = ['ok', 'ok_with_conditions', 'needs_review', 'unknown', 'conflict'];

/** Index 0 is the most severe member for AND. */
export const AND_SEVERITY: readonly Verdict[] = ['conflict', 'unknown', 'needs_review', 'ok_with_conditions', 'ok'];

export function orRank(v: Verdict): number {
  return OR_PREFERENCE.indexOf(v);
}

export function andRank(v: Verdict): number {
  return AND_SEVERITY.indexOf(v);
}

/** Index of the best verdict for OR; the first declared wins ties. */
export function bestForOr(verdicts: readonly Verdict[]): number {
  let best = 0;
  for (let k = 1; k < verdicts.length; k++) if (orRank(verdicts[k]) < orRank(verdicts[best])) best = k;
  return best;
}

/** Index of the worst verdict for AND; the first declared wins ties. */
export function worstForAnd(verdicts: readonly Verdict[]): number {
  let worst = 0;
  for (let k = 1; k < verdicts.length; k++) if (andRank(verdicts[k]) < andRank(verdicts[worst])) worst = k;
  return worst;
}

export function emptyCounts(): Record<Verdict, number> {
  return { ok: 0, ok_with_conditions: 0, conflict: 0, needs_review: 0, unknown: 0 };
}

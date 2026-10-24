// Every rule id of the full precedence ladder (PLAN §4: C§2.6 steps 1-10 plus amendments A1-A5).
// The M1 stub table (ruleTable.ts) defines rows only for STUB_RULE_IDS; M2 adds the rest.
// Ids keep their meaning across editions.

export const ALL_RULE_IDS = [
  // step 1: unresolved / unsupported
  'R-UNKNOWN-UNRESOLVED',
  'R-UNKNOWN-UNSUPPORTED',
  'R-EXC-UNSUPPORTED',
  // step 2: source-available / non-commercial
  'R-SA-REVIEW',
  // step 3: exception-modified leaves
  'R-EXC-CLASSPATH',
  'R-EXC-GCC',
  'R-EXC-CONTEXT',
  // step 4: dev scope, unbundled
  'R-DEV-NOT-SHIPPED',
  // step 5: internal
  'R-INTERNAL-ANY',
  // step 6: hosted
  'R-STRONG-HOSTED',
  'R-NET-HOSTED',
  'R-NET-HOSTED-AGPL',
  'R-NET-GPL3-COMBINATION',
  'R-WEAK-HOSTED',
  'R-PERM-HOSTED',
  // step 7: library, unbundled
  'R-LIB-UNBUNDLED-COPYLEFT',
  'R-LIB-UNBUNDLED-WEAK',
  'R-LIB-UNBUNDLED-PERM',
  // step 8: directional pair overrides
  'R-PAIR-APACHE-GPL2',
  'R-PAIR-APACHE-GPL3',
  'R-PAIR-GPL2ONLY-GPL3',
  'R-PAIR-GPL-SAME',
  'R-PAIR-MPL-GPL',
  'R-PAIR-MPL-GPL-CONTEXT',
  'R-PAIR-LGPL-PROPRIETARY-BUNDLED',
  'R-PAIR-EPL-GPL',
  // A5 cells (after step 8, before step 9)
  'R-SAME-LICENCE',
  'R-PAIR-GPL3-GPL2ONLY',
  'R-PAIR-GPL3-AGPL',
  'R-PAIR-GPL2ONLY-AGPL',
  'R-PAIR-LGPL-GPL',
  'R-PAIR-LGPL3-GPL2ONLY',
  // step 9: class-by-project table
  'R-DIST-PERM',
  'R-DIST-WEAK-UNBUNDLED',
  'R-DIST-WEAK-BUNDLED',
  'R-DIST-STRONG',
  'R-DIST-NET',
  'R-DIST-NET-AGPL',
  // step 10
  'R-FALLBACK',
] as const;

export type RuleId = (typeof ALL_RULE_IDS)[number];

/** Rule ids that have rows in the M1 stub table (PLAN §12 M1 scope). */
export const STUB_RULE_IDS: readonly RuleId[] = [
  'R-UNKNOWN-UNRESOLVED',
  'R-UNKNOWN-UNSUPPORTED',
  'R-SA-REVIEW',
  'R-DEV-NOT-SHIPPED',
  'R-INTERNAL-ANY',
  'R-STRONG-HOSTED',
  'R-NET-HOSTED',
  'R-PERM-HOSTED',
  'R-FALLBACK',
];

export function isRuleId(value: string): value is RuleId {
  return (ALL_RULE_IDS as readonly string[]).includes(value);
}

// Precedence ladder (PLAN §4, C§2.6): ordered matchers, first match wins. M1 STUB.
//
// Implemented in M1: step 1 (R-UNKNOWN-UNRESOLVED, R-UNKNOWN-UNSUPPORTED), step 2 (R-SA-REVIEW),
// step 4 (R-DEV-NOT-SHIPPED), step 5 (R-INTERNAL-ANY) and the hosted cells R-STRONG-HOSTED,
// R-NET-HOSTED and R-PERM-HOSTED of step 6. Everything else reaches R-FALLBACK (needs_review):
//   - step 1 R-EXC-UNSUPPORTED and step 3 exception leaves (R-EXC-*): any leaf with an exception
//     stops at a stub guard placed where step 3 sits, so dev/internal/hosted rules never see it;
//   - step 6 R-WEAK-HOSTED, R-NET-HOSTED-AGPL, R-NET-GPL3-COMBINATION;
//   - steps 7-9 and the A5 cells (library, pair overrides, distribute class table).
// M2 replaces this module with the full ladder; engine.ts and evaluate.ts stay unchanged.

import type { EvalContext, LeafRef } from '../types.ts';
import type { RuleId } from './ruleIds.ts';
import { isPermissiveClass, isRestrictedClass } from './licences.ts';

export interface LadderStep {
  /** C§2.6 step number, for documentation and RULES.md generation. */
  step: number;
  ruleId: RuleId;
  matches: (leaf: LeafRef, ctx: EvalContext) => boolean;
  /** True for stub guards that exist only in the M1 ladder. */
  stubGuard?: boolean;
}

/** Projects into which hosted network copyleft is not decided by R-NET-HOSTED (M2: R-NET-HOSTED-AGPL / R-NET-GPL3-COMBINATION). */
const NET_HOSTED_EXEMPT_PROJECTS: readonly string[] = ['AGPL-3.0-only', 'GPL-3.0-only'];

export const LADDER: readonly LadderStep[] = [
  {
    step: 1,
    ruleId: 'R-UNKNOWN-UNRESOLVED',
    matches: (leaf) => leaf.status === 'unresolved' || leaf.status === 'ambiguous',
  },
  {
    step: 1,
    ruleId: 'R-UNKNOWN-UNSUPPORTED',
    matches: (leaf) => leaf.status === 'unsupported_licence',
  },
  {
    step: 2,
    ruleId: 'R-SA-REVIEW',
    matches: (leaf) => isRestrictedClass(leaf.licenceClass),
  },
  {
    // STUB GUARD (step 1 R-EXC-UNSUPPORTED + step 3 R-EXC-*): exception leaves are not modelled in M1.
    step: 3,
    ruleId: 'R-FALLBACK',
    matches: (leaf) => leaf.exceptionId !== null,
    stubGuard: true,
  },
  {
    step: 4,
    ruleId: 'R-DEV-NOT-SHIPPED',
    matches: (_leaf, ctx) => ctx.scope === 'dev' && !ctx.settings.bundled,
  },
  {
    step: 5,
    ruleId: 'R-INTERNAL-ANY',
    matches: (_leaf, ctx) => ctx.settings.mode === 'internal',
  },
  {
    step: 6,
    ruleId: 'R-STRONG-HOSTED',
    matches: (leaf, ctx) => ctx.settings.mode === 'hosted' && leaf.licenceClass === 'strong_copyleft',
  },
  {
    step: 6,
    ruleId: 'R-NET-HOSTED',
    matches: (leaf, ctx) =>
      ctx.settings.mode === 'hosted' &&
      leaf.licenceClass === 'network_copyleft' &&
      !NET_HOSTED_EXEMPT_PROJECTS.includes(ctx.settings.projectLicense),
  },
  {
    step: 6,
    ruleId: 'R-PERM-HOSTED',
    matches: (leaf, ctx) => ctx.settings.mode === 'hosted' && isPermissiveClass(leaf.licenceClass),
  },
];

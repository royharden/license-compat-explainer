// PLAN §4 / C§2.6, amended A1–A6. First match wins; expansion precedes this ladder.
import type { EvalContext, LeafRef } from '../types.ts';
import type { RuleId } from './ruleIds.ts';
import { isPermissiveClass, isRestrictedClass } from './licences.ts';
export interface LadderStep { step: number; ruleId: RuleId; matches: (leaf: LeafRef, ctx: EvalContext) => boolean }
const gplProjects: readonly string[] = ['GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only'];
const gplProject = (c: EvalContext): boolean => gplProjects.includes(c.settings.projectLicense);
const id = (l: LeafRef, value: string): boolean => l.licenceId === value;
const gpl3 = (l: LeafRef): boolean => id(l, 'GPL-3.0-only') || id(l, 'GPL-3.0-or-later');
const lgpl = (l: LeafRef): boolean => l.licenceId?.startsWith('LGPL-') ?? false;
const lgpl3 = (l: LeafRef): boolean => l.licenceId?.startsWith('LGPL-3.0-') ?? false;
const net = (l: LeafRef): boolean => l.licenceClass === 'network_copyleft';
const weak = (l: LeafRef): boolean => l.licenceClass === 'weak_copyleft';
const hosted = (c: EvalContext): boolean => c.settings.mode === 'hosted';
const unbundledLibrary = (c: EvalContext): boolean => c.settings.mode === 'library' && !c.settings.bundled;
const distribution = (c: EvalContext): boolean => c.settings.mode === 'distribute' || (c.settings.mode === 'library' && c.settings.bundled);
const pair = (base: (l: LeafRef) => boolean, project: string) => (l: LeafRef, c: EvalContext): boolean => distribution(c) && base(l) && c.settings.projectLicense === project;
const mplGpl = (l: LeafRef, c: EvalContext): boolean => distribution(c) && id(l, 'MPL-2.0') && gplProject(c);
export const LADDER: readonly LadderStep[] = [
  { step: 1, ruleId: 'R-UNKNOWN-UNRESOLVED', matches: l => l.status === 'unresolved' || l.status === 'ambiguous' },
  { step: 1, ruleId: 'R-UNKNOWN-UNSUPPORTED', matches: l => l.status === 'unsupported_licence' },
  { step: 1, ruleId: 'R-EXC-UNSUPPORTED', matches: l => l.status === 'unsupported_exception' },
  { step: 2, ruleId: 'R-SA-REVIEW', matches: l => isRestrictedClass(l.licenceClass) },
  { step: 3, ruleId: 'R-EXC-CONTEXT', matches: (l,c) => l.exceptionPair !== null && !c.settings.acknowledgements.unmodified_use },
  { step: 3, ruleId: 'R-EXC-CLASSPATH', matches: l => l.exceptionPair === 'classpath' },
  { step: 3, ruleId: 'R-EXC-GCC', matches: l => l.exceptionPair === 'gcc' },
  { step: 4, ruleId: 'R-DEV-NOT-SHIPPED', matches: (_l,c) => c.scope === 'dev' && !c.settings.bundled },
  { step: 5, ruleId: 'R-INTERNAL-ANY', matches: (_l,c) => c.settings.mode === 'internal' },
  { step: 6, ruleId: 'R-STRONG-HOSTED', matches: (l,c) => hosted(c) && l.licenceClass === 'strong_copyleft' },
  { step: 6, ruleId: 'R-NET-HOSTED-AGPL', matches: (l,c) => hosted(c) && net(l) && c.settings.projectLicense === 'AGPL-3.0-only' },
  // GPL3/AGPL combination is reviewed in both hosted and distribution modes, but never before step 7 for an unbundled library.
  { step: 6, ruleId: 'R-NET-GPL3-COMBINATION', matches: (l,c) => (hosted(c) || distribution(c)) && net(l) && c.settings.projectLicense === 'GPL-3.0-only' },
  { step: 6, ruleId: 'R-NET-HOSTED', matches: (l,c) => hosted(c) && net(l) },
  { step: 6, ruleId: 'R-WEAK-HOSTED', matches: (l,c) => hosted(c) && weak(l) },
  { step: 6, ruleId: 'R-PERM-HOSTED', matches: (l,c) => hosted(c) && isPermissiveClass(l.licenceClass) },
  { step: 7, ruleId: 'R-LIB-UNBUNDLED-COPYLEFT', matches: (l,c) => unbundledLibrary(c) && (net(l) || l.licenceClass === 'strong_copyleft') },
  { step: 7, ruleId: 'R-LIB-UNBUNDLED-WEAK', matches: (l,c) => unbundledLibrary(c) && weak(l) },
  { step: 7, ruleId: 'R-LIB-UNBUNDLED-PERM', matches: (l,c) => unbundledLibrary(c) && isPermissiveClass(l.licenceClass) },
  { step: 8, ruleId: 'R-PAIR-APACHE-GPL2', matches: pair(l => id(l,'Apache-2.0'), 'GPL-2.0-only') },
  { step: 8, ruleId: 'R-PAIR-APACHE-GPL3', matches: pair(l => id(l,'Apache-2.0'), 'GPL-3.0-only') },
  { step: 8, ruleId: 'R-PAIR-GPL2ONLY-GPL3', matches: pair(l => id(l,'GPL-2.0-only'), 'GPL-3.0-only') },
  { step: 8, ruleId: 'R-PAIR-GPL-SAME', matches: pair(gpl3, 'GPL-3.0-only') },
  { step: 8, ruleId: 'R-PAIR-MPL-GPL', matches: (l,c) => mplGpl(l,c) && c.settings.acknowledgements.mpl_secondary_eligible },
  { step: 8, ruleId: 'R-PAIR-MPL-GPL-CONTEXT', matches: (l,c) => mplGpl(l,c) && !c.settings.acknowledgements.mpl_secondary_eligible },
  { step: 8, ruleId: 'R-PAIR-LGPL-PROPRIETARY-BUNDLED', matches: (l,c) => distribution(c) && lgpl(l) && c.settings.projectLicense === 'LicenseRef-Proprietary' && c.settings.bundled },
  { step: 8, ruleId: 'R-PAIR-EPL-GPL', matches: (l,c) => distribution(c) && id(l,'EPL-2.0') && gplProject(c) },
  { step: 8.5, ruleId: 'R-SAME-LICENCE', matches: (l,c) => distribution(c) && l.licenceId === c.settings.projectLicense && (weak(l) || l.licenceClass === 'strong_copyleft') },
  { step: 8.5, ruleId: 'R-PAIR-GPL3-GPL2ONLY', matches: pair(gpl3,'GPL-2.0-only') },
  { step: 8.5, ruleId: 'R-PAIR-GPL3-AGPL', matches: pair(gpl3,'AGPL-3.0-only') },
  { step: 8.5, ruleId: 'R-PAIR-GPL2ONLY-AGPL', matches: pair(l => id(l,'GPL-2.0-only'),'AGPL-3.0-only') },
  { step: 8.5, ruleId: 'R-PAIR-LGPL3-GPL2ONLY', matches: pair(lgpl3,'GPL-2.0-only') },
  { step: 8.5, ruleId: 'R-PAIR-LGPL-GPL', matches: (l,c) => distribution(c) && lgpl(l) && gplProject(c) },
  { step: 9, ruleId: 'R-DIST-PERM', matches: (l,c) => distribution(c) && isPermissiveClass(l.licenceClass) },
  { step: 9, ruleId: 'R-DIST-WEAK-UNBUNDLED', matches: (l,c) => distribution(c) && weak(l) && !gplProject(c) && !c.settings.bundled },
  { step: 9, ruleId: 'R-DIST-WEAK-BUNDLED', matches: (l,c) => distribution(c) && weak(l) && !gplProject(c) && c.settings.bundled },
  { step: 9, ruleId: 'R-DIST-STRONG', matches: (l,c) => distribution(c) && l.licenceClass === 'strong_copyleft' },
  { step: 9, ruleId: 'R-DIST-NET-AGPL', matches: pair(net,'AGPL-3.0-only') },
  { step: 9, ruleId: 'R-DIST-NET', matches: (l,c) => distribution(c) && net(l) },
];

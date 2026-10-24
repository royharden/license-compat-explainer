// Authored rule data: PLAN §4 A1–A6. Not legal advice.
import type { RuleRow } from '../types.ts';
import type { RuleId } from './ruleIds.ts';
export const RULES_EDITION = '2026-10-24.m2';
export const rulesEdition = RULES_EDITION;
export const RULES_ARE_STUB = false;
const ROWS: readonly RuleRow[] = [
  {
    "id": "R-UNKNOWN-UNRESOLVED",
    "verdict": "unknown",
    "title": "Metadata unresolved",
    "rationale": "Missing, ambiguous, UNLICENSED, file-referenced or malformed metadata cannot establish compatibility.",
    "obligations": [],
    "assumptions": [
      "Metadata only; no registry lookup or source-file scan."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-UNKNOWN-UNSUPPORTED",
    "verdict": "unknown",
    "title": "Unsupported licence",
    "rationale": "The licence identifier is outside the frozen supported catalogue.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-EXC-UNSUPPORTED",
    "verdict": "needs_review",
    "title": "Unsupported exception pair",
    "rationale": "The exception or its pairing with this base licence is not modelled. The base rule is not substituted.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-SA-REVIEW",
    "verdict": "needs_review",
    "title": "Restricted terms require review",
    "rationale": "Source-available and non-commercial terms can restrict use as well as distribution; review is required in every mode and scope.",
    "obligations": [
      "Read service, field-of-use and non-commercial restrictions."
    ],
    "assumptions": [],
    "options": [
      "review_commercial_terms",
      "review_alternative_dependency",
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-EXC-CLASSPATH",
    "verdict": "ok_with_conditions",
    "title": "Classpath eligibility acknowledged",
    "rationale": "The modelled GPL2 Classpath exception allows unmodified linking under the acknowledged context.",
    "obligations": [
      "Keep the library under its own licence and preserve its source offer."
    ],
    "assumptions": [
      "User asserted unmodified linking; source eligibility is not verified."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-EXC-GCC",
    "verdict": "ok_with_conditions",
    "title": "GCC eligibility acknowledged",
    "rationale": "The modelled GPL3 GCC exception applies under the acknowledged eligible compilation context.",
    "obligations": [
      "Preserve the runtime library licence and source obligations."
    ],
    "assumptions": [
      "User asserted unmodified use and an eligible compilation process; not verified."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-EXC-CONTEXT",
    "verdict": "needs_review",
    "title": "Exception context missing",
    "rationale": "Exception eligibility depends on unmodified use, and for GCC an eligible compilation process; acknowledge only if true.",
    "obligations": [],
    "assumptions": [
      "Unmodified use has not been asserted."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DEV-NOT-SHIPPED",
    "verdict": "ok",
    "title": "Dev dependency not shipped",
    "rationale": "The dependency is dev-only and bundled is no, so distribution rules do not apply.",
    "obligations": [],
    "assumptions": [
      "Dev dependencies are excluded from all shipped artefacts."
    ],
    "options": [],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-INTERNAL-ANY",
    "verdict": "ok",
    "title": "Internal use",
    "rationale": "The declared internal use has no distribution or users outside the organisation.",
    "obligations": [],
    "assumptions": [
      "No users outside the organisation receive or interact with the software; internal-network AGPL analysis is simplified."
    ],
    "options": [],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-STRONG-HOSTED",
    "verdict": "ok",
    "title": "Hosted GPL",
    "rationale": "Hosting without conveying software does not trigger the modelled GPL distribution duties.",
    "obligations": [],
    "assumptions": [
      "No client, appliance or on-premises copy is conveyed."
    ],
    "options": [],
    "passages": [
      "GPL-2.0-only#s0",
      "GPL-3.0-only#s2"
    ],
    "stub": false
  },
  {
    "id": "R-NET-HOSTED",
    "verdict": "conflict",
    "title": "Hosted AGPL combination",
    "rationale": "The model treats an externally accessed combined AGPL service under this project licence as conflicting with the network-source duty.",
    "obligations": [
      "Review offering Corresponding Source to remote users."
    ],
    "assumptions": [
      "External network interaction and a combined work; source and modification facts are not verified."
    ],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-NET-HOSTED-AGPL",
    "verdict": "ok_with_conditions",
    "title": "Hosted AGPL project",
    "rationale": "The project uses AGPL3; the dependency network-source obligations remain applicable.",
    "obligations": [
      "Offer Corresponding Source where AGPL section 13 requires it."
    ],
    "assumptions": [
      "External network interaction; combined-work assumption."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-NET-GPL3-COMBINATION",
    "verdict": "needs_review",
    "title": "AGPL dependency in GPL3 project",
    "rationale": "GPL3 section 13 permits an AGPL3 combination, but the AGPL part brings network-source duties requiring review.",
    "obligations": [
      "Review the AGPL part network-source duty and combined-work licensing."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [
      "GPL-3.0-only#s13"
    ],
    "stub": false
  },
  {
    "id": "R-WEAK-HOSTED",
    "verdict": "ok_with_conditions",
    "title": "Hosted weak copyleft",
    "rationale": "Hosted use is modelled as compatible subject to applicable modification notices and own-file obligations.",
    "obligations": [
      "Retain notices and review modified covered-file obligations."
    ],
    "assumptions": [
      "No software is distributed."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PERM-HOSTED",
    "verdict": "ok",
    "title": "Hosted permissive dependency",
    "rationale": "Hosted use without distribution is modelled as compatible.",
    "obligations": [],
    "assumptions": [
      "No software is distributed."
    ],
    "options": [],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-LIB-UNBUNDLED-COPYLEFT",
    "verdict": "needs_review",
    "title": "Downstream copyleft combination",
    "rationale": "An unbundled library declares this dependency; downstream combination and distribution still need review.",
    "obligations": [],
    "assumptions": [
      "Dependency is declared, not shipped inside the library."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-LIB-UNBUNDLED-WEAK",
    "verdict": "ok_with_conditions",
    "title": "Unbundled weak-copyleft dependency",
    "rationale": "The library declares the dependency without shipping it; preserve the downstream weak-copyleft obligations.",
    "obligations": [
      "Keep notices and inform downstream distributors of covered-file and replacement duties."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-LIB-UNBUNDLED-PERM",
    "verdict": "ok",
    "title": "Unbundled permissive dependency",
    "rationale": "The library declares a permissive dependency without shipping it.",
    "obligations": [],
    "assumptions": [
      "Dependency is declared, not shipped."
    ],
    "options": [],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-APACHE-GPL2",
    "verdict": "conflict",
    "title": "Apache2 into GPL2-only",
    "rationale": "Apache2 additional terms are not modelled as compatible with a GPL2-only combined distribution.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [
      "GPL-2.0-only#s6"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-APACHE-GPL3",
    "verdict": "ok_with_conditions",
    "title": "Apache2 into GPL3",
    "rationale": "Apache2 can be included in a GPL3 combined distribution with its notices and terms preserved.",
    "obligations": [
      "Preserve Apache notices and comply with GPL3 for the combination."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-GPL2ONLY-GPL3",
    "verdict": "conflict",
    "title": "GPL2-only into GPL3",
    "rationale": "GPL2-only lacks permission to adopt GPL3 terms for this combined distribution.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-2.0-only#s9"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-GPL-SAME",
    "verdict": "ok_with_conditions",
    "title": "GPL3 project and dependency",
    "rationale": "The selected GPL3 leaf matches the GPL3 project licence.",
    "obligations": [
      "Preserve GPL3 notices and provide Corresponding Source when conveying."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [
      "GPL-3.0-only#s5",
      "GPL-3.0-only#s6"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-MPL-GPL",
    "verdict": "ok_with_conditions",
    "title": "MPL secondary licensing acknowledged",
    "rationale": "The user asserts no Exhibit B incompatibility notice, enabling the modelled MPL secondary-licence route into the GPL family.",
    "obligations": [
      "Meet MPL covered-file duties and the selected secondary licence terms."
    ],
    "assumptions": [
      "MPL secondary eligibility is user-asserted, not verified from source."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-MPL-GPL-CONTEXT",
    "verdict": "needs_review",
    "title": "MPL secondary eligibility unknown",
    "rationale": "The required absence of an MPL Exhibit B incompatibility notice cannot be established from metadata.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-LGPL-PROPRIETARY-BUNDLED",
    "verdict": "needs_review",
    "title": "Bundled LGPL in proprietary project",
    "rationale": "The bundled combination needs review of replacement, relinking and source-offer routes.",
    "obligations": [
      "Review an LGPL-compliant replacement or relinking mechanism."
    ],
    "assumptions": [],
    "options": [
      "review_unbundled_distribution",
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-EPL-GPL",
    "verdict": "needs_review",
    "title": "EPL secondary designation unknown",
    "rationale": "EPL secondary-licence designation cannot be seen in metadata; GPL-family combination needs review.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-SAME-LICENCE",
    "verdict": "ok_with_conditions",
    "title": "Same copyleft licence",
    "rationale": "The selected copyleft licence matches the project; its own obligations remain.",
    "obligations": [
      "Retain notices and satisfy the selected licence source and covered-file duties."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-PAIR-GPL3-GPL2ONLY",
    "verdict": "conflict",
    "title": "GPL3 into GPL2-only",
    "rationale": "GPL3 terms cannot be imposed under a GPL2-only combined distribution.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [
      "GPL-3.0-only#s5",
      "GPL-2.0-only#s6"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-GPL3-AGPL",
    "verdict": "ok_with_conditions",
    "title": "GPL3 into AGPL3",
    "rationale": "GPL3 section 13 permits combination with AGPL3; network conditions apply to the combination.",
    "obligations": [
      "Comply with both components terms and the combination network-source duty."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [
      "GPL-3.0-only#s13"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-GPL2ONLY-AGPL",
    "verdict": "conflict",
    "title": "GPL2-only into AGPL3",
    "rationale": "GPL2-only does not provide a GPL3 or AGPL3 combination route.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-2.0-only#s9"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-LGPL-GPL",
    "verdict": "ok_with_conditions",
    "title": "LGPL conversion to GPL family",
    "rationale": "LGPL2.1 section 3 permits conversion to ordinary GPL; LGPL3 incorporates GPL3 for compatible GPL3/AGPL3 projects.",
    "obligations": [
      "Apply the appropriate GPL conversion and preserve notices and Corresponding Source."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [
      "LGPL-2.1-only#s3"
    ],
    "stub": false
  },
  {
    "id": "R-PAIR-LGPL3-GPL2ONLY",
    "verdict": "conflict",
    "title": "LGPL3 into GPL2-only",
    "rationale": "LGPL3 incorporates GPL3, which is incompatible with GPL2-only combined licensing.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DIST-PERM",
    "verdict": "ok_with_conditions",
    "title": "Distributed permissive dependency",
    "rationale": "The permissive dependency is modelled as compatible subject to its licence-specific notices and attribution.",
    "obligations": [
      "Preserve licence text, notices and any applicable attribution."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DIST-WEAK-UNBUNDLED",
    "verdict": "ok_with_conditions",
    "title": "Distributed unbundled weak copyleft",
    "rationale": "Weak-copyleft files remain covered by their licence without relicensing unrelated project files.",
    "obligations": [
      "Preserve notices and covered-library source offers.",
      "Keep the library replaceable where required."
    ],
    "assumptions": [
      "Bundled is no; review actual linking and modifications."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DIST-WEAK-BUNDLED",
    "verdict": "ok_with_conditions",
    "title": "Bundled weak copyleft",
    "rationale": "A weak-copyleft combination is modelled as compatible subject to covered-file and applicable LGPL relinking routes.",
    "obligations": [
      "Provide covered-file source and notices where required.",
      "For LGPL, provide an applicable relinking or replacement route."
    ],
    "assumptions": [
      "Metadata does not verify the actual linking route."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DIST-STRONG",
    "verdict": "conflict",
    "title": "Strong copyleft distribution",
    "rationale": "The combined distribution cannot retain the selected non-compatible project terms under the modelled strong copyleft requirements.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-3.0-only#s5"
    ],
    "stub": false
  },
  {
    "id": "R-DIST-NET",
    "verdict": "conflict",
    "title": "Network copyleft distribution",
    "rationale": "The modelled AGPL combined distribution cannot retain the selected incompatible project licence.",
    "obligations": [],
    "assumptions": [],
    "options": [
      "review_alternative_dependency",
      "review_project_licensing",
      "review_separate_process",
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-DIST-NET-AGPL",
    "verdict": "ok_with_conditions",
    "title": "Distributed AGPL project",
    "rationale": "Both sides use AGPL3; distribution and network-source obligations remain.",
    "obligations": [
      "Preserve notices and satisfy AGPL distribution and network-source duties."
    ],
    "assumptions": [],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  },
  {
    "id": "R-FALLBACK",
    "verdict": "needs_review",
    "title": "No specific rule",
    "rationale": "No specific supported rule matches; counted separately for coverage review.",
    "obligations": [],
    "assumptions": [
      "No favourable compatibility conclusion is inferred."
    ],
    "options": [
      "review_with_counsel"
    ],
    "passages": [],
    "stub": false
  }
];
export const RULE_ROWS: ReadonlyMap<RuleId, RuleRow> = new Map(ROWS.map(row => [row.id, row]));

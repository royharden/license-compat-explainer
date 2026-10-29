# Rules

Edition: 2026-10-24.m2. Source-only; runtime unverified. Not legal advice.

Hand-synced in M2; regenerate with `npm run rules:doc` after Dirty Mode closes.

The ordered ladder in `rules/ladder.ts` is authoritative: unknown/unsupported â†’ restricted â†’ exception context â†’ dev/unbundled â†’ internal â†’ hosted â†’ unbundled library â†’ directional pairs â†’ A5 pairs â†’ distribution classes â†’ fallback. `WITH` is one leaf; OR chooses best, AND worst. Acknowledgements are user-asserted, not verified from source.

## Distribution class defaults

For distribute and bundled library only; the exact pairs and A5 rules below run first. Weak-copyleft same-licence and GPL-family pairs have their own rules.

| Project group | Permissive/PD dependency | Weak copyleft dependency | Strong copyleft dependency | Network copyleft dependency | Restricted dependency |
|---|---|---|---|---|---|
| MIT / Apache2 / BSD3 | R-DIST-PERM | R-DIST-WEAK-UNBUNDLED or R-DIST-WEAK-BUNDLED | R-DIST-STRONG | R-DIST-NET | R-SA-REVIEW |
| MPL2 | R-DIST-PERM | R-SAME-LICENCE for MPL; otherwise weak rules | R-DIST-STRONG | R-DIST-NET | R-SA-REVIEW |
| GPL2-only | R-DIST-PERM except Apache | exact MPL/EPL/LGPL pair rules | same or version-only pair rules | R-DIST-NET | R-SA-REVIEW |
| GPL3-only | R-DIST-PERM except Apache | exact MPL/EPL/LGPL pair rules | R-PAIR-GPL-SAME or R-PAIR-GPL2ONLY-GPL3 | R-NET-GPL3-COMBINATION | R-SA-REVIEW |
| AGPL3-only | R-DIST-PERM | exact MPL/EPL/LGPL pair rules | R-PAIR-GPL3-AGPL or R-PAIR-GPL2ONLY-AGPL | R-DIST-NET-AGPL | R-SA-REVIEW |
| Proprietary | R-DIST-PERM | weak rules; bundled LGPL needs review | R-DIST-STRONG | R-DIST-NET | R-SA-REVIEW |

## R-UNKNOWN-UNRESOLVED â€” Metadata unresolved

Verdict: `unknown`. Missing, ambiguous, UNLICENSED, file-referenced or malformed metadata cannot establish compatibility.

Obligations: None.

Assumptions: Metadata only; no registry lookup or source-file scan.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-UNKNOWN-UNSUPPORTED â€” Unsupported licence

Verdict: `unknown`. The licence identifier is outside the frozen supported catalogue.

Obligations: None.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-EXC-UNSUPPORTED â€” Unsupported exception pair

Verdict: `needs_review`. The exception or its pairing with this base licence is not modelled. The base rule is not substituted.

Obligations: None.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-SA-REVIEW â€” Restricted terms require review

Verdict: `needs_review`. Source-available and non-commercial terms can restrict use as well as distribution; review is required in every mode and scope.

Obligations: Read service, field-of-use and non-commercial restrictions.

Assumptions: None.

Options: review_commercial_terms; review_alternative_dependency; review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-EXC-CLASSPATH â€” Classpath eligibility acknowledged

Verdict: `ok_with_conditions`. The modelled GPL2 Classpath exception allows unmodified linking under the acknowledged context.

Obligations: Keep the library under its own licence and preserve its source offer.

Assumptions: User asserted unmodified linking; source eligibility is not verified.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-EXC-GCC â€” GCC eligibility acknowledged

Verdict: `ok_with_conditions`. The modelled GPL3 GCC exception applies under the acknowledged eligible compilation context.

Obligations: Preserve the runtime library licence and source obligations.

Assumptions: User asserted unmodified use and an eligible compilation process; not verified.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-EXC-CONTEXT â€” Exception context missing

Verdict: `needs_review`. Exception eligibility depends on unmodified use, and for GCC an eligible compilation process; acknowledge only if true.

Obligations: None.

Assumptions: Unmodified use has not been asserted.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DEV-NOT-SHIPPED â€” Dev dependency not shipped

Verdict: `ok`. The dependency is dev-only and bundled is no, so distribution rules do not apply.

Obligations: None.

Assumptions: Dev dependencies are excluded from all shipped artefacts.

Options: None.

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-INTERNAL-ANY â€” Internal use

Verdict: `ok`. The declared internal use has no distribution or users outside the organisation.

Obligations: None.

Assumptions: No users outside the organisation receive or interact with the software; internal-network AGPL analysis is simplified.

Options: None.

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-STRONG-HOSTED â€” Hosted GPL

Verdict: `ok`. Hosting without conveying software does not trigger the modelled GPL distribution duties.

Obligations: None.

Assumptions: No client, appliance or on-premises copy is conveyed.

Options: None.

Passages: GPL-2.0-only#s0; GPL-3.0-only#s2

## R-NET-HOSTED â€” Hosted AGPL combination

Verdict: `conflict`. The model treats an externally accessed combined AGPL service under this project licence as conflicting with the network-source duty.

Obligations: Review offering Corresponding Source to remote users.

Assumptions: External network interaction and a combined work; source and modification facts are not verified.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-NET-HOSTED-AGPL â€” Hosted AGPL project

Verdict: `ok_with_conditions`. The project uses AGPL3; the dependency network-source obligations remain applicable.

Obligations: Offer Corresponding Source where AGPL section 13 requires it.

Assumptions: External network interaction; combined-work assumption.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-NET-GPL3-COMBINATION â€” AGPL dependency in GPL3 project

Verdict: `needs_review`. GPL3 section 13 permits an AGPL3 combination, but the AGPL part brings network-source duties requiring review.

Obligations: Review the AGPL part network-source duty and combined-work licensing.

Assumptions: None.

Options: review_with_counsel

Passages: GPL-3.0-only#s13

## R-WEAK-HOSTED â€” Hosted weak copyleft

Verdict: `ok_with_conditions`. Hosted use is modelled as compatible subject to applicable modification notices and own-file obligations.

Obligations: Retain notices and review modified covered-file obligations.

Assumptions: No software is distributed.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PERM-HOSTED â€” Hosted permissive dependency

Verdict: `ok`. Hosted use without distribution is modelled as compatible.

Obligations: None.

Assumptions: No software is distributed.

Options: None.

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-LIB-UNBUNDLED-COPYLEFT â€” Downstream copyleft combination

Verdict: `needs_review`. An unbundled library declares this dependency; downstream combination and distribution still need review.

Obligations: None.

Assumptions: Dependency is declared, not shipped inside the library.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-LIB-UNBUNDLED-WEAK â€” Unbundled weak-copyleft dependency

Verdict: `ok_with_conditions`. The library declares the dependency without shipping it; preserve the downstream weak-copyleft obligations.

Obligations: Keep notices and inform downstream distributors of covered-file and replacement duties.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-LIB-UNBUNDLED-PERM â€” Unbundled permissive dependency

Verdict: `ok`. The library declares a permissive dependency without shipping it.

Obligations: None.

Assumptions: Dependency is declared, not shipped.

Options: None.

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-APACHE-GPL2 â€” Apache2 into GPL2-only

Verdict: `conflict`. Apache2 additional terms are not modelled as compatible with a GPL2-only combined distribution.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: GPL-2.0-only#s6

## R-PAIR-APACHE-GPL3 â€” Apache2 into GPL3

Verdict: `ok_with_conditions`. Apache2 can be included in a GPL3 combined distribution with its notices and terms preserved.

Obligations: Preserve Apache notices and comply with GPL3 for the combination.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-GPL2ONLY-GPL3 â€” GPL2-only into GPL3

Verdict: `conflict`. GPL2-only lacks permission to adopt GPL3 terms for this combined distribution.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: GPL-2.0-only#s2; GPL-2.0-only#s9

## R-PAIR-GPL-SAME â€” GPL3 project and dependency

Verdict: `ok_with_conditions`. The selected GPL3 leaf matches the GPL3 project licence.

Obligations: Preserve GPL3 notices and provide Corresponding Source when conveying.

Assumptions: None.

Options: review_with_counsel

Passages: GPL-3.0-only#s5; GPL-3.0-only#s6

## R-PAIR-MPL-GPL â€” MPL secondary licensing acknowledged

Verdict: `ok_with_conditions`. The user asserts no Exhibit B incompatibility notice, enabling the modelled MPL secondary-licence route into the GPL family.

Obligations: Meet MPL covered-file duties and the selected secondary licence terms.

Assumptions: MPL secondary eligibility is user-asserted, not verified from source.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-MPL-GPL-CONTEXT â€” MPL secondary eligibility unknown

Verdict: `needs_review`. The required absence of an MPL Exhibit B incompatibility notice cannot be established from metadata.

Obligations: None.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-LGPL-PROPRIETARY-BUNDLED â€” Bundled LGPL in proprietary project

Verdict: `needs_review`. The bundled combination needs review of replacement, relinking and source-offer routes.

Obligations: Review an LGPL-compliant replacement or relinking mechanism.

Assumptions: None.

Options: review_unbundled_distribution; review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-EPL-GPL â€” EPL secondary designation unknown

Verdict: `needs_review`. EPL secondary-licence designation cannot be seen in metadata; GPL-family combination needs review.

Obligations: None.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-SAME-LICENCE â€” Same copyleft licence

Verdict: `ok_with_conditions`. The selected copyleft licence matches the project; its own obligations remain.

Obligations: Retain notices and satisfy the selected licence source and covered-file duties.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-PAIR-GPL3-GPL2ONLY â€” GPL3 into GPL2-only

Verdict: `conflict`. GPL3 terms cannot be imposed under a GPL2-only combined distribution.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: GPL-3.0-only#s5; GPL-2.0-only#s6

## R-PAIR-GPL3-AGPL â€” GPL3 into AGPL3

Verdict: `ok_with_conditions`. GPL3 section 13 permits combination with AGPL3; network conditions apply to the combination.

Obligations: Comply with both components terms and the combination network-source duty.

Assumptions: None.

Options: review_with_counsel

Passages: GPL-3.0-only#s13

## R-PAIR-GPL2ONLY-AGPL â€” GPL2-only into AGPL3

Verdict: `conflict`. GPL2-only does not provide a GPL3 or AGPL3 combination route.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: GPL-2.0-only#s2; GPL-2.0-only#s9

## R-PAIR-LGPL-GPL â€” LGPL conversion to GPL family

Verdict: `ok_with_conditions`. LGPL2.1 section 3 permits conversion to ordinary GPL; LGPL3 incorporates GPL3 for compatible GPL3/AGPL3 projects.

Obligations: Apply the appropriate GPL conversion and preserve notices and Corresponding Source.

Assumptions: None.

Options: review_with_counsel

Passages: LGPL-2.1-only#s3

## R-PAIR-LGPL3-GPL2ONLY â€” LGPL3 into GPL2-only

Verdict: `conflict`. LGPL3 incorporates GPL3, which is incompatible with GPL2-only combined licensing.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DIST-PERM â€” Distributed permissive dependency

Verdict: `ok_with_conditions`. The permissive dependency is modelled as compatible subject to its licence-specific notices and attribution.

Obligations: Preserve licence text, notices and any applicable attribution.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DIST-WEAK-UNBUNDLED â€” Distributed unbundled weak copyleft

Verdict: `ok_with_conditions`. Weak-copyleft files remain covered by their licence without relicensing unrelated project files.

Obligations: Preserve notices and covered-library source offers.; Keep the library replaceable where required.

Assumptions: Bundled is no; review actual linking and modifications.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DIST-WEAK-BUNDLED â€” Bundled weak copyleft

Verdict: `ok_with_conditions`. A weak-copyleft combination is modelled as compatible subject to covered-file and applicable LGPL relinking routes.

Obligations: Provide covered-file source and notices where required.; For LGPL, provide an applicable relinking or replacement route.

Assumptions: Metadata does not verify the actual linking route.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DIST-STRONG â€” Strong copyleft distribution

Verdict: `conflict`. The combined distribution cannot retain the selected non-compatible project terms under the modelled strong copyleft requirements.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: GPL-2.0-only#s2; GPL-3.0-only#s5

## R-DIST-NET â€” Network copyleft distribution

Verdict: `conflict`. The modelled AGPL combined distribution cannot retain the selected incompatible project licence.

Obligations: None.

Assumptions: None.

Options: review_alternative_dependency; review_project_licensing; review_separate_process; review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-DIST-NET-AGPL â€” Distributed AGPL project

Verdict: `ok_with_conditions`. Both sides use AGPL3; distribution and network-source obligations remain.

Obligations: Preserve notices and satisfy AGPL distribution and network-source duties.

Assumptions: None.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## R-FALLBACK â€” No specific rule

Verdict: `needs_review`. No specific supported rule matches; counted separately for coverage review.

Obligations: None.

Assumptions: No favourable compatibility conclusion is inferred.

Options: review_with_counsel

Passages: Template-only: no applicable verified corpus passage; see `data/PROVENANCE.md` and `rules/rulePassages.ts`.

## Contracts

`providers.complete(request): Promise<{text, usage: {input_tokens, output_tokens} | null, model, provider}>`; `callledger.record(row)` stores a server-side ledger row (mock uses an in-memory twin); `rulings.append(event)` and `rulings.replay(findings, events)` append/replay overlays without changing verdicts; evalkit supplies results writers and confusion-matrix helpers in `scripts/eval/`. Implemented in later milestones.

`R-RESTRICTED-REVIEW` is a documentation alias for `R-SA-REVIEW`, never an emitted id.
# M4 adapter contracts (source-only, unexecuted)

`providers.complete(preparedRequest)` returns `{text, usage: {input_tokens, output_tokens} | null,
model, provider}`. `prepare` serializes the entire request before reservation; provider transport is
injected, and only the edge function supplies network access. Configured and returned model must
match exactly for known-cost settlement. TypeSafe is an interface slot only. Browser mock replays
`fixtures/mock/explain/index.json` by readable `<rule_id>__<scenario>` keys; default demos cover
`R-STRONG-HOSTED` and `R-DIST-STRONG` using available GPL3 text. Other mock keys fail to templates.
AGPL demo is unavailable (D18). Mock and server `callledger.record(row)` use the same `LedgerRow`
shape in `explain/service.ts`; mock has zero cost and only in-memory state.

`rulings.append` remains append-only in the browser store; `rulings.replay` returns review overlays
without changing engine output. `evalkit` helpers are M5 scope. No model output may supply verdicts
or options. Summary polarity checks remain heuristics, not legal-semantic verification. Every
displayed quote is a source span rechecked at render time.

## Closed summary vocabulary (`quote-guard@2`)

No full pinned SPDX licence/exception identifier vocabulary is vendored. The summary guard instead
uses the small closed English prose vocabulary in `explain/guard.ts`. It accepts only those prose
words (case-insensitively), canonical-case licence/exception IDs from the re-derived `Facts.licenceIds`,
and the exact operators `AND`, `OR`, `WITH`. Every character is consumed: letters/digits with internal
dots/hyphens form one exact token; whitespace and `. , ; : ! ? ( ) ' "` separate tokens; every other
character fails closed. A name cannot pass merely because it lacks a version or looks like prose.
No arbitrary word or hyphenated-name pattern is accepted. IDs absent from the facts, including
unversioned `WTFPL`, `PostgreSQL`, `OpenSSL`, `curl` and `LLVM-exception`, fall back to a labelled
template. This is a closed-vocabulary fallback, not a claim to classify the full SPDX list.

The conservative vocabulary intentionally rejects benign synonyms, unfamiliar title/lowercase
words, non-English prose, altered-case IDs, ordinary hyphenated words and unsupported punctuation.
For example, `Consult the licensing team.` falls back even though it names no licence. The current
neutral GPL mock summaries stay within the vocabulary; quote validation and canonical spans are
unchanged. The server, browser and every cache read share this guard. `GUARD_VERSION` is included
in the cache key, so version 1 entries cannot be reused as version 2 entries; any vocabulary change
requires another version bump. Summary legal meaning is still not verified.

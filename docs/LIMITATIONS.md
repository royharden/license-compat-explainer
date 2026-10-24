# Limitations

**Not legal advice.** The source implements a finite interpretation of licence metadata. A
`conflict` is a review flag under the selected assumptions; `ok` does not grant rights or prove
compliance. No tests, eval, builds, app, migrations or edge function have been run. Static
inspection is not runtime, deployment or legal validation. See [DEFERRED-VALIDATION.md](DEFERRED-VALIDATION.md).

Named assumptions and boundaries:

- **Metadata truth:** package-lock/CSV licence fields are taken as supplied. Source code,
  actual LICENSE files, copyright ownership and commercial agreements are not inspected.
  npm v1 lacks usable licence metadata; links/unresolved graph edges and CSV row failures
  remain visible coverage gaps. A path is one shortest dependency path, not source linkage.
- **Shipping model:** hosted service is not distribution for GPL-family rules; internal use
  is treated as exempt even for AGPL. That internal AGPL assumption needs case-specific review.
  A global bundled flag cannot represent different treatment of individual dependencies.
  Dev scope is exempt only when unbundled; unknown scope receives no exemption.
- **User assertions:** `unmodified_use` and `mpl_secondary_eligible` are global assertions,
  not source-verified facts. Classpath/GCC eligibility is simplified; in particular an eligible
  GCC compilation process cannot be established from lockfile metadata. MPL Exhibit B and EPL
  secondary-licence designation require independent inspection. File-level weak copyleft and
  LGPL relinking duties depend on facts outside the input.
- **Finite catalogue:** only the frozen catalogue/exception pairs are modelled. Unknown stays
  unknown; the partial list of other SPDX ids can mislabel the unknown reason. `-or-later`
  expands only to known catalogue successors; hypothetical future versions are unmodelled.
  Patents, trademarks, export controls, notice generation and other ecosystems/SBOM are absent.
- **Partial corpus:** only GPL2, GPL3 and LGPL2.1 were vendored. AGPL3, LGPL3 and GCC3.1 GETs
  timed out; other documents await terms checks. Rules with unavailable passages remain
  template-only. The original AGPL section-13 quoted demo is unavailable (D18). Supplementary
  GPL3 mock demos are source only and have not run.
- **Grounding boundary:** quote-guard@2 verifies canonical spans from offered passages.
  Its closed summary vocabulary and polarity lexicon can reject benign prose and cannot
  verify legal meaning. A canonical quote can still be irrelevant or selectively used.
  Model prose is labelled supplementary; verdicts and options stay code-owned. Mock examples
  are authored adversarial fixtures, not evidence of real-model quality. Offered passages
  are not generated quote attempts and cannot be a grounding-rate denominator.
- **Evaluation evidence:** OSADL applies to distribution pairs with both acknowledgements
  asserted. Its Yes/Same is set-valued gold (`ok` or `ok_with_conditions`); Unknown/Check
  dependency/undefined map to needs_review. Unsupported project rows/columns are uncovered,
  not invented cases. Provisional disagreements are retained in metrics. Author cases and
  synthetic tree labels reflect the same rule design and are partly true by construction;
  they do not prove legal accuracy or real-world usefulness. Tree families/scenarios remain
  in a single frozen split; dev and heldout numbers must not be pooled to tune rules.
- **Baseline comparability:** denylist ignores context; ladder uses only class rank. The
  mode-blind matrix approximation projects all inputs to bundled runtime distribution with
  both acknowledgements, sharing our distribution rules. It is correlated with the full
  engine, not an independent oracle. esdecode is absent/unverified and reports not_run until
  an exact package/revision/API bridge is verified; library mode abstains until D19.
- **String evidence:** the 30 messy strings are synthetic dev examples. Alias-plus-fuzzy is
  eval-only, not inserted into production analysis. Fuzzy accepts a unique one-edit candidate
  only within the same alphabetic family and version digits, preserving ambiguity guards.
  The public-lockfile string set and Jev experiment are not built/run. No heldout normaliser
  accuracy, blind helpfulness rating or five-lockfile audit is claimed.
- **Ruling identity:** default keys derived from root package name or CSV `inventory` can
  collide. Use distinct explicit project keys for distinct projects; the default does not
  establish unique identity. LocalStorage sequential append rereads history but simultaneous
  tab read/modify/write is not atomic: edit rulings in one tab. Account saves are explicit
  and send package names; this differs from the name-free explanation payload.
- **Unverified infrastructure:** version pins have not been installed together; no npm
  lockfile exists. Worker bundling, Deno imports/shared deployment, actual SQL/RLS, public
  gateway/CORS, auth/email, concurrency and provider prices/usage bounds are unverified.
  Unknown charged calls retain reservations. Local eval caps are separate from public day
  caps; neither proposed cap nor this source grants spending authorization.

<!-- EVAL-FAILURES:BEGIN -->
Not yet run. No observed failure counts or scores exist. Provisional source-derived OSADL
disagreements are documented in [OSADL-DISAGREEMENTS.md](OSADL-DISAGREEMENTS.md).
<!-- EVAL-FAILURES:END -->

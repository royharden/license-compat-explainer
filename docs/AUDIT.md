# Five-lockfile audit protocol (not run)

Purpose: determine whether flags help a human reviewer on public projects beyond synthetic
fixtures. This is a later, separately authorized audit; no repositories or real lockfiles were
downloaded for it. Legal correctness is not inferred from author labels or OSADL agreement.

1. Freeze the app source revision, rules/corpus editions and audit protocol before selection.
   Select five publicly accessible projects with permissively licensed project roots and npm
   v2/v3 lockfiles. Record selection criteria before seeing flags; include different project
   sizes and hosted/distributed use contexts. Do not select only projects expected to pass.
2. Check permission to retain each lockfile/metadata and cite repository URL, commit, path,
   retrieval date, SHA-256 and root licence document/basis. Record unavailable or substituted
   projects and why. Use read-only public data acquisition only after authorization; never
   install dependencies or execute downloaded scripts. Avoid private repositories and user data.
3. Have a human state project licence, mode, bundled status and both acknowledgements from
   actual source/distribution facts. Record unknowns; do not assert acknowledgements to reduce
   flags. Preserve these settings with each run and separate project keys.
4. Run the frozen analyser locally; preserve JSON/Markdown exports, coverage gaps, unknowns,
   dependency paths, OR choice, rule ids and raw metadata references. Preserve parser failures
   and timeouts as outcomes, not silent exclusions. Do not change rules during collection.
5. Independently hand-review every conflict, needs_review and unknown, plus a prespecified
   deterministic sample of ok/ok_with_conditions. Check actual licence/exception files and
   distribution facts; an uncertain legal interpretation remains unresolved. Record reviewer,
   rationale, cited evidence, confidence, time and any cross-review disagreement. Do not use
   the model explanation or the engine verdict as the gold answer.
6. Classify actionable flag, false flag, metadata error, coverage failure and unresolved legal
   question separately. Report denominators, sampled-negative selection and unresolved cases;
   avoid claiming recall from positive-only review. Publish examples only within their terms.
   Report time to disposition and user action taken, distinct from legal correctness.
7. If measuring explanation helpfulness, prepare 20 blinded, random-order template/model
   pairs with identical facts. Roy rates them before identities are revealed. Record the
   rating rubric, ties, abstentions and all pairs. Otherwise helpfulness remains not measured.
8. Write a dated audit receipt under results/audit/ with source/input hashes and raw per-project
   observations. Replace this status only after the audit actually runs. Keep protocol and
   results distinguishable; list regressions as future dev cases without reusing heldout cases
   for tuning or silently changing the one-use final evaluation.

Current outcome: **not_run**. Acquisition, five analyses, independent human review and any
paid explanation/helpfulness experiment remain deferred (D14/D16).

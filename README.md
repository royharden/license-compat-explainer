# License Compatibility Explainer

Checks the licences of your dependencies against your project licence and how you ship the
project (distribute, library, hosted, internal; bundled or not), and explains each verdict with a
rule id, the dependency path and the rule's text. Analysis runs in the browser; the lockfile never
leaves your machine.

**Not legal advice.** Verdicts come from a fixed rule table applied to licence metadata only.

## Status: construction in progress (Dirty Mode)

This repository is being written in **Dirty Mode**: source code only, checked statically.
**Nothing has been installed, built or run.** No test has run, no type check or lint has run, the
app has never been opened in a browser, and there is no `package-lock.json` yet. Every runtime
check that is owed is listed in [`docs/DEFERRED-VALIDATION.md`](docs/DEFERRED-VALIDATION.md).
This README makes no claim that anything works.

What exists as source after milestones M1–M4:

- Shared analysis core in `supabase/functions/_shared/core/` (pure TypeScript, zero dependencies,
  meant to run unchanged in the browser worker, Node and Deno):
  - `inputs/`: safe JSON parsing, npm `package-lock.json` v2/v3 dependency graph (v1 listed as
    unknown with a warning), inventory CSV with column mapping, input caps.
  - `spdxexpr/`: SPDX expression lexer, parser, normaliser (aliases, legacy forms, deprecated ids,
    alias guards), `-or-later` expansion and the OR/AND/WITH evaluator.
  - `rules/`: frozen catalogue of 29 licences and 3 exceptions, full 39-rule precedence ladder
    (edition `2026-10-24.m2`), explicit obligations, assumptions, options and passage policies.
    See [`docs/RULES.md`](docs/RULES.md).
  - Partial GNU corpus (GPL2, GPL3, LGPL2.1) and OSADL snapshot with per-file provenance.
    AGPL3, LGPL3 and GCC3.1 downloads timed out; quote coverage is incomplete and the AGPL
    quoted demo is unavailable pending D18. Other documents remain template-only.
  - `util/sha256.ts` (synchronous, pure TS), `report/` (JSON and Markdown exports),
    `rulings/` (identity, latest-event replay and applicability overlays).
- React + Vite UI in `src/`: demo-mode banner, file drop and sample loader, settings form (Analyze
  stays disabled until project licence, mode and bundled are chosen), CSV column mapping and
  preview, report grouped by verdict with paths/rows, obligations, assumptions, options and coverage
  gaps, one-click global acknowledgements that rerun analysis, rule-table "template" explanations,
  JSON and Markdown exports, disclaimer and attribution.
- Local append-only review events (accept, waive with a bounded reason, follow-up), editable project
  keys, stale-expression and different-settings states, explicit re-confirmation under changed
  settings. These overlays never change an engine verdict. Clear local rulings is explicit.
- Nullable Supabase client and email magic-link sign-in/callback/sign-out/error source. The explicit
  "Save to account" action uploads this project's local review events, including package names;
  automatic reads show only the signed-in user's account history and do not import it into local storage.
  Migration `supabase/migrations/20261024160100_create_rulings.sql` enables owner-only RLS select/insert,
  with no update/delete or anonymous access. **No database or auth configuration has been applied.**
- Test source (vitest, not yet run) in `tests/`.
- Explanation source: strict canonical request/re-derived server facts; enum-only consent payload;
  strict summary/quotes schema; closed summary vocabulary plus heuristic polarity guard; branded quotes rendered only as canonical
  vendored spans; guard on server, browser and cache reads. Summary legal meaning is not verified.
  Without a full pinned SPDX vocabulary, unfamiliar summary words/names use a labelled template;
  exact re-derived licence/exception IDs remain allowed. Benign prose can also fall back. See the
  summary vocabulary contract in [`docs/RULES.md`](docs/RULES.md).
  Rule options, verdicts and review overlays remain code-owned. Exports include explanation labels.
- Explicit browser mock fixtures and in-memory ledger. In `hosted-mit-service`, open `gpl-runtime`
  and click **Explain (mock)** for the supplementary GPL3 section 2 example: the fixture contains a
  valid quote and a planted fabrication. Alternatively use `distributed-mit-bundle` / MIT /
  distribute / bundled=yes and explain `build-gpl` for GPL3 section 5. **Neither demo has run.**
  `R-NET-HOSTED__demo` remains unavailable pending D18; no AGPL quote was fabricated.
- Anthropic and OpenAI-compatible adapters, deliberately public edge function `explain`, versioned
  cache, full serialized UTF-8 request cost bound and SQL day/run reservation ledger. Unknown usage
  retains the full reservation; a single retry requires explicit proof of a noncharged failure.
  Migration 2 creates budget/ledger tables; migration 3 creates cache and service-role-only RPCs.
  The function, SQL transactions and provider contracts have never been executed or deployed.
- Three dev trees, three heldout trees and the demo expression-change companion, 79 authored
  verdict cases, frozen family splits and an OSADL-derived case builder. OSADL disagreements
  are provisional until the agreement test runs; see `docs/OSADL-DISAGREEMENTS.md`.

All three dev trees, the changed-expression demo and a synthetic pip-licenses-shaped CSV are
available in the sample loader. The CSV is authored test data, not output captured from pip-licenses.

Not built yet: evaluation and hand-off documents (M5). Live explanations are inactive by default;
missing provider/configuration yields a labelled template and never silently selects mock.

Live activation requires owner-verified server settings: `EXPLAIN_PROVIDER`, `EXPLAIN_MODEL`,
`EXPLAIN_MAX_OUTPUT_TOKENS`, `EXPLAIN_TOKEN_SAFETY_FACTOR` (at least 1), `EXPLAIN_PRICE_TABLE`,
`EXPLAIN_RUN_CAP_USD`, `EXPLAIN_DAILY_CAP_USD`, `ALLOWED_ORIGINS`; the appropriate server-only
`ANTHROPIC_API_KEY` or `OPENAI_COMPATIBLE_API_KEY` and `OPENAI_COMPATIBLE_BASE_URL`; platform
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Price table is an array with exact provider/model,
`input_usd_per_million`, `output_usd_per_million`, `framing_tokens`, `input_bound: "utf8_bytes"`,
`max_output_tokens` (verified provider hard bound) and `verified_on`. No live model/price is pinned.
The owner must separately set matching PostgreSQL settings `app.settings.explain_daily_cap_usd`
and `app.settings.explain_run_cap_usd`; unset settings refuse reservations. Existing day/run caps
are never raised automatically. Proposed caps in the plan are not spending authorization.
Provisioning/gateway, price/token bounds, RLS and concurrency checks remain deferred.

## Planned commands (none has been run)

```sh
npm install          # creates package-lock.json (deferred D17)
npm run dev          # local dev server
npm test             # vitest
npm run typecheck    # tsc -b
npm run lint         # eslint
npm run build        # tsc -b && vite build
```

## Licence

MIT (see `LICENSE`). Third-party data notices: `NOTICE`.

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

What exists as source after milestone M1 (walking skeleton):

- Shared analysis core in `supabase/functions/_shared/core/` (pure TypeScript, zero dependencies,
  meant to run unchanged in the browser worker, Node and Deno):
  - `inputs/`: safe JSON parsing, npm `package-lock.json` v2/v3 dependency graph (v1 listed as
    unknown with a warning), inventory CSV with column mapping, input caps.
  - `spdxexpr/`: SPDX expression lexer, parser, normaliser (aliases, legacy forms, deprecated ids,
    alias guards), `-or-later` expansion and the OR/AND/WITH evaluator.
  - `rules/`: the frozen catalogue of 29 licences and 3 exceptions, and a **stub** rule table
    (rules edition `2026-10-24.m1-stub`): only the unknown, source-available, dev-not-shipped,
    internal and hosted rules are implemented; every other combination is reported as
    `needs_review` (`R-FALLBACK`). The full rule table is milestone M2.
  - `util/sha256.ts` (synchronous, pure TS), `report/json.ts` (JSON export).
- React + Vite UI in `src/`: demo-mode banner, file drop and sample loader, settings form (Analyze
  stays disabled until project licence, mode and bundled are chosen), flat report with paths, rule
  ids and chosen OR side, rule-table "template" explanations, JSON export, disclaimer.
- Test source (vitest, not yet run) in `tests/`.
- Synthetic demo fixtures in `fixtures/trees/dev/`.

Not built yet: full rules and OSADL oracle (M2), rulings, Markdown export, CSV mapping UI and
sign-in (M3), model explanations with verified quotes and the budget-capped edge function (M4),
evaluation and hand-off documents (M5).

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

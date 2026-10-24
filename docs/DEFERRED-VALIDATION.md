# Deferred validation

This project is being built in **Dirty Mode**: source is written and checked statically only.
Nothing listed here has been installed, run, built or deployed. Each entry says what was skipped,
why, and the exact command or steps that will check it later. IDs follow PLAN.md §9 (D1–D19);
`M1-*` entries were added by milestone M1.

Static checks that *were* run during construction (no installs, no code executed):

- `node --experimental-vm-modules --no-warnings scripts/static-syntax-check.mjs <files>` over every
  `.ts` file (Node's built-in type stripper + module compile; parse only, no type checking).
- JSON fixtures parsed as data (`JSON.parse` of the file text only).
- The core purity grep from PLAN §12 M1 (b).
- `.tsx`, `.css`, `.html`, `.json` config and `.md` files: by inspection only.

## Entries

| ID | What is unverified | Why deferred | Later check (exact command / steps) |
|---|---|---|---|
| D1 | All vitest suites in `tests/`, TypeScript type checking, ESLint | Dirty Mode: no installs, no test runs; no `tsc`/`eslint` available without `npm install` | `npm ci` (after D17), then `npx vitest run`, `npx tsc -b`, `npx eslint .`; fix every failure and record results |
| D17 | `package-lock.json` does not exist; the pinned versions in `package.json` (PLAN §2.4) have never been resolved together | Creating a lockfile needs `npm install` (network + install) | `npm install` once in a clean checkout, commit the generated `package-lock.json`, then use `npm ci` everywhere; confirm `npm ls` shows no peer-dependency errors (vite 5.4.10 / @vitejs/plugin-react 4.3.3 / vitest 2.1.4 / typescript-eslint 8.12.2 / eslint 9.13.0) |
| M1-BUILD | `vite build` has never run: `@core` alias, `?raw` fixture imports, module worker bundling (`new Worker(new URL(...), { type: 'module' })` with `worker.format: 'es'`) are unverified | Dirty Mode: no builds | `npm run build` (runs `tsc -b && vite build`); confirm `dist/` contains a separate worker chunk and the fixture text is inlined |
| M1-JOURNEY | The walking-skeleton UI has never been opened. Demo journey steps 1–4 and 8 (PLAN §1.6) are traced in source only | Dirty Mode: no dev server, no browser | `npm run dev`, open the printed URL with no `.env`: (1) demo-mode banner shows, no crash; (2) Load sample `hosted-mit-service`; Analyze is disabled until project licence, mode and bundled are all chosen; (3) choose MIT / hosted / no and Analyze; (4) check the AGPL conflict with path `root > web-kit > chart-core > agpl-plot`, `MIT OR GPL-3.0-only` ok with MIT chosen, dev GPL linter ok `R-DEV-NOT-SHIPPED`, GPL runtime ok `R-STRONG-HOSTED`, UNLICENSED and missing unknown, SSPL needs_review; open "Show explanation" and see the `template` label; Export JSON downloads a file with settings and the disclaimer; (8) load `hosted-mit-service.v2` and confirm only `sspl-db` changed |
| M1-TSX | `.tsx` components (`src/App.tsx`, `src/main.tsx`, `src/ui/*.tsx`) were checked by inspection only; the static syntax checker cannot parse JSX | Node's type stripper does not support JSX | Covered by D1 (`npx tsc -b`, `npx eslint .`) and M1-BUILD |
| M1-ERASABLE | The "erasable syntax only" rule for the shared core is enforced by the static checker (Node strip mode rejects enums, namespaces, parameter properties), not by TypeScript: `erasableSyntaxOnly` needs TypeScript 5.8 and the pin is 5.6.3 | Version pin from PLAN §2.4 | Keep running `npm run check:syntax -- $(git ls-files 'supabase/functions/_shared/core/*.ts')` in CI; when TypeScript is upgraded to ≥ 5.8 add `"erasableSyntaxOnly": true` to both tsconfigs |
| M1-SHA256 | The pure-TS SHA-256 and UTF-8 encoder are unexecuted; correctness rests on the FIPS 180-4 vectors in `tests/util.test.ts` | Dirty Mode: no test runs | Part of D1: `npx vitest run tests/util.test.ts` must pass the three FIPS vectors and the TextEncoder comparison |
| M1-LOCKFILES | The package-lock reader has only been exercised (in test source) against synthetic lockfiles. Real npm 7–10 lockfiles with workspaces, `link: true` entries, `inBundle`, aliases (`npm:` specifiers) and peer-dependency layouts are untested | No real-world lockfile run in Dirty Mode | Run the analysis (Node, via a small `tsx` script or the app) on at least three real public v3 lockfiles, one with workspaces; check that coverage gaps are plausible and no path is invented; add any surprise as a regression test |
| M1-CSV | CSV mapping was written against the documented `pip-licenses --format=csv` headings (`Name,Version,License`); no real `pip-licenses` output was parsed | No Python tool runs in Dirty Mode | Generate `pip-licenses --format=csv` from any Python environment, load it in the app, confirm the suggested mapping and verdicts; add the file (synthetic or with recorded provenance) as `fixtures/csv/pip-licenses-sample.csv` in M3 |
| M1-KNOWN-IDS | `KNOWN_OTHER_LICENCE_IDS` / `KNOWN_OTHER_EXCEPTIONS` are short hand-written lists, so some valid SPDX ids resolve as `unresolved` (`unrecognised_identifier`) instead of `unsupported_licence`. Both give `unknown`; only the reason differs | The SPDX licence list is not vendored (PLAN §5.2, D18) | When SPDX list-data terms are confirmed (D18), generate the full id list into a TS module and replace the hand-written sets; re-run D1 |
| D12 | Worker performance for 5,000 packages (target: under a second) | No browser runs | Generate a synthetic 5,000-package v3 lockfile, analyze it in a browser with DevTools performance recording; record the time in `results/` |

Further entries D2–D11, D13–D16, D18 and D19 (eval runs, Deno check, migrations, deployed function,
budget concurrency, live provider, mock re-recording, licence-text terms, OSADL refresh, esdecode,
auth, audit, Jev, live eval metrics, remaining licence texts, esdecode `library` mapping) are added
by the milestones that create the code they cover (M2–M5), per PLAN.md §9 and §12.

## M2 source-only validation

No M2 rules, generator, tests, split verifier, corpus segmenter, eval case builder or application code has been executed. Only TypeScript syntax stripping/module compilation, JSON data parsing, source inspection and raw-byte/string-literal comparison are allowed in this run.

| ID | What is unverified | Why deferred | Later check (exact command / steps) |
|---|---|---|---|
| M2-RULES | All 39 rule ids, A1–A6, mode matrix, exception ordering, three precedence traces, source-authored golden expectations | Dirty Mode forbids runtime | After D17, `npx vitest run tests/rules.full.test.ts tests/rules.stubJourney.test.ts tests/fixtures.test.ts`; then `npx tsc -b` and `npx eslint .`. Fix failures before activation. The old filename rules.stubJourney.test.ts is retained; its assertions now target M2. |
| M2-OSADL | Provisional disagreement list completeness over all covered distribution pairs, both bundled settings and both acknowledgements true | No engine or agreement test was run | `npx vitest run tests/osadl.test.ts`; independently review every undocumented mismatch, record exact pair/context/reason in docs/OSADL-DISAGREEMENTS.md; retain mismatches as disagreements in later eval metrics. Do not blanket-exempt them. |
| M2-SPLIT | Frozen author-family coverage, deterministic OSADL split and dev golden cases; heldout scoring is unperformed | No split/eval/runtime runs | `npm run split:verify`, then `npx vitest run tests/fixtures.test.ts tests/osadl.test.ts`; inspect fixtures/cases/SPLIT.json. Heldout trees are parsed only by vitest; score them only through the future guarded eval once with `--heldout --final`. |
| M2-DOC | RULES.md is hand-synced from table literals; generator exists but has never run | Dirty Mode forbids running the generator | `npm run rules:doc`, then `git diff --exit-code -- docs/RULES.md`; investigate any drift rather than accepting stale docs. |
| D9 | The three vendored GNU licence documents carry their own verbatim-copying grant; OSADL terms are separate. SHA-256/string-module identity tests are unrun | Content and copying sentences inspected statically; runtime tests deferred | Before accepting a commit, review data/PROVENANCE.md and NOTICE, verify each raw file's grant and preservation of copyright notices; after D17 run `npx vitest run tests/corpus.test.ts`. No unconfirmed document should be added. |
| D10 | OSADL 2026-10-24 snapshot freshness and future upstream changes | Only authorized snapshot reused in this run | In a separately authorized refresh, GET https://www.osadl.org/fileadmin/checklists/matrix.csv into a temporary file, compare SHA-256 with data/PROVENANCE.md, review changed cells and terms, then run `npx vitest run tests/osadl.test.ts tests/corpus.test.ts` before changing the snapshot. |
| D18 | AGPL3, LGPL3, GCC3.1 failed direct GNU GETs; all other licence/exception documents lack confirmed redistribution terms this run. Quote coverage is incomplete; AGPL quoted demo is unavailable | Bounded public GETs timed out; no fabrication or unapproved alternate sources | In an authorized data-acquisition run, retry only the named GNU URLs in PLAN §5.2, inspect each grant before vendoring; independently confirm each other steward document's terms before copying it. Store bytes, URL/date/SHA-256/copying basis, update corpus modules and explicit rule passage policies; run `npx vitest run tests/corpus.test.ts`, and later the M4 guard/demo tests. Require an actual AGPL-3.0-only#s13 before claiming the quoted AGPL demo works. |

The .gitattributes M1 baseline (`data/** -text`) is part of the M2 review scope: vendored raw bytes must survive checkout unchanged. No installs, builds, tests, dev servers, browsers, databases, containers or paid calls were run in M2.

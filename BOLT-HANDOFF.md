# Bolt infrastructure handoff: License Compatibility Explainer

## Target and readiness

- Product/import root: this inner Git repository (`license-compat-explainer/`), not the outer planning shell.
  Local Git only; no remote/import/push is configured or authorized. Use the later reviewed source revision.
- Database choice: **Bolt Database**, fresh target intended; actual target and migration baseline **Unknown**.
  Do not create a separate Supabase project or replace an existing connection.
- Hosting: eventual Bolt hosting; publication **prepare only**. Bolt action: **inspect and prepare only**.
- Status: **implementation complete for Dirty Mode, runtime unverified**. Source files exist;
  dependency resolution, all tests/eval/build/app, database/auth/function execution and infrastructure
  remain unverified. No cloud resources have been provisioned. This is not locally validated readiness.
- Owner prerequisites: later GitHub remote/access/import authorization, intended database/baseline,
  hosting origin, email configuration and any provider account/verified model/pricing. No secrets in chat.

## Build and connection

| Item | Implemented source / later command | Status |
|---|---|---|
| Stack | React/TypeScript/Vite, npm; exact pins in package.json | Never installed together; Node >=23.2 only required by static parser |
| Install | First `npm install` generates package-lock.json; review/commit it; then `npm ci` | D17 pending; no frozen install currently possible |
| Dev | `npm run dev -- --host 127.0.0.1 --port <reserved-port> --strictPort` after agent-ports reservation | Never run |
| Build / output | `npm run build`; intended `dist/` + module worker | Never run; no built output |
| Checks | `npm test`, `npm run typecheck`, `npm run lint`, `npm run eval` | All pending D1/D2 |
| Client | src/lib/supabase.ts; VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | Public names only, nullable client enables local mode |
| Explain mode | VITE_EXPLAIN_MODE=mock or live | Explicit fixtures vs live transport; missing live config yields template |

Static source inspection/parse-only checks do not resolve imports or prove runtime types. Some
prior approved Node parse invocations printed all files parsed then exited 1 with
`UV_HANDLE_CLOSING`; this is not a clean command pass. See DEFERRED-VALIDATION for owed checks.

## Database (files present; none applied)

| Order | Exact migration | Resources |
|---|---|---|
| 1 | supabase/migrations/20261024160100_create_rulings.sql | rulings, append-only user ownership, SELECT/INSERT RLS, waiver reason constraints |
| 2 | supabase/migrations/20261024160200_create_budget_and_callledger.sql | budget_days, budget_runs, budget_attempts, callledger; partial active/unknown request uniqueness |
| 3 | supabase/migrations/20261024160300_create_cache_and_budget_rpcs.sql | explanation_cache; reserve_attempt, finish_budget_attempt helper, settle_attempt, mark_attempt_unknown, reconcile_attempt |

Rulings: authenticated owner SELECT/INSERT only; no anon, UPDATE or DELETE grants. Budgets,
cache, ledger and RPCs: service_role only, fixed `search_path = public, pg_temp` for privileged
functions. No browser service-role access. Owner separately sets database
`app.settings.explain_daily_cap_usd` and `app.settings.explain_run_cap_usd`; missing settings
refuse reservations. Function EXPLAIN caps are additional bounds, not a replacement.

No seeds, buckets, Realtime, extensions, webhooks, jobs or schedules are required. Inspect
migration tracking/schema before provisioning, apply only pending files in order, preserve
existing data; verify timeout outcomes before retry. Files are not proof of applied history.

## Function and secrets

| Function / source | Caller + auth | Contract and dependencies |
|---|---|---|
| explain; supabase/functions/explain/index.ts | Deliberately public; supabase/config.toml sets verify_jwt=false; CORS is not authentication | Normalised expression/settings/rule claims only, opaque dep_ref, no package/raw strings; server re-derives facts/passages; shared core; service-role budget/cache/ledger |

Bounded POST/OPTIONS; explicit ALLOWED_ORIGINS and preflight headers. Public spending boundary
is atomic account-independent daily/run SQL reservation before provider calls; unknown usage
retains reservation and requires reconciliation. Confirm target gateway/key behavior and actual
shared-core bundle inclusion. No silent mock fallback in live mode. See D3–D7 before activation.

| Server-only name | Consumer / owner source |
|---|---|
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | explain REST DB ports; platform-injected configuration, verify availability |
| EXPLAIN_PROVIDER, EXPLAIN_MODEL | explain provider selection; owner chooses verified model |
| ANTHROPIC_API_KEY | Anthropic adapter, only when selected; owner provider account |
| OPENAI_COMPATIBLE_API_KEY, OPENAI_COMPATIBLE_BASE_URL | OpenAI-compatible adapter, only when selected; owner HTTPS endpoint/account |
| EXPLAIN_MAX_OUTPUT_TOKENS, EXPLAIN_TOKEN_SAFETY_FACTOR | Verified provider hard output bound and full UTF-8 serialized request bound |
| EXPLAIN_PRICE_TABLE | Exact provider/model entries: input_usd_per_million, output_usd_per_million, framing_tokens, input_bound=utf8_bytes, max_output_tokens, verified_on |
| EXPLAIN_DAILY_CAP_USD, EXPLAIN_RUN_CAP_USD | Additional owner-set bounds; matching database settings also required |
| ALLOWED_ORIGINS | Explicit comma-separated browser origins |

Only public connection names and VITE_EXPLAIN_MODE belong in frontend config. Missing/unverified
key/model/prices/bounds/DB cap yields a labelled template. No live model/price has been pinned.
`EVAL_CAP_USD` belongs only to a separately authorized local Node campaign, never the deployed
function. That campaign calls Provider.complete directly, not this public endpoint; activation is
unbound and reports not_run in the eval CLI. Proposed caps do not authorize spending.

## Auth and external steps

Email magic link with PKCE is implemented for explicit Save to account only. Set Site URL and
redirect allowlist to the chosen app origin/root path (callback code/error is handled on the app
page by src/lib/useAuth.ts). Verify same-browser PKCE exchange, reused/expired links, logout,
session/account changes, two-user isolation and explicit save behavior. Local analysis/rulings
remain available without login. Account saves include package names; explanations omit them.

Explicit demo/stubs: browser mock fixtures and in-memory ledger; Jev not implemented;
esdecode absent/unverified, library mapping unresolved. Partial corpus lacks AGPL3/LGPL3/GCC3.1;
original AGPL quoted demo unavailable. Supplementary GPL examples have never run.

## Pending acceptance receipts

Every item below is **pending / not_run**, with exact steps in docs/DEFERRED-VALIDATION.md:
install/frozen build/type/lint/tests/eval (D1/D2/D17); Deno/shared bundling (D3); migration
constraints/grants and actual anon/user-A/user-B RLS (D4); public gateway/facts mismatch/CORS
and missing-secret template without provider call (D5); concurrent reservations/retries/midnight/
unknown reconciliation (D6); owner-activated bounded live provider (D7); mock re-recording (D8);
email sign-in/save/logout (D13); UI/export journey and final URL checks before any publication.

## One prompt after a separately authorized GitHub import

> Read BOLT-HANDOFF.md and inspect the imported source at the intended reviewed revision.
> The chosen future target is Bolt Database; implementation is source-complete under Dirty Mode
> and all runtime checks are unverified. Compare the listed resources with actual files, inspect
> existing connection and migration history read-only when access is available, and report concrete
> deployment gaps and owner blockers, including the missing npm lockfile and pending local checks.
> Preserve the app design, chosen provider and existing data. Prepare a reviewable setup plan with
> exact migrations, function/auth/env names and pending checks. Do not create/change cloud resources,
> apply migrations, deploy functions, enter secrets, enable schedules, publish, or claim readiness
> from source files or this prompt. No provisioning or publication is authorized by this handoff.

-- Owner settings, never browser input: app.settings.explain_daily_cap_usd and
-- app.settings.explain_run_cap_usd must be set on the database before activation.
create table public.budget_days (
  day date primary key, cap_usd numeric not null check (cap_usd > 0),
  reserved_usd numeric not null default 0 check (reserved_usd >= 0),
  spent_usd numeric not null default 0 check (spent_usd >= 0), breach boolean not null default false
);
create table public.budget_runs (
  run_id uuid primary key, day date not null references public.budget_days(day),
  cap_usd numeric not null check (cap_usd > 0), reserved_usd numeric not null default 0 check (reserved_usd >= 0),
  spent_usd numeric not null default 0 check (spent_usd >= 0), unique (run_id, day)
);
create table public.budget_attempts (
  attempt_id uuid primary key default gen_random_uuid(), request_id uuid not null,
  run_id uuid not null, day date not null references public.budget_days(day),
  reserved_usd numeric not null check (reserved_usd > 0), actual_usd numeric check (actual_usd >= 0),
  state text not null check (state in ('reserved','settled','unknown')),
  created_at timestamptz not null default now(), settled_at timestamptz,
  foreign key (run_id, day) references public.budget_runs(run_id, day),
  check ((state = 'settled' and actual_usd is not null and settled_at is not null)
    or (state in ('reserved','unknown') and actual_usd is null and settled_at is null))
);
create unique index budget_attempts_one_pending_request on public.budget_attempts(request_id)
  where state in ('reserved','unknown');
create index budget_attempts_request_history on public.budget_attempts(request_id);
create table public.callledger (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  attempt_id uuid references public.budget_attempts(attempt_id), run_id uuid not null,
  provider text not null, model text not null, request_hash text not null,
  cache_hit boolean not null default false, input_tokens bigint check (input_tokens >= 0),
  output_tokens bigint check (output_tokens >= 0), cost_usd numeric check (cost_usd >= 0),
  status text not null check (status in ('ok','template_fallback','over_cap','pending','provider_error',
    'timeout_unknown_usage','rejected_output','facts_mismatch','cap_breach')),
  quotes_offered integer not null check (quotes_offered >= 0), quotes_kept integer not null check (quotes_kept >= 0),
  rules_edition text not null
);
alter table public.budget_days enable row level security;
alter table public.budget_runs enable row level security;
alter table public.budget_attempts enable row level security;
alter table public.callledger enable row level security;
revoke all on public.budget_days, public.budget_runs, public.budget_attempts, public.callledger from public, anon, authenticated;
grant select, insert, update on public.budget_days, public.budget_runs, public.budget_attempts to service_role;
grant select, insert on public.callledger to service_role;
-- No client policies. No deletion/expiry/optimistic refund of unknown reservations.

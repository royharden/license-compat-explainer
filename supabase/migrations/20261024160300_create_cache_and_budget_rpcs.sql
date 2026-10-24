create table public.explanation_cache (
  key text primary key, output jsonb not null, created_at timestamptz not null default now()
);
alter table public.explanation_cache enable row level security;
revoke all on public.explanation_cache from public, anon, authenticated;
grant select, insert, update on public.explanation_cache to service_role;

create function public.reserve_attempt(p_request_id uuid, p_run_id uuid, p_worst_case_usd numeric)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_day date := (clock_timestamp() at time zone 'UTC')::date;
  v_day_cap numeric := nullif(current_setting('app.settings.explain_daily_cap_usd', true), '')::numeric;
  v_run_cap numeric := nullif(current_setting('app.settings.explain_run_cap_usd', true), '')::numeric;
  d public.budget_days%rowtype; r public.budget_runs%rowtype; v_attempt uuid;
begin
  if p_request_id is null or p_run_id is null or p_worst_case_usd is null
    or p_worst_case_usd <= 0 or p_worst_case_usd::text in ('NaN','Infinity','-Infinity')
    or v_day_cap is null or v_run_cap is null or v_day_cap <= 0 or v_run_cap <= 0
    or v_day_cap::text in ('NaN','Infinity','-Infinity') or v_run_cap::text in ('NaN','Infinity','-Infinity') then return null; end if;
  -- Serialize reservation history for this logical request; settlement never takes this lock.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  if exists(select 1 from public.budget_attempts where request_id = p_request_id and (state <> 'settled' or actual_usd <> 0))
    or (select count(*) from public.budget_attempts where request_id = p_request_id) >= 2 then return null; end if;
  insert into public.budget_days(day, cap_usd) values (v_day, v_day_cap) on conflict (day) do nothing;
  -- Global lock order for every RPC: day -> run -> attempt. Never attempt -> day.
  select * into d from public.budget_days where day = v_day for update;
  insert into public.budget_runs(run_id, day, cap_usd) values (p_run_id, v_day, v_run_cap) on conflict (run_id) do nothing;
  select * into r from public.budget_runs where run_id = p_run_id for update;
  if r.day <> v_day or d.breach or d.reserved_usd + d.spent_usd + p_worst_case_usd > least(d.cap_usd, v_day_cap)
    or r.reserved_usd + r.spent_usd + p_worst_case_usd > least(r.cap_usd, v_run_cap) then return null; end if;
  insert into public.budget_attempts(request_id, run_id, day, reserved_usd, state)
    values (p_request_id, p_run_id, v_day, p_worst_case_usd, 'reserved') returning attempt_id into v_attempt;
  update public.budget_days set reserved_usd = reserved_usd + p_worst_case_usd where day = v_day;
  update public.budget_runs set reserved_usd = reserved_usd + p_worst_case_usd where run_id = p_run_id;
  return v_attempt;
exception when unique_violation or invalid_text_representation or numeric_value_out_of_range then
  -- This block rolls back every insert/counter mutation before returning a refusal.
  return null;
end $$;

-- Shared accounting body. Only an owner/service-role caller may reconcile unknown usage.
create function public.finish_budget_attempt(p_attempt_id uuid, p_actual_usd numeric, p_reconcile boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.budget_attempts%rowtype; v_day date; v_run uuid;
begin
  if p_actual_usd is null or p_actual_usd < 0 or p_actual_usd::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_actual_cost'; end if;
  -- First read is metadata only. Re-read state after acquiring locks in the universal order.
  select day, run_id into v_day, v_run from public.budget_attempts where attempt_id = p_attempt_id;
  if not found then raise exception 'attempt_not_found'; end if;
  perform 1 from public.budget_days where day = v_day for update;
  perform 1 from public.budget_runs where run_id = v_run for update;
  select * into a from public.budget_attempts where attempt_id = p_attempt_id for update;
  if a.state = 'settled' then return; end if;
  if a.state = 'unknown' and not p_reconcile then raise exception 'owner_reconciliation_required'; end if;
  update public.budget_days set reserved_usd = reserved_usd - a.reserved_usd,
    spent_usd = spent_usd + p_actual_usd, breach = breach or p_actual_usd > a.reserved_usd where day = a.day;
  update public.budget_runs set reserved_usd = reserved_usd - a.reserved_usd,
    spent_usd = spent_usd + p_actual_usd where run_id = a.run_id;
  update public.budget_attempts set state = 'settled', actual_usd = p_actual_usd, settled_at = clock_timestamp() where attempt_id = a.attempt_id;
  if p_actual_usd > a.reserved_usd then update public.callledger set status = 'cap_breach' where attempt_id = a.attempt_id; end if;
end $$;
create function public.settle_attempt(p_attempt_id uuid, p_actual_usd numeric)
returns void language sql security definer set search_path = public, pg_temp as $$
  select public.finish_budget_attempt(p_attempt_id, p_actual_usd, false);
$$;
create function public.reconcile_attempt(p_attempt_id uuid, p_actual_usd numeric)
returns void language sql security definer set search_path = public, pg_temp as $$
  select public.finish_budget_attempt(p_attempt_id, p_actual_usd, true);
$$;
create function public.mark_attempt_unknown(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_day date; v_run uuid;
begin
  select day, run_id into v_day, v_run from public.budget_attempts where attempt_id = p_attempt_id;
  if not found then raise exception 'attempt_not_found'; end if;
  perform 1 from public.budget_days where day = v_day for update;
  perform 1 from public.budget_runs where run_id = v_run for update;
  perform 1 from public.budget_attempts where attempt_id = p_attempt_id for update;
  update public.budget_attempts set state = 'unknown' where attempt_id = p_attempt_id and state = 'reserved';
  -- Both reserved counters stay unchanged until provider-record reconciliation.
end $$;
revoke execute on function public.reserve_attempt(uuid,uuid,numeric) from public, anon, authenticated;
revoke execute on function public.finish_budget_attempt(uuid,numeric,boolean) from public, anon, authenticated;
revoke execute on function public.settle_attempt(uuid,numeric) from public, anon, authenticated;
revoke execute on function public.mark_attempt_unknown(uuid) from public, anon, authenticated;
revoke execute on function public.reconcile_attempt(uuid,numeric) from public, anon, authenticated;
grant execute on function public.reserve_attempt(uuid,uuid,numeric) to service_role;
grant execute on function public.finish_budget_attempt(uuid,numeric,boolean) to service_role;
grant execute on function public.settle_attempt(uuid,numeric) to service_role;
grant execute on function public.mark_attempt_unknown(uuid) to service_role;
grant execute on function public.reconcile_attempt(uuid,numeric) to service_role;

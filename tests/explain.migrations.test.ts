import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tables = read('supabase/migrations/20261024160200_create_budget_and_callledger.sql');
const rpcs = read('supabase/migrations/20261024160300_create_cache_and_budget_rpcs.sql');
describe('M4 SQL source contracts (not a database execution test)', () => {
  it('creates tables in FK order, RLS and partial unique request index', () => {
    expect(tables.indexOf('create table public.budget_days')).toBeLessThan(tables.indexOf('create table public.budget_runs'));
    expect(tables.indexOf('create table public.budget_runs')).toBeLessThan(tables.indexOf('create table public.budget_attempts'));
    expect(tables.indexOf('create table public.budget_attempts')).toBeLessThan(tables.indexOf('create table public.callledger'));
    expect(tables).toMatch(/unique index[^;]+request_id\)[\s\S]*?where state in \('reserved','unknown'\)/);
    for (const table of ['budget_days','budget_runs','budget_attempts','callledger']) expect(tables).toContain(`alter table public.${table} enable row level security`);
    expect(rpcs).toContain('alter table public.explanation_cache enable row level security');
  });
  it('all RPCs are fixed-search-path security-definer and service-role only', () => {
    for (const [name, args] of [['reserve_attempt','uuid,uuid,numeric'],['finish_budget_attempt','uuid,numeric,boolean'],['settle_attempt','uuid,numeric'],['mark_attempt_unknown','uuid'],['reconcile_attempt','uuid,numeric']]) {
      const start = rpcs.indexOf(`create function public.${name}(`); const end = rpcs.indexOf('$$;', start);
      expect(start).toBeGreaterThan(-1); expect(rpcs.slice(start, end)).toContain('security definer set search_path = public, pg_temp');
      expect(rpcs).toContain(`revoke execute on function public.${name}(${args}) from public, anon, authenticated`);
      expect(rpcs).toContain(`grant execute on function public.${name}(${args}) to service_role`);
    }
  });
  it('settle is idempotent, subtracts entire original reservation, adds actual, uses own day and flags breach', () => {
    const finish = rpcs.slice(rpcs.indexOf('create function public.finish_budget_attempt'), rpcs.indexOf('create function public.settle_attempt'));
    expect(finish).toContain("if a.state = 'settled' then return");
    expect(finish).toContain('reserved_usd = reserved_usd - a.reserved_usd'); expect(finish).toContain('spent_usd = spent_usd + p_actual_usd');
    expect(finish).toContain('where day = a.day'); expect(finish).not.toContain('current_date');
    expect(finish).toContain('breach = breach or p_actual_usd > a.reserved_usd');
    expect(finish.indexOf('public.budget_days where day = v_day for update')).toBeLessThan(finish.indexOf('public.budget_runs where run_id = v_run for update'));
    expect(finish.indexOf('public.budget_runs where run_id = v_run for update')).toBeLessThan(finish.indexOf('public.budget_attempts where attempt_id = p_attempt_id for update'));
  });
  it('unknown keeps reservations and is reconciled only by explicit service-role RPC', () => {
    const unknown = rpcs.slice(rpcs.indexOf('create function public.mark_attempt_unknown'), rpcs.indexOf('revoke execute'));
    expect(unknown).toContain("set state = 'unknown'"); expect(unknown).not.toContain('reserved_usd =');
    expect(rpcs).toContain("if a.state = 'unknown' and not p_reconcile then raise exception 'owner_reconciliation_required'");
    expect(rpcs).toContain('select public.finish_budget_attempt(p_attempt_id, p_actual_usd, true)');
  });
  it('caps come from owner settings, reservation checks day/run together and retry count is bounded', () => {
    expect(rpcs).toContain("current_setting('app.settings.explain_daily_cap_usd', true)");
    expect(rpcs).toContain('d.reserved_usd + d.spent_usd + p_worst_case_usd'); expect(rpcs).toContain('r.reserved_usd + r.spent_usd + p_worst_case_usd');
    expect(rpcs).toContain('or d.breach'); expect(rpcs).toContain('>= 2 then return null');
  });
});

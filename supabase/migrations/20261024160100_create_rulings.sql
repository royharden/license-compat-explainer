-- Append-only, explicit account saves. Browser analysis and local rulings need no account.
create table public.rulings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  project_key text not null check (length(btrim(project_key)) between 1 and 200),
  occurrence text not null,
  ecosystem text not null check (ecosystem in ('npm', 'csv')),
  package text not null,
  version text not null,
  location text,
  ordinal integer check (ordinal > 0),
  source_row integer check (source_row > 0),
  expr_hash text not null check (expr_hash ~ '^[0-9a-f]{64}$'),
  settings_hash text not null check (settings_hash ~ '^[0-9a-f]{64}$'),
  rules_edition text not null,
  kind text not null check (kind in ('licence_waiver', 'acceptance', 'follow_up')),
  action text not null check (action in ('accept', 'waive', 'follow-up')),
  reason text not null default '' check (char_length(reason) <= 500),
  engine_verdict text not null check (engine_verdict in ('ok', 'ok_with_conditions', 'conflict', 'needs_review', 'unknown')),
  rule_id text not null,
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  constraint waiver_reason_required check (action <> 'waive' or reason ~ '[^[:space:]]'),
  constraint ruling_action_kind check (
    (action = 'waive' and kind = 'licence_waiver') or
    (action = 'accept' and kind = 'acceptance') or
    (action = 'follow-up' and kind = 'follow_up')
  ),
  constraint ruling_occurrence_identity check (
    (ecosystem = 'npm' and location is not null and ordinal is null and
      occurrence = 'npm:' || package || '@' || version || '|' || location) or
    (ecosystem = 'csv' and location is null and ordinal is not null and
      occurrence = 'csv:' || package || '@' || version || '#' || ordinal::text)
  )
);
create index rulings_owner_replay on public.rulings (user_id, project_key, occurrence, created_at desc, id desc);
alter table public.rulings enable row level security;
revoke all on public.rulings from anon, authenticated;
grant select, insert on public.rulings to authenticated;
create policy rulings_select_own on public.rulings for select to authenticated using (user_id = auth.uid());
create policy rulings_insert_own on public.rulings for insert to authenticated with check (user_id = auth.uid());
-- No UPDATE/DELETE grants or policies. No anonymous access. No service-role key in the SPA.

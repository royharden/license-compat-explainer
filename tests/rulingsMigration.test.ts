import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../supabase/migrations/20261024160100_create_rulings.sql', import.meta.url), 'utf8');
describe('rulings migration source contract (not a database isolation test)', () => {
  it('enables RLS and grants only owner select/insert with no anonymous grants', () => {
    expect(sql).toContain('alter table public.rulings enable row level security');
    expect(sql).toContain('revoke all on public.rulings from anon, authenticated');
    expect(sql).toContain('grant select, insert on public.rulings to authenticated');
    expect(sql).toContain('for select to authenticated using (user_id = auth.uid())');
    expect(sql).toContain('for insert to authenticated with check (user_id = auth.uid())');
    expect(sql).not.toMatch(/grant\s+(?:all|update|delete)[^;]*on public\.rulings/i);
    expect(sql).not.toMatch(/create policy[^;]*for (update|delete)/i);
  });
  it('constrains waiver reason, action/kind, occurrence and settings provenance', () => {
    expect(sql).toContain('char_length(reason) <= 500');
    expect(sql).toContain("action <> 'waive' or reason ~ '[^[:space:]]'");
    expect(sql).toContain('constraint ruling_action_kind');
    expect(sql).toContain('constraint ruling_occurrence_identity');
    expect(sql).toContain('settings jsonb not null');
  });
});

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LOCAL_RULINGS_KEY, LocalRulingsStore, SupabaseRulingsStore, mergeRulings } from '../src/lib/rulingsStore.ts';
import type { RulingStorage } from '../src/lib/rulingsStore.ts';
import type { Ruling } from '../supabase/functions/_shared/core/rulings/key.ts';
import { waiver } from './rulings.helpers.ts';

function memoryStorage(): RulingStorage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
}
function accountClient(owner = 'user-A') {
  const rows: (Ruling & { user_id: string })[] = [];
  let insertCalls = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) },
    from: () => ({
      select: () => ({ eq: (_column: string, userId: string) => ({
        order: () => ({ order: () => ({ range: async (from: number, to: number) => ({ data: rows.filter((row) => row.user_id === userId).slice(from, to + 1), error: null }) }) }),
      }) }),
      insert: async (entries: (Ruling & { user_id: string })[]) => { insertCalls++; rows.push(...entries); return { error: null }; },
    }),
  } as unknown as SupabaseClient;
  return { client, rows, insertCalls: () => insertCalls };
}
describe('local ruling storage', () => {
  it('appends and clears explicitly; a malformed log remains untouched on append failure', () => {
    const storage = memoryStorage();
    const store = new LocalRulingsStore(storage);
    expect(store.append(waiver())).toHaveLength(1);
    expect(store.list()[0].id).toBe(waiver().id);
    store.clear(); expect(store.list()).toEqual([]);
    storage.setItem(LOCAL_RULINGS_KEY, 'damaged');
    expect(() => store.append(waiver())).toThrow();
    expect(storage.getItem(LOCAL_RULINGS_KEY)).toBe('damaged');
  });
  it('surfaces quota failure instead of reporting an unsaved ruling as persisted', () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error('Quota exceeded'); };
    expect(() => new LocalRulingsStore(storage).append(waiver())).toThrow('Quota exceeded');
    expect(new LocalRulingsStore(storage).list()).toEqual([]);
  });
  it('does not merge account rows into local persistence automatically', () => {
    const storage = memoryStorage();
    const event = waiver();
    expect(mergeRulings([], [event])).toEqual([event]);
    expect(new LocalRulingsStore(storage).list()).toEqual([]);
    expect(mergeRulings([], [])).toEqual([]);
  });
});
describe('explicit account saves', () => {
  it('retains event id, timestamp, settings, reason and verdict; retry inserts no duplicate', async () => {
    const backend = accountClient();
    const store = new SupabaseRulingsStore(backend.client);
    const event = waiver();
    const original = JSON.stringify(event);
    expect(await store.saveToAccount('user-A', [event])).toEqual([event]);
    await store.saveToAccount('user-A', [event]);
    expect(backend.insertCalls()).toBe(1);
    expect(backend.rows[0]).toEqual({ ...event, user_id: 'user-A' });
    expect(JSON.stringify(event)).toBe(original);
  });
  it('refuses a stale user session and never uploads to the requested foreign owner', async () => {
    const backend = accountClient();
    const store = new SupabaseRulingsStore(backend.client);
    await expect(store.saveToAccount('user-B', [waiver()])).rejects.toThrow('Sign in again');
    expect(backend.insertCalls()).toBe(0);
  });
  it('refuses same-id changed content rather than overwriting the existing account intent', async () => {
    const backend = accountClient();
    const event = waiver();
    backend.rows.push({ ...event, user_id: 'user-A' });
    await expect(new SupabaseRulingsStore(backend.client).saveToAccount('user-A', [{ ...event, reason: 'Changed' }])).rejects.toThrow('same id');
    expect(backend.insertCalls()).toBe(0);
    expect(backend.rows[0].reason).toBe(event.reason);
  });
  it('requests only the current owner rows (RLS must still be verified separately)', async () => {
    const backend = accountClient();
    backend.rows.push({ ...waiver(), user_id: 'user-B' });
    expect(await new SupabaseRulingsStore(backend.client).list('user-A')).toEqual([]);
  });
});

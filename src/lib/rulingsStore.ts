import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ruling } from '@core/rulings/key.ts';
import { parseRuling } from '@core/rulings/key.ts';
import { canonicalJson } from '@core/util/canonicalJson.ts';

export const LOCAL_RULINGS_KEY = 'license-compat-explainer/rulings@1';
export interface RulingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
function parseEntries(values: unknown): Ruling[] {
  if (!Array.isArray(values)) throw new Error('Saved rulings are not a list; original storage was preserved.');
  const entries: Ruling[] = [];
  for (const value of values) {
    const entry = parseRuling(value);
    if (!entry) throw new Error('A saved ruling is invalid; original storage was preserved.');
    entries.push(entry);
  }
  return entries;
}
/** Local persistence succeeds before the caller updates the displayed log. */
export class LocalRulingsStore {
  private storage: RulingStorage;
  constructor(storage: RulingStorage) { this.storage = storage; }
  list(): Ruling[] {
    const raw = this.storage.getItem(LOCAL_RULINGS_KEY);
    return raw === null ? [] : parseEntries(JSON.parse(raw));
  }
  append(entry: Ruling): Ruling[] {
    const valid = parseRuling(entry);
    if (!valid) throw new Error('Cannot save an invalid ruling.');
    const entries = this.list();
    if (entries.some((saved) => saved.id === entry.id)) throw new Error('Ruling id already exists.');
    const next = [...entries, valid];
    this.storage.setItem(LOCAL_RULINGS_KEY, JSON.stringify(next));
    return next;
  }
  clear(): void { this.storage.removeItem(LOCAL_RULINGS_KEY); }
}

/** Account rows are fetched separately and never silently written into the local intent log. */
export class SupabaseRulingsStore {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async list(userId: string): Promise<Ruling[]> {
    // Paginate instead of truncating the replay log to the API's default 1,000-row limit.
    const entries: Ruling[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await this.client.from('rulings').select('*').eq('user_id', userId)
        .order('created_at').order('id').range(offset, offset + 499);
      if (error) throw new Error(error.message);
      const page = parseEntries(data ?? []);
      entries.push(...page);
      if (page.length < 500) return entries;
    }
  }
  async saveToAccount(userId: string, entries: readonly Ruling[]): Promise<Ruling[]> {
    const { data, error } = await this.client.auth.getUser();
    if (error || data.user?.id !== userId) throw new Error('Sign in again before saving rulings.');
    const existing = await this.list(userId);
    const byId = new Map(existing.map((ruling) => [ruling.id, ruling]));
    const pending: Ruling[] = [];
    for (const entry of entries) {
      const valid = parseRuling(entry);
      if (!valid) throw new Error('Cannot upload an invalid ruling.');
      const previous = byId.get(valid.id);
      if (previous && canonicalJson(previous) !== canonicalJson(valid)) {
        throw new Error('An account ruling has the same id with different content. No local intent was overwritten.');
      }
      if (!previous) pending.push(valid);
    }
    for (let i = 0; i < pending.length; i += 100) {
      // Insert-only: preserve event id, timestamp, expression, settings and verdict exactly.
      const { error: insertError } = await this.client.from('rulings')
        .insert(pending.slice(i, i + 100).map((entry) => ({ ...entry, user_id: userId })));
      if (insertError) throw new Error(`Account save incomplete: ${insertError.message}. Local rulings are retained; retry is safe.`);
    }
    return this.list(userId);
  }
}

export function mergeRulings(local: readonly Ruling[], account: readonly Ruling[]): Ruling[] {
  const entries = new Map(account.map((entry) => [entry.id, entry]));
  for (const entry of local) entries.set(entry.id, entry);
  return [...entries.values()];
}

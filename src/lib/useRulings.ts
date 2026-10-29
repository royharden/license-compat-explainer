import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult, Finding } from '@core/types.ts';
import type { Ruling, RulingAction } from '@core/rulings/key.ts';
import { createRuling } from '@core/rulings/key.ts';
import { LocalRulingsStore, SupabaseRulingsStore, mergeRulings } from './rulingsStore.ts';
import { supabase } from './supabase.ts';

export function useRulings(userId: string | null) {
  const initial = useMemo(() => {
    try {
      const store = new LocalRulingsStore(window.localStorage);
      return { store, entries: store.list(), error: '' };
    } catch (cause) {
      return { store: null, entries: [] as Ruling[], error: `Local rulings unavailable: ${cause instanceof Error ? cause.message : 'Storage blocked.'} Use Clear local rulings to explicitly discard damaged data.` };
    }
  }, []);
  const [local, setLocal] = useState(initial.entries);
  const [account, setAccount] = useState<{ userId: string; entries: Ruling[] } | null>(null);
  const [error, setError] = useState(initial.error);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const currentUser = useRef(userId);
  const accountRevision = useRef(0);
  currentUser.current = userId;
  const accountStore = useMemo(() => supabase ? new SupabaseRulingsStore(supabase) : null, []);
  useEffect(() => {
    let active = true;
    const revision = ++accountRevision.current;
    setAccount(null); setMessage('');
    if (!userId || !accountStore) return;
    void accountStore.list(userId).then((entries) => {
      if (active && accountRevision.current === revision) setAccount({ userId, entries });
    }).catch((cause: unknown) => {
      if (active && accountRevision.current === revision) setError(`Account rulings could not be loaded: ${cause instanceof Error ? cause.message : 'Unknown error'}`);
    });
    return () => { active = false; };
  }, [userId, accountStore]);
  const entries = useMemo(() => mergeRulings(local, account && account.userId === userId ? account.entries : []), [local, account, userId]);
  const append = (projectKey: string, finding: Finding, result: AnalysisResult, action: RulingAction, reason: string) => {
    try {
      const entry = createRuling({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), projectKey, finding, result, action, reason });
      // Read again at append to retain events written by another tab.
      const store = new LocalRulingsStore(window.localStorage);
      setLocal(store.append(entry)); setError(''); setMessage('Ruling saved locally. Account upload is explicit.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Local ruling could not be saved.'); }
  };
  const clear = () => {
    try {
      new LocalRulingsStore(window.localStorage).clear(); setLocal([]); setError('');
      setMessage('Local rulings cleared. Saved account rows remain append-only and are shown while signed in.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Local rulings could not be cleared.'); }
  };
  const save = async (projectKey: string) => {
    if (!userId || !accountStore || busy) return;
    const owner = userId;
    // An older automatic read must not replace the explicit save's fresher response.
    const revision = ++accountRevision.current;
    setBusy(true); setError(''); setMessage('');
    try {
      const own = local.filter((entry) => entry.project_key === projectKey.trim());
      const saved = await accountStore.saveToAccount(owner, own);
      if (currentUser.current === owner && accountRevision.current === revision) { setAccount({ userId: owner, entries: saved }); setMessage('This project’s local rulings were saved to your account with their original identities and timestamps.'); }
    } catch (cause) {
      if (currentUser.current === owner && accountRevision.current === revision) setError(cause instanceof Error ? cause.message : 'Account save failed. Local rulings remain.');
    } finally { setBusy(false); }
  };
  return { entries, local, error, message, busy, append, clear, save };
}

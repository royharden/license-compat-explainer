import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

let initialization: Promise<Session | null> | null = null;
async function initializeAuth(): Promise<Session | null> {
  if (!supabase) return null;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const callbackError = url.searchParams.get('error_description') ?? hash.get('error_description')
    ?? url.searchParams.get('error') ?? hash.get('error');
  const code = url.searchParams.get('code');
  if (code || callbackError) {
    for (const key of ['code', 'error', 'error_description', 'error_code']) url.searchParams.delete(key);
    if (callbackError) url.hash = '';
    window.history.replaceState({}, '', url.toString());
  }
  if (callbackError) throw new Error(`Sign-in callback failed: ${callbackError}`);
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(`Sign-in callback failed: ${error.message}. Request a fresh link in this browser.`);
    return data.session;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(Boolean(supabase));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    // Reuse PKCE callback exchange through React StrictMode's mount/unmount cycle.
    initialization ??= initializeAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    void initialization.then((next) => {
      if (active) { setSession(next); setBusy(false); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.'); setBusy(false); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const login = async (email: string) => {
    if (!supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const redirect = new URL(window.location.href);
      redirect.search = ''; redirect.hash = '';
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(), options: { emailRedirectTo: redirect.toString() },
      });
      if (authError) throw authError;
      setMessage('Check your email. Open the magic link in this browser to finish signing in.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send the sign-in link.'); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (!supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
      setSession(null);
      setMessage('Signed out. Local rulings remain on this browser.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  };
  return { session, busy, message, error, login, logout, configured: Boolean(supabase) };
}

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Public anonymous key only. Missing/invalid configuration leaves local analysis available. */
export function createSupabaseClient(url: string, publicKey: string): SupabaseClient | null {
  if (!url.trim() || !publicKey.trim()) return null;
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    return createClient(parsed.toString(), publicKey.trim(), {
      auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
    });
  } catch {
    return null;
  }
}
export const supabase = createSupabaseClient(
  typeof import.meta.env.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL : '',
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '',
);

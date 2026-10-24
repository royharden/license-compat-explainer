// Public build-time configuration (VITE_ variables only; no secret ever lives here).
// With no Supabase configuration the app runs in demo mode (PLAN C§1.3 step 1).

export interface AppEnv {
  supabaseConfigured: boolean;
  explainMode: 'mock' | 'live';
}

export function readEnv(): AppEnv {
  const env = import.meta.env;
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const key = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  return {
    supabaseConfigured: url !== '' && key !== '',
    explainMode: env.VITE_EXPLAIN_MODE === 'live' ? 'live' : 'mock',
  };
}

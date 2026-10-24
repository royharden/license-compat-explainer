import type { AppEnv } from '../lib/env.ts';

export function SetupBanner({ env }: { env: AppEnv }) {
  if (env.supabaseConfigured) return null;
  return (
    <div className="banner" role="status">
      <strong>Demo mode:</strong> analysis runs locally; explanations use rule-table templates (recorded model fixtures
      arrive in a later build); saving rulings needs a configured backend.
    </div>
  );
}

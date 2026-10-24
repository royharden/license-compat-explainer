import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The analysis core lives once in supabase/functions/_shared/core (PLAN §2.2) and is reached via @core.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./supabase/functions/_shared/core', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
});

import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Untrusted strings (licence text, names, descriptions) are rendered only as React text nodes.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Render untrusted text through React text nodes only (PLAN C§2.9).',
        },
      ],
    },
  },
  {
    // Shared core: pure TS, no DOM/Node/Deno APIs, relative .ts imports only (PLAN §2.2).
    files: ['supabase/functions/_shared/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'process', 'Deno', 'require', 'self', 'navigator'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*', 'npm:*', 'jsr:*', 'http://*', 'https://*'], message: 'The shared core has zero runtime dependencies.' },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.{ts,mjs}', '*.config.{ts,js}'],
    languageOptions: { globals: { ...globals.node } },
  },
);

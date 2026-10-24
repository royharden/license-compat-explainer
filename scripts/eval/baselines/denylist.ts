import type { Method } from '../types.ts';
// Deliberately naive string matching: no project/mode/scope/OR/exception interpretation.
export const denylist: Method = {
  name: 'denylist', description: 'Raw GPL/LGPL/AGPL/SSPL/BUSL/Elastic/NC substring denylist; otherwise ok. Ignores context and expression semantics.',
  predict(c) {
    if (c.raw.kind === 'missing' || c.raw.kind === 'invalid' || c.raw.kind === 'lockfile_v1') return { status: 'abstain', verdict: null, reason: 'no_string' };
    const value = c.raw.kind === 'legacy_array' ? c.raw.values.join(' ') : c.raw.value;
    if (!value.trim()) return { status: 'abstain', verdict: null, reason: 'empty_string' };
    return { status: 'ok', verdict: /gpl|sspl|busl|elastic|cc-by-nc/i.test(value) ? 'conflict' : 'ok', reason: 'raw_substring_denylist' };
  },
};

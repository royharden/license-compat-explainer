import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { VERDICTS } from '../../../supabase/functions/_shared/core/types.ts';
import type { Verdict } from '../../../supabase/functions/_shared/core/types.ts';
import type { Method } from '../types.ts';
/** Activation seam, NOT a claimed upstream API. D11 supplies a thin wrapper around an actually
 * installed, exact-version esdecode package after inspecting its exports/statuses/scenarios.
 * Keep bridge source + upstream revision in the final evidence; never infer them from a wiki.
 * This file does not install/import an assumed package name or invent a verified version. */
export interface EsdecodeBridge {
  verification: { package: string; version: string; revision: string; verifiedOn: string; verified: true };
  // Exact upstream enum strings and all observed statuses, verified against the installed package.
  scenarios: { distribute: string; hosted: string; internal: string };
  statuses: Record<string, Verdict>;
  check(input: { dependencyExpression: string; projectLicense: string; scenario: string }): Promise<string> | string;
}
export async function esdecode(bridgePath?: string): Promise<Method> {
  let bridge: EsdecodeBridge | null = null;
  let reason = 'D11: esdecode is absent/unverified; no package version or API has been validated';
  if (bridgePath) {
    try {
      const module = await import(pathToFileURL(resolve(bridgePath)).href) as { bridge?: EsdecodeBridge };
      const b = module.bridge;
      if (!b || b.verification?.verified !== true || !b.verification.package || !b.verification.version || !b.verification.revision
        || !/^\d{4}-\d{2}-\d{2}$/.test(b.verification.verifiedOn) || typeof b.check !== 'function'
        || !['distribute','hosted','internal'].every(k => typeof b.scenarios?.[k as keyof typeof b.scenarios] === 'string' && b.scenarios[k as keyof typeof b.scenarios])
        || !Object.keys(b.statuses ?? {}).length || !Object.values(b.statuses).every(v => VERDICTS.includes(v))) throw new Error('unverified_bridge');
      bridge = b;
    } catch { reason = 'D11: bridge failed to load or lacks exact package/revision/scenario/status verification'; }
  }
  return { name: 'esdecode', description: bridge ? `Verified wrapper metadata: ${JSON.stringify(bridge.verification)}; library always abstains D19` : reason,
    async predict(c) {
      if (c.settings.mode === 'library') return { status: 'abstain', verdict: null, reason: 'D19: library scenario mapping unresolved' };
      if (!bridge) return { status: 'not_run', verdict: null, reason };
      if (c.raw.kind !== 'string') return { status: 'abstain', verdict: null, reason: 'bridge_requires_string' };
      try {
        const status = await bridge.check({ dependencyExpression: c.raw.value, projectLicense: c.settings.projectLicense, scenario: bridge.scenarios[c.settings.mode] });
        const verdict = Object.hasOwn(bridge.statuses, status) ? bridge.statuses[status] : null;
        return verdict ? { status: 'ok', verdict, reason: `upstream_status:${status}` } : { status: 'abstain', verdict: null, reason: `unmapped_status:${status}` };
      } catch { return { status: 'not_run', verdict: null, reason: 'esdecode_execution_failed; inspect bridge before any claim' }; }
    } };
}

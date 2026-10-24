// Test helpers (vitest source; written in Dirty Mode, not yet run — see docs/DEFERRED-VALIDATION.md D1).

import { readFileSync } from 'node:fs';
import type { Inventory, InventoryItem, LeafRef, RuleResult, Settings, Verdict } from '../supabase/functions/_shared/core/types.ts';
import type { RuleId } from '../supabase/functions/_shared/core/rules/ruleIds.ts';

export function fixtureText(relative: string): string {
  return readFileSync(new URL(`../fixtures/${relative}`, import.meta.url), 'utf8');
}

export function fixtureJson<T>(relative: string): T {
  return JSON.parse(fixtureText(relative)) as T;
}

/** Build a lockfile text from a `packages` map. */
export function lockfile(packages: Record<string, unknown>, lockfileVersion = 3, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name: 'fixture-root', version: '1.0.0', lockfileVersion, requires: true, packages, ...extra });
}

export function settings(partial: Partial<Settings> = {}): Settings {
  return {
    projectLicense: 'MIT',
    mode: 'hosted',
    bundled: false,
    acknowledgements: { unmodified_use: false, mpl_secondary_eligible: false },
    ...partial,
  };
}

export function itemByLocation(inventory: Inventory, location: string): InventoryItem {
  const item = inventory.items.find((i) => i.location === location);
  if (!item) throw new Error(`no item at ${location}`);
  return item;
}

/**
 * A rule-independent leaf evaluator for combinator tests: the verdict is looked up by leaf text
 * (falling back to the leaf status), so OR/AND behaviour is tested without the rule table.
 */
export function fakeEvaluator(table: Record<string, Verdict>): (leaf: LeafRef) => RuleResult {
  return (leaf: LeafRef) => {
    const verdict: Verdict = table[leaf.text] ?? (leaf.status === 'supported' ? 'ok' : 'unknown');
    const ruleId: RuleId = verdict === 'unknown' ? 'R-UNKNOWN-UNRESOLVED' : 'R-FALLBACK';
    return { ruleId, verdict, rationale: `fake ${leaf.text}`, obligations: [`ob:${leaf.text}`], assumptions: [], options: [], passages: [], stub: false };
  };
}

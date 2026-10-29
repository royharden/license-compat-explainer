import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { fnv1a32 } from '../supabase/functions/_shared/core/util/fnv1a.ts';
export type Split = 'dev' | 'heldout';
export interface SplitManifest { frozen: string; policy: string; families: Record<string, Split> }
// Entire (project row, dependency column) family stays together, including bundled variants.
export function osadlSplit(row: string, col: string): Split { return fnv1a32(`${row}|${col}`) % 5 < 2 ? 'dev' : 'heldout'; }
export function verifySplit(families: readonly string[], manifest: SplitManifest): void {
  const actual = new Set(families);
  for (const family of actual) if (!['dev','heldout'].includes(manifest.families[family])) throw new Error(`Missing split: ${family}`);
  for (const [family,split] of Object.entries(manifest.families)) {
    if (!actual.has(family) || (split !== 'dev' && split !== 'heldout')) throw new Error(`Invalid split entry: ${family}`);
  }
  if (manifest.frozen !== '2026-10-24') throw new Error('Split freeze changed');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== '--verify') throw new Error('Usage: tsx scripts/split.ts --verify');
  const cases = readFileSync(new URL('../fixtures/cases/verdicts.jsonl', import.meta.url),'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line) as { family: string });
  const manifest = JSON.parse(readFileSync(new URL('../fixtures/cases/SPLIT.json', import.meta.url),'utf8')) as SplitManifest;
  verifySplit(cases.map(c => c.family), manifest);
  console.log(`Split verified: ${cases.length} cases, ${Object.keys(manifest.families).length} families; frozen ${manifest.frozen}`);
}

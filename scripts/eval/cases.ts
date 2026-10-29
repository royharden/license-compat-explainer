import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parsePackageLock } from '../../supabase/functions/_shared/core/inputs/packageLock.ts';
import { analyzeInventory } from '../../supabase/functions/_shared/core/analyze.ts';
import type { Settings, Scope, Verdict } from '../../supabase/functions/_shared/core/types.ts';
import { osadlCases } from './osadlCases.ts';
import { verifySplit } from '../split.ts';
import type { Split, SplitManifest } from '../split.ts';
import type { Case } from './types.ts';
interface AuthorCase { id: string; family: string; origin: 'author'; basis: string; dep_expr: string; project: Settings['projectLicense']; mode: Settings['mode']; bundled: boolean; acknowledgements: Settings['acknowledgements']; scope: Scope; expected: Verdict; rule_ids: string[]; chosen_side?: string | null }
interface Expected { location: string; verdict?: Verdict; ruleIds?: string[]; chosenSide?: string | null; path?: string[]; scope?: Scope; m2?: { verdict: Verdict; ruleIds: string[]; chosenSide?: string | null } }
interface Sidecar { fixture: string; split: Split; settings: Settings; expectedCoverageGaps: number; expected: Expected[]; scenarios?: { name: string; settings: Settings; expected: Expected[] }[] }
export interface TreeCheck { kind: 'tree_coverage'; tree: string; scenario: string; origin: 'author'; split: Split; expectedItems: number; actualItems: number; missing: string[]; extra: string[]; pathOrScopeMismatches: string[]; expectedGaps: number; actualGaps: number }
export function loadCases(root: string, split: Split): { cases: Case[]; treeChecks: TreeCheck[]; inputs: Record<string, string> } {
  const inputs: Record<string, string> = {};
  const read = (path: string) => { const bytes = readFileSync(join(root, path)); inputs[path.replaceAll('\\','/')] = createHash('sha256').update(bytes).digest('hex'); return bytes.toString('utf8'); };
  const authored = read('fixtures/cases/verdicts.jsonl').trim().split(/\r?\n/).map(line => JSON.parse(line) as AuthorCase);
  const manifest = JSON.parse(read('fixtures/cases/SPLIT.json')) as SplitManifest;
  verifySplit(authored.map(c => c.family), manifest);
  if (new Set(authored.map(c => c.id)).size !== authored.length || authored.some(c => c.origin !== 'author' || !c.basis)) throw new Error('Invalid author provenance/ids');
  const cases: Case[] = authored.filter(c => manifest.families[c.family] === split).map(c => ({
    id: `author:${c.id}`, family: `author:${c.family}`, origin: 'author', basis: c.basis, split, source: 'case', raw: { kind: 'string', value: c.dep_expr }, scope: c.scope,
    settings: { projectLicense: c.project, mode: c.mode, bundled: c.bundled, acknowledgements: c.acknowledgements }, expected: [c.expected], expectedRuleIds: c.rule_ids,
    ...(c.chosen_side !== undefined ? { expectedChosenSide: c.chosen_side } : {}),
  }));
  for (const c of osadlCases(read('data/osadl/matrix.csv')).filter(c => c.split === split)) cases.push({ ...c,
    id: c.id, family: `osadl:${c.family}`, raw: { kind: 'string', value: c.dep_expr }, source: 'osadl' });
  const treeChecks: TreeCheck[] = [];
  const devTrees = new Set(readdirSync(join(root, 'fixtures/trees/dev')).filter(n => n.endsWith('.expected.json')));
  if (readdirSync(join(root, 'fixtures/trees/heldout')).some(n => devTrees.has(n))) throw new Error('A tree family exists in both splits');
  // Directory is the frozen tree-family split; primary + every settings scenario stay together.
  const directory = `fixtures/trees/${split}`;
  for (const name of readdirSync(join(root, directory)).filter(n => n.endsWith('.expected.json')).sort()) {
    const side = JSON.parse(read(`${directory}/${name}`)) as Sidecar;
    if (side.split !== split || !side.fixture || side.fixture.includes('/') || side.fixture.includes('\\') || side.fixture.includes('..')) throw new Error('Invalid tree split/path');
    const parsed = parsePackageLock(read(`${directory}/${side.fixture}`));
    if (!parsed.ok) throw new Error(`Tree parse failure: ${name}: ${parsed.error.message}`);
    const scenarios = [{ name: 'primary', settings: side.settings, expected: side.expected }, ...(side.scenarios ?? [])];
    for (const scenario of scenarios) {
      const analysis = analyzeInventory(parsed.inventory, scenario.settings);
      const wanted = new Set(scenario.expected.map(e => e.location));
      if (wanted.size !== scenario.expected.length) throw new Error(`Duplicate expected location: ${name}`);
      const check: TreeCheck = { kind: 'tree_coverage', tree: name, scenario: scenario.name, origin: 'author', split,
        expectedItems: wanted.size, actualItems: parsed.inventory.items.length, missing: [], extra: parsed.inventory.items.filter(i => !wanted.has(i.location ?? '')).map(i => i.location ?? i.occurrence),
        pathOrScopeMismatches: [], expectedGaps: side.expectedCoverageGaps, actualGaps: analysis.coverageGaps.length };
      for (const expected of scenario.expected) {
        const e = expected.m2 ?? expected;
        if (!e.verdict || !e.ruleIds) throw new Error(`Missing M2 tree expectation: ${name}`);
        const item = parsed.inventory.items.find(i => i.location === expected.location);
        if (!item) check.missing.push(expected.location);
        if (item && ((expected.path !== undefined && JSON.stringify(item.path) !== JSON.stringify(expected.path)) || (expected.scope !== undefined && item.scope !== expected.scope))) check.pathOrScopeMismatches.push(expected.location);
        cases.push({ id: `tree:${name}:${scenario.name}:${expected.location}`, family: `tree:${name}`, origin: 'author', basis: 'Synthetic authored M2 tree sidecar; not an independent legal oracle', source: 'tree', split,
          raw: item?.licence ?? { kind: 'missing' }, settings: scenario.settings, scope: item?.scope ?? expected.scope ?? 'unknown', missing: !item,
          expected: [e.verdict], expectedRuleIds: e.ruleIds, expectedChosenSide: e.chosenSide ?? null });
      }
      treeChecks.push(check);
    }
  }
  if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Duplicate evaluation case id');
  return { cases, treeChecks, inputs };
}

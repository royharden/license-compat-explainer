import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parsePackageLock } from '../supabase/functions/_shared/core/inputs/packageLock.ts';
import { analyzeInventory, expressionFor } from '../supabase/functions/_shared/core/analyze.ts';
import { normaliseString } from '../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { evaluateExpression } from '../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../supabase/functions/_shared/core/rules/engine.ts';
import { verifySplit } from '../scripts/split.ts';
import type { SplitManifest } from '../scripts/split.ts';
import type { Scope, Settings, Verdict } from '../supabase/functions/_shared/core/types.ts';
import { fixtureJson, fixtureText } from './helpers.ts';
interface Expected { location: string; name?: string; version?: string; scope?: Scope; path?: string[]; verdict: Verdict; ruleIds: string[]; chosenSide?: string }
interface Sidecar { fixture: string; split: 'dev'|'heldout'; settings: Settings; expectedCoverageGaps: number; expected: Expected[]; scenarios?: {name:string;settings:Settings;expected:Expected[]}[] }
interface VerdictCase { id:string; family:string; origin:'author'; basis:string; dep_expr:string; project:Settings['projectLicense']; mode:Settings['mode']; bundled:boolean; scope:Scope; acknowledgements:Settings['acknowledgements']; expected:Verdict; rule_ids:string[] }
const cases=fixtureText('cases/verdicts.jsonl').trim().split(/\r?\n/).map(line=>JSON.parse(line) as VerdictCase);
const split=fixtureJson<SplitManifest>('cases/SPLIT.json');
describe('authored families and dev golden cases', () => {
  it('at least 60 author cases have a basis, unique id and frozen exhaustive split', () => {
    expect(cases.length).toBeGreaterThanOrEqual(60);
    expect(new Set(cases.map(c=>c.id)).size).toBe(cases.length);
    verifySplit(cases.map(c=>c.family),split);
    for (const c of cases) { expect(c.origin).toBe('author'); expect(c.basis.length).toBeGreaterThan(0); }
  });
  for (const c of cases.filter(c=>split.families[c.family]==='dev')) {
    it(`dev author case ${c.id}`, () => {
      const settings:Settings={projectLicense:c.project,mode:c.mode,bundled:c.bundled,acknowledgements:c.acknowledgements};
      const r=evaluateExpression(expressionFor(normaliseString(c.dep_expr)),{settings,scope:c.scope},evaluateLeaf);
      expect(r.verdict).toBe(c.expected);
      expect(r.ruleIds).toEqual(c.rule_ids);
    });
  }
});
describe('remaining dev trees: complete sidecar equality and planted traps', () => {
  for (const name of ['distributed-mit-bundle','gpl3-library']) {
    const side=fixtureJson<Sidecar>(`trees/dev/${name}.expected.json`);
    const scenarios=[{name:'primary',settings:side.settings,expected:side.expected},...(side.scenarios??[])];
    for (const scenario of scenarios) {
      it(`${name}: ${scenario.name} — exact settings, every path/row verdict and chosen side`, () => {
        const parsed=parsePackageLock(fixtureText(`trees/dev/${side.fixture}`));
        if (!parsed.ok) throw new Error(parsed.error.message);
        const result=analyzeInventory(parsed.inventory,scenario.settings);
        expect(result.settings).toEqual(scenario.settings);
        expect(result.coverageGaps).toHaveLength(side.expectedCoverageGaps);
        expect(result.findings).toHaveLength(scenario.expected.length);
        for (const e of scenario.expected) {
          const f=result.findings.find(f=>f.location===e.location);
          expect(f,e.location).toBeDefined();
          expect(f,e.location).toMatchObject({ verdict:e.verdict,ruleIds:e.ruleIds });
          if (e.name !== undefined) expect(f?.name).toBe(e.name);
          if (e.version !== undefined) expect(f?.version).toBe(e.version);
          if (e.scope !== undefined) expect(f?.scope).toBe(e.scope);
          if (e.path !== undefined) expect(f?.path).toEqual(e.path);
          if (e.chosenSide !== undefined) expect(f?.chosenSide).toBe(e.chosenSide);
        }
      });
    }
  }
  it('injection description leaves verdict unchanged, injection licence stays unknown', () => {
    const fixture=fixtureJson<{licenceString:string;description:string}>('injection/verdicts.json');
    const clean={lockfileVersion:3,packages:{'':{dependencies:{dep:'1'}},'node_modules/dep':{version:'1',license:'MIT'}}};
    const dirty={...clean,packages:{...clean.packages,'node_modules/dep':{...clean.packages['node_modules/dep'],description:fixture.description}}};
    const settings=fixtureJson<Sidecar>('trees/dev/distributed-mit-bundle.expected.json').settings;
    const parse=(x:unknown)=>{const r=parsePackageLock(JSON.stringify(x));if(!r.ok)throw new Error(r.error.message);return analyzeInventory(r.inventory,settings);};
    expect(parse(dirty)).toEqual(parse(clean));
    const n=normaliseString(fixture.licenceString);
    expect(n.text).toBeNull();
    expect(evaluateExpression(expressionFor(n),{settings,scope:'runtime'},evaluateLeaf).verdict).toBe('unknown');
  });
});
describe('heldout trees: data parsing only (never analyze or score)', () => {
  const dir=new URL('../fixtures/trees/heldout/',import.meta.url);
  const names=readdirSync(dir).filter(name=>name.endsWith('.expected.json'));
  it('has three synthetically authored heldout sidecars with complete settings', () => {
    expect(names).toHaveLength(3);
    for (const name of names) {
      const side=JSON.parse(readFileSync(new URL(name,dir),'utf8')) as Sidecar;
      expect(side.split).toBe('heldout');
      expect(side.settings.projectLicense).toBeTypeOf('string');
      expect(side.settings.mode).toBeTypeOf('string');
      expect(side.settings.bundled).toBeTypeOf('boolean');
      expect(side.settings.acknowledgements.unmodified_use).toBeTypeOf('boolean');
      expect(side.settings.acknowledgements.mpl_secondary_eligible).toBeTypeOf('boolean');
      expect(side.expected.length).toBeGreaterThan(0);
      expect(()=>JSON.parse(readFileSync(new URL(side.fixture,dir),'utf8'))).not.toThrow();
    }
  });
});

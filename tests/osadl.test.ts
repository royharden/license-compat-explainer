import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { osadlCases, parseOsadl, acceptableOracleVerdicts } from '../scripts/eval/osadlCases.ts';
import { expressionFor } from '../supabase/functions/_shared/core/analyze.ts';
import { normaliseString } from '../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { evaluateExpression } from '../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { evaluateLeaf } from '../supabase/functions/_shared/core/rules/engine.ts';
const raw=readFileSync(new URL('../data/osadl/matrix.csv',import.meta.url),'utf8');
describe('OSADL direction, independent labels and documented disagreements', () => {
  it('direction sentinels: GPL3 project/Apache dependency Yes, MIT project/GPL3 dependency No', () => {
    const m=parseOsadl(raw);
    expect(m.rows.get('GPL-3.0-only')?.[m.header.indexOf('Apache-2.0')]).toBe('Yes');
    expect(m.rows.get('MIT')?.[m.header.indexOf('GPL-3.0-only')]).toBe('No');
  });
  it('maps every oracle status conservatively, including undefined', () => {
    for (const x of ['Yes','Same']) expect(acceptableOracleVerdicts(x)).toEqual(['ok','ok_with_conditions']);
    expect(acceptableOracleVerdicts('No')).toEqual(['conflict']);
    for (const x of ['Unknown','Check dependency','unexpected',undefined]) expect(acceptableOracleVerdicts(x)).toEqual(['needs_review']);
  });
  it('every covered distribute pair agrees or has a narrow non-stale documented exception (both acknowledgements true)', () => {
    const doc=readFileSync(new URL('../docs/OSADL-DISAGREEMENTS.md',import.meta.url),'utf8');
    const exceptions=new Map<string,{oracle:string;engine:string;reason:string}>();
    for (const line of doc.split(/\r?\n/)) {
      if (!line.startsWith('| ') || line.startsWith('| Project ')) continue;
      const fields=line.split('|').slice(1,-1).map(s=>s.trim());
      expect(fields).toHaveLength(6);
      const [project,dep,bundled,oracle,engine,reason]=fields;
      const key=`${project}|${dep}|${bundled}`;
      expect(exceptions.has(key)).toBe(false);
      expect(reason.length).toBeGreaterThan(20);
      exceptions.set(key,{oracle,engine,reason});
    }
    const used=new Set<string>();
    const cases=osadlCases(raw);
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      const r=evaluateExpression(expressionFor(normaliseString(c.dep_expr)),{settings:c.settings,scope:c.scope},evaluateLeaf);
      const key=`${c.settings.projectLicense}|${c.dep_expr}|${c.settings.bundled}`;
      const exception=exceptions.get(key);
      if (exception) {
        used.add(key);
        expect(c.expected.includes(r.verdict),`${key}: stale exception`).toBe(false);
        expect(exception.oracle,key).toBe(c.oracle);
        expect(exception.engine,key).toBe(r.verdict);
      } else expect(c.expected,`${key} (${c.oracle}) undocumented mismatch`).toContain(r.verdict);
      if (c.oracle==='Same') expect(c.dep_expr).toBe(c.settings.projectLicense);
    }
    expect([...used].sort()).toEqual([...exceptions.keys()].sort());
  });
  it('keeps authored labels separate and OSADL family splits together across bundled contexts', () => {
    const cases=osadlCases(raw);
    for (const c of cases) { expect(c.origin).toBe('osadl'); expect(c.basis).toContain('OSADL'); }
    const families=new Map<string,Set<string>>();
    for (const c of cases) { const v=families.get(c.family) ?? new Set(); v.add(c.split); families.set(c.family,v); }
    for (const splits of families.values()) expect(splits.size).toBe(1);
  });
});

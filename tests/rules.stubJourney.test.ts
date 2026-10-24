// Demo journey step 4 on the dev tree with the M1 stub rules (PLAN §12 M1 g), plus stub-ladder checks.
import { describe, expect, it } from 'vitest';
import { parsePackageLock } from '../supabase/functions/_shared/core/inputs/packageLock.ts';
import { analyzeInventory } from '../supabase/functions/_shared/core/analyze.ts';
import { evaluateLeaf } from '../supabase/functions/_shared/core/rules/engine.ts';
import { RULES_ARE_STUB, RULES_EDITION, RULE_ROWS } from '../supabase/functions/_shared/core/rules/ruleTable.ts';
import { STUB_RULE_IDS } from '../supabase/functions/_shared/core/rules/ruleIds.ts';
import { LADDER } from '../supabase/functions/_shared/core/rules/ladder.ts';
import { normaliseString } from '../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { templateExplanation } from '../supabase/functions/_shared/core/explain/template.ts';
import { buildJsonExport } from '../supabase/functions/_shared/core/report/json.ts';
import { DISCLAIMER } from '../supabase/functions/_shared/core/explain/disclaimer.ts';
import { settingsHash } from '../supabase/functions/_shared/core/settings.ts';
import type { AnalysisResult, Finding, LeafRef, Settings, Verdict } from '../supabase/functions/_shared/core/types.ts';
import { fixtureJson, fixtureText, settings } from './helpers.ts';

interface ExpectedFinding {
  location: string;
  name: string;
  version: string;
  scope: string;
  path: string[];
  m1: { verdict: Verdict; ruleIds: string[]; chosenSide?: string; reason?: string };
  m2: { verdict: Verdict; ruleIds: string[]; changesInM2: boolean };
}

interface Sidecar {
  settings: Settings;
  expectedCoverageGaps: number;
  expectedCounts: { m1: Record<Verdict, number>; m2: Record<Verdict, number> };
  expected: ExpectedFinding[];
}

const sidecar = fixtureJson<Sidecar>('trees/dev/hosted-mit-service.expected.json');

function analyzeFixture(name: string, s: Settings = sidecar.settings): AnalysisResult {
  const parsed = parsePackageLock(fixtureText(`trees/dev/${name}`));
  if (!parsed.ok) throw new Error(parsed.error.message);
  return analyzeInventory(parsed.inventory, s);
}

function at(result: AnalysisResult, location: string): Finding {
  const f = result.findings.find((x) => x.location === location);
  if (!f) throw new Error(`no finding at ${location}`);
  return f;
}

const result = analyzeFixture('hosted-mit-service.package-lock.json');

describe('dev tree hosted-mit-service under the M1 stub (demo journey step 4)', () => {
  it('rules edition is the M1 stub', () => {
    expect(RULES_EDITION).toContain('m1-stub');
    expect(RULES_ARE_STUB).toBe(true);
    expect(result.rulesEdition).toBe(RULES_EDITION);
  });

  it('transitive AGPL is conflict R-NET-HOSTED with path root > web-kit > chart-core > agpl-plot', () => {
    const f = at(result, 'node_modules/agpl-plot');
    expect(f.verdict).toBe('conflict');
    expect(f.ruleIds).toEqual(['R-NET-HOSTED']);
    expect(f.path).toEqual(['root', 'web-kit', 'chart-core', 'agpl-plot']);
  });

  it('MIT OR GPL-3.0-only is ok with MIT chosen', () => {
    const f = at(result, 'node_modules/dual-lib');
    expect(f.verdict).toBe('ok');
    expect(f.chosenSide).toBe('MIT');
    expect(f.ruleIds).toEqual(['R-PERM-HOSTED']);
  });

  it('dev-only GPL linter is ok R-DEV-NOT-SHIPPED', () => {
    const f = at(result, 'node_modules/gpl-lint');
    expect(f.scope).toBe('dev');
    expect(f.verdict).toBe('ok');
    expect(f.ruleIds).toEqual(['R-DEV-NOT-SHIPPED']);
  });

  it('GPL runtime dependency is ok R-STRONG-HOSTED (hosting is not distribution)', () => {
    const f = at(result, 'node_modules/gpl-runtime');
    expect(f.verdict).toBe('ok');
    expect(f.ruleIds).toEqual(['R-STRONG-HOSTED']);
  });

  it('UNLICENSED and missing licences are unknown and counted', () => {
    expect(at(result, 'node_modules/closed-thing')).toMatchObject({ verdict: 'unknown', reason: 'unlicensed', ruleIds: ['R-UNKNOWN-UNRESOLVED'] });
    expect(at(result, 'node_modules/mystery-pkg')).toMatchObject({ verdict: 'unknown', reason: 'missing', ruleIds: ['R-UNKNOWN-UNRESOLVED'] });
    expect(result.counts.unknown).toBe(2);
  });

  it('SSPL-1.0 is needs_review R-SA-REVIEW', () => {
    expect(at(result, 'node_modules/sspl-db')).toMatchObject({ verdict: 'needs_review', ruleIds: ['R-SA-REVIEW'] });
  });

  it('MPL-2.0 in hosted mode falls to the stub R-FALLBACK (changes to R-WEAK-HOSTED in M2)', () => {
    const f = at(result, 'node_modules/mpl-widget');
    expect(f).toMatchObject({ verdict: 'needs_review', ruleIds: ['R-FALLBACK'], stubRule: true });
    expect(result.fallbackCount).toBe(1);
  });

  it('every finding equals the sidecar m1 expectation, and counts match', () => {
    expect(result.findings).toHaveLength(sidecar.expected.length);
    for (const e of sidecar.expected) {
      const f = at(result, e.location);
      expect(f.name, e.location).toBe(e.name);
      expect(f.version, e.location).toBe(e.version);
      expect(f.scope, e.location).toBe(e.scope);
      expect(f.path, e.location).toEqual(e.path);
      expect(f.verdict, e.location).toBe(e.m1.verdict);
      expect(f.ruleIds, e.location).toEqual(e.m1.ruleIds);
      if (e.m1.chosenSide !== undefined) expect(f.chosenSide, e.location).toBe(e.m1.chosenSide);
      if (e.m1.reason !== undefined) expect(f.reason, e.location).toBe(e.m1.reason);
    }
    expect(result.counts).toEqual(sidecar.expectedCounts.m1);
    expect(result.coverageGaps).toHaveLength(sidecar.expectedCoverageGaps);
  });

  it('the injection description leaves the verdict unchanged and never appears in findings', () => {
    expect(at(result, 'node_modules/notes-helper').verdict).toBe('ok');
    expect(JSON.stringify(result)).not.toMatch(/ignore the rules/i);
  });

  it('nested duplicate tiny-color versions are separate findings', () => {
    expect(at(result, 'node_modules/tiny-color').version).toBe('1.0.0');
    expect(at(result, 'node_modules/web-kit/node_modules/tiny-color').version).toBe('2.0.0');
  });

  it('switching to internal makes the AGPL finding ok R-INTERNAL-ANY (journey step 7 preview)', () => {
    const internal = analyzeFixture('hosted-mit-service.package-lock.json', { ...sidecar.settings, mode: 'internal' });
    expect(at(internal, 'node_modules/agpl-plot')).toMatchObject({ verdict: 'ok', ruleIds: ['R-INTERNAL-ANY'] });
    expect(at(internal, 'node_modules/sspl-db').verdict).toBe('needs_review');
    expect(internal.settingsHash).not.toBe(result.settingsHash);
  });

  it('bundled = yes removes the dev exemption (the linter is no longer R-DEV-NOT-SHIPPED)', () => {
    const bundled = analyzeFixture('hosted-mit-service.package-lock.json', { ...sidecar.settings, bundled: true });
    expect(at(bundled, 'node_modules/gpl-lint').ruleIds).toEqual(['R-STRONG-HOSTED']);
  });
});

describe('v2 fixture (journey step 8)', () => {
  const v2 = analyzeFixture('hosted-mit-service.v2.package-lock.json');

  it('has the same packages, versions and locations', () => {
    const key = (r: AnalysisResult) => r.findings.map((f) => `${f.location}|${f.name}@${f.version}`);
    expect(key(v2)).toEqual(key(result));
  });

  it('exactly one licence changed, so exactly one expr_hash differs', () => {
    const changed = v2.findings.filter((f) => f.exprHash !== at(result, f.location ?? '').exprHash);
    expect(changed.map((f) => f.location)).toEqual(['node_modules/sspl-db']);
    expect(changed[0]).toMatchObject({ exprNormalised: 'Elastic-2.0', verdict: 'needs_review', ruleIds: ['R-SA-REVIEW'] });
  });
});

describe('stub ladder', () => {
  const leaf = (s: string): LeafRef => {
    const n = normaliseString(s);
    if (!n.expr || n.expr.type !== 'leaf') throw new Error('expected single leaf');
    return n.expr.leaf;
  };

  it('every ladder rule id and R-FALLBACK has a row; rows exist only for the stub ids', () => {
    for (const step of LADDER) expect(RULE_ROWS.has(step.ruleId), step.ruleId).toBe(true);
    expect([...RULE_ROWS.keys()].sort()).toEqual([...STUB_RULE_IDS].sort());
  });

  it('exception leaves stop at the stub guard before dev/internal/hosted rules', () => {
    const r = evaluateLeaf(leaf('GPL-2.0-only WITH Classpath-exception-2.0'), { settings: settings({ mode: 'internal' }), scope: 'runtime' });
    expect(r.ruleId).toBe('R-FALLBACK');
  });

  it('restricted licences are needs_review even as dev dependencies and in internal mode', () => {
    for (const id of ['SSPL-1.0', 'BUSL-1.1', 'Elastic-2.0', 'CC-BY-NC-4.0']) {
      expect(evaluateLeaf(leaf(id), { settings: settings({ mode: 'internal' }), scope: 'dev' }).ruleId).toBe('R-SA-REVIEW');
    }
  });

  it('unknown scope never takes the dev exemption', () => {
    expect(evaluateLeaf(leaf('GPL-3.0-only'), { settings: settings({ mode: 'distribute' }), scope: 'unknown' }).ruleId).toBe('R-FALLBACK');
  });

  it('hosted network copyleft into AGPL or GPL-3.0 projects is left to M2 (fallback, not conflict)', () => {
    for (const projectLicense of ['AGPL-3.0-only', 'GPL-3.0-only'] as const) {
      expect(evaluateLeaf(leaf('AGPL-3.0-only'), { settings: settings({ projectLicense }), scope: 'runtime' }).ruleId).toBe('R-FALLBACK');
    }
  });

  it('unsupported licences are unknown R-UNKNOWN-UNSUPPORTED', () => {
    expect(evaluateLeaf(leaf('WTFPL'), { settings: settings(), scope: 'runtime' })).toMatchObject({ ruleId: 'R-UNKNOWN-UNSUPPORTED', verdict: 'unknown' });
  });
});

describe('template explanation and JSON export', () => {
  it('template explanation is labelled template and built from rule-table text', () => {
    const t = templateExplanation(at(result, 'node_modules/agpl-plot'));
    expect(t.label).toBe('template');
    expect(t.sections[0].ruleId).toBe('R-NET-HOSTED');
    expect(t.sections[0].rationale).toBe(RULE_ROWS.get('R-NET-HOSTED')?.rationale);
    expect(t.disclaimer).toBe(DISCLAIMER);
  });

  it('JSON export carries settings with acknowledgements, the stub flag, labels and the disclaimer', () => {
    const doc = buildJsonExport(result, '2026-10-24T00:00:00.000Z');
    expect(doc.settings.acknowledgements).toEqual({ unmodified_use: false, mpl_secondary_eligible: false });
    expect(doc.acknowledgementsLabel).toBe('user-asserted, not verified from source');
    expect(doc.rulesStub).toBe(true);
    expect(doc.disclaimer).toBe(DISCLAIMER);
    expect(doc.findings.every((f) => f.explanation.label === 'template')).toBe(true);
    expect(doc.settingsHash).toBe(settingsHash(sidecar.settings));
  });
});

import { describe, it, expect } from 'vitest';
import { buildExplainRequest, deriveFacts, normalizedExpression, factBlock } from '../supabase/functions/_shared/core/explain/factBlock.ts';
import { requestFor, RUN_ID, REQUEST_ID } from './explain.helpers.ts';
import { csvResult } from './rulings.helpers.ts';
import { settings } from './helpers.ts';
describe('M4 normalized private request and server rederivation', () => {
  it('transmits only enumerated facts, no package name/path/raw string or client passages', () => {
    const result = csvResult('Name,Version,License\nsecret-name,private-version,GPLv3', settings({ mode: 'distribute', bundled: true }));
    const request = buildExplainRequest(result.findings[0], result.settings, result.rulesEdition, REQUEST_ID, RUN_ID);
    expect(request).not.toBeNull();
    for (const raw of ['secret-name','private-version','GPLv3','rawLicence','passages','location']) expect(JSON.stringify(request)).not.toContain(raw);
    expect(Object.keys(request!)).toEqual(['request_id','run_id','dep_ref','expr','project','mode','bundled','scope','acknowledgements','claimed','rules_edition']);
  });
  it.each(['UNLICENSED','SEE LICENSE IN secret-file','NASA-1.3','MIT OR secret-name','LicenseRef-Private','GPL','Apache 2','MIT/GPL-3.0-only'])('rejects unresolved/foreign/noncanonical expr %s locally and on server', expr => {
    expect(normalizedExpression(expr)).toBeNull(); expect(deriveFacts({ ...requestFor(), expr })).toBeNull();
    const result = csvResult(`Name,Version,License\nprivate-package,1,${expr}`);
    if (['UNLICENSED','SEE LICENSE IN secret-file','NASA-1.3','MIT OR secret-name','LicenseRef-Private','GPL'].includes(expr))
      expect(buildExplainRequest(result.findings[0], result.settings, result.rulesEdition, REQUEST_ID, RUN_ID)).toBeNull();
  });
  it('rejects extra client passages/package keys and extra acknowledgement/claim keys', () => {
    const r = requestFor();
    for (const value of [{ ...r, passages: [] }, { ...r, package: 'leak' }, { ...r, acknowledgements: { ...r.acknowledgements, raw: 'leak' } },
      { ...r, claimed: { ...r.claimed, text: 'leak' } }]) expect(deriveFacts(value)).toBeNull();
  });
  it('rejects forged verdict, rule IDs, chosen OR side and stale rule edition as facts_mismatch', () => {
    const r = requestFor('MIT OR GPL-3.0-only'); expect(r.claimed.chosen_side).toBe('MIT');
    for (const value of [{ ...r, claimed: { ...r.claimed, verdict: 'conflict' } }, { ...r, claimed: { ...r.claimed, rule_ids: ['R-DIST-STRONG'] } },
      { ...r, claimed: { ...r.claimed, chosen_side: 'GPL-3.0-only' } }, { ...r, rules_edition: 'stale' }]) expect(deriveFacts(value)).toBeNull();
  });
  it('rederives settings, acknowledgements, scope, AND and expanded OR choices', () => {
    const r = requestFor('GPL-2.0-or-later'); const f = deriveFacts(r)!;
    expect(f.evaluation.chosenSide).toBe('GPL-2.0-only'); expect(f.evaluation.ruleIds).toEqual(r.claimed.rule_ids);
    expect(deriveFacts(requestFor('MIT AND GPL-3.0-only'))?.evaluation.verdict).toBe('conflict');
    expect(factBlock(f)).not.toHaveProperty('request_id'); expect(factBlock(f)).not.toHaveProperty('run_id');
    expect(deriveFacts({ ...r, mode: 'internal' })).toBeNull();
    expect(deriveFacts({ ...r, scope: 'prod' })).toBeNull();
  });
});

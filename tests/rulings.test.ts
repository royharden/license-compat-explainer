import { describe, expect, it } from 'vitest';
import { analyzeInventory } from '../supabase/functions/_shared/core/analyze.ts';
import { parsePackageLock } from '../supabase/functions/_shared/core/inputs/packageLock.ts';
import { parseInventoryCsv } from '../supabase/functions/_shared/core/inputs/inventoryCsv.ts';
import { createRuling, parseRuling, rulingKey, validateReason } from '../supabase/functions/_shared/core/rulings/key.ts';
import { replayRulings } from '../supabase/functions/_shared/core/rulings/replay.ts';
import { fixtureText, settings } from './helpers.ts';
import { csvResult, waiver } from './rulings.helpers.ts';

describe('ruling identity and replay', () => {
  it('maps the synthetic pip-licenses sample, quoting and duplicate ordinals without inventing paths', () => {
    const parsed = parseInventoryCsv(fixtureText('csv/pip-licenses-sample.csv'));
    if (!parsed.ok) throw new Error(parsed.error.message);
    expect(parsed.inventory.items).toHaveLength(9);
    expect(parsed.inventory.items.find((item) => item.name === 'demo,quoted')?.licence).toEqual({ kind: 'string', value: 'Apache License, Version 2.0' });
    expect(parsed.inventory.items.filter((item) => item.name === 'demo-duplicate').map((item) => item.occurrence))
      .toEqual(['csv:demo-duplicate@1.0.0#1', 'csv:demo-duplicate@1.0.0#2']);
    expect(parsed.inventory.items.every((item) => item.path === null && item.pathNote === 'path unavailable (CSV input)')).toBe(true);
  });
  it('keeps engine verdict unchanged while applying a licence_waiver on unchanged rerun', () => {
    const first = csvResult();
    const event = waiver(first);
    const rerun = csvResult();
    const original = JSON.stringify(rerun);
    expect(replayRulings([event], 'project-A', rerun)[0].status).toBe('applicable');
    expect(event.kind).toBe('licence_waiver');
    expect(rerun.findings[0].verdict).toBe('needs_review');
    expect(JSON.stringify(rerun)).toBe(original);
  });
  it('selects latest timestamp, then id, independently of array arrival order', () => {
    const result = csvResult();
    const early = waiver(result, '00000000-0000-4000-8000-000000000099');
    const later = waiver(result, '00000000-0000-4000-8000-000000000001', '2026-10-24T13:00:00.000Z');
    const tie = { ...later, id: '00000000-0000-4000-8000-000000000002', action: 'follow-up' as const, kind: 'follow_up' as const };
    expect(replayRulings([tie, early, later], 'project-A', result)[0].ruling.id).toBe(tie.id);
  });
  it('keeps projects separate with unambiguous tuple keys', () => {
    expect(replayRulings([waiver()], 'project-B', csvResult())).toEqual([]);
    expect(rulingKey('a|b', 'c')).not.toBe(rulingKey('a', 'b|c'));
  });
  it('retains CSV occurrence when expression changes and marks ruling stale', () => {
    const result = csvResult('Name,Version,License\na,1,MIT');
    const next = csvResult('Name,Version,License\na,1,GPL-3.0-only');
    expect(result.findings[0].occurrence).toBe('csv:a@1#1');
    expect(next.findings[0].occurrence).toBe(result.findings[0].occurrence);
    expect(replayRulings([waiver(result)], 'project-A', next)[0].status).toBe('stale');
  });
  it('moves source rows on CSV reorder without moving a waiver to another package', () => {
    const original = csvResult();
    const reordered = csvResult('Name,Version,License\nb,1,MIT\na,1,SSPL-1.0');
    const overlay = replayRulings([waiver(original)], 'project-A', reordered)[0];
    expect(overlay.occurrence).toBe('csv:a@1#1');
    expect(overlay.status).toBe('applicable');
    expect(reordered.findings.find((finding) => finding.occurrence === overlay.occurrence)?.sourceRow).toBe(3);
  });
  it('uses ordinals among same name/version; swapping distinct expressions makes both stale', () => {
    const before = csvResult('Name,Version,License\na,1,MIT\nb,1,MIT\na,1,GPL-3.0-only');
    const after = csvResult('Name,Version,License\na,1,GPL-3.0-only\na,1,MIT\nb,1,MIT');
    const event = waiver(before);
    expect(before.findings[2].occurrence).toBe('csv:a@1#2');
    expect(replayRulings([event], 'project-A', after)[0].status).toBe('stale');
  });
  it('shows settings and acknowledgement diffs without applying until append reconfirmation', () => {
    const before = csvResult();
    const event = waiver(before);
    const after = csvResult(undefined, settings({ mode: 'internal', acknowledgements: { unmodified_use: true, mpl_secondary_eligible: true } }));
    const overlay = replayRulings([event], 'project-A', after)[0];
    expect(overlay.status).toBe('different_settings');
    expect(overlay.differences.join(' ')).toContain('mode: hosted → internal');
    expect(overlay.differences.join(' ')).toContain('unmodified_use');
    const confirmed = waiver(after, '00000000-0000-4000-8000-000000000002', '2026-10-24T14:00:00.000Z');
    expect(replayRulings([event, confirmed], 'project-A', after)[0].status).toBe('applicable');
    expect(event.settings.mode).toBe('hosted');
  });
  it('treats rules edition changes as different settings and expression changes as stale first', () => {
    const result = csvResult();
    const event = waiver(result);
    const changed = { ...result, rulesEdition: 'future-edition' };
    expect(replayRulings([event], 'project-A', changed)[0].status).toBe('different_settings');
    changed.findings = [{ ...result.findings[0], exprHash: 'a'.repeat(64) }];
    expect(replayRulings([event], 'project-A', changed)[0].status).toBe('stale');
  });
  it('demo v2 fixture makes the sspl-db ruling stale rather than orphaning it', () => {
    const parse = (file: string) => {
      const input = parsePackageLock(fixtureText(`trees/dev/${file}.package-lock.json`));
      if (!input.ok) throw new Error(input.error.message);
      return analyzeInventory(input.inventory, settings());
    };
    const first = parse('hosted-mit-service');
    const changed = parse('hosted-mit-service.v2');
    const finding = first.findings.find((item) => item.name === 'sspl-db');
    if (!finding) throw new Error('Missing demo SSPL finding');
    const event = createRuling({ id: '00000000-0000-4000-8000-000000000001', createdAt: '2026-10-24T12:00:00Z', projectKey: 'demo', finding, result: first, action: 'waive', reason: 'Demo review' });
    expect(replayRulings([event], 'demo', changed)[0].status).toBe('stale');
    expect(parseRuling(event)?.occurrence).toBe(finding.occurrence);
  });
});

describe('waive reason and saved-event boundaries', () => {
  it('rejects blank, whitespace, and 501 characters; accepts exactly 500 Unicode characters', () => {
    expect(validateReason('waive', '')).not.toBeNull();
    expect(validateReason('waive', ' \n\t')).not.toBeNull();
    expect(validateReason('waive', 'x'.repeat(501))).not.toBeNull();
    expect(validateReason('waive', '😀'.repeat(500))).toBeNull();
    expect(validateReason('accept', '')).toBeNull();
  });
  it('rejects mismatched action/kind, settings hash or occurrence at the storage boundary', () => {
    const event = waiver();
    expect(parseRuling(event)).not.toBeNull();
    expect(parseRuling({ ...event, kind: 'acceptance' })).toBeNull();
    expect(parseRuling({ ...event, settings_hash: 'a'.repeat(64) })).toBeNull();
    expect(parseRuling({ ...event, occurrence: 'csv:other@1#1' })).toBeNull();
  });
});

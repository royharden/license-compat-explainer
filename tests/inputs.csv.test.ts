import { describe, expect, it } from 'vitest';
import {
  parseCsvRecords,
  parseInventoryCsv,
  suggestCsvMapping,
} from '../supabase/functions/_shared/core/inputs/inventoryCsv.ts';
import { MAX_PACKAGES } from '../supabase/functions/_shared/core/inputs/caps.ts';
import { analyzeInventory } from '../supabase/functions/_shared/core/analyze.ts';
import type { Inventory } from '../supabase/functions/_shared/core/types.ts';
import { settings } from './helpers.ts';

function inventoryOf(text: string): Inventory {
  const result = parseInventoryCsv(text);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.inventory;
}

describe('CSV RFC 4180 parsing', () => {
  it('handles quoted commas, escaped quotes and embedded newlines', () => {
    const parsed = parseCsvRecords('Name,Version,License\r\n"a, b",1.0,"MIT"\r\n"say ""hi""",2.0,"line1\nline2"\r\n');
    if (!parsed.ok) throw new Error('parse failed');
    expect(parsed.records.map((r) => r.fields)).toEqual([
      ['Name', 'Version', 'License'],
      ['a, b', '1.0', 'MIT'],
      ['say "hi"', '2.0', 'line1\nline2'],
    ]);
    expect(parsed.records.map((r) => r.row)).toEqual([1, 2, 3]);
  });

  it('strips a BOM and accepts LF line endings without a trailing newline', () => {
    const parsed = parseCsvRecords('﻿Name,License\nx,MIT');
    if (!parsed.ok) throw new Error('parse failed');
    expect(parsed.records[0].fields).toEqual(['Name', 'License']);
    expect(parsed.records[1].fields).toEqual(['x', 'MIT']);
  });

  it('reports an unterminated quote as a row error', () => {
    const parsed = parseCsvRecords('Name,License\nx,"MIT\n');
    if (!parsed.ok) throw new Error('parse failed');
    expect(parsed.errors).toEqual([expect.objectContaining({ row: 2, code: 'unterminated_quote' })]);
    expect(parsed.records).toHaveLength(1);
  });

  it('reports a bare quote and text after a closing quote as row errors and keeps other rows', () => {
    const parsed = parseCsvRecords('Name,License\nab"c,MIT\n"x"y,MIT\nok,MIT\n');
    if (!parsed.ok) throw new Error('parse failed');
    expect(parsed.errors.map((e) => [e.row, e.code])).toEqual([
      [2, 'bare_quote'],
      [3, 'text_after_closing_quote'],
    ]);
    expect(parsed.records.map((r) => r.fields[0])).toEqual(['Name', 'ok']);
  });
});

describe('CSV column mapping and inventory', () => {
  it('suggests the pip-licenses mapping (Name, Version, License)', () => {
    expect(suggestCsvMapping(['Name', 'Version', 'License'])).toEqual({ name: 0, version: 1, licence: 2, scope: null });
  });

  it('with no scope column every row has unknown scope and a warning', () => {
    const inv = inventoryOf('Name,Version,License\nrequests,2.31.0,Apache-2.0\nsix,1.16.0,MIT\n');
    expect(inv.items.map((i) => i.scope)).toEqual(['unknown', 'unknown']);
    expect(inv.warnings.map((w) => w.code)).toContain('csv_no_scope_column');
    expect(inv.items[0].path).toBeNull();
    expect(inv.items[0].pathNote).toBe('path unavailable (CSV input)');
    expect(inv.items.map((i) => i.sourceRow)).toEqual([2, 3]);
  });

  it('unknown scope never qualifies for the dev exemption', () => {
    const inv = inventoryOf('Name,Version,License\nlinter,1.0,GPL-3.0-only\n');
    const result = analyzeInventory(inv, settings({ mode: 'distribute', bundled: false }));
    expect(result.findings[0].ruleIds).not.toContain('R-DEV-NOT-SHIPPED');
  });

  it('maps scope column values', () => {
    const inv = inventoryOf('Name,Version,License,Scope\na,1,MIT,dev\nb,1,MIT,prod\nc,1,MIT,optional\nd,1,MIT,weird\n');
    expect(inv.items.map((i) => i.scope)).toEqual(['dev', 'runtime', 'runtime', 'unknown']);
    expect(inv.warnings.map((w) => w.code)).toContain('csv_unrecognised_scope');
  });

  it('row-level errors carry row numbers and become coverage gaps', () => {
    const inv = inventoryOf('Name,Version,License\nok,1,MIT\n,1,MIT\nshort\n');
    expect(inv.items.map((i) => i.name)).toEqual(['ok']);
    expect(inv.coverageGaps.map((g) => [g.from, g.detail.split(':')[0]])).toEqual([
      ['row 3', 'empty_name'],
      ['row 4', 'missing_columns'],
    ]);
  });

  it('identical name@version rows get ordinals; occurrence excludes the licence', () => {
    const inv = inventoryOf('Name,Version,License\nx,1.0,MIT\ny,1.0,MIT\nx,1.0,Apache-2.0\n');
    expect(inv.items.map((i) => i.occurrence)).toEqual(['csv:x@1.0#1', 'csv:y@1.0#1', 'csv:x@1.0#2']);
  });

  it('a mapping without name or licence is rejected', () => {
    const result = parseInventoryCsv('Package,Ver\nx,1\n', { name: 0, version: 1, licence: null, scope: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('csv_mapping_incomplete');
  });

  it('a mapping that reuses a column is rejected', () => {
    const result = parseInventoryCsv('A,B\nx,MIT\n', { name: 0, version: null, licence: 0, scope: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('csv_mapping_invalid');
  });

  it('rejects more than 5,000 data rows', () => {
    const rows = ['Name,License'];
    for (let i = 0; i <= MAX_PACKAGES + 1; i++) rows.push(`p${i},MIT`);
    const result = parseInventoryCsv(rows.join('\n'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('too_many_rows');
  });

  it('pip-licenses style strings normalise through the same path', () => {
    const inv = inventoryOf('Name,Version,License\na,1,MIT License\nb,1,BSD License\nc,1,UNKNOWN\n');
    const result = analyzeInventory(inv, settings());
    expect(result.findings.map((f) => f.exprNormalised)).toEqual(['MIT', null, 'UNKNOWN']);
    expect(result.findings.map((f) => f.verdict)).toEqual(['ok', 'unknown', 'unknown']);
  });
});

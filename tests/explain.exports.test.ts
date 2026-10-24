import { describe, it, expect } from 'vitest';
import { csvResult } from './rulings.helpers.ts';
import { settings } from './helpers.ts';
import { buildJsonExport } from '../supabase/functions/_shared/core/report/json.ts';
import { buildMarkdownExport } from '../supabase/functions/_shared/core/report/markdown.ts';
import { guardOutput } from '../supabase/functions/_shared/core/explain/guard.ts';
import { factsFor, mockFixtures } from './explain.helpers.ts';
describe('M4 additive explanation export seam', () => {
  it('exports actual model/template labels, canonical quotes and dropped counts without changing engine verdict', () => {
    const result = csvResult('Name,Version,License\na,1,GPL-3.0-only', settings({ mode: 'distribute', bundled: true }));
    const finding = result.findings[0]; const explanation = guardOutput(mockFixtures()['R-DIST-STRONG__demo'], factsFor());
    const doc = buildJsonExport(result, '2026-10-24T12:00:00Z', 'p', [], { [finding.findingId]: explanation });
    expect(doc.findings[0].explanation.label).toBe('model'); expect(doc.findings[0].verdict).toBe('conflict');
    expect(doc.findings[0].explanation.droppedQuotes).toBe(1);
    const md = buildMarkdownExport(doc).replace(/\\/g, '');
    expect(md).toContain('GPL-3.0-only#s5'); expect(md).toContain('summary not checked for legal meaning'); expect(md).toContain('Not legal advice');
    expect(buildJsonExport(result, 'now').findings[0].explanation).toMatchObject({ label: 'template', fallbackReason: 'not_requested' });
  });
});

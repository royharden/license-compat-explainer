import { describe, expect, it } from 'vitest';
import { buildJsonExport, serializeJsonExport } from '../supabase/functions/_shared/core/report/json.ts';
import { buildMarkdownExport, escapeMarkdown } from '../supabase/functions/_shared/core/report/markdown.ts';
import { csvResult, waiver } from './rulings.helpers.ts';
import { settings } from './helpers.ts';

describe('M3 report exports', () => {
  it('exports acknowledgements, verdicts, template label, attribution and disclaimer in JSON and Markdown', () => {
    const result = csvResult();
    const event = waiver(result);
    const doc = buildJsonExport(result, '2026-10-24T12:00:00Z', 'project-A', [event]);
    expect(doc.rulings[0]).toMatchObject({ status: 'applicable', applied: true, latest: true });
    expect(doc.findings[0].verdict).toBe('needs_review');
    for (const text of [serializeJsonExport(doc), buildMarkdownExport(doc)]) {
      expect(text).toContain('unmodified_use');
      expect(text).toContain('mpl_secondary_eligible');
      expect(text.replace(/\\/g, '')).toContain('user-asserted');
      expect(text).toContain('OSADL');
      expect(text).toContain('template');
      expect(text.toLowerCase()).toContain('not legal advice');
    }
  });
  it('exports stale, different-settings, superseded, and absent history without applying it', () => {
    const event = waiver();
    const changed = csvResult(undefined, settings({ mode: 'internal' }));
    const stale = { ...event, id: '00000000-0000-4000-8000-000000000002', expr_hash: 'a'.repeat(64) };
    const absent = { ...event, id: '00000000-0000-4000-8000-000000000003', occurrence: 'csv:gone@1#1', package: 'gone' };
    const doc = buildJsonExport(changed, '2026-10-24T12:00:00Z', 'project-A', [event, stale, absent]);
    expect(doc.rulings.map((entry) => entry.status)).toEqual(['different_settings', 'stale', 'not_in_report']);
    expect(doc.rulings.every((entry) => !entry.applied)).toBe(true);
    const md = buildMarkdownExport(doc);
    expect(md.replace(/\\/g, '')).toContain('different_settings'); expect(md).toContain('stale'); expect(md).toContain('history only');
    expect(doc.rulings[0].latest).toBe(false);
  });
  it('escapes pipes, backticks, multiline metadata and raw HTML in Markdown', () => {
    expect(escapeMarkdown('a|b`c\n<script>')).toBe('a\\|b\\`c &lt;script&gt;');
    const result = csvResult();
    result.findings[0].name = 'a|b`c';
    const md = buildMarkdownExport(buildJsonExport(result, 'now'));
    expect(md).toContain('a\\|b\\`c');
  });
});

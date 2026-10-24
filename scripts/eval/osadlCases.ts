// OSADL-derived labels stay independent of the application rule engine.
import { parseCsvRecords } from '../../supabase/functions/_shared/core/inputs/inventoryCsv.ts';
import { LICENCES } from '../../supabase/functions/_shared/core/rules/licences.ts';
import { PROJECT_LICENCES } from '../../supabase/functions/_shared/core/types.ts';
import type { Settings, Verdict } from '../../supabase/functions/_shared/core/types.ts';
import { osadlSplit } from '../split.ts';

export interface OsadlCase {
  id: string; family: string; origin: 'osadl'; basis: string; dep_expr: string;
  settings: Settings; scope: 'runtime'; expected: readonly Verdict[];
  oracle: string | undefined; split: 'dev' | 'heldout';
}
export function acceptableOracleVerdicts(cell: string | undefined): readonly Verdict[] {
  if (cell === 'Yes' || cell === 'Same') return ['ok', 'ok_with_conditions'];
  if (cell === 'No') return ['conflict'];
  return ['needs_review'];
}
export function parseOsadl(text: string): { header: string[]; rows: Map<string, string[]> } {
  const csv = parseCsvRecords(text);
  if (!csv.ok) throw new Error(csv.error.message);
  if (csv.errors.length || csv.records.length < 2) throw new Error('Invalid OSADL CSV');
  const [head, ...body] = csv.records;
  if (head.fields[0] !== 'Compatibility*') throw new Error('Unexpected OSADL header');
  if (new Set(head.fields).size !== head.fields.length) throw new Error('Duplicate OSADL column');
  const rows = new Map<string, string[]>();
  for (const row of body) {
    if (!row.fields[0] || rows.has(row.fields[0]) || row.fields.length !== head.fields.length) throw new Error('Invalid OSADL row');
    rows.set(row.fields[0], row.fields);
  }
  return { header: head.fields, rows };
}
export function osadlCases(text: string): OsadlCase[] {
  const matrix = parseOsadl(text);
  const out: OsadlCase[] = [];
  for (const projectLicense of PROJECT_LICENCES) {
    const row = matrix.rows.get(projectLicense);
    if (!row) continue; // Explicitly uncovered, not an invented unknown cell.
    for (const dep of LICENCES) {
      const col = matrix.header.indexOf(dep.id);
      if (col < 1) continue;
      const oracle = row[col] || undefined;
      for (const bundled of [false, true]) {
        const family = `${projectLicense}|${dep.id}`;
        out.push({ id: `osadl:${family}|${bundled}`, family, origin: 'osadl',
          basis: `OSADL matrix.csv row=${projectLicense} column=${dep.id} cell=${oracle ?? 'undefined'}`,
          dep_expr: dep.id, scope: 'runtime', oracle, split: osadlSplit(projectLicense, dep.id),
          expected: acceptableOracleVerdicts(oracle), settings: { projectLicense, mode: 'distribute', bundled,
            acknowledgements: { unmodified_use: true, mpl_secondary_eligible: true } } });
      }
    }
  }
  return out;
}

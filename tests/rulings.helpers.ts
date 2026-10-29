import { analyzeInventory } from '../supabase/functions/_shared/core/analyze.ts';
import { parseInventoryCsv } from '../supabase/functions/_shared/core/inputs/inventoryCsv.ts';
import { createRuling } from '../supabase/functions/_shared/core/rulings/key.ts';
import type { AnalysisResult, Settings } from '../supabase/functions/_shared/core/types.ts';
import { settings } from './helpers.ts';

export function csvResult(text = 'Name,Version,License\na,1,SSPL-1.0\nb,1,MIT', context: Settings = settings()): AnalysisResult {
  const parsed = parseInventoryCsv(text);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return analyzeInventory(parsed.inventory, context);
}
export function waiver(result = csvResult(), id = '00000000-0000-4000-8000-000000000001', createdAt = '2026-10-24T12:00:00.000Z') {
  return createRuling({ id, createdAt, projectKey: 'project-A', finding: result.findings[0], result, action: 'waive', reason: 'Review approved under documented commercial terms.' });
}

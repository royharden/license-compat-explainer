// Pure request handler used by the worker: input text -> inventory -> findings.
// Kept free of worker globals so it is testable and syntax-checkable on its own.

import { analyzeInventory } from '@core/analyze.ts';
import { parseInventoryCsv } from '@core/inputs/inventoryCsv.ts';
import { parsePackageLock } from '@core/inputs/packageLock.ts';
import { validateSettings } from '@core/settings.ts';
import type { AnalyzeRequest, AnalyzeResponse } from './protocol.ts';

export function runAnalysis(request: AnalyzeRequest, now: () => number = () => Date.now()): AnalyzeResponse {
  const started = now();
  const settings = validateSettings(request.settings);
  if (!settings) {
    return { kind: 'error', requestId: request.requestId, error: { code: 'settings_incomplete', message: 'Choose project licence, mode and bundled before analyzing.' } };
  }
  const parsed =
    request.input.kind === 'csv'
      ? parseInventoryCsv(request.input.text, request.input.csvMapping ?? undefined)
      : parsePackageLock(request.input.text);
  if (!parsed.ok) return { kind: 'error', requestId: request.requestId, error: parsed.error };
  const result = analyzeInventory(parsed.inventory, settings);
  return { kind: 'result', requestId: request.requestId, result, elapsedMs: now() - started };
}

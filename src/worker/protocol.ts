// Messages between the UI thread and the analysis worker. The lockfile text stays in the browser.

import type { AnalysisResult, CsvMapping, InputError, Settings } from '@core/types.ts';

export type InputKind = 'npm-lock' | 'csv';

export interface AnalyzeRequest {
  kind: 'analyze';
  requestId: number;
  input: { kind: InputKind; fileName: string; text: string; csvMapping: CsvMapping | null };
  settings: Settings;
}

export type AnalyzeResponse =
  | { kind: 'result'; requestId: number; result: AnalysisResult; elapsedMs: number }
  | { kind: 'error'; requestId: number; error: InputError };

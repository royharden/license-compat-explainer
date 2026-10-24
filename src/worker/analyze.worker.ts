// Analysis Web Worker (PLAN §1.1): parse, normalise and evaluate off the UI thread.
// Only this file touches worker globals; the logic lives in runAnalysis.ts and the shared core.

import { runAnalysis } from './runAnalysis.ts';
import type { AnalyzeRequest, AnalyzeResponse } from './protocol.ts';

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage(message: AnalyzeResponse): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const request = event.data;
  if (!request || request.kind !== 'analyze') return;
  let response: AnalyzeResponse;
  try {
    response = runAnalysis(request);
  } catch (err) {
    response = {
      kind: 'error',
      requestId: request.requestId,
      error: { code: 'internal_error', message: err instanceof Error ? err.message.slice(0, 300) : 'analysis failed' },
    };
  }
  scope.postMessage(response);
};

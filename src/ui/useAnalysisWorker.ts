// React hook owning the analysis worker. Only the latest request's response is applied.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, InputError } from '@core/types.ts';
import type { AnalyzeRequest, AnalyzeResponse } from '../worker/protocol.ts';

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: AnalysisResult; elapsedMs: number }
  | { status: 'error'; error: InputError };

export function useAnalysisWorker(): { state: AnalysisState; run: (request: Omit<AnalyzeRequest, 'kind' | 'requestId'>) => void } {
  const workerRef = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

  useEffect(() => {
    const worker = new Worker(new URL('../worker/analyze.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<AnalyzeResponse>) => {
      const response = event.data;
      if (response.requestId !== latest.current) return;
      if (response.kind === 'result') setState({ status: 'done', result: response.result, elapsedMs: response.elapsedMs });
      else setState({ status: 'error', error: response.error });
    };
    worker.onerror = (event: ErrorEvent) => {
      setState({ status: 'error', error: { code: 'worker_error', message: event.message || 'The analysis worker failed.' } });
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((request: Omit<AnalyzeRequest, 'kind' | 'requestId'>) => {
    const worker = workerRef.current;
    if (!worker) {
      setState({ status: 'error', error: { code: 'worker_unavailable', message: 'The analysis worker is not running.' } });
      return;
    }
    latest.current += 1;
    const message: AnalyzeRequest = { kind: 'analyze', requestId: latest.current, ...request };
    setState({ status: 'running' });
    worker.postMessage(message);
  }, []);

  return { state, run };
}

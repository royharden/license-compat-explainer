import { useState } from 'react';
import type { Finding, Settings } from '@core/types.ts';
import { buildExplainRequest, deriveFacts } from '@core/explain/factBlock.ts';
import { fallback } from '@core/explain/guard.ts';
import type { Explanation } from '@core/explain/guard.ts';
import { explainClient } from '../lib/explainClient.ts';
import { readEnv } from '../lib/env.ts';
import { TemplatePanel } from './TemplatePanel.tsx';
import { ConsentBanner } from './ConsentBanner.tsx';
import { QuoteView } from './QuoteView.tsx';
export function ExplanationPanel({ finding, settings, rulesEdition, runId, disabled, onExplanation }: {
  finding: Finding; settings: Settings; rulesEdition: string; runId: string; disabled: boolean; onExplanation: (explanation: Explanation) => void;
}) {
  const [result, setResult] = useState<Explanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const request = buildExplainRequest(finding, settings, rulesEdition, requestId, runId);
  const facts = request && deriveFacts(request);
  const mode = readEnv().explainMode;
  async function consent() {
    if (busy || disabled || requested) return;
    setBusy(true); setRequested(true);
    const explanation = request ? await explainClient(request, mode) : fallback('unresolved_or_foreign_ids_local');
    setResult(explanation); onExplanation(explanation); setBusy(false);
  }
  return <div className="explanation">
    <TemplatePanel finding={finding} />
    {!request && <p role="status">Supplementary explanation unavailable: unresolved or foreign IDs were rejected locally. No request sent.</p>}
    {request && !facts?.passages.length && <p role="status">Quote demo unavailable for this finding: applicable text was not vendored (D18). AGPL section 13 remains unavailable. For an available GNU example, load distributed-mit-bundle and explain a GPL conflict, or explain a hosted GPL runtime finding.</p>}
    {request && !!facts?.passages.length && <ConsentBanner mode={mode} disabled={busy || disabled || requested} onConsent={() => void consent()} />}
    {busy && <p role="status">Explaining…</p>}
    {result && <><p><span className="badge">{result.label}</span> {result.label === 'model' ? result.notice : result.fallbackReason}</p>
      <p role="status">{result.droppedQuotes} quote(s) dropped by verification.</p>
      {result.label === 'model' && facts && <><p>{result.summary}</p>{result.quotes.map((quote, i) => <QuoteView key={`${quote.passage_id}-${i}`} quote={quote} passages={facts.passages} />)}</>}
      <p>{result.disclaimer}</p></>}
  </div>;
}

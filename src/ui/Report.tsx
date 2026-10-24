import type { AnalysisResult, Settings } from '@core/types.ts';
import { ExportButtons } from './ExportButtons.tsx';
import { FindingCard } from './FindingCard.tsx';
import { formatAcknowledgements, formatSettings, sortFindings, summaryLine } from './reportView.ts';
import { sameSettings } from './settingsState.ts';

export function Report({
  result,
  elapsedMs,
  currentSettings,
}: {
  result: AnalysisResult;
  elapsedMs: number;
  currentSettings: Settings | null;
}) {
  const settingsChanged = currentSettings !== null && !sameSettings(currentSettings, result.settings);
  const findings = sortFindings(result.findings);
  return (
    <section className="report" aria-labelledby="report-heading">
      <h2 id="report-heading">3. Report</h2>
      <div className="report-header">
        <p>
          <strong>Settings:</strong> {formatSettings(result.settings)}
        </p>
        <p>
          <strong>Acknowledgements:</strong> {formatAcknowledgements(result.settings)}
        </p>
        <p>
          <strong>Rules edition:</strong> <code>{result.rulesEdition}</code>
          {result.rulesStub && (
            <span className="badge stub" title="Most combinations are not modelled yet and are reported as needs_review">
              stub rule table (M1)
            </span>
          )}
        </p>
        <p>
          <strong>Input:</strong> {result.input.kind === 'csv' ? 'inventory CSV' : `npm lockfile v${result.input.lockfileVersion ?? '?'}`}
          {result.input.rootName ? ` · root ${result.input.rootName}` : ''} · {result.input.itemCount} packages · analyzed in{' '}
          {Math.round(elapsedMs)} ms
        </p>
        <p className="summary">{summaryLine(result)}</p>
        {result.fallbackCount > 0 && (
          <p className="hint">{result.fallbackCount} finding(s) matched no specific rule (R-FALLBACK).</p>
        )}
        {settingsChanged && (
          <p className="notice" role="status">
            Settings changed since this report was produced. Analyze again to apply them.
          </p>
        )}
        <ExportButtons result={result} />
      </div>

      {result.warnings.length > 0 && (
        <div className="warnings">
          <h3>Warnings</h3>
          <ul>
            {result.warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>
                <code>{w.code}</code>: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.coverageGaps.length > 0 && (
        <details className="gaps">
          <summary>{result.coverageGaps.length} coverage gap(s): parts of the input that could not be traced</summary>
          <ul>
            {result.coverageGaps.map((g, i) => (
              <li key={`${g.kind}-${i}`}>
                <code>{g.kind}</code>: {g.detail}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ol className="findings">
        {findings.map((f) => (
          <li key={f.findingId}>
            <FindingCard finding={f} />
          </li>
        ))}
      </ol>
    </section>
  );
}

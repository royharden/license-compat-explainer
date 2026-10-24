import type { Acknowledgements, AnalysisResult, Finding, Settings } from '@core/types.ts';
import type { Ruling, RulingAction } from '@core/rulings/key.ts';
import { replayRulings, compareRulings } from '@core/rulings/replay.ts';
import { ExportButtons } from './ExportButtons.tsx';
import { FindingCard } from './FindingCard.tsx';
import { VERDICT_DISPLAY_ORDER, VERDICT_LABELS, formatAcknowledgements, formatSettings, sortFindings, summaryLine } from './reportView.ts';
import { sameSettings } from './settingsState.ts';

export function Report({
  result,
  elapsedMs,
  currentSettings,
  projectKey, rulings, inputChanged, onAcknowledge, onRuling,
}: {
  result: AnalysisResult;
  elapsedMs: number;
  currentSettings: Settings | null;
  projectKey: string;
  rulings: readonly Ruling[];
  inputChanged: boolean;
  onAcknowledge: (key: keyof Acknowledgements) => void;
  onRuling: (finding: Finding, action: RulingAction, reason: string) => void;
}) {
  const settingsChanged = currentSettings === null || !sameSettings(currentSettings, result.settings);
  const findings = sortFindings(result.findings);
  const overlays = replayRulings(rulings, projectKey, result);
  const disabled = settingsChanged || inputChanged || !projectKey.trim();
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
        {inputChanged && <p className="notice" role="status">Input or CSV mapping changed. Analyze again before recording a ruling or acknowledgement.</p>}
        <ExportButtons result={result} projectKey={projectKey} rulings={rulings} />
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
                <code>{g.kind}</code>: {g.detail} {g.from ? `(from ${g.from})` : ''} {g.dependency ? `dependency: ${g.dependency}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      {VERDICT_DISPLAY_ORDER.map((verdict) => {
        const group = findings.filter((finding) => finding.verdict === verdict);
        return group.length > 0 && <section key={verdict} aria-label={`${VERDICT_LABELS[verdict]} findings`}>
          <h3>{VERDICT_LABELS[verdict]} ({group.length})</h3>
          <ol className="findings">{group.map((finding) => <li key={finding.findingId}>
            <FindingCard finding={finding} settings={result.settings} onAcknowledge={onAcknowledge}
              rulingControls={{ overlay: overlays.find((overlay) => overlay.occurrence === finding.occurrence), disabled,
                history: rulings.filter((ruling) => ruling.project_key === projectKey.trim() && ruling.occurrence === finding.occurrence).sort(compareRulings),
                onRuling: (action, reason) => onRuling(finding, action, reason) }} />
          </li>)}</ol>
        </section>;
      })}
    </section>
  );
}

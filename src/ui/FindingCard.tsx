import { useState } from 'react';
import type { Acknowledgements, Finding, Settings } from '@core/types.ts';
import { OPTION_LABELS } from '@core/explain/options.ts';
import { RulingControls } from './RulingControls.tsx';
import type { RulingControlsProps } from './RulingControls.tsx';
import { TemplatePanel } from './TemplatePanel.tsx';
import { VERDICT_LABELS, formatPath, formatWhere } from './reportView.ts';

export function FindingCard({ finding, settings, rulingControls, onAcknowledge }: {
  finding: Finding; settings: Settings; rulingControls: RulingControlsProps;
  onAcknowledge: (key: keyof Acknowledgements) => void;
}) {
  const [open, setOpen] = useState(false);
  const showLeaves = finding.leaves.length > 1;
  return (
    <article className={`finding verdict-${finding.verdict}`}>
      <header className="finding-head">
        <span className={`badge verdict verdict-${finding.verdict}`}>{VERDICT_LABELS[finding.verdict]}</span>
        <strong className="pkg">
          {finding.name}@{finding.version}
        </strong>
        <span className="muted">{formatWhere(finding)}</span>
        {finding.scope !== 'runtime' && <span className="badge scope">{finding.scope} scope</span>}
      </header>

      <dl className="facts">
        <dt>Path</dt>
        <dd>{formatPath(finding)}</dd>
        <dt>Licence (as written)</dt>
        <dd>
          <code>{finding.rawLicence}</code>
        </dd>
        <dt>Normalised</dt>
        <dd>{finding.exprNormalised ? <code>{finding.exprNormalised}</code> : <em>unresolved ({finding.reason})</em>}</dd>
        <dt>Rule</dt>
        <dd>
          {finding.ruleIds.map((id) => (
            <code key={id} className="rule-id">
              {id}
            </code>
          ))}
          {finding.stubRule && <span className="badge stub">stub</span>}
        </dd>
        {finding.chosenSide !== null && (
          <>
            <dt>Chosen side</dt>
            <dd>
              <code>{finding.chosenSide}</code> (choosing between alternatives is the licensee&apos;s act)
            </dd>
          </>
        )}
        {finding.notes.length > 0 && (
          <>
            <dt>Notes</dt>
            <dd>
              <ul className="plain">
                {finding.notes.map((n, i) => (
                  <li key={`${n.code}-${i}`}>
                    <code>{n.code}</code> {n.detail}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>

      <h4>Obligations</h4>
      {finding.obligations.length ? <ul>{finding.obligations.map((text) => <li key={text}>{text}</li>)}</ul> : <p>None identified by the modelled rule; this is not a complete legal audit.</p>}
      <h4>Assumptions</h4>
      {finding.assumptions.length ? <ul>{finding.assumptions.map((text) => <li key={text}>{text}</li>)}</ul> : <p>No additional rule assumptions listed.</p>}
      {finding.options.length > 0 && <><h4>Options to review</h4><ul>{finding.options.map((id) => <li key={id}>{OPTION_LABELS[id]}</li>)}</ul></>}
      {finding.ruleIds.includes('R-EXC-CONTEXT') && !settings.acknowledgements.unmodified_use &&
        <button type="button" disabled={rulingControls.disabled} onClick={() => onAcknowledge('unmodified_use')}>Acknowledge for this analysis: dependency used as published and linked unmodified (GCC: eligible compilation process)</button>}
      {finding.ruleIds.includes('R-PAIR-MPL-GPL-CONTEXT') && !settings.acknowledgements.mpl_secondary_eligible &&
        <button type="button" disabled={rulingControls.disabled} onClick={() => onAcknowledge('mpl_secondary_eligible')}>Acknowledge for this analysis: MPL files carry no Exhibit B notice</button>}
      <p className="hint">Context acknowledgements apply globally and are user-asserted, not verified from source. Acknowledging reruns the analysis.</p>

      {showLeaves && (
        <table className="leaves">
          <thead>
            <tr>
              <th>Leaf</th>
              <th>Rule</th>
              <th>Verdict</th>
              <th>Counted</th>
            </tr>
          </thead>
          <tbody>
            {finding.leaves.map((l, i) => (
              <tr key={`${l.leafText}-${i}`} className={l.counted ? '' : 'muted'}>
                <td>
                  <code>{l.leafText}</code>
                  {l.expandedFrom ? ` (from ${l.expandedFrom})` : ''}
                </td>
                <td>
                  <code>{l.ruleId}</code>
                </td>
                <td>{VERDICT_LABELS[l.verdict]}</td>
                <td>{l.counted ? 'yes' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide explanation' : 'Show explanation'}
      </button>
      {open && <TemplatePanel finding={finding} />}
      <RulingControls {...rulingControls} />
    </article>
  );
}

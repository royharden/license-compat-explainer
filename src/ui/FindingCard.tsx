import { useState } from 'react';
import type { Finding } from '@core/types.ts';
import { TemplatePanel } from './TemplatePanel.tsx';
import { VERDICT_LABELS, formatPath, formatWhere } from './reportView.ts';

export function FindingCard({ finding }: { finding: Finding }) {
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
    </article>
  );
}

import { useState } from 'react';
import type { Ruling, RulingAction } from '@core/rulings/key.ts';
import { validateReason } from '@core/rulings/key.ts';
import type { RulingOverlay } from '@core/rulings/replay.ts';

export interface RulingControlsProps {
  overlay?: RulingOverlay;
  history: readonly Ruling[];
  disabled: boolean;
  onRuling: (action: RulingAction, reason: string) => void;
}
export function RulingControls({ overlay, history, disabled, onRuling }: RulingControlsProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const append = (action: RulingAction) => {
    const invalid = validateReason(action, reason);
    if (invalid) { setError(invalid); return; }
    setError(''); onRuling(action, reason);
  };
  return <div className="ruling-controls">
    <h4>Review ruling (engine verdict stays unchanged)</h4>
    {overlay && <div className={`ruling-overlay ${overlay.status}`}>
      {overlay.status === 'applicable' && <p>Applied review ruling: <strong>{overlay.ruling.action}</strong>.</p>}
      {overlay.status === 'stale' && <p><strong>Stale ruling:</strong> the licence expression changed. History only; not applied. Review the new expression before recording another ruling.</p>}
      {overlay.status === 'different_settings' && <>
        <p><strong>Recorded under different settings:</strong> {overlay.differences.join('; ')}. Not applied.</p>
        <button type="button" disabled={disabled} onClick={() => onRuling(overlay.ruling.action, overlay.ruling.reason)}>Re-confirm under this report’s settings</button>
      </>}
      <p>{overlay.ruling.reason || 'No reason supplied.'} <small>Recorded {overlay.ruling.created_at}</small></p>
    </div>}
    <label>Reason (required for waiver, at most 500 characters)
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={disabled} rows={2} />
    </label>
    <div className="actions">
      <button type="button" disabled={disabled} onClick={() => append('accept')}>Accept</button>{' '}
      <button type="button" disabled={disabled} onClick={() => append('waive')}>Waive</button>{' '}
      <button type="button" disabled={disabled} onClick={() => append('follow-up')}>Follow-up</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {history.length > 0 && <details><summary>Ruling history ({history.length} events)</summary><ol>
      {[...history].reverse().map((ruling) => <li key={ruling.id}>{ruling.created_at}: {ruling.action} — {ruling.reason || 'No reason supplied.'} (settings {ruling.settings_hash.slice(0, 12)}, edition {ruling.rules_edition})</li>)}
    </ol></details>}
  </div>;
}

import {
  ACKNOWLEDGEMENTS_NOTE,
  ACKNOWLEDGEMENT_OPTIONS,
  MODE_OPTIONS,
  PROJECT_LICENCE_OPTIONS,
  parseBundled,
  parseMode,
  parseProjectLicence,
} from './settingsState.ts';
import type { SettingsDraft } from './settingsState.ts';

export function SettingsForm({ draft, onChange }: { draft: SettingsDraft; onChange: (draft: SettingsDraft) => void }) {
  return (
    <form className="settings" onSubmit={(event) => event.preventDefault()}>
      <label className="field">
        <span>Project licence</span>
        <select
          value={draft.projectLicense ?? ''}
          onChange={(event) => onChange({ ...draft, projectLicense: parseProjectLicence(event.target.value) })}
        >
          <option value="">— choose —</option>
          {PROJECT_LICENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Mode</span>
        <select value={draft.mode ?? ''} onChange={(event) => onChange({ ...draft, mode: parseMode(event.target.value) })}>
          <option value="">— choose —</option>
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} — {o.hint}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="field">
        <legend>Bundled (dependencies shipped inside your artefact)</legend>
        {(['yes', 'no'] as const).map((value) => (
          <label key={value} className="inline">
            <input
              type="radio"
              name="bundled"
              value={value}
              checked={draft.bundled !== null && (draft.bundled ? 'yes' : 'no') === value}
              onChange={(event) => onChange({ ...draft, bundled: parseBundled(event.target.value) })}
            />
            {value}
          </label>
        ))}
      </fieldset>

      <fieldset className="field acknowledgements">
        <legend>Context acknowledgements (optional, {ACKNOWLEDGEMENTS_NOTE})</legend>
        {ACKNOWLEDGEMENT_OPTIONS.map((o) => (
          <label key={o.key} className="inline">
            <input
              type="checkbox"
              checked={draft.acknowledgements[o.key]}
              onChange={(event) =>
                onChange({ ...draft, acknowledgements: { ...draft.acknowledgements, [o.key]: event.target.checked } })
              }
            />
            {o.label}
          </label>
        ))}
      </fieldset>
    </form>
  );
}

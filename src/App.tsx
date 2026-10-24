import { useMemo, useState } from 'react';
import { readEnv } from './lib/env.ts';
import { Disclaimer } from './ui/Disclaimer.tsx';
import { InputPanel } from './ui/InputPanel.tsx';
import type { LoadedInput } from './ui/InputPanel.tsx';
import { Report } from './ui/Report.tsx';
import { SettingsForm } from './ui/SettingsForm.tsx';
import { SetupBanner } from './ui/SetupBanner.tsx';
import { EMPTY_DRAFT, canAnalyze, draftToSettings, missingSettings } from './ui/settingsState.ts';
import type { SettingsDraft } from './ui/settingsState.ts';
import { useAnalysisWorker } from './ui/useAnalysisWorker.ts';
import type { Acknowledgements } from '@core/types.ts';
import { useAuth } from './lib/useAuth.ts';
import { useRulings } from './lib/useRulings.ts';
import { AuthPanel } from './ui/AuthPanel.tsx';

export function App() {
  const env = useMemo(() => readEnv(), []);
  const [input, setInput] = useState<LoadedInput | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>(EMPTY_DRAFT);
  const { state, run } = useAnalysisWorker();
  const auth = useAuth();
  const rulings = useRulings(auth.session?.user.id ?? null);
  const [projectOverride, setProjectOverride] = useState<string | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState<LoadedInput | null>(null);
  const projectKey = projectOverride ?? (state.status === 'done' ? state.result.input.rootName ?? 'inventory' : 'inventory');

  const running = state.status === 'running';
  const settings = draftToSettings(draft);
  const enabled = canAnalyze(draft, input !== null, running);
  const missing = missingSettings(draft);

  const onAnalyze = () => {
    if (!input || !settings || !enabled) return;
    setAnalyzedInput(input);
    run({ input: { kind: input.kind, fileName: input.fileName, text: input.text, csvMapping: input.csvMapping }, settings });
  };
  const acknowledge = (key: keyof Acknowledgements) => {
    if (!input || !settings || running || input !== analyzedInput) return;
    const next = { ...settings, acknowledgements: { ...settings.acknowledgements, [key]: true } };
    setDraft({ ...draft, acknowledgements: next.acknowledgements });
    run({ input: { kind: input.kind, fileName: input.fileName, text: input.text, csvMapping: input.csvMapping }, settings: next });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>License Compatibility Explainer</h1>
        <p className="tagline">
          Checks dependency licences against your project licence and how you ship it. Analysis runs in your browser;
          the file never leaves this machine.
        </p>
      </header>

      <SetupBanner env={env} />
      <Disclaimer />
      <AuthPanel auth={auth} />

      <main className="layout">
        <section className="panel" aria-labelledby="input-heading">
          <h2 id="input-heading">1. Input</h2>
          <InputPanel input={input} onInput={setInput} />
        </section>

        <section className="panel" aria-labelledby="settings-heading">
          <h2 id="settings-heading">2. Settings</h2>
          <SettingsForm draft={draft} onChange={setDraft} />
          <div className="analyze-bar">
            <button type="button" className="primary" disabled={!enabled} onClick={onAnalyze}>
              {running ? 'Analyzing…' : 'Analyze'}
            </button>
            {!enabled && !running && (
              <span className="hint">
                {input === null ? 'Load a lockfile or CSV. ' : ''}
                {missing.length > 0 ? `Choose: ${missing.join(', ')}.` : ''}
              </span>
            )}
          </div>
        </section>
      </main>

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.error.code}: {state.error.message}
        </p>
      )}
      {state.status === 'done' && <>
        <section className="panel" aria-label="Ruling storage">
          <label className="field">Project key (separates ruling histories)
            <input value={projectKey} maxLength={200} onChange={(event) => setProjectOverride(event.target.value)} />
          </label>
          <p className="hint">Rulings always save locally. Save to account uploads this project’s local ruling events, including package names, only when you click it.</p>
          <button type="button" disabled={!auth.session || auth.busy || rulings.busy || !projectKey.trim() || !rulings.local.some((entry) => entry.project_key === projectKey.trim())}
            onClick={() => void rulings.save(projectKey)}>{rulings.busy ? 'Saving…' : 'Save to account'}</button>{' '}
          <button type="button" onClick={rulings.clear}>Clear local rulings</button>
          {rulings.error && <p className="error" role="alert">{rulings.error}</p>}
          {rulings.message && <p role="status">{rulings.message}</p>}
        </section>
        <Report result={state.result} elapsedMs={state.elapsedMs} currentSettings={settings}
          projectKey={projectKey} rulings={rulings.entries} inputChanged={input !== analyzedInput}
          onAcknowledge={acknowledge}
          onRuling={(finding, action, reason) => rulings.append(projectKey, finding, state.result, action, reason)} />
      </>}
    </div>
  );
}

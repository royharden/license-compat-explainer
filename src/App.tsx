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

export function App() {
  const env = useMemo(() => readEnv(), []);
  const [input, setInput] = useState<LoadedInput | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>(EMPTY_DRAFT);
  const { state, run } = useAnalysisWorker();

  const running = state.status === 'running';
  const settings = draftToSettings(draft);
  const enabled = canAnalyze(draft, input !== null, running);
  const missing = missingSettings(draft);

  const onAnalyze = () => {
    if (!input || !settings || !enabled) return;
    run({ input: { kind: input.kind, fileName: input.fileName, text: input.text, csvMapping: null }, settings });
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
      {state.status === 'done' && <Report result={state.result} elapsedMs={state.elapsedMs} currentSettings={settings} />}
    </div>
  );
}

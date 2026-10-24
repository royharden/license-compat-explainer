import { useState } from 'react';
import type { DragEvent } from 'react';
import { SAMPLES } from '../lib/samples.ts';
import type { InputKind } from '../worker/protocol.ts';
import { checkFileSize, detectInputKind } from './inputDetect.ts';
import type { CsvMapping } from '@core/types.ts';
import { parseCsvRecords, suggestCsvMapping } from '@core/inputs/inventoryCsv.ts';
import { CsvMappingPanel } from './CsvMappingPanel.tsx';

export interface LoadedInput {
  kind: InputKind;
  fileName: string;
  text: string;
  origin: 'file' | 'sample';
  csvMapping: CsvMapping | null;
}

export function InputPanel({ input, onInput }: { input: LoadedInput | null; onInput: (input: LoadedInput) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const load = (kind: InputKind, fileName: string, text: string, origin: LoadedInput['origin']) => {
    const parsed = kind === 'csv' ? parseCsvRecords(text) : null;
    const csvMapping = parsed?.ok ? suggestCsvMapping(parsed.records[0]?.fields ?? []) : null;
    onInput({ kind, fileName, text, origin, csvMapping });
  };

  const readFile = async (file: File) => {
    const sizeError = checkFileSize(file.size);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    const text = await file.text();
    const kind = detectInputKind(file.name, text);
    if (!kind) {
      setError('The file is empty.');
      return;
    }
    setError(null);
    load(kind, file.name, text, 'file');
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const onSample = (id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setError(null);
    load(sample.kind, sample.fileName, sample.text, 'sample');
  };

  return (
    <div className="input-panel">
      <div
        className={dragging ? 'dropzone dragging' : 'dropzone'}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p>Drop a package-lock.json (v2/v3) or an inventory CSV here, or</p>
        <label className="file-button">
          Choose file
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="sample-row">
        <label htmlFor="sample-select">Load sample</label>
        <select id="sample-select" value="" onChange={(event) => onSample(event.target.value)}>
          <option value="">— choose a sample —</option>
          {SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {input && (
        <p className="loaded">
          Loaded <code>{input.fileName}</code> ({input.kind === 'csv' ? 'inventory CSV, confirm column mapping below' : 'npm lockfile'},{' '}
          {input.text.length.toLocaleString()} characters)
        </p>
      )}
      {input?.kind === 'csv' && <CsvMappingPanel text={input.text}
        mapping={input.csvMapping ?? { name: null, version: null, licence: null, scope: null }}
        onChange={(csvMapping) => onInput({ ...input, csvMapping })} />}
    </div>
  );
}

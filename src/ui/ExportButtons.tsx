import type { AnalysisResult } from '@core/types.ts';
import { buildJsonExport, serializeJsonExport } from '@core/report/json.ts';
import { downloadText } from '../lib/download.ts';
import { exportFileName } from './reportView.ts';
import type { Ruling } from '@core/rulings/key.ts';
import { buildMarkdownExport } from '@core/report/markdown.ts';

export function ExportButtons({ result, projectKey, rulings }: { result: AnalysisResult; projectKey: string; rulings: readonly Ruling[] }) {
  const onJson = () => {
    const doc = buildJsonExport(result, new Date().toISOString(), projectKey, rulings);
    downloadText(exportFileName(result, 'json'), serializeJsonExport(doc), 'application/json');
  };
  return (
    <div className="export">
      <button type="button" onClick={onJson}>
        Export JSON
      </button>
      <button type="button" onClick={() => downloadText(exportFileName(result, 'md'),
        buildMarkdownExport(buildJsonExport(result, new Date().toISOString(), projectKey, rulings)), 'text/markdown')}>Export Markdown</button>
      <span className="hint">Exports use this report’s analyzed settings and show ruling applicability separately from verdicts.</span>
    </div>
  );
}

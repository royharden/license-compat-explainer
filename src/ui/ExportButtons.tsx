import type { AnalysisResult } from '@core/types.ts';
import { buildJsonExport, serializeJsonExport } from '@core/report/json.ts';
import { downloadText } from '../lib/download.ts';
import { exportFileName } from './reportView.ts';

export function ExportButtons({ result }: { result: AnalysisResult }) {
  const onJson = () => {
    const doc = buildJsonExport(result, new Date().toISOString());
    downloadText(exportFileName(result, 'json'), serializeJsonExport(doc), 'application/json');
  };
  return (
    <div className="export">
      <button type="button" onClick={onJson}>
        Export JSON
      </button>
      <span className="hint">Markdown export arrives with the full report.</span>
    </div>
  );
}

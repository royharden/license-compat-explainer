import { useMemo } from 'react';
import type { CsvMapping } from '@core/types.ts';
import { parseCsvRecords, buildCsvInventory } from '@core/inputs/inventoryCsv.ts';

export function CsvMappingPanel({ text, mapping, onChange }: {
  text: string; mapping: CsvMapping; onChange: (mapping: CsvMapping) => void;
}) {
  const parsed = useMemo(() => parseCsvRecords(text), [text]);
  const preview = useMemo(() => parsed.ok ? buildCsvInventory(parsed.records, parsed.errors, mapping) : null, [parsed, mapping]);
  if (!parsed.ok) return <p role="alert" className="error">{parsed.error.message}</p>;
  const header = parsed.records[0]?.fields ?? [];
  return <fieldset className="csv-mapping"><legend>CSV column mapping</legend>
    <p className="hint">Name and licence are required. An unmapped scope stays unknown; CSV has no dependency graph.</p>
    {(['name', 'version', 'licence', 'scope'] as const).map((key) => <label className="field" key={key}>
      <span>{key}{key === 'name' || key === 'licence' ? ' (required)' : ''}</span>
      <select value={mapping[key] ?? ''} onChange={(event) => onChange({ ...mapping, [key]: event.target.value === '' ? null : Number(event.target.value) })}>
        <option value="">— unmapped —</option>
        {header.map((column, index) => <option key={index} value={index}>{index + 1}: {column || '(blank heading)'}</option>)}
      </select>
    </label>)}
    {preview && !preview.ok && <p role="alert" className="error">{preview.error.message}</p>}
    {preview?.ok && <p role="status">{preview.inventory.items.length} valid rows; {preview.inventory.coverageGaps.length} row errors will appear as coverage gaps.</p>}
    <details><summary>Raw preview (first 3 data records)</summary><table><thead><tr>{header.map((column, index) => <th key={index}>{column}</th>)}</tr></thead>
      <tbody>{parsed.records.slice(1, 4).map((record) => <tr key={record.row}>{record.fields.map((field, index) => <td key={index}>{field}</td>)}</tr>)}</tbody></table></details>
  </fieldset>;
}

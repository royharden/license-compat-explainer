// Inventory CSV reader (PLAN §1.2-§1.3): RFC 4180 parsing, column mapping (pip-licenses headings
// `Name,Version,License` are recognised), row-level errors, no graph (findings carry the source row
// and "path unavailable"). Scope comes from a mapped column; with no scope column every row is
// `unknown` scope, which never qualifies for the dev exemption.
//
// Row numbers are CSV record numbers (the header record is row 1), so a quoted field with an
// embedded newline does not shift later row numbers.

import type { CoverageGap, CsvMapping, InputResult, InputWarning, InventoryItem, Scope } from '../types.ts';
import { MAX_FILE_BYTES, MAX_NAME_CHARS, MAX_PACKAGES, MAX_VERSION_CHARS, clip } from './caps.ts';
import { utf8ByteLength } from '../util/utf8.ts';

export interface CsvRecord {
  row: number;
  fields: string[];
}

export interface CsvRowError {
  row: number;
  code: 'unterminated_quote' | 'bare_quote' | 'text_after_closing_quote' | 'missing_columns' | 'empty_name';
  message: string;
}

export type CsvParseResult =
  | { ok: true; records: CsvRecord[]; errors: CsvRowError[] }
  | { ok: false; error: { code: string; message: string } };

/** RFC 4180 parser. Records with a quoting error are dropped and reported; parsing continues. */
export function parseCsvRecords(text: string): CsvParseResult {
  const bytes = utf8ByteLength(text);
  if (bytes > MAX_FILE_BYTES) {
    return { ok: false, error: { code: 'file_too_large', message: `File is ${bytes} bytes; the limit is ${MAX_FILE_BYTES} bytes (5 MB).` } };
  }
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: CsvRecord[] = [];
  const errors: CsvRowError[] = [];

  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let afterClosingQuote = false;
  let recordError: CsvRowError | null = null;
  let row = 1;
  let recordHasContent = false;

  const endField = (): void => {
    fields.push(field);
    field = '';
    afterClosingQuote = false;
  };
  const endRecord = (): void => {
    endField();
    const blank = fields.length === 1 && fields[0] === '' && !recordHasContent;
    if (recordError) errors.push(recordError);
    else if (!blank) records.push({ row, fields });
    fields = [];
    recordError = null;
    recordHasContent = false;
    row++;
  };
  const markError = (code: CsvRowError['code'], message: string): void => {
    if (!recordError) recordError = { row, code, message };
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
          afterClosingQuote = true;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === ',') {
      recordHasContent = true;
      endField();
    } else if (c === '\r') {
      if (src[i + 1] === '\n') i++;
      endRecord();
    } else if (c === '\n') {
      endRecord();
    } else if (c === '"') {
      recordHasContent = true;
      if (field === '' && !afterClosingQuote) inQuotes = true;
      else {
        markError('bare_quote', `Row ${row}: a double quote appears inside an unquoted field.`);
        field += c;
      }
    } else {
      recordHasContent = true;
      if (afterClosingQuote) markError('text_after_closing_quote', `Row ${row}: text follows a closing quote.`);
      field += c;
    }
    if (records.length > MAX_PACKAGES + 1) {
      return { ok: false, error: { code: 'too_many_rows', message: `The CSV has more than ${MAX_PACKAGES} data rows.` } };
    }
  }
  if (inQuotes) {
    markError('unterminated_quote', `Row ${row}: a quoted field is not closed before the end of the file.`);
    endRecord();
  } else if (field !== '' || fields.length > 0 || recordHasContent) {
    endRecord();
  }
  if (records.length > MAX_PACKAGES + 1) {
    return { ok: false, error: { code: 'too_many_rows', message: `The CSV has more than ${MAX_PACKAGES} data rows.` } };
  }
  return { ok: true, records, errors };
}

const HEADER_PATTERNS: { key: keyof CsvMapping; pattern: RegExp }[] = [
  { key: 'name', pattern: /^(name|package|package name|component)$/i },
  { key: 'version', pattern: /^(version|installed version)$/i },
  { key: 'licence', pattern: /^(license|licence|licenses|licences|license-metadata|license expression|spdx)$/i },
  { key: 'scope', pattern: /^(scope|dependency type|type|group)$/i },
];

/** Suggest a mapping from header names (pip-licenses: `Name`, `Version`, `License`). */
export function suggestCsvMapping(header: readonly string[]): CsvMapping {
  const mapping: CsvMapping = { name: null, version: null, licence: null, scope: null };
  header.forEach((raw, index) => {
    const h = raw.trim();
    for (const { key, pattern } of HEADER_PATTERNS) {
      if (mapping[key] === null && pattern.test(h)) {
        mapping[key] = index;
        break;
      }
    }
  });
  return mapping;
}

export function mapScopeValue(value: string): Scope | null {
  const v = value.trim().toLowerCase();
  if (v === 'prod' || v === 'production' || v === 'runtime' || v === 'main' || v === 'optional') return 'runtime';
  if (v === 'dev' || v === 'development') return 'dev';
  return null;
}

/** Build the inventory from parsed records (first record = header) and a mapping. */
export function buildCsvInventory(records: CsvRecord[], parseErrors: CsvRowError[], mapping: CsvMapping): InputResult {
  if (records.length === 0) return { ok: false, error: { code: 'empty_csv', message: 'The CSV has no header row.' } };
  const headerError = parseErrors.find((e) => e.row === 1);
  if (headerError) return { ok: false, error: { code: 'csv_header_invalid', message: headerError.message } };
  const header = records[0].fields.map((h) => clip(h, 200));
  if (mapping.name === null || mapping.licence === null) {
    return { ok: false, error: { code: 'csv_mapping_incomplete', message: 'Map at least the package-name and licence columns.' } };
  }
  const mapped = [mapping.name, mapping.version, mapping.licence, mapping.scope].filter((v): v is number => v !== null);
  for (const index of mapped) {
    if (!Number.isInteger(index) || index < 0 || index >= header.length) {
      return { ok: false, error: { code: 'csv_mapping_invalid', message: `Column ${index} does not exist in the header.` } };
    }
  }
  if (new Set(mapped).size !== mapped.length) {
    return { ok: false, error: { code: 'csv_mapping_invalid', message: 'Each column can be mapped to one field only.' } };
  }
  const needed = Math.max(...mapped) + 1;

  const items: InventoryItem[] = [];
  const gaps: CoverageGap[] = [];
  const warnings: InputWarning[] = [];
  const rowErrors: CsvRowError[] = [...parseErrors];
  const ordinals = new Map<string, number>();
  let unrecognisedScopes = 0;

  for (const record of records.slice(1)) {
    if (record.fields.length < needed) {
      rowErrors.push({
        row: record.row,
        code: 'missing_columns',
        message: `Row ${record.row}: ${record.fields.length} columns, the mapping needs ${needed}.`,
      });
      continue;
    }
    const name = clip(record.fields[mapping.name].trim(), MAX_NAME_CHARS);
    if (name === '') {
      rowErrors.push({ row: record.row, code: 'empty_name', message: `Row ${record.row}: the package name is empty.` });
      continue;
    }
    const version = mapping.version === null ? '' : clip(record.fields[mapping.version].trim(), MAX_VERSION_CHARS);
    const licenceText = record.fields[mapping.licence];
    let scope: Scope = 'unknown';
    if (mapping.scope !== null) {
      const mappedScope = mapScopeValue(record.fields[mapping.scope]);
      if (mappedScope === null) unrecognisedScopes++;
      else scope = mappedScope;
    }
    const identity = `${name}@${version}`;
    const ordinal = (ordinals.get(identity) ?? 0) + 1;
    ordinals.set(identity, ordinal);
    items.push({
      source: 'csv',
      name,
      version,
      location: null,
      sourceRow: record.row,
      ordinal,
      occurrence: `csv:${identity}#${ordinal}`,
      scope,
      licence: licenceText.trim() === '' ? { kind: 'missing' } : { kind: 'string', value: licenceText },
      path: null,
      pathNote: 'path unavailable (CSV input)',
      alternatePathCount: 0,
    });
  }

  rowErrors.sort((a, b) => a.row - b.row);
  for (const err of rowErrors) {
    gaps.push({ kind: 'csv_row_error', from: `row ${err.row}`, dependency: null, detail: `${err.code}: ${err.message}` });
  }
  if (mapping.scope === null) {
    warnings.push({ code: 'csv_no_scope_column', message: 'No scope column is mapped; every row has unknown scope (never treated as dev-only).' });
  } else if (unrecognisedScopes > 0) {
    warnings.push({ code: 'csv_unrecognised_scope', message: `${unrecognisedScopes} row(s) have an unrecognised scope value and were given unknown scope.` });
  }

  return {
    ok: true,
    inventory: {
      kind: 'csv',
      lockfileVersion: null,
      rootName: null,
      rootVersion: null,
      items,
      coverageGaps: gaps,
      warnings,
      csv: { header, mapping },
    },
  };
}

/** Parse a CSV and build its inventory, using `mapping` or the suggested mapping. */
export function parseInventoryCsv(text: string, mapping?: CsvMapping): InputResult {
  const parsed = parseCsvRecords(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.records.length === 0) return { ok: false, error: { code: 'empty_csv', message: 'The CSV has no header row.' } };
  const effective = mapping ?? suggestCsvMapping(parsed.records[0].fields);
  return buildCsvInventory(parsed.records, parsed.errors, effective);
}

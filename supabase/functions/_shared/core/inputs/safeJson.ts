// Safe JSON parsing for untrusted lockfiles (PLAN C§2.9, review M9a).
// 1. A cheap pre-scan rejects inputs nested deeper than the cap before JSON.parse runs.
// 2. JSON.parse runs with a reviver that drops `__proto__`, `constructor` and `prototype` keys.
// 3. The result is copied into fresh null-prototype records; input objects are never spread or merged.
// JSON.parse alone does not create null-prototype objects, hence step 3.

import { MAX_JSON_DEPTH } from './caps.ts';

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonRecord;

/** A plain JSON object. At runtime every JsonRecord produced here has a null prototype. */
export interface JsonRecord {
  [key: string]: JsonValue | undefined;
}

export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

export type SafeJsonResult =
  | { ok: true; value: JsonValue }
  | { ok: false; code: 'invalid_json' | 'nesting_too_deep'; message: string };

/** Maximum container nesting of a JSON text, ignoring brackets inside strings. */
export function jsonNestingDepth(text: string): number {
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 0x5c /* \ */) i++;
      else if (c === 0x22 /* " */) inString = false;
      continue;
    }
    if (c === 0x22) inString = true;
    else if (c === 0x7b /* { */ || c === 0x5b /* [ */) {
      depth++;
      if (depth > max) max = depth;
    } else if (c === 0x7d /* } */ || c === 0x5d /* ] */) depth--;
  }
  return max;
}

function copyNullPrototype(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const out: JsonValue[] = [];
    for (const item of value) out.push(copyNullPrototype(item));
    return out;
  }
  if (typeof value === 'object') {
    const out = Object.create(null) as JsonRecord;
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      out[key] = copyNullPrototype((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  // JSON.parse never yields other types; treat defensively as null.
  return null;
}

export function parseJsonSafe(text: string, maxDepth: number = MAX_JSON_DEPTH): SafeJsonResult {
  const depth = jsonNestingDepth(text);
  if (depth > maxDepth) {
    return { ok: false, code: 'nesting_too_deep', message: `JSON nesting depth ${depth} exceeds the cap of ${maxDepth}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, (key: string, value: unknown) => (FORBIDDEN_KEYS.has(key) ? undefined : value));
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'invalid JSON';
    return { ok: false, code: 'invalid_json', message };
  }
  return { ok: true, value: copyNullPrototype(parsed) };
}

// ---------------------------------------------------------------- typed accessors (no prototype lookups)

export function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRecord(record: JsonRecord | null | undefined, key: string): JsonRecord | null {
  if (!record) return null;
  const v = record[key];
  return isRecord(v) ? v : null;
}

export function getString(record: JsonRecord | null | undefined, key: string): string | null {
  if (!record) return null;
  const v = record[key];
  return typeof v === 'string' ? v : null;
}

export function getBoolean(record: JsonRecord | null | undefined, key: string): boolean {
  if (!record) return false;
  return record[key] === true;
}

export function hasOwn(record: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

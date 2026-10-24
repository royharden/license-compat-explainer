// Canonical JSON (sorted object keys, no whitespace) used before hashing (PLAN §2.5b).
// Arrays keep their order; `undefined` members are dropped like JSON.stringify does.

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue | undefined };

export function canonicalJson(value: CanonicalValue | undefined): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonicalJson: non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v: CanonicalValue) => canonicalJson(v)).join(',') + ']';
  }
  const record = value as { readonly [key: string]: CanonicalValue | undefined };
  const keys = Object.keys(record).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const v = record[key];
    if (v === undefined) continue;
    parts.push(JSON.stringify(key) + ':' + canonicalJson(v));
  }
  return '{' + parts.join(',') + '}';
}

import { describe, expect, it } from 'vitest';
import { getRecord, isRecord, jsonNestingDepth, parseJsonSafe } from '../supabase/functions/_shared/core/inputs/safeJson.ts';
import { parsePackageLock } from '../supabase/functions/_shared/core/inputs/packageLock.ts';

describe('safeJson', () => {
  it('drops __proto__, constructor and prototype keys (M1 e)', () => {
    const parsed = parseJsonSafe('{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":2,"ok":{"__proto__":{"deep":1},"v":3}}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !isRecord(parsed.value)) throw new Error('expected record');
    expect(Object.keys(parsed.value)).toEqual(['ok']);
    const inner = getRecord(parsed.value, 'ok');
    expect(inner && Object.keys(inner)).toEqual(['v']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('copies objects into null-prototype records (M1 e)', () => {
    const parsed = parseJsonSafe('{"a":{"b":[{"c":1}]}}');
    if (!parsed.ok || !isRecord(parsed.value)) throw new Error('expected record');
    expect(Object.getPrototypeOf(parsed.value)).toBeNull();
    const a = getRecord(parsed.value, 'a');
    expect(a && Object.getPrototypeOf(a)).toBeNull();
    const arr = a?.['b'];
    expect(Array.isArray(arr)).toBe(true);
    if (Array.isArray(arr) && isRecord(arr[0])) expect(Object.getPrototypeOf(arr[0])).toBeNull();
  });

  it('a "toString" or "hasOwnProperty" key is plain data, not an inherited method', () => {
    const parsed = parseJsonSafe('{"toString":"x","hasOwnProperty":"y"}');
    if (!parsed.ok || !isRecord(parsed.value)) throw new Error('expected record');
    expect(parsed.value['toString']).toBe('x');
    expect(parsed.value['hasOwnProperty']).toBe('y');
  });

  it('rejects invalid JSON with a code, not an exception', () => {
    const parsed = parseJsonSafe('{"a":');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe('invalid_json');
  });

  it('rejects nesting deeper than the cap before parsing', () => {
    const deep = '['.repeat(200) + ']'.repeat(200);
    const parsed = parseJsonSafe(deep);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe('nesting_too_deep');
  });

  it('ignores brackets inside strings when measuring depth', () => {
    expect(jsonNestingDepth('{"a":"[[[[{{{{\\"]]]"}')).toBe(1);
  });

  it('a __proto__ payload in a lockfile entry is neutralised', () => {
    const text = JSON.stringify({ lockfileVersion: 3, packages: { '': { dependencies: { a: '1' } }, 'node_modules/a': { version: '1.0.0', license: 'MIT' } } }).replace(
      '"license":"MIT"',
      '"license":"MIT","__proto__":{"dev":true,"license":"GPL-3.0-only"}',
    );
    const result = parsePackageLock(text);
    if (!result.ok) throw new Error(result.error.message);
    const item = result.inventory.items[0];
    expect(item.scope).toBe('runtime');
    expect(item.licence).toEqual({ kind: 'string', value: 'MIT' });
  });
});

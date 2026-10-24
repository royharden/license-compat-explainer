import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../supabase/functions/_shared/core/util/sha256.ts';
import { utf8ByteLength, utf8Encode } from '../supabase/functions/_shared/core/util/utf8.ts';
import { fnv1a32 } from '../supabase/functions/_shared/core/util/fnv1a.ts';
import { canonicalJson } from '../supabase/functions/_shared/core/util/canonicalJson.ts';

describe('sha256 (pure, synchronous)', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('returns a string synchronously (no Promise)', () => {
    const out: unknown = sha256Hex('x');
    expect(typeof out).toBe('string');
  });

  it('handles inputs spanning several 64-byte blocks', () => {
    expect(sha256Hex('a'.repeat(1000))).toHaveLength(64);
    expect(sha256Hex('a'.repeat(55))).not.toBe(sha256Hex('a'.repeat(56)));
  });
});

describe('utf8', () => {
  it('encodes multi-byte characters like TextEncoder', () => {
    expect([...utf8Encode('é')]).toEqual([0xc3, 0xa9]);
    expect([...utf8Encode('€')]).toEqual([0xe2, 0x82, 0xac]);
    expect([...utf8Encode('😀')]).toEqual([0xf0, 0x9f, 0x98, 0x80]);
    expect(utf8ByteLength('a😀é')).toBe(7);
  });

  it('encodes lone surrogates as U+FFFD', () => {
    expect([...utf8Encode('\ud800')]).toEqual([0xef, 0xbf, 0xbd]);
  });

  it('matches TextEncoder on a mixed string', () => {
    const s = 'MIT OR GPL-3.0-only — ✓ 😀';
    expect([...utf8Encode(s)]).toEqual([...new TextEncoder().encode(s)]);
  });
});

describe('fnv1a32', () => {
  it('matches known values', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });
});

describe('canonicalJson', () => {
  it('sorts keys recursively and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: true, c: null }, e: undefined })).toBe('{"a":{"c":null,"d":true},"b":1}');
    expect(canonicalJson([3, 'x', { z: 1, y: 2 }])).toBe('[3,"x",{"y":2,"z":1}]');
  });
});

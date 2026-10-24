// UTF-8 encoding without any runtime global (no TextEncoder needed), so the core stays
// identical in browser, Node and Deno. Lone surrogates encode as U+FFFD, as TextEncoder does.

function codePointAt(s: string, i: number): { cp: number; width: number } {
  const c = s.charCodeAt(i);
  if (c >= 0xd800 && c <= 0xdbff) {
    if (i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        return { cp: 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00), width: 2 };
      }
    }
    return { cp: 0xfffd, width: 1 };
  }
  if (c >= 0xdc00 && c <= 0xdfff) return { cp: 0xfffd, width: 1 };
  return { cp: c, width: 1 };
}

function bytesFor(cp: number): number {
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/** Number of bytes `s` occupies in UTF-8. */
export function utf8ByteLength(s: string): number {
  let total = 0;
  let i = 0;
  while (i < s.length) {
    const { cp, width } = codePointAt(s, i);
    total += bytesFor(cp);
    i += width;
  }
  return total;
}

/** UTF-8 bytes of `s`. */
export function utf8Encode(s: string): Uint8Array {
  const out = new Uint8Array(utf8ByteLength(s));
  let o = 0;
  let i = 0;
  while (i < s.length) {
    const { cp, width } = codePointAt(s, i);
    i += width;
    if (cp < 0x80) {
      out[o++] = cp;
    } else if (cp < 0x800) {
      out[o++] = 0xc0 | (cp >> 6);
      out[o++] = 0x80 | (cp & 0x3f);
    } else if (cp < 0x10000) {
      out[o++] = 0xe0 | (cp >> 12);
      out[o++] = 0x80 | ((cp >> 6) & 0x3f);
      out[o++] = 0x80 | (cp & 0x3f);
    } else {
      out[o++] = 0xf0 | (cp >> 18);
      out[o++] = 0x80 | ((cp >> 12) & 0x3f);
      out[o++] = 0x80 | ((cp >> 6) & 0x3f);
      out[o++] = 0x80 | (cp & 0x3f);
    }
  }
  return out;
}

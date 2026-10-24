// FNV-1a 32-bit over UTF-8 bytes (PLAN §2.5b, §7.5: deterministic OSADL dev/held-out split).

import { utf8Encode } from './utf8.ts';

export function fnv1a32(input: string): number {
  const bytes = utf8Encode(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

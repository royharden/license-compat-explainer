// Decide how to read a dropped or chosen file, before any parsing.

import { MAX_FILE_BYTES } from '@core/inputs/caps.ts';
import type { InputKind } from '../worker/protocol.ts';

export function detectInputKind(fileName: string, text: string): InputKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.json')) return 'npm-lock';
  const head = text.trimStart();
  if (head.startsWith('{')) return 'npm-lock';
  if (head.length > 0) return 'csv';
  return null;
}

/** Reject oversized files before reading them into memory (the core re-checks UTF-8 size). */
export function checkFileSize(size: number): string | null {
  return size > MAX_FILE_BYTES ? `The file is ${size} bytes; the limit is ${MAX_FILE_BYTES} bytes (5 MB).` : null;
}

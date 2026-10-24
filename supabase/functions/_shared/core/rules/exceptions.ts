// Licence exceptions (PLAN §3.3): Classpath-exception-2.0 and GCC-exception-3.1 are modelled for
// their GPL bases; LLVM-exception is recognised but not modelled (always needs_review).
// Any other exception, or a modelled exception on a base it is not modelled for, is unsupported.

import type { ExceptionPair } from '../types.ts';

export interface ExceptionEntry {
  id: string;
  name: string;
  modelled: boolean;
  /** Catalogue base ids the exception is modelled for. */
  appliesTo: readonly string[];
  pair: ExceptionPair | null;
  text: 'gnu_verbatim' | 'template_only';
}

export const EXCEPTIONS: readonly ExceptionEntry[] = [
  {
    id: 'Classpath-exception-2.0',
    name: 'Classpath exception 2.0',
    modelled: true,
    appliesTo: ['GPL-2.0-only', 'GPL-2.0-or-later'],
    pair: 'classpath',
    text: 'template_only',
  },
  {
    id: 'GCC-exception-3.1',
    name: 'GCC Runtime Library exception 3.1',
    modelled: true,
    appliesTo: ['GPL-3.0-only', 'GPL-3.0-or-later'],
    pair: 'gcc',
    text: 'gnu_verbatim',
  },
  {
    id: 'LLVM-exception',
    name: 'LLVM Exception',
    modelled: false,
    appliesTo: [],
    pair: null,
    text: 'template_only',
  },
];

/** A partial, hand-written list of other SPDX exception ids, recognised so they read as unsupported. */
export const KNOWN_OTHER_EXCEPTIONS: ReadonlySet<string> = new Set(
  [
    '389-exception',
    'Autoconf-exception-2.0',
    'Autoconf-exception-3.0',
    'Bison-exception-2.2',
    'eCos-exception-2.0',
    'Font-exception-2.0',
    'GCC-exception-2.0',
    'Linux-syscall-note',
    'LZMA-exception',
    'OpenJDK-assembly-exception-1.0',
    'Qt-GPL-exception-1.0',
    'Qt-LGPL-exception-1.1',
    'Swift-exception',
    'u-boot-exception-2.0',
    'Universal-FOSS-exception-1.0',
    'WxWindows-exception-3.1',
  ].map((id) => id.toLowerCase()),
);

const BY_LOWER = new Map<string, ExceptionEntry>(EXCEPTIONS.map((e) => [e.id.toLowerCase(), e]));

export function findException(id: string): ExceptionEntry | null {
  return BY_LOWER.get(id.toLowerCase()) ?? null;
}

import { segmentLicence } from '../quotecheck/segment.ts';
import { text as text0 } from './GPL-2.0-only.ts';
import { text as text1 } from './GPL-3.0-only.ts';
import { text as text2 } from './LGPL-2.1-only.ts';
export const CORPUS_EDITION = '2026-10-24.gnu-partial';
export const TEXTS: Readonly<Record<string, string>> = {"GPL-2.0-only": text0, "GPL-3.0-only": text1, "LGPL-2.1-only": text2};
export function canonicalTextId(id: string): string { return id.replace(/-or-later$/, '-only'); }
export const PASSAGES = Object.entries(TEXTS).flatMap(([id,text]) => segmentLicence(id,text));
export const QUOTE_COVERAGE = { complete: false, availableDocuments: 3, plannedDocuments: 6, reason: 'AGPL3, LGPL3 and GCC3.1 GETs timed out; all other documents await D18 terms verification.' } as const;

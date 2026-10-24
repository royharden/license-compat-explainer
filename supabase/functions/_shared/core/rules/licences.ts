// Frozen licence catalogue (PLAN §3.3): Claude's 28 + BSL-1.0 = 29 licences.
// `-or-later` ids expand only over the recognised later versions listed here (PLAN §3.4);
// hypothetical future versions are not modelled.
//
// `text` records the M2 vendoring decision of PLAN §5.2: `gnu_verbatim` texts are fetched from
// gnu.org in M2 (their own wording grants verbatim copying); every other text is template-only.

import type { LicenceClass } from '../types.ts';

export interface LicenceEntry {
  id: string;
  name: string;
  licenceClass: LicenceClass;
  /** For an `-only` (or unversioned-successor) id: the `-or-later` id that `+` maps to. */
  orLaterId: string | null;
  /** For an `-or-later` id: the recognised `-only` versions it expands to, in version order. */
  expandsTo: readonly string[] | null;
  text: 'gnu_verbatim' | 'template_only';
}

function entry(
  id: string,
  name: string,
  licenceClass: LicenceClass,
  extra: { orLaterId?: string; expandsTo?: readonly string[]; text?: 'gnu_verbatim' | 'template_only' } = {},
): LicenceEntry {
  return {
    id,
    name,
    licenceClass,
    orLaterId: extra.orLaterId ?? null,
    expandsTo: extra.expandsTo ?? null,
    text: extra.text ?? 'template_only',
  };
}

export const LICENCES: readonly LicenceEntry[] = [
  // public domain / permissive (13)
  entry('0BSD', 'BSD Zero Clause License', 'permissive'),
  entry('Unlicense', 'The Unlicense', 'public_domain'),
  entry('CC0-1.0', 'Creative Commons Zero v1.0 Universal', 'public_domain'),
  entry('MIT', 'MIT License', 'permissive'),
  entry('ISC', 'ISC License', 'permissive'),
  entry('BSD-2-Clause', 'BSD 2-Clause "Simplified" License', 'permissive'),
  entry('BSD-3-Clause', 'BSD 3-Clause "New" or "Revised" License', 'permissive'),
  entry('Apache-2.0', 'Apache License 2.0', 'permissive'),
  entry('Zlib', 'zlib License', 'permissive'),
  entry('BlueOak-1.0.0', 'Blue Oak Model License 1.0.0', 'permissive'),
  entry('Python-2.0', 'Python License 2.0', 'permissive'),
  entry('CC-BY-4.0', 'Creative Commons Attribution 4.0 International', 'permissive'),
  entry('BSL-1.0', 'Boost Software License 1.0', 'permissive'),
  // weak copyleft (6)
  entry('MPL-2.0', 'Mozilla Public License 2.0', 'weak_copyleft'),
  entry('LGPL-2.1-only', 'GNU Lesser General Public License v2.1 only', 'weak_copyleft', {
    orLaterId: 'LGPL-2.1-or-later',
    text: 'gnu_verbatim',
  }),
  entry('LGPL-2.1-or-later', 'GNU Lesser General Public License v2.1 or later', 'weak_copyleft', {
    expandsTo: ['LGPL-2.1-only', 'LGPL-3.0-only'],
    text: 'gnu_verbatim',
  }),
  entry('LGPL-3.0-only', 'GNU Lesser General Public License v3.0 only', 'weak_copyleft', {
    orLaterId: 'LGPL-3.0-or-later',
    text: 'gnu_verbatim',
  }),
  entry('LGPL-3.0-or-later', 'GNU Lesser General Public License v3.0 or later', 'weak_copyleft', {
    expandsTo: ['LGPL-3.0-only'],
    text: 'gnu_verbatim',
  }),
  entry('EPL-2.0', 'Eclipse Public License 2.0', 'weak_copyleft'),
  // strong copyleft (4)
  entry('GPL-2.0-only', 'GNU General Public License v2.0 only', 'strong_copyleft', {
    orLaterId: 'GPL-2.0-or-later',
    text: 'gnu_verbatim',
  }),
  entry('GPL-2.0-or-later', 'GNU General Public License v2.0 or later', 'strong_copyleft', {
    expandsTo: ['GPL-2.0-only', 'GPL-3.0-only'],
    text: 'gnu_verbatim',
  }),
  entry('GPL-3.0-only', 'GNU General Public License v3.0 only', 'strong_copyleft', {
    orLaterId: 'GPL-3.0-or-later',
    text: 'gnu_verbatim',
  }),
  entry('GPL-3.0-or-later', 'GNU General Public License v3.0 or later', 'strong_copyleft', {
    expandsTo: ['GPL-3.0-only'],
    text: 'gnu_verbatim',
  }),
  // network copyleft (2)
  entry('AGPL-3.0-only', 'GNU Affero General Public License v3.0 only', 'network_copyleft', {
    orLaterId: 'AGPL-3.0-or-later',
    text: 'gnu_verbatim',
  }),
  entry('AGPL-3.0-or-later', 'GNU Affero General Public License v3.0 or later', 'network_copyleft', {
    expandsTo: ['AGPL-3.0-only'],
    text: 'gnu_verbatim',
  }),
  // restricted: always needs_review (4)
  entry('SSPL-1.0', 'Server Side Public License, v 1', 'source_available'),
  entry('BUSL-1.1', 'Business Source License 1.1', 'source_available'),
  entry('Elastic-2.0', 'Elastic License 2.0', 'source_available'),
  entry('CC-BY-NC-4.0', 'Creative Commons Attribution Non Commercial 4.0 International', 'non_commercial'),
];

const BY_ID = new Map<string, LicenceEntry>(LICENCES.map((l) => [l.id, l]));
const BY_LOWER = new Map<string, LicenceEntry>(LICENCES.map((l) => [l.id.toLowerCase(), l]));

/** Exact (canonical-case) lookup. */
export function getLicence(id: string): LicenceEntry | null {
  return BY_ID.get(id) ?? null;
}

/** SPDX ids match case-insensitively; returns the catalogue entry with its canonical id. */
export function findLicence(id: string): LicenceEntry | null {
  return BY_LOWER.get(id.toLowerCase()) ?? null;
}

export function isRestrictedClass(licenceClass: LicenceClass | null): boolean {
  return licenceClass === 'source_available' || licenceClass === 'non_commercial';
}

export function isPermissiveClass(licenceClass: LicenceClass | null): boolean {
  return licenceClass === 'permissive' || licenceClass === 'public_domain';
}

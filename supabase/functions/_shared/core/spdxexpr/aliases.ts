// Alias, deprecated-id and known-id tables (PLAN §3.1, §3.5).
//
// Alias guards: bare `BSD`, bare `BSL`, `BSL-1.1` and versionless `GPL` resolve to nothing
// (`target: null` = ambiguous -> unknown). Exact `BSL-1.0` is the Boost licence and is a catalogue id,
// so it never passes through this table. Every alias declares the class it is intended to land in;
// a test asserts the catalogue agrees, so no alias can map across classes (e.g. a restricted licence
// can never be reached through a permissive-looking alias).

import type { LicenceClass } from '../types.ts';

export interface AliasEntry {
  /** Canonical catalogue id, or null when the spelling is ambiguous. */
  target: string | null;
  /** Class the alias is meant to resolve into; null for ambiguous entries. */
  intendedClass: LicenceClass | null;
  /** True when the alias picks the stricter `-only` reading of an unversioned-successor spelling. */
  stricterOnly: boolean;
}

export function aliasKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function a(target: string | null, intendedClass: LicenceClass | null, stricterOnly = false): AliasEntry {
  return { target, intendedClass, stricterOnly };
}

const AMBIGUOUS = a(null, null);

/** Whole-string aliases (checked before lexing, so `MIT/X11` is not split on `/`). Keys use aliasKey(). */
export const WHOLE_STRING_ALIASES: ReadonlyMap<string, AliasEntry> = new Map<string, AliasEntry>([
  // Apache
  ['apache 2', a('Apache-2.0', 'permissive')],
  ['apache 2.0', a('Apache-2.0', 'permissive')],
  ['apache license 2.0', a('Apache-2.0', 'permissive')],
  ['apache license, version 2.0', a('Apache-2.0', 'permissive')],
  ['apache license version 2.0', a('Apache-2.0', 'permissive')],
  ['the apache license, version 2.0', a('Apache-2.0', 'permissive')],
  ['the apache software license, version 2.0', a('Apache-2.0', 'permissive')],
  ['apache software license', AMBIGUOUS],
  ['apache', AMBIGUOUS],
  // MIT
  ['mit license', a('MIT', 'permissive')],
  ['the mit license', a('MIT', 'permissive')],
  ['mit/x11', a('MIT', 'permissive')],
  ['expat', a('MIT', 'permissive')],
  ['expat license', a('MIT', 'permissive')],
  // ISC / BSD
  ['isc license', a('ISC', 'permissive')],
  ['bsd', AMBIGUOUS],
  ['bsd license', AMBIGUOUS],
  ['bsd-like', AMBIGUOUS],
  ['new bsd license', a('BSD-3-Clause', 'permissive')],
  ['modified bsd license', a('BSD-3-Clause', 'permissive')],
  ['bsd 3-clause', a('BSD-3-Clause', 'permissive')],
  ['bsd 3-clause license', a('BSD-3-Clause', 'permissive')],
  ['simplified bsd license', a('BSD-2-Clause', 'permissive')],
  ['bsd 2-clause', a('BSD-2-Clause', 'permissive')],
  ['bsd 2-clause license', a('BSD-2-Clause', 'permissive')],
  // BSL: only the explicit Boost name is aliased; the short forms are ambiguous with BUSL-1.1.
  ['bsl', AMBIGUOUS],
  ['bsl-1.1', AMBIGUOUS],
  ['bsl 1.1', AMBIGUOUS],
  ['boost software license 1.0', a('BSL-1.0', 'permissive')],
  ['boost software license - version 1.0', a('BSL-1.0', 'permissive')],
  ['business source license 1.1', a('BUSL-1.1', 'source_available')],
  // GPL family
  ['gpl', AMBIGUOUS],
  ['gnu gpl', AMBIGUOUS],
  ['gnu general public license', AMBIGUOUS],
  ['lgpl', AMBIGUOUS],
  ['agpl', AMBIGUOUS],
  ['gplv2', a('GPL-2.0-only', 'strong_copyleft', true)],
  ['gplv3', a('GPL-3.0-only', 'strong_copyleft', true)],
  ['gnu general public license v2 (gplv2)', a('GPL-2.0-only', 'strong_copyleft', true)],
  ['gnu general public license v3 (gplv3)', a('GPL-3.0-only', 'strong_copyleft', true)],
  ['lgplv2.1', a('LGPL-2.1-only', 'weak_copyleft', true)],
  ['lgplv3', a('LGPL-3.0-only', 'weak_copyleft', true)],
  ['gnu lesser general public license v3 (lgplv3)', a('LGPL-3.0-only', 'weak_copyleft', true)],
  ['agplv3', a('AGPL-3.0-only', 'network_copyleft', true)],
  ['gnu affero general public license v3', a('AGPL-3.0-only', 'network_copyleft', true)],
  // others
  ['mozilla public license 2.0 (mpl 2.0)', a('MPL-2.0', 'weak_copyleft')],
  ['mpl 2.0', a('MPL-2.0', 'weak_copyleft')],
  ['mpl', AMBIGUOUS],
  ['eclipse public license 2.0', a('EPL-2.0', 'weak_copyleft')],
  ['cc0', a('CC0-1.0', 'public_domain')],
  ['cc0 1.0 universal', a('CC0-1.0', 'public_domain')],
  ['public domain', AMBIGUOUS],
  ['server side public license', a('SSPL-1.0', 'source_available')],
]);

/** Single-token aliases, used for leaves inside an expression. Keys are lower-case tokens. */
export const TOKEN_ALIASES: ReadonlyMap<string, AliasEntry> = new Map<string, AliasEntry>([
  ['expat', a('MIT', 'permissive')],
  ['apache2', a('Apache-2.0', 'permissive')],
  ['apache-2', a('Apache-2.0', 'permissive')],
  ['cc0', a('CC0-1.0', 'public_domain')],
  ['gplv2', a('GPL-2.0-only', 'strong_copyleft', true)],
  ['gplv3', a('GPL-3.0-only', 'strong_copyleft', true)],
  ['bsd', AMBIGUOUS],
  ['bsl', AMBIGUOUS],
  ['bsl-1.1', AMBIGUOUS],
  ['gpl', AMBIGUOUS],
  ['lgpl', AMBIGUOUS],
  ['agpl', AMBIGUOUS],
  ['mpl', AMBIGUOUS],
  ['apache', AMBIGUOUS],
]);

export interface DeprecatedEntry {
  id: string;
  exception: string | null;
}

/**
 * Deprecated SPDX ids -> current ids (lower-case keys). Unversioned-successor GNU ids map to the
 * stricter `-only` form; `GPL-2.0+` arrives as `GPL-2.0` with the `+` operator, which then lifts it
 * to `-or-later`. Targets outside the catalogue are listed in KNOWN_OTHER_LICENCE_IDS.
 */
export const DEPRECATED_IDS: ReadonlyMap<string, DeprecatedEntry> = new Map<string, DeprecatedEntry>([
  ['gpl-1.0', { id: 'GPL-1.0-only', exception: null }],
  ['gpl-2.0', { id: 'GPL-2.0-only', exception: null }],
  ['gpl-3.0', { id: 'GPL-3.0-only', exception: null }],
  ['lgpl-2.0', { id: 'LGPL-2.0-only', exception: null }],
  ['lgpl-2.1', { id: 'LGPL-2.1-only', exception: null }],
  ['lgpl-3.0', { id: 'LGPL-3.0-only', exception: null }],
  ['agpl-1.0', { id: 'AGPL-1.0-only', exception: null }],
  ['agpl-3.0', { id: 'AGPL-3.0-only', exception: null }],
  ['gpl-2.0-with-classpath-exception', { id: 'GPL-2.0-only', exception: 'Classpath-exception-2.0' }],
  ['gpl-3.0-with-gcc-exception', { id: 'GPL-3.0-only', exception: 'GCC-exception-3.1' }],
  ['gpl-2.0-with-gcc-exception', { id: 'GPL-2.0-only', exception: 'GCC-exception-2.0' }],
  ['gpl-2.0-with-autoconf-exception', { id: 'GPL-2.0-only', exception: 'Autoconf-exception-2.0' }],
  ['gpl-2.0-with-bison-exception', { id: 'GPL-2.0-only', exception: 'Bison-exception-2.2' }],
  ['gpl-2.0-with-font-exception', { id: 'GPL-2.0-only', exception: 'Font-exception-2.0' }],
  ['gpl-3.0-with-autoconf-exception', { id: 'GPL-3.0-only', exception: 'Autoconf-exception-3.0' }],
]);

/**
 * A partial, hand-written list of valid SPDX licence ids outside the catalogue. They resolve to
 * `unsupported_licence` (unknown). Unlisted well-formed tokens resolve to `unresolved`
 * (`unrecognised_identifier`) because the full SPDX list is not vendored (PLAN §5.2, D18).
 */
const OTHER_IDS = [
  'AAL', 'AFL-3.0', 'AGPL-1.0-only', 'AGPL-1.0-or-later', 'APSL-2.0', 'Artistic-1.0', 'Artistic-2.0',
  'Beerware', 'BSD-1-Clause', 'BSD-3-Clause-Clear', 'BSD-4-Clause', 'CC-BY-2.0', 'CC-BY-3.0',
  'CC-BY-NC-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0', 'CC-PDDC', 'CDDL-1.0', 'CDDL-1.1',
  'CPAL-1.0', 'CPL-1.0', 'curl', 'ECL-2.0', 'EPL-1.0', 'EUPL-1.1', 'EUPL-1.2', 'GPL-1.0-only',
  'GPL-1.0-or-later', 'Hippocratic-2.1', 'IPL-1.0', 'JSON', 'LGPL-2.0-only', 'LGPL-2.0-or-later',
  'MIT-0', 'MPL-1.0', 'MPL-1.1', 'MS-PL', 'MS-RL', 'MulanPSL-2.0', 'NCSA', 'ODbL-1.0', 'OFL-1.1',
  'OpenSSL', 'OSL-3.0', 'Parity-7.0.0', 'PHP-3.01', 'PolyForm-Noncommercial-1.0.0',
  'PolyForm-Small-Business-1.0.0', 'PostgreSQL', 'PSF-2.0', 'Ruby', 'Unicode-3.0', 'Unicode-DFS-2016',
  'UPL-1.0', 'Vim', 'W3C', 'WTFPL', 'X11', 'ZPL-2.1',
];

export const KNOWN_OTHER_LICENCE_IDS: ReadonlyMap<string, string> = new Map<string, string>(
  OTHER_IDS.map((id) => [id.toLowerCase(), id]),
);

/** `LicenseRef-...` / `DocumentRef-...:LicenseRef-...` are valid SPDX forms but never in the catalogue. */
export function isLicenseRef(token: string): boolean {
  return /^(DocumentRef-[A-Za-z0-9.-]+:)?LicenseRef-[A-Za-z0-9.-]+$/i.test(token);
}

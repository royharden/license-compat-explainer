// Input bounds (PLAN §1.2). Every untrusted input is checked against these before work is done.

/** Maximum input file size in UTF-8 bytes (5 MB). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Maximum number of packages (lockfile entries other than the root) or CSV data rows. */
export const MAX_PACKAGES = 5000;

/** Maximum length of one licence string, in UTF-16 code units. */
export const MAX_LICENCE_STRING = 1000;

/** Maximum length of an SPDX expression handed to the lexer. */
export const MAX_EXPRESSION_CHARS = 200;

/** Maximum parenthesis nesting in an expression, and maximum v1 lockfile dependency nesting. */
export const MAX_NESTING_DEPTH = 32;

/**
 * Maximum JSON container nesting. A lockfile v1 package level costs two JSON levels
 * (`dependencies` -> name), so this admits MAX_NESTING_DEPTH package levels plus envelope.
 */
export const MAX_JSON_DEPTH = MAX_NESTING_DEPTH * 2 + 8;

/** Upper bound reported for alternate-path counts (bounded, never enumerated). */
export const MAX_ALTERNATE_PATH_COUNT = 999;

/** Maximum entries read from a legacy `licenses` array. */
export const MAX_LEGACY_LICENCE_ENTRIES = 16;

/** Display clip for names and versions taken from untrusted input. */
export const MAX_NAME_CHARS = 214;
export const MAX_VERSION_CHARS = 256;

/** Clip a display string to `max` code units, marking the cut. */
export function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max) + '…';
}
